const async = require ('async');
const _ =     require ('lodash');
const util =  require ('util');
const Log =   require ('winston-log-space');

const Exchange = require ('./lib/exchange/Exchange');

const logger = Log.logger ('scope');

class Scope {
  //////////////////////////////
  constructor () {
    this._stats_providers = {};
    this._signal_providers = {};
    this._q_namespaces = {};
    this._exchanges = {};

    /*
      namespaces store:
      _q_namespaces: map(string) of 
        factory:    QueueFactory
        q_repo:     map(string) of Queue : canonical Queue object for its name
        q_cl_repo:  map(string) of Queue : alternate Queue objects (used for different incarnations)
    */
  }


  //////////////////////////////
  namespaces () {
    return this._q_namespaces;
  }


  //////////////////////////////
  exchanges () {
    return this._exchanges;
  }


  //////////////////////////////
  namespace (t) {
    return this._q_namespaces[t];
  }


  //////////////////////////////
  exchange (t) {
    return this._exchanges[t];
  }


  //////////////////////////////////////////////////
  notify_creation_of_exchange (ev) {
    // check if existent
    if (this.exchange (ev.name)) throw {c: 409, t: `exchange ${ev.name} already exists`};

    // validate decl
    const v_error = Exchange.validate_config (ev.decl);
    if (v_error) throw {c: 400, t: v_error};

    // get ns of src queue
    const ns = ev.decl.src.ns;
    const src_ns = this.namespace (ns);

    // must exist
    if (!src_ns) throw {c: 404, t: `namespace ${ns} not defined`};

    // emit creation on the ns of the src queue; actual creation happens at the event's handler
    src_ns.factory._signaller_factory.emit_extra (ns, 'exchanges/create', ev);
    logger.info ('emitted event [%j] to exchanges/create on ns [%s]', ev, ns);
  }


  //////////////////////////////////////////////////
  notify_deletion_of_exchange (ev) {
    // check if existent
    const x = this.exchange (ev.name)
    if (!x) throw {c: 404, t: `exchange ${ev.name} does not exist`};

    const ns = x._qconsumer._src.ns();
    const sf = x._qconsumer._src._factory._signaller_factory;

    sf.emit_extra (ns, 'exchanges/delete', ev);
    logger.info ('emitted event [%j] to exchanges/delete on ns [%s]', ev, ns);
  }


  //////////////////////////////////////////////////
  notify_start_of_exchange (ev) {
    // check if existent
    const x = this.exchange (ev.name)
    if (!x) throw {c: 404, t: `exchange ${ev.name} does not exist`};

    const ns = x._qconsumer._src.ns();
    const sf = x._qconsumer._src._factory._signaller_factory;

    sf.emit_extra (ns, 'exchanges/start', ev);
    logger.info ('emitted event [%j] to exchanges/start on ns [%s]', ev, ns);
  }


  //////////////////////////////////////////////////
  notify_stop_of_exchange (ev) {
    // check if existent
    const x = this.exchange (ev.name)
    if (!x) throw {c: 404, t: `exchange ${ev.name} does not exist`};

    const ns = x._qconsumer._src.ns();
    const sf = x._qconsumer._src._factory._signaller_factory;

    sf.emit_extra (ns, 'exchanges/stop', ev);
    logger.info ('emitted event [%j] to exchanges/stop on ns [%s]', ev, ns);
  }


