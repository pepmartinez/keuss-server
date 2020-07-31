var should = require('should');
var async = require('async');
var request = require('supertest');
var _ = require('lodash');

var BaseApp = require('../app');
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

function get_msg_timeout_id(namespace, q, timeout, id, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query({
      to: timeout,
      tid: id
    })
    .expect(504)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function cancel_pop(namespace, q, id, cb) {
  request(theApp)
    .del('/q/' + namespace + '/' + q + '/consumer/' + id)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function get_consumers(namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/q1/consumers')
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}


function _get_body (cb) {
  return function (err, res) {
    if (err) return cb(err);
    return cb (null, res.body);
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
  'mongo_tape',
  'mongo_pipeline',
  'bucket_mongo',
  'bucket_mongo_safe'
], function (namespace) {
  describe('REST push/pop operations on queue namespace ' + namespace, function () {
    before(function (done) {
      var scope = new Scope ();
      scope.init (config, {}, function (err) {
        if (err) return done (err);
        BaseApp(config, {scope, metrics}, function () {}, function (err, app) {
          theApp = app;
          done(err);
        });
      });
    });

    after(function (done) {
      theApp.locals.Prometheus.register.clear();
      done();
    });

    it ('lists introspection info ok', done => {
      async.series([
        cb => request(theApp).get('/q/' + namespace + '/q1/status').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/' + namespace + '/q2/status').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/' + namespace + '/q1/consumers').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/' + namespace + '/q2/consumers').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/' + namespace + '/q1/paused').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/' + namespace + '/q2/paused').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/' + namespace).expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q?tree=1').expect(200).auth('test', 'toast').end(_get_body (cb)),
        cb => request(theApp).get('/q/?array=1').expect(200).auth('test', 'toast').end(_get_body (cb)),
      ], (err, res) => {
        if (err) return done(err);
        res[2].should.eql ([]);
        res[3].should.eql ([]);
        res[4].should.equal (false);
        res[5].should.equal (false);

        // TODO check schema of rest

        done ();
      });
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

    it('does pop + delay + push ok', function (done) {
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
          get_msg(namespace, 'q1', cb);
        },
        function (cb) {
          setTimeout(function () {
            put_msg(namespace, 'q1', msg, cb);
          }, 1000);
        }
      ], function (err, allres) {

        allres[0].should.match({
          payload: msg,
//          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 700);

        done(err);
      });
    });

    it('does pop + delay + cancel + push + pop ok', function (done) {
      async.series([
        function (cb) {
          get_msg_timeout_id(namespace, 'q1', 3000, 'the-first-consumer', function () {});
          cb ();
        },
        function (cb) {
          setTimeout(cb, 1000)
        },
        function (cb) {
          get_consumers(namespace, 'q1', cb)
        },
        function (cb) {
          cancel_pop(namespace, 'q1', 'the-first-consumer', cb)
        },
        function (cb) {
          get_consumers(namespace, 'q1', cb)
        },
        function (cb) {
          setTimeout(cb, 3000)
        },
      ], function (err, allres) {
        allres[2].should.match([{
          tid: 'the-first-consumer',
          since: /.+/,
          callback: 'set',
          cleanup_timeout: 'set',
          wakeup_timeout: 'set'
        }]);

        allres[4].should.eql([]);
        done(err);
      });
    });
  });
});
