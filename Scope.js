'use strict';

var async = require ('async');
var _ =     require ('lodash');
var util =  require ('util');

var Logger = require ('./Logger');

var logger = Logger.logger ('scope');

class Scope {
  //////////////////////////////
  constructor () {
    this._stats_providers = {};
    this._signal_providers = {};
    this._types = {};
  }


  //////////////////////////////
  type (t) {
    return this._types[t];
  }
  
  
  //////////////////////////////
  _init_stats_providers (config, cb) {
    _.forEach (config.stats, (v, k) => {
      var modul = require('keuss/stats/' + v.factory);
      this._stats_providers[k] = new modul (v.config);
      logger.info ('loaded stats provider [%s] (keuss/stats/%s)', k, v.factory);
    });

    cb ();
  }
  
  
  //////////////////////////////
  _init_signal_providers (config, cb) {
    _.forEach (config.signallers, (v, k) => {
      var modul = require('keuss/signal/' + v.factory);
      this._signal_providers[k] = new modul (v.config);
      logger.info ('loaded signal provider [%s] (keuss/signal/%s)', k, v.factory);
    });

    cb ();
  }


  //////////////////////////////
  _init_backends (config, cb) {
    var tasks = [];
    
    _.forEach (config.backends, (backend) => {
      if (backend.disable) {
        logger.info ('queue backend [%s] disabled, not loading', backend.factory);
        return;
      }
    
      tasks.push (cb => {
        var bk_module = require ('keuss/backends/' + backend.factory);

        var stats_provider = this._stats_providers [backend.config.stats || ''];

        if (stats_provider) {
          backend.config.stats = {provider: stats_provider};
        }

        var signal_provider = this._signal_providers [backend.config.signaller || ''];

        if (signal_provider) {
          backend.config.signaller = {provider: signal_provider};
        }

        bk_module (backend.config, (err, factory) => {
          if (err) {
            logger.info ('error initializing queue backend [%s]: %j', factory.type (), err);
            return cb (err);
          }

          this._types [factory.type ()] = {factory: factory, q_repo: new Map ()};
          logger.info ('loaded queue backend [%s] (keuss/backends/%s)', factory.type (), backend.factory);
          cb ();
        });
      });
    });

    tasks.push (cb => this.refresh (cb));
    
    async.series (tasks, cb);
  }


  //////////////////////////////
  init (config, cb) {
    var self = this;
    async.series ([
      function (cb) {self._init_stats_providers  (config, cb);},
      function (cb) {self._init_signal_providers (config, cb);},
      function (cb) {self._init_backends         (config, cb);}
    ], cb);
  }


  //////////////////////////////
  refresh (cb) {
    var tasks = [];
    var self = this;
    
    _.forEach (this._types, function (type_obj, type_name) {
      tasks.push (function (cb) {
        var bk = type_obj.factory;
        
        bk.recreate_topology (function (err, ql) {
          if (err) return cb (err);

          type_obj.q_repo.clear ();

          _.forEach (ql, function (v, k) {
            type_obj.q_repo.set (k, v);
            logger.info ('%s: added queue [%s]', type_name, k);
          });

          cb ();
        });
      });
    });
    
    async.series (tasks, cb);
  }
  
  
  //////////////////////////////
  queues () {
    var ret = {};
    
    _.forEach (this._types, function (type_obj, type_name) {
      type_obj.q_repo.forEach (function (q_obj, q_name) {
        ret [q_name + '@' + type_name] = q_obj;
      });
    });
    
    return ret;
  }
};

module.exports = Scope;
