
'use strict';

var express = require ('express');
var async =   require ('async');
var _ =       require ('lodash');

var Config = require ('../config');


function ensure_queue (scope, req) {
  var type = req.__type || scope.type (req.param.type);
  var q = req.params.q;
  
  if (!type.q_repo.has (q)) {
    type.q_repo.set (q, new type.factory (q, Config.queues));
  }
  
  return type.q_repo.get (q);
}


function get_router (scope) 
{
  var router = express.Router();
  
  router.use ('/:type', function (req, res, next) {
    // 404 if no such type
    var type = scope.type (req.params.type);
    if (!type) {
      res.status(404).send ('no such queue type [' + req.params.type + ']');
    }
    else {
      req.__type = type;
      next ();
    }
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.get('/', function (req, res) {
    if (req.query.tree) {
      var queues = scope.queues ();
      var tasks = {};
      
      _.forEach (queues, function (q, qname) {
        tasks [qname] = function (cb) {q.status (cb)}
      });
      
      var hier = {};
      
      async.parallel (tasks, function (err, r) {
        _.forEach (r, function (q, qname) {
          if (!hier[q.type]) {
            hier[q.type] = {title: q.type, key: q.type, folder: true, expanded: true, children: []};
          }
          
          var ch = hier[q.type].children;
          ch.push ({
            title:  qname, 
            key:    qname,
            put:    q.stats.put,
            got:    q.stats.got,
            size:   q.size,
            total:  q.totalSize,
            sched:  q.schedsize,
            next_t: q.next_mature_t
          });
        });
        
        var final_res = [];
        
        _.forEach (hier, function (v, k) {
          final_res.push (v);
        });
        
        res.send (final_res);
      });
    }
    else if (req.query.array) {
      
      var queues = scope.queues ();
      var tasks = {};
      
      _.forEach (queues, function (q, qname) {
        tasks [qname] = function (cb) {q.status (cb)}
      });
      
      async.parallel (tasks, function (err, r) {
        var final_res = [];
        _.forEach (r, function (q, qname) {
          q.id = qname;
          final_res.push (q);
        });
          
        res.send ({data: final_res});
      });
    }
    else {
      var queues = scope.queues ();
      var tasks = {};
      
      _.forEach (queues, function (q, qname) {
        tasks [qname] = function (cb) {q.status (cb)}
      });
      
      async.parallel (tasks, function (err, r) {
        res.send (r);
      });
    }
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.get('/:type', function (req, res) {
    var tasks = {};

    for (let entry of req.__type.q_repo) {
      tasks[entry [0]] = function (cb) {entry [1].status (cb)};
    }
    
    async.parallel (tasks, function (err, r) {
      res.send (r);
    });
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.get('/:type/:q/status', function (req, res) {
    var q = ensure_queue (scope, req);

    q.status (function (err, r) {
      res.send (r);
    });
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.get('/:type/:q/consumers', function (req, res) {
    var q = ensure_queue (scope, req);
    res.send (q.consumers ()); 
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.put ('/:type/:q', function (req, res) {
    var q = ensure_queue (scope, req);
    var opts = req.query || {};
    
    q.push (req.body || req.text, opts, function (err, id) {
      if (err) {
        res.status(500).send (err);
      }
      else{
        res.send ({id: id});
      }
    });
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.get ('/:type/:q', function (req, res) {
    var q = ensure_queue (scope, req);
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
    
    var tid = q.pop (cid, opts, function (err, result) {
      if (err) {
        if (err.timeout) {
          res.status(504);
          res.statusMessage = 'Queue Pop Timeout';
          res.send (err);
        }
        else {
          res.status(500).send (err);
        }
      }
      else{
        res.send (result);
      }
    });
    
    // check if (res.finished)
    res.on ('close', function () {
//      console.log ('res is closed');
      
      if (!res.finished) {
//        console.log ('cancelling ' + tid);
        q.cancel (tid);
      }
    });
    
    res.on ('aborted', function () {
//      console.log ('res is aborted');
      
      if (!res.finished) {
//        console.log ('cancelling ' + tid);
        q.cancel (tid);
      }
    });
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.delete ('/:type/:q/consumer/:tid', function (req, res) {
    var q = ensure_queue (scope, req);
    var opts = {};
    
    var cdata = q.cancel (req.params.tid, opts);
    res.send (cdata);
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.patch ('/:type/:q/commit/:id', function (req, res) {
    var q = ensure_queue (scope, req);
    
    q.ok (req.params.id, function (err, ret) {
      if (err) {
        return res.status(500).send (err);
      }
      
      if (!ret) {
        return res.status(404).send ('id ' + req.params.id + ' cannot be committed');
      }
      
      res.send ({});
    });
  });
  
  
  /////////////////////////////////////////////////////////////////////////////
  router.patch ('/:type/:q/rollback/:id', function (req, res) {
    var q = ensure_queue (scope, req);
    
    q.ko (req.params.id, function (err, ret) {
      if (err) {
        return res.status(500).send (err);
      }
      
      if (!ret) {
        return res.status(404).send ('id ' + req.params.id + ' cannot be rolled back');
      }
      
      res.send ({});
    });
  });
  
  
  return router;
}

module.exports = get_router;

