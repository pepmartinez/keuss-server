var should =  require('should');
var async =   require('async');
var _ =       require('lodash');
var stompit = require('stompit');

var Stomp =   require ('../stomp');
var Scope =   require ('../Scope');

var stomp_server;

var stats_redis =  require('keuss/stats/redis');
var signal_redis = require('keuss/signal/redis-pubsub');

var stats_mongo =  require('keuss/stats/mongo');
var signal_mongo = require('keuss/signal/mongo-capped');

var config = {
  http: {
    users: {
      'test': 'toast'
    }
  },
  namespaces: {
    mongo_simple: {
      factory: 'mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test',
        pollInterval: 17000,
        stats: {
          provider: stats_mongo,
        },
        signaller: {
          provider: signal_mongo
        }
      }
    },
    mongo_pipeline: {
      factory: 'pl-mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test',
        pollInterval: 17000,
        stats: {
          provider: stats_mongo,
        },
        signaller: {
          provider: signal_mongo
        }
      }
    },
    mongo_tape: {
      factory: 'ps-mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test',
        pollInterval: 17000,
        stats: {
          provider: stats_mongo,
        },
        signaller: {
          provider: signal_mongo
        }
      }
    },
    redis_list: {
      factory: 'redis-list',
      config: {
        pollInterval: 17000,
        stats: {
          provider: stats_redis,
        },
        signaller: {
          provider: signal_redis
        }
      }
    },
    redis_oq: {
      factory: 'redis-oq',
      config: {
        pollInterval: 17000,
        stats: {
          provider: stats_redis,
        },
        signaller: {
          provider: signal_redis
        }
      }
    }
  }
};


//should.config.checkProtoEql = false;


function stompcl (cb) {
  var connectOptions = {
    'host': 'localhost',
    'port': 61613,
    'connectHeaders':{
      'host': '/',
      'login': 'username',
      'passcode': 'password',
      'heart-beat': '5000,6000'
    }
  };
   
  stompit.connect(connectOptions, cb);
}

function send_obj (scl, q, obj, cb) {
  var sendHeaders = {
    'destination': q,
    'content-type': 'application/json'
  };

  var frame = scl.send(sendHeaders, {onReceipt: cb});
  frame.write(JSON.stringify (obj));
  frame.end();
}


_.forEach([
  'redis_oq',
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape'
], function (namespace) {
  before (function (done) {
    var Log = require ('winston-log-space');
    Log.init ({level: {default: 'verbose'}}, done);
  });

  describe('STOMP reserve operations on queue namespace ' + namespace, function () {
    before(function (done) {
      var scope = new Scope ();
      scope.init (config, function (err) {
        if (err) return done (err);
        stomp_server = new Stomp (config, scope);
        stomp_server.run (done);
      });
    });

    after(function (done) {
      stomp_server.end (function () {
        setTimeout (done, 500);
      });
    });
    
    it('does push/reserve/commit ok', function (done) {
      var q = '/' + namespace + '/stomp_test_2';
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      stompcl (function (err, cl) {
        if (err) return done(err);

        var subscribeHeaders = {
          'destination': q,
          'ack': 'client-individual'
        };
        
        cl.subscribe(subscribeHeaders, function(err, message) {
          if (err) return done(err);
          
          message.readString ('utf-8', function (err, body) {
            if (err) return done(err);
            JSON.parse (body).should.eql (msg);
            cl.ack (message);
            cl.disconnect();
            done();
          });
        });

        // send it
        send_obj (cl, q, msg, function (r) {});
      });
    });

    it('does push/reserve/nack cycle (2 nacks, 1 ack) ok');
  });
});