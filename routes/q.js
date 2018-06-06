'use strict';

var express = require('express');
var async = require('async');
var _ = require('lodash');


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues_tree(scope, req, res) {
  var queues = scope.queues();
  var tasks = {};

  _.forEach(queues, function (q, qname) {
    tasks[qname] = function (cb) {
      q.status(cb)
    }
  });

  var hier = {};

  async.parallel(tasks, function (err, r) {
    _.forEach(r, function (q, qname) {
      if (!hier[q.type]) {
        hier[q.type] = {
          title: q.type,
          key: q.type,
          folder: true,
          expanded: true,
          children: []
        };
      }

      var ch = hier[q.type].children;
      ch.push({
        title: qname,
        key: qname,
        put: q.stats.put,
        got: q.stats.got,
        size: q.size,
        total: q.totalSize,
        sched: q.schedsize,
        next_t: q.next_mature_t
      });
    });

    var final_res = [];

    _.forEach(hier, function (v, k) {
      final_res.push(v);
    });

    res.send(final_res);
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues_array(scope, req, res) {
  var queues = scope.queues();
  var tasks = {};


  _.forEach(queues, function (q, qname) {
    tasks[qname] = function (cb) {
      q.status(cb)
    }
  });

  async.parallel(tasks, function (err, r) {
    var final_res = [];
    _.forEach(r, function (q, qname) {
      q.id = qname;
      final_res.push(q);
    });

    res.send({
      data: final_res
    });
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues_plain(scope, req, res) {
  var queues = scope.queues();
  var tasks = {};

  _.forEach(queues, function (q, qname) {
    tasks[qname] = function (cb) {
      q.status(cb)
    }
  });

  async.parallel(tasks, function (err, r) {
    res.send(r);
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_queues(scope, req, res) {
  if (req.query.tree) {
    _list_queues_tree(scope, req, res);
  } else if (req.query.array) {
    _list_queues_array(scope, req, res);
  } else {
    _list_queues_plain(scope, req, res);
  }
}


//////////////////////////////////////////////////////////////////////////////////////
function _reload_list_queues(scope, req, res) {
  scope.refresh(function () {
    _list_queues(scope, req, res);
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function get_router(config, scope) {

  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queues(req, res) {
    if (req.query.reload) {
      _reload_list_queues(scope, req, res);
    } else {
      _list_queues(scope, req, res);
    }
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queues_of_type(req, res) {
    var tasks = {};

    for (let entry of req.__type.q_repo) {
      tasks[entry[0]] = function (cb) {
        entry[1].status(cb)
      };
    }

    async.parallel(tasks, function (err, r) {
      res.send(r);
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queue_status(req, res) {
    var q = req.__q;

    q.status(function (err, r) {
      if (err) res.status(500).send(err);
      res.send(r);
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_queue_consumers(req, res) {
    var q = req.__q;
    res.send(q.consumers());
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _push_in_queue(req, res) {
    var q = req.__q;
    var opts = req.query || {};

    q.push(req.body || req.text, opts, function (err, id) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send({
          id: id
        });
      }
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _pop_from_queue(req, res) {
    var q = req.__q;
    var opts = {};
    var cid = req.ip + '-' + new Date().getTime();

    if (req.query.to) {
      opts.timeout = req.query.to;
    }

    if (req.query.tid) {
      opts.tid = req.query.tid;
    }

    if (req.query.reserve) {
      opts.reserve = true;
    }

    var tid = q.pop(cid, opts, function (err, result) {
      if (err) {
        if (err.timeout) {
          res.status(504);
          res.statusMessage = 'Queue Pop Timeout';
          res.send(err);
        } else {
          res.status(500).send(err);
        }
      } else {
        res.send(result);
      }
    });

    // check if (res.finished)
    res.on('close', function () {
      if (!res.finished) {
        //        console.log ('cancelling ' + tid);
        q.cancel(tid);
      }
    });

    res.on('aborted', function () {
      if (!res.finished) {
        //        console.log ('cancelling ' + tid);
        q.cancel(tid);
      }
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _cancel_pop(req, res) {
    var q = req.__q;
    var opts = {};

    var cdata = q.cancel(req.params.tid, opts);
    res.send(cdata);
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _commit(req, res) {
    var q = req.__q;

    q.ok(req.params.id, function (err, ret) {
      if (err) {
        return res.status(500).send(err);
      }

      if (!ret) {
        return res.status(404).send('id ' + req.params.id + ' cannot be committed');
      }

      res.send({});
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _rollback(req, res) {
    var q = req.__q;
    var delay_str = (req.query || {}).delay;
    var delay = delay_str ? parseInt (delay_str) : 0;
    var next_t = new Date().getTime () + delay; 

    q.ko(req.params.id, next_t, function (err, ret) {
      if (err) {
        return res.status(500).send(err);
      }

      if (!ret) {
        return res.status(404).send('id ' + req.params.id + ' cannot be rolled back');
      }

      res.send({});
    });
  }


  var router = express.Router();

  
  router.param('type', function (req, res, next, type) {
    var __type = scope.type(type);
    if (!__type) {
      res.status(404).send('no such queue type [' + type + ']');
    } else {
      req.__type = __type;
      next();
    }
  });

  router.param('q', function (req, res, next, q) {
    var type = req.__type;

    if (!type.q_repo.has(q)) {
      type.q_repo.set(q, type.factory.queue(q, {}));
    }

    req.__q = type.q_repo.get(q);
    next();
  });

  router.get('/', _get_queues);
  router.get('/:type', _get_queues_of_type);
  router.get('/:type/:q/status', _get_queue_status);
  router.get('/:type/:q/consumers', _get_queue_consumers);

  router.put('/:type/:q', _push_in_queue);
  router.post('/:type/:q', _push_in_queue);
  router.get('/:type/:q', _pop_from_queue);

  router.delete('/:type/:q/consumer/:tid', _cancel_pop);

  router.patch('/:type/:q/commit/:id', _commit);
  router.patch('/:type/:q/rollback/:id', _rollback);

  return router;
}

module.exports = get_router;