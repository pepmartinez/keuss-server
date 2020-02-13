var should =  require('should');
var async =   require('async');
var _ =       require('lodash');
var stompit = require('stompit');
var Log =     require('winston-log-space');


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
        url: 'mongodb://localhost:27017/keuss-server-test__mongo',
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
        url: 'mongodb://localhost:27017/keuss-server-test__ps-mongo',
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
        url: 'mongodb://localhost:27017/keuss-server-test__pl-mongo',
        pollInterval: 17000,
        stats: {
          provider: stats_redis,
        },
        signaller: {
          provider: signal_redis
        }
      }
    },
    bucket_mongo: {
      factory: 'bucket-mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test__bucket-mongo',
        pollInterval: 17000,
        stats: {
          provider: stats_redis,
        },
        signaller: {
          provider: signal_redis
        }
      }
    },
    bucket_mongo_safe: {
      factory: 'bucket-mongo-safe',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test__bucket-mongo-safe',
        pollInterval: 17000,
        stats: {
          provider: stats_redis,
        },
        signaller: {
          provider: signal_redis
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



var promster = {
  register: {
    getSingleMetric: function () {return null;}
  },
  Gauge: class __Gauge__ {
    constructor() {}
    set () {}
  }
}


var metrics = {
};
_.forEach(['q_push', 'q_pop', 'q_reserve', 'q_commit', 'q_rollback'], i => {
  metrics['keuss_' + i] = {
    labels: function () {
      return {
        inc: function () {}
      };
    }
  };
});

_.forEach([
  'redis_oq',
  'redis_list',
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape',
  'bucket_mongo',
  'bucket_mongo_safe'
], function (namespace) {
  describe('STOMP push/pop operations on queue namespace ' + namespace, () => {

    before (done => async.series ([
//      cb => Log.init (cb),
      cb => {
        const Stomp = require ('../stomp');
        const Scope = require ('../Scope');

        var scope = new Scope ();
        scope.init (config, err  => {
          if (err) return cb (err);
          stomp_server = new Stomp (config, {scope, metrics, promster});
          stomp_server.run (cb);
        });
      }
    ], done));

    after(done => {
      stomp_server.end (() => setTimeout (done, 1000));
    });

    it('does push/pop ok, ack to auto', function (done) {
      var q = '/q/' + namespace + '/stomp_test_1';
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
          'ack': 'auto'
        };

        cl.subscribe(subscribeHeaders, function(err, message) {
          if (err) return done(err);

          message.readString ('utf-8', function (err, body) {
            if (err) return done(err);
            JSON.parse (body).should.eql (msg);
            cl.disconnect();
            done();
          });
        });

        // send it
        send_obj (cl, q, msg, function (r) {});
      });
    });

  });
});
