var express =    require ('express');
var async =      require ('async');
var _ =          require ('lodash');
var bodyParser = require ('body-parser');
var typeis =     require ('type-is');


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues_tree (scope, req, res) {
  var queues = scope.queues();
  var tasks = {};

  _.forEach(queues, (q, qname) => {
    tasks[qname] = cb => q.status(cb);
  });

  var hier = {};

  async.parallel(tasks, (err, r) => {
    _.forEach(r, (q, qname) => {
      if (!hier[q.namespace]) {
        hier[q.namespace] = {
          title: q.namespace,
          key: q.namespace,
          folder: true,
          expanded: true,
          children: []
        };
      }

      var ch = hier[q.namespace].children;
      ch.push({
        title: qname,
        key: qname,
        put: q.stats.put,
        got: q.stats.got,
        commit: q.stats.commit,
        reserve: q.stats.reserve,
        rollback: q.stats.rollback,
        size: q.size,
        total: q.totalSize,
        sched: q.schedsize,
        next_t: q.next_mature_t
      });
    });

    var final_res = [];

    _.forEach(hier, (v, k) => final_res.push(v));

    res.send(final_res);
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues_array (scope, req, res) {
  var queues = scope.queues();
  var tasks = {};


  _.forEach(queues, (q, qname) => {
    tasks[qname] = cb => q.status(cb);
  });

  async.parallel(tasks, (err, r) => {
    var final_res = [];

    _.forEach(r, (q, qname) => {
      q.id = qname;
      final_res.push(q);
    });

    res.send({
      data: final_res
    });
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_namespaces (scope, req, res) {
  var namespaces = scope.namespaces();
  var ret = [];
  _.forEach (namespaces, (v, k) => ret.push (k));
  res.send (ret);
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues (scope, req, res) {
  if (req.query.tree) {
    _list_queues_tree(scope, req, res);
  } else if (req.query.array) {
    _list_queues_array(scope, req, res);
  } else {
    _list_namespaces(scope, req, res);
  }
}


//////////////////////////////////////////////////////////////////////////////////////
function _reload_list_queues (scope, req, res) {
  scope.refresh(() => _list_queues(scope, req, res));
}


//////////////////////////////////////////////////////////////////////////////////////
function get_router(config, context) {
  var scope = context.scope;

  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queues (req, res) {
    if (req.query.reload) {
      _reload_list_queues(scope, req, res);
    } else {
      _list_queues(scope, req, res);
    }
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queues_of_namespace (req, res) {
    var tasks = {};

    for (let entry of req.__namespace.q_repo) {
      tasks[entry[0]] = cb => entry[1].status(cb);
    }

    async.parallel(tasks, (err, r) => res.send(r));
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queue_status (req, res) {
    var q = req.__q;

    q.status((err, r) => {
      if (err) res.status(500).send(err);
      res.send(r);
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queue_consumers (req, res) {
    var q = req.__q;
    res.send(q.consumers());
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queue_paused (req, res) {
    var q = req.__q;

    q.paused((err, r) => {
      if (err) res.status(500).send(err);
      res.send(r);
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _push_in_queue (req, res) {
    var q = req.__q;
    var opts = req.query ? _.clone (req.query) : {};

    // pass ctype, x-ks-hdr-*
    opts.hdrs = {};

    if (req.headers['content-type']) opts.hdrs['content-type'] = req.headers['content-type'];

    _.each (req.headers, (v, k) => {
      if (k.match (/^x-ks-hdr-.+/)) opts.hdrs[k.substr (9)] = v;
    });

    // groom req.body
    if (typeis (req, ['json'])) {
      try {
        req.body = JSON.parse (req.body);
      }
      catch (e) {
        return res.status (500).send ('cannot parse body as json');
      }
    }
    else if (typeis (req, ['text/*'])) {
      req.body = req.body.toString ();
    }

    q.push (req.body || req.text, opts, (err, id) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send({
          id: id
        });
      }

      context.metrics.keuss_q_push.labels ('rest', req.__q.ns(), req.__q.name(), (err ? 'ko' : 'ok')).inc ();
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _pop_from_queue (req, res) {
    var q = req.__q;
    var opts = {};
    var cid = req.ip + '-' + new Date().getTime();
    var metric = context.metrics.keuss_q_pop;

    if (req.query.to) {
      opts.timeout = req.query.to;
    }

    if (req.query.tid) {
      opts.tid = req.query.tid;
    }

    if (req.query.reserve) {
      opts.reserve = true;
      metric = context.metrics.keuss_q_reserve;
    }

    var tid = q.pop(cid, opts, (err, result) => {
      if (err) {
        if (err.timeout) {
          res.status(504);
          res.statusMessage = 'Queue Pop Timeout';
          res.send(err);
          metric.labels ('rest', req.__q.ns(), req.__q.name(), 'timeout').inc ();
        } else if (err == 'cancel') {
          res.status(410);
          res.statusMessage = 'Queue Pop Cancelled';
          res.send(err);
          metric.labels ('rest', req.__q.ns(), req.__q.name(), 'cancel').inc ();
        } else {
          res.status(500).send(err);
          metric.labels ('rest', req.__q.ns(), req.__q.name(), 'ko').inc ();
        }
      } else {
        const h = {
          'x-ks-tries': result.tries,
          'x-ks-mature': result.mature.toISOString(),
          'x-ks-id': result._id
        };

        // extract ctype & x-ks-hdr-*
        _.each (result.hdrs, (v, k) => {
          if (k == 'content-type') h[k] = v;
          else h['x-ks-hdr-' + k] = v;
        });

        res.set (h).send(result.payload);
        metric.labels ('rest', req.__q.ns(), req.__q.name(), 'ok').inc ();
      }
    });

    // check if (res.finished)
    res.on('close', () => {
      if (!res.finished) {
        q.cancel(tid);
      }
    });

    res.on('aborted', () => {
      if (!res.finished) {
        q.cancel(tid);
      }
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _cancel_pop (req, res) {
    var q = req.__q;
    var opts = {};

    var cdata = q.cancel(req.params.tid, opts);
    res.send(cdata);
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _commit (req, res) {
    var q = req.__q;

    q.ok(req.params.id, (err, ret) => {
      if (err) {
        context.metrics.keuss_q_commit.labels ('rest', req.__q.ns(), req.__q.name(), 'ko').inc ();
        return res.status(500).send(err);
      }

      if (!ret) {
        context.metrics.keuss_q_commit.labels ('rest', req.__q.ns(), req.__q.name(), 'notfound').inc ();
        return res.status(404).send('id ' + req.params.id + ' cannot be committed');
      }

      res.send({});
      context.metrics.keuss_q_commit.labels ('rest', req.__q.ns(), req.__q.name(), 'ok').inc ();
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _remove (req, res) {
    var q = req.__q;

    q.remove (req.params.id, (err, ret) => {
      if (err) {
        return res.status(500).send(err);
      }

      if (!ret) {
        return res.status(404).send('id ' + req.params.id + ' cannot be committed');
      }
      
      res.status(204).end();
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _rollback (req, res) {
    var q = req.__q;
    var delay_str = (req.query || {}).delay;
    var delay = delay_str ? parseInt (delay_str) : 0;
    var next_t = new Date().getTime () + delay;

    q.ko(req.params.id, next_t, (err, ret) => {
      if (err) {
        context.metrics.keuss_q_rollback.labels ('rest', req.__q.ns(), req.__q.name(), 'ko').inc ();
        return res.status(500).send(err);
      }

      if (ret == 'deadletter') {
        context.metrics.keuss_q_rollback.labels ('rest', req.__q.ns(), req.__q.name(), 'notfound').inc ();
        return res.status(301).set ({'location': 'deadletter'}).send('id ' + req.params.id + ' moved to deadletter');
      }
      
      if (!ret) {
        context.metrics.keuss_q_rollback.labels ('rest', req.__q.ns(), req.__q.name(), 'notfound').inc ();
        return res.status(404).send('id ' + req.params.id + ' cannot be rolled back: not found');
      }

      res.send({});
      context.metrics.keuss_q_rollback.labels ('rest', req.__q.ns(), req.__q.name(), 'ok').inc ();
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _pause (req, res) {
    var q = req.__q;
    q.pause (true);
    res.status(201).end();
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _resume (req, res) {
    var q = req.__q;
    q.pause (false);
    res.status(201).end();
  }


  var router = express.Router();


  router.param ('namespace', (req, res, next, namespace) => {
    const __namespace = scope.namespace(namespace);
    if (!__namespace) {
      res.status(404).send('no such queue namespace [' + namespace + ']');
    } else {
      req.__namespace = __namespace;
      next();
    }
  });

  router.param ('q', (req, res, next, q) => {
    const ns = req.__namespace;
    const opts = _.pick(req.query || {}, ['group', 'groups']);

    scope.queue_from_ns (ns, q, opts, (err, q) => {
      req.__q = q;
      next(err);
    });
  });

  const json_mw = bodyParser.json ();
  const raw_mw =  bodyParser.raw ({type: () => true});

  router.get ('/',                        [json_mw], _get_queues);
  router.get ('/:namespace',              [json_mw], _get_queues_of_namespace);
  router.get ('/:namespace/:q/status',    [json_mw], _get_queue_status);
  router.get ('/:namespace/:q/consumers', [json_mw], _get_queue_consumers);
  router.get ('/:namespace/:q/paused',    [json_mw], _get_queue_paused);

  router.put  ('/:namespace/:q', [raw_mw], _push_in_queue);
  router.post ('/:namespace/:q', [raw_mw], _push_in_queue);
  router.get  ('/:namespace/:q', _pop_from_queue);

  router.delete ('/:namespace/:q/consumer/:tid', _cancel_pop);

  router.patch  ('/:namespace/:q/commit/:id',   _commit);
  router.patch  ('/:namespace/:q/rollback/:id', _rollback);
  router.delete ('/:namespace/:q/:id',          _remove);
  router.patch  ('/:namespace/:q/pause',        _pause);
  router.patch  ('/:namespace/:q/resume',       _resume);

  return router;
}

module.exports = get_router;
