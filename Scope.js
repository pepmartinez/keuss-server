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


  //////////////////////////////
  init (config, cb) {
    async.series ([
      cb => this._init_stats_providers  (config, cb),
      cb => this._init_signal_providers (config, cb),
      cb => this._init_backends         (config, cb)
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
