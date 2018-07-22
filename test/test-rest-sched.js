var should = require('should');
var async = require('async');
var request = require('supertest');
var _ = require('lodash');

var BaseApp = require ('../app');
var Scope =   require ('../Scope');

var theApp;

var stats_redis = require('keuss/stats/redis');
var signal_redis_pubsub = require('keuss/signal/redis-pubsub');

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
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    mongo_tape: {
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
    mongo_pipeline: {
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
    redis_list: {
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
    redis_oq: {
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
  }
};


function put_msg(type, q, msg, cb) {
  request(theApp)
    .put('/q/' + type + '/' + q)
    .send(msg)
    .auth('test', 'toast')
    .expect(200)
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function put_msg_delayed(type, q, msg, delay, cb) {
  request(theApp)
    .put('/q/' + type + '/' + q)
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

function get_msg(type, q, cb) {
  request(theApp)
    .get('/q/' + type + '/' + q)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function get_msg_timeout(type, q, timeout, cb) {
  request(theApp)
    .get('/q/' + type + '/' + q)
    .query({
      to: timeout
    })
    .expect(504)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}


_.forEach([
  'redis_oq',
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape'
], function (type) {
  describe('REST scheduled operations on queue type ' + type, function () {
    before(function (done) {
      var scope = new Scope ();
      scope.init (config, function (err) {
        if (err) return done (err);
        BaseApp(config, scope, function () {}, function (err, app) {
          theApp = app;
          done(err);
        });
      });
    });

    after(function (done) {
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
          put_msg(type, 'q1', msg, cb)
        },
        function (cb) {
          get_msg(type, 'q1', cb)
        },
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
        });

        done(err);
      });
    });

    it('does pop + timeout ok', function (done) {
      var t0 = new Date().getTime();
      async.series([
        function (cb) {
          get_msg_timeout(type, 'q1', 2000, cb)
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
          put_msg_delayed(type, 'q1', msg, 2, cb)
        },
        function (cb) {
          get_msg(type, 'q1', cb)
        },
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
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
          get_msg(type, 'q1', cb)
        },
        function (cb) {
          setTimeout(function () {
            put_msg_delayed(type, 'q1', msg, 2, cb)
          }, 1000)
        }
      ], function (err, allres) {

        allres[0].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
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
          put_msg_delayed(type, 'q1', msg, 2, cb)
        },
        function (cb) {
          setTimeout(cb, 1000)
        },
        function (cb) {
          get_msg(type, 'q1', cb)
        },
      ], function (err, allres) {

        allres[2].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(2000, 100);

        done(err);
      });
    });


  });
});