  //////////////////////////////
  queue_from_ns (ns, qname, opts, cb) {
    let key = null;
    if (opts) key = qname + JSON.stringify (opts);

    const tasks = [];

    if (!ns.q_repo.has (qname)) {
      // canonical queue does not exist, create it async
      tasks.push (cb => {
        ns.factory.queue (qname, (err, q) => {
          if (err) return cb (err);
          ns.q_repo.set (qname, q);
          logger.verbose ('created canonical queue [%s@%s] ondemand', qname, ns.factory.name());
          cb();
        })
      })
    }

    if (key) {
      if (!ns.q_cl_repo.has (key)) {
        // alternate queue does not exist, create it async
        tasks.push (cb => {
          ns.factory.queue (qname, opts, (err, q) => {
            if (err) return cb (err);
            ns.q_cl_repo.set (key, q);
            logger.verbose ('created alternate queue [%s@%s] ondemand', key, ns.factory.name());
            cb();
          })
        })
      }
    }

    async.series (tasks, err => {
      if (err) return cb (err);
      if (key) return cb (null, ns.q_cl_repo.get (key));
      return cb (null, ns.q_repo.get (qname));
    });
  }


  //////////////////////////////
  create_exchange (name, exchange_decl, cb) {
    // ensure it does not exist
    if (this._exchanges[name]) {
      logger.warn ('create_exchange: exchange [%s] does exist, ignoring creation', ev.name);
      return cb ();
    }

    if (exchange_decl.disable) {
      logger.info ('exchange [%s] disabled, ignored', name);
      return cb ();
    }

    logger.info ('creating exchange [%s]', name);
    const ex = new Exchange (name, exchange_decl, this._context);

    ex.init (err => {
      if (err) {
        logger.error ('could not initialize exchange [%s]: %s', name, err.toString());
        return cb (err);
      }

      logger.info ('initialized exchange [%s]', name);
      this._exchanges[name] = ex;
      cb()
    });
  }


  //////////////////////////////
  _init_stats_providers (config, cb) {
    _.forEach (config.stats, (v, k) => {
      var modul = require('keuss/stats/' + v.factory);

      this._stats_providers[k] = {
        m: modul,
        cfg: v.config
      };

      logger.info ('loaded stats provider [%s] (keuss/stats/%s)', k, v.factory);
    });

    cb ();
  }


  //////////////////////////////
  _init_signal_providers (config, cb) {
    _.forEach (config.signallers, (v, k) => {
      var modul = require('keuss/signal/' + v.factory);

      this._signal_providers[k] = {
        m: modul,
        cfg: v.config
      };

      logger.info ('loaded signal provider [%s] (keuss/signal/%s)', k, v.factory);
    });

    cb ();
  }


  //////////////////////////////
  _init_backends (config, cb) {
    var tasks = [];

    _.forEach (config.namespaces, (namespace, namespace_name) => {
      if (namespace.disable) {
        logger.info ('queue namespace [%s] disabled, not loading', namespace_name);
        return;
      }

      tasks.push (cb => {
        var bk_module = require ('keuss/backends/' + namespace.factory);
        var stats_provider = this._stats_providers [namespace.config.stats || ''];

        if (stats_provider) {
          namespace.config.stats = {
            provider: stats_provider.m,
            opts:     stats_provider.cfg
          };
        }

        var signal_provider = this._signal_providers [namespace.config.signaller || ''];

        if (signal_provider) {
          namespace.config.signaller = {
            provider: signal_provider.m,
            opts:     signal_provider.cfg
          };
        }

        var bk_opts = {name: namespace_name};
        _.merge (bk_opts, namespace.config);

        bk_module (bk_opts, (err, factory) => {
          if (err) {
            logger.info ('error initializing queue namespace [%s]: %s', namespace_name, err.toString ());
            return cb (err);
          }

          this._q_namespaces [namespace_name] = {factory: factory, q_repo: new Map (), q_cl_repo: new Map ()};
          logger.info ('loaded queue namespace [%s] (keuss/backends/%s)', namespace_name, namespace.factory);
          cb ();
        });
      });
    });

    tasks.push (cb => this.refresh (cb));

    async.series (tasks, cb);
  }


  //////////////////////////////
  _init_exchanges (config, cb) {
    const tasks = [];

    _.forEach (config.exchanges, (exchange, exchange_name) => {
      tasks.push (cb => this.create_exchange (exchange_name, exchange, cb));
    });

    tasks.push (cb => this.refresh (cb));

    async.series (tasks, cb);
  }


