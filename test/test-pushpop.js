var should = require('should');
var async = require('async');
var request = require('supertest');
var _ = require('lodash');

var BaseApp = require('../app');
var theApp;

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

function get_msg_timeout_id(type, q, timeout, id, cb) {
  request(theApp)
    .get('/q/' + type + '/' + q)
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

function cancel_pop(type, q, id, cb) {
  request(theApp)
    .del('/q/' + type + '/' + q + '/consumer/' + id)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function get_consumers(type, q, cb) {
  request(theApp)
    .get('/q/' + type + '/q1/consumers')
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}


_.forEach([
  'redis:oq',
  'redis:list',
  'mongo:simple',
  'mongo:pipeline'
], function (type) {
  describe('REST push/pop operations on queue type ' + type, function () {
    before(function (done) {
      BaseApp(config, function (err, app) {
        theApp = app;
        done(err);
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
          get_msg(type, 'q1', cb)
        },
        function (cb) {
          setTimeout(function () {
            put_msg(type, 'q1', msg, cb)
          }, 1000);
        }
      ], function (err, allres) {

        allres[0].should.match({
          payload: msg,
          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 100);

        done(err);
      });
    });

    it('does pop + delay + cancel + push + pop ok', function (done) {
      async.series([
        function (cb) {
          get_msg_timeout_id(type, 'q1', 3000, 'the-first-consumer', cb);
          cb();
        },
        function (cb) {
          setTimeout(cb, 1000)
        },
        function (cb) {
          get_consumers(type, 'q1', cb)
        },
        function (cb) {
          cancel_pop(type, 'q1', 'the-first-consumer', cb)
        },
        function (cb) {
          get_consumers(type, 'q1', cb)
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