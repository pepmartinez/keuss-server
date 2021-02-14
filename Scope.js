var async = require ('async');
var _ =     require ('lodash');
var util =  require ('util');
var Log =   require ('winston-log-space');

var logger = Log.logger ('scope');

class Scope {
  //////////////////////////////
  constructor () {
    this._stats_providers = {};
    this._signal_providers = {};
    this._q_namespaces = {};
  }


  //////////////////////////////
  namespaces () {
    return this._q_namespaces;
  }


  //////////////////////////////
  namespace (t) {
    return this._q_namespaces[t];
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
            logger.info ('error initializing queue namespace [%s]: %j', namespace_name, err);
            return cb (err);
          }

          this._q_namespaces [namespace_name] = {factory: factory, q_repo: new Map ()};
          logger.info ('loaded queue namespace [%s] (keuss/backends/%s)', namespace_name, namespace.factory);
          cb ();
        });
      });
    });

    tasks.push (cb => this.refresh (cb));

    async.series (tasks, cb);
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
  _create_metrics_g_global () {
    this._metrics = {};
    this._create_metric_gauge_q_global ('size',      'size of queue, only available elements');
    this._create_metric_gauge_q_global ('schedSize', 'elements in queue due in the future');
    this._create_metric_gauge_q_global ('totalSize', 'total size of queue (all elements)');
    this._create_metric_gauge_q_global ('resvSize',  'reserved elements in queue pending commit/rollback');
    this._create_metric_gauge_q_global ('next_t',    'delta time to next due element');
    this._create_metric_gauge_q_global ('put',       'elements inserted in queue');
    this._create_metric_gauge_q_global ('get',       'elements extracted from queue');
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

      if (_.isInteger (res.stats.put)) this._metrics.q_global_put.labels (q.ns(), q.name()).set (res.stats.put);
      if (_.isInteger (res.stats.get)) this._metrics.q_global_get.labels (q.ns(), q.name()).set (res.stats.get);

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
      cb => this._init_stats_providers  (config, cb),
      cb => this._init_signal_providers (config, cb),
      cb => this._init_backends         (config, cb),
    ], cb);
  }


  //////////////////////////////
  start (cb) {
    async.series ([
      cb => {
        this._create_metrics_g_global ();
        this._rqgm_timer = setInterval (() => this._refresh_q_global_metrics (), this._config.refresh_metrics_interval || 2000);
        cb ();
      }
    ], cb);
  }


  //////////////////////////////
  end (cb) {
    var tasks = [];

    _.each (this._q_namespaces, (v, k) => {
      tasks.push ((cb) => {
        logger.info (`closing backend ${k}`)
        v.q_repo.forEach ((q, qname) => {
          logger.info (`cancelling queue ${qname}`);
          // TODO drain queues
          q.cancel();
        });
        v.factory.close (cb);
      });
    });

    clearInterval (this._rqgm_timer);

    async.parallel (tasks, (err) => {
      logger.info ('all factories closed');
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