  //////////////////////////////////////////////////
  _subscribe_to_exchanges (cb) {
    _.each (this._q_namespaces, (v, k) => {
      v.factory._signaller_factory.subscribe_extra (k, 'exchanges/create', ev => this._on_exchange_create_event (ev));
      logger.info ('subscribed to exchange/create on ns [%s]', k);

      v.factory._signaller_factory.subscribe_extra (k, 'exchanges/delete', ev => this._on_exchange_delete_event (ev));
      logger.info ('subscribed to exchange/delete on ns [%s]', k);

      v.factory._signaller_factory.subscribe_extra (k, 'exchanges/start', ev => this._on_exchange_start_event (ev));
      logger.info ('subscribed to exchange/start on ns [%s]', k);

      v.factory._signaller_factory.subscribe_extra (k, 'exchanges/stop', ev => this._on_exchange_stop_event (ev));
      logger.info ('subscribed to exchange/stop on ns [%s]', k);
    });

    cb ();
  }


  //////////////////////////////////////////////////
  _on_exchange_create_event (ev) {
    logger.verbose ('got exchange/create event %j', ev);

    try {
      this.create_exchange (ev.name, ev.decl, (err, xchg) => {
        if (err) return logger.error ('error when creating exchange %j: %s', ev, err.toString ());

        logger.info ('created exchange %j', ev);

        xchg.start (err => {
          if (err) {
            logger.error ('error when starting exchange %j: %s', ev, err.toString ());
          }
          else {
            logger.info ('started exchange %j', ev);
          }
        });
      });
    }
    catch (e) {
      logger.warn ('on exchange/create event %j: exchange creation failed, %j', ev, e);
    }
  }


  //////////////////////////////////////////////////
  _on_exchange_delete_event (ev) {
    logger.verbose ('got exchange/delete event %j', ev);

    const x = this._exchanges[ev.name];
    delete this._exchanges[ev.name];

    if (!x) return logger.warn ('_on_exchange_delete_event: exchange [%s] does not exist', ev.name);

    try {
      x.end (err => {
        if (err) logger.error ('while closing exchange %s: %s', ev.name, err.toString ());
        logger.info ('exchange %s closed', ev.name);
      });
    }
    catch (e) {
      logger.warn ('on exchange/delete event %j: exchange deletion failed, %j', ev, e);
    }
  }


  //////////////////////////////////////////////////
  _on_exchange_start_event (ev) {
    logger.verbose ('got exchange/start event %j', ev);

    const x = this._exchanges[ev.name];

    if (!x) return logger.warn ('_on_exchange_start_event: exchange [%s] does not exist', ev.name);

    try {
      x.start (err => {
        if (err) logger.error ('while starting exchange %s: %s', ev.name, err.toString ());
        logger.info ('exchange %s started', ev.name);
      });
    }
    catch (e) {
      logger.warn ('on exchange/start event %j: exchange start failed, %j', ev, e);
    }
  }


  //////////////////////////////////////////////////
  _on_exchange_stop_event (ev) {
    logger.verbose ('got exchange/stop event %j', ev);

    const x = this._exchanges[ev.name];

    if (!x) return logger.warn ('_on_exchange_stop_event: exchange [%s] does not exist', ev.name);

    try {
      x.end (err => {
        if (err) logger.error ('while stopping exchange %s: %s', ev.name, err.toString ());
        logger.info ('exchange %s stopped', ev.name);
      });
    }
    catch (e) {
      logger.warn ('on exchange/stop event %j: exchange stop failed, %j', ev, e);
    }
  }


  //////////////////////////////////////////////////
  _create_metric_gauge_q_global (id, help) {
    let the_metric = this._context.promster.register.getSingleMetric('q_global_' + id);

    if (the_metric) {
      this._metrics['q_global_' + id] = the_metric;
    }
    else {
      this._metrics['q_global_' + id] = new this._context.promster.Gauge ({
        name: 'q_global_' + id,
        help: help,
        labelNames: ['ns', 'q']
      });
    }
  }


