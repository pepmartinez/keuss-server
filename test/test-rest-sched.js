var should = require('should');
var async = require('async');
var request = require('supertest');
var _ = require('lodash');

var BaseApp = require ('../app');
var Scope =   require ('../Scope');

var theApp;

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


function put_msg(namespace, q, msg, cb) {
  request(theApp)
    .put('/q/' + namespace + '/' + q)
    .send(msg)
    .auth('test', 'toast')
    .expect(200)
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function put_msg_delayed(namespace, q, msg, delay, cb) {
  request(theApp)
    .put('/q/' + namespace + '/' + q)
    .query({
      delay: delay
    })
    .send(msg)
    .auth('test', 'toast')
    .expect(200)
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function get_msg(namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function get_msg_timeout(namespace, q, timeout, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query({
      to: timeout
    })
    .expect(504)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
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
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape',
  'bucket_mongo_safe'
], function (namespace) {
  describe('REST scheduled operations on queue namespace ' + namespace, function () {
    before(function (done) {
      var scope = new Scope ();
      scope.init (config, function (err) {
        if (err) return done (err);
        BaseApp(config, {scope, metrics}, function () {}, function (err, app) {
          theApp = app;
          done(err);
        });
      });
    });

    after(function (done) {
      clearInterval(theApp.locals.Prometheus.collectDefaultMetrics());
      theApp.locals.Prometheus.register.clear();
      done();
    });

    it('does push/pop ok', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      async.series([
        function (cb) {
          put_msg(namespace, 'q1', msg, cb)
        },
        function (cb) {
          get_msg(namespace, 'q1', cb)
        },
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        done(err);
      });
    });

    it('does pop + timeout ok', function (done) {
      var t0 = new Date().getTime();
      async.series([
        function (cb) {
          get_msg_timeout(namespace, 'q1', 2000, cb)
        }
      ], function (err, allres) {
        allres[0].should.match({
          timeout: true,
          tid: /.+/
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(2000, 100);

        done(err);
      });
    });

    it('does push-delayed + pop ok', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      var t0 = new Date().getTime();
      async.series([
        function (cb) {
          put_msg_delayed(namespace, 'q1', msg, 2, cb)
        },
        function (cb) {
          get_msg(namespace, 'q1', cb)
        },
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(2000, 100);

        done(err);
      });
    });

    it('does pop + delay + push-delayed ok', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      var t0 = new Date().getTime();
      async.parallel([
        function (cb) {
          get_msg(namespace, 'q1', cb)
        },
        function (cb) {
          setTimeout(function () {
            put_msg_delayed(namespace, 'q1', msg, 2, cb)
          }, 1000)
        }
      ], function (err, allres) {

        allres[0].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 100);

        done(err);
      });
    });

    it('does push-delayed + deny + pop ok', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      var t0 = new Date().getTime();
      async.series([
        function (cb) {
          put_msg_delayed(namespace, 'q1', msg, 2, cb)
        },
        function (cb) {
          setTimeout(cb, 1000)
        },
        function (cb) {
          get_msg(namespace, 'q1', cb)
        },
      ], function (err, allres) {

        allres[2].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(2000, 100);

        done(err);
      });
    });


  });
});
