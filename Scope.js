'use strict';

var async =  require ('async');
var _ =      require ('lodash');

var Logger = require ('./Logger');

var logger = Logger ('scope');

class Scope {
  //////////////////////////////
  constructor () {
    this._types = {};
  }


  //////////////////////////////
  type (t) {
    return this._types[t];
  }
  
  
  //////////////////////////////
  init (config, cb) {
    var tasks = [];
    var self = this;
    
    config.backends.forEach (function (backend) {
      if (backend.disable) {
        logger.info ('queue backend [%s] disabled, not loading', backend.factory);
        return;
      }
    
      tasks.push (function (cb) {
        var bk_module = require ('keuss/backends/' + backend.factory);

        bk_module (backend.config, function (err, factory) {
          if (err) {
            logger.info ('error initializing queue backend [%s]: %j', factory.type (), err);
            return cb (err);
          }

          self._types [factory.type ()] = {factory: factory, q_repo: new Map ()};
          logger.info ('queue backend [%s] loaded as [%s]', backend.factory, factory.type ());
          cb ();
        });
      });
    });

    tasks.push (function (cb) {
      self.refresh (cb);
    });
    
    async.series (tasks, cb);
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
