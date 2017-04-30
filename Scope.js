'use strict';

var async =   require ('async');
var _ =       require ('lodash');

var WithLog = require ('./WithLog');
var Config =  require ('./config');


class Scope extends WithLog {
  //////////////////////////////
  constructor (opts) {
  //////////////////////////////
    super (opts);
    
    this._types = {
    };
  }


  //////////////////////////////
  type (t) {
  //////////////////////////////
    return this._types[t];
  }
  
  
  //////////////////////////////
  init (cb) {
  //////////////////////////////
    var tasks = [];
    var self = this;
    
    Config.backends.forEach (function (backend) {
      if (backend.disable) {
        self._info ('queue backend [%s] disabled, not loading', backend.factory);
        return;
      }
    
      tasks.push (function (cb) {
        var bk_module = require ('keuss/backends/' + backend.factory);

        bk_module (backend.config, function (err, factory) {
          if (err) {
            self._info ('error initializing queue backend [%s]: %j', factory.type (), err);
            return cb (err);
          }

          self._types [factory.type ()] = {factory: factory, q_repo: new Map ()};
          self._info ('queue backend [%s] loaded as [%s]', backend.factory, factory.type ());
          cb ();
        });
      });
    });
    
    async.series (tasks, cb);
  }


  //////////////////////////////
  refresh (cb) {
  //////////////////////////////
    var tasks = [];
    var self = this;
    
    _.forEach (this._types, function (type_obj, type_name) {
      tasks.push (function (cb) {
        var bk = type_obj.factory;

        // init q_repo from colls in db
        bk.list (function (err, colls) {
          for (let i = 0; i < colls.length; i++) {
            let qname = colls[i];

            if (!type_obj.q_repo.get (qname)) {
              type_obj.q_repo.set (qname, bk.queue (qname, Config.queues));
              self._info ('%s: added queue [%s]', type_name, qname);
            }
          }
          
          cb ();
        });
      });
    });
    
    async.series (tasks, cb);
  }
  
  
  //////////////////////////////
  queues () {
  /////////////////////////////
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