  //////////////////////////////////////////////////
  _create_metric_counter_q_global (id, help) {
    let the_metric = this._context.promster.register.getSingleMetric('q_global_' + id);

    if (the_metric) {
      this._metrics['q_global_' + id] = the_metric;
    }
    else {
      this._metrics['q_global_' + id] = new this._context.promster.Counter ({
        name: 'q_global_' + id,
        help: help,
        labelNames: ['ns', 'q']
      });
    }
  }


  //////////////////////////////////////////////////
  _create_metrics_g_global () {
    this._metrics = {};
    this._create_metric_gauge_q_global ('size',      'size of queue, only available elements');
    this._create_metric_gauge_q_global ('schedSize', 'elements in queue due in the future');
    this._create_metric_gauge_q_global ('totalSize', 'total size of queue (all elements)');
    this._create_metric_gauge_q_global ('resvSize',  'reserved elements in queue pending commit/rollback');
    this._create_metric_gauge_q_global ('next_t',    'delta time to next due element');
    this._create_metric_gauge_q_global ('put',       'elements inserted in queue');
    this._create_metric_gauge_q_global ('get',       'elements extracted from queue');
    this._create_metric_gauge_q_global ('reserve',   'elements reserved from queue');
    this._create_metric_gauge_q_global ('commit',    'elements committed at queue');
    this._create_metric_gauge_q_global ('rollback',  'elements rolled back at queue');
  }


  //////////////////////////////////////////////////
  _refresh_q_global_metrics_for_queue (q, cb) {
    async.parallel ({
      size:          cb => q.size (cb),
      totalSize:     cb => q.totalSize (cb),
      schedSize:     cb => q.schedSize (cb),
      resvSize:      cb => q.resvSize (cb),
      stats:         cb => q.stats(cb),
      next_t:        cb => q.next_t (cb),
    }, (err, res) => {
      if (err) return cb (err);
      this._metrics.q_global_size.labels (q.ns(), q.name()).set (res.size);
      this._metrics.q_global_totalSize.labels (q.ns(), q.name()).set (res.totalSize);
      this._metrics.q_global_schedSize.labels (q.ns(), q.name()).set (res.schedSize);

      if (_.isInteger (res.stats.put))      this._metrics.q_global_put.labels      (q.ns(), q.name()).set (res.stats.put);
      if (_.isInteger (res.stats.get))      this._metrics.q_global_get.labels      (q.ns(), q.name()).set (res.stats.get);
      if (_.isInteger (res.stats.reserve))  this._metrics.q_global_reserve.labels  (q.ns(), q.name()).set (res.stats.reserve);
      if (_.isInteger (res.stats.commit))   this._metrics.q_global_commit.labels   (q.ns(), q.name()).set (res.stats.commit);
      if (_.isInteger (res.stats.rollback)) this._metrics.q_global_rollback.labels (q.ns(), q.name()).set (res.stats.rollback);

      const delta = res.next_t ? (res.next_t.getTime() - new Date ().getTime ()) : 0;
      this._metrics.q_global_next_t.labels (q.ns(), q.name()).set (delta);

      if (_.isInteger (res.resvSize)) this._metrics.q_global_resvSize.labels (q.ns(), q.name()).set (res.resvSize);
      cb ();
    });
  }


  //////////////////////////////
  _refresh_q_global_metrics () {
    var tasks = [];

    _.each (this._q_namespaces, ns => {
       ns.q_repo.forEach (q => {
        tasks.push (cb => this._refresh_q_global_metrics_for_queue (q, cb))
      });
    });

    async.parallel (tasks, err => {
      if (err) return logger.error ('while refreshing q_global metrics: %j', err);
    });
  }


