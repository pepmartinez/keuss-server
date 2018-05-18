var should =  require('should');
var async =   require('async');
var _ =       require('lodash');
var stompit = require('stompit');

var Stomp =   require ('../stomp');
var Scope =   require ('../Scope');

var stomp_server;

var stats_redis = require('keuss/stats/redis');
var signal_redis_pubsub = require('keuss/signal/redis-pubsub');

var config = {
  http: {
    users: {
      'test': 'toast'
    }
  },
  backends: [{
      factory: 'mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test',
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    {
      factory: 'pl-mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test',
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    {
      factory: 'redis-list',
      config: {
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    {
      factory: 'redis-oq',
      config: {
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    }
  ]
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
  'redis:oq',
  'redis:list',
  'mongo:simple',
  'mongo:pipeline'
], function (type) {
  describe('STOMP push/pop operations on queue type ' + type, function () {
    before(function (done) {
      var scope = new Scope ();
      scope.init (config, function (err) {
        if (err) return done (err);
        stomp_server = new Stomp (config, scope);
        stomp_server.run (done);
      });
    });

    after(function (done) {
      stomp_server.end (done);
    });

    it('does push/pop ok, ack to auto', function (done) {
      var q = '/' + type + '/stomp_test_1';
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