  //////////////////////////////
  init (config, context, cb) {
    this._context = context;
    this._config = config;

    async.series ([
      cb => this._init_stats_providers   (config, cb),
      cb => this._init_signal_providers  (config, cb),
      cb => this._init_backends          (config, cb),
      cb => this._init_exchanges         (config, cb),
      cb => this._subscribe_to_exchanges (cb),
    ], cb);
  }


  //////////////////////////////
  _start_exchanges (cb) {
    var tasks = [];

    _.each (this._exchanges, (v, k) => {
      tasks.push (cb => {
        logger.info (`starting exchange ${k}`);
        v.start (cb);
      });
    });

    async.parallel (tasks, err => {
      logger.info ('all exchanges started');
      cb (err);
    });
  }


  //////////////////////////////
  start (cb) {
    async.series ([
      cb => {
        this._create_metrics_g_global ();
        this._rqgm_timer = setInterval (() => this._refresh_q_global_metrics (), this._config.refresh_metrics_interval || 2000);
        cb ();
      },
      cb => this._start_exchanges (cb),
    ], cb);
  }


  //////////////////////////////
  end (cb) {
    clearInterval (this._rqgm_timer);

    async.series ([
      cb => this._end_exchanges (cb),
      cb => this._end_namespaces (cb),
    ], cb);
  }


  //////////////////////////////
  _end_namespaces (cb) {
    var tasks = [];

    _.each (this._q_namespaces, (v, k) => {
      tasks.push (cb => {
        logger.info (`closing backend ${k}`);

        v.q_repo.forEach ((q, qname) => {
          logger.info (`cancelling queue ${qname}`);
          // TODO drain queues
          q.cancel();
        });

        v.q_cl_repo.forEach ((q, qname) => {
          logger.info (`cancelling queue ${qname}`);
          // TODO drain queues
          q.cancel();
        });

        v.factory.close (cb);
      });
    });

    async.parallel (tasks, err => {
      logger.info ('all factories closed');
      cb (err);
    });
  }


  //////////////////////////////
  _end_exchanges (cb) {
    var tasks = [];

    _.each (this._exchanges, (v, k) => {
      tasks.push (cb => {
        logger.info (`closing exchange ${k}`);
        v.end (cb);
      });
    });

    async.parallel (tasks, err => {
      logger.info ('all exchanges closed');
      cb (err);
    });
  }


  //////////////////////////////
  drain (cb) {
    var tasks = [];
    _.each (this._q_namespaces, (v, k) => {
      v.q_repo.forEach ((q, qname) => {
        tasks.push ((cb) => {
          logger.info (`draining queue ${qname}`);
          q.drain( cb);
        });
      });

      v.q_cl_repo.forEach ((q, qname) => {
        tasks.push ((cb) => {
          logger.info (`draining queue ${qname}`);
          q.drain( cb);
        });
      });
    });

    async.parallel (tasks, (err) => {
      logger.info ('all queus drained');
      cb (err);
    });
  }


  //////////////////////////////
  refresh (cb) {
    var tasks = [];

    _.forEach (this._q_namespaces, (ns_obj, ns_name) => {
      tasks.push (cb => {
        var bk = ns_obj.factory;

        bk.recreate_topology ((err, ql) => {
          if (err) return cb (err);

          ns_obj.q_repo.clear ();

          _.forEach (ql, (v, k) => {
            ns_obj.q_repo.set (k, v);
            logger.info ('%s: added queue [%s]', ns_name, k);
          });

          cb ();
        });
      });
    });

    async.series (tasks, cb);
  }


  //////////////////////////////
  queues (ns) {
    var ret = {};

    if (!ns) {
      _.forEach (this._q_namespaces, (qns, ns) => {
        qns.q_repo.forEach ((q_obj, q_name) => ret [q_name + '@' + ns] = q_obj);
      });
    }
    else {
      _.forEach (this._q_namespaces[ns], (q_obj, q_name) => ret [q_name] = q_obj);
    }

    return ret;
  }
};

module.exports = Scope;
