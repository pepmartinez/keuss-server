const should = require('should');
const async = require('async');
const request = require('supertest');
const _ = require('lodash');

const BaseApp = require('../app');
const Scope =   require ('../Scope');

let theApp;

const stats_redis =  require('keuss/stats/redis');
const signal_redis = require('keuss/signal/redis-pubsub');

const stats_mongo =  require('keuss/stats/mongo');
const signal_mongo = require('keuss/signal/mongo-capped');

const config = {
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
    },
    postgres: {
      factory: 'postgres',
      config: {
        pollInterval: 17000,
        stats: {
          provider: stats_redis,
        },
        signaller: {
          provider: signal_redis
        },
        deadletter: {
          max_ko: 4
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

function put_msg_hdrs (namespace, q, msg, hdrs, cb) {
  request(theApp)
    .put('/q/' + namespace + '/' + q)
    .set (hdrs)
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

function get_msg_hdrs (namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, {body: res && res.body, text: res && res.text,  hdrs: res && res.headers});
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


const metrics = {
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
  'bucket_mongo_safe',
  'mongo_simple',
  'mongo_tape',
  'mongo_pipeline',
  'postgres'
], function (namespace) {
  describe('REST push/pop operations on queue namespace ' + namespace, function () {
    before(done => {
      const scope = new Scope ();
      scope.init (config, {}, function (err) {
        if (err) return done (err);
        BaseApp(config, {scope, metrics}, function () {}, function (err, app) {
          theApp = app;
          done(err);
        });
      });
    });

    after(done => {
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


    it('does push/pop of json body ok', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      async.series([
        cb => put_msg_hdrs(namespace, 'q1', msg, {a: '76', 'x-ks-hdr-a': '555', 'x-ks-hdr-b': 555}, cb),
        cb => get_msg_hdrs(namespace, 'q1', cb)
      ], (err, allres) => {
        allres[1].body.should.eql(msg);
        allres[1].hdrs.should.match ({
          'x-ks-tries': /.+/,
          'x-ks-mature': /.+Z$/,
          'x-ks-id': /.+/,
          'x-ks-hdr-a': '555',
          'x-ks-hdr-b': '555',
          'content-type': /^application\/json/,
          'content-length': '46',
        });
        should (allres[1].hdrs.a).be.undefined();

        done(err);
      });
    });


    it('does push/pop of text body ok', done => {
      const msg = 'qwertyuiop';

      async.series([
        cb => put_msg_hdrs(namespace, 'q1', msg, {a: '76', 'x-ks-hdr-a': '555', 'x-ks-hdr-b': 555, 'content-type': 'text/plain-str'}, cb),
        cb => get_msg_hdrs(namespace, 'q1', cb)
      ], (err, allres) => {
        allres[1].text.should.eql(msg);
        allres[1].hdrs.should.match ({
          'x-ks-tries': '0',
          'x-ks-mature': /.+Z$/,
          'x-ks-id': /.+/,
          'x-ks-hdr-a': '555',
          'x-ks-hdr-b': '555',
          'content-type': /^text\/plain-str/,
          'content-length': '10',
        });
        should (allres[1].hdrs.a).be.undefined();

        done(err);
      });
    });


    it('does push/pop of Buffer body ok', done => {
      const msg = Buffer.from ([0x10, 0x11, 0x12]);

      async.series([
        cb => put_msg_hdrs(namespace, 'q1', msg, {a: '76', 'x-ks-hdr-a': '555', 'x-ks-hdr-b': 555, 'content-type': 'application/octet-stream'}, cb),
        cb => get_msg_hdrs(namespace, 'q1', cb)
      ], (err, allres) => {
        allres[1].body.should.eql(msg);
        allres[1].hdrs.should.match ({
          'x-ks-tries': '0',
          'x-ks-mature': /.+Z$/,
          'x-ks-id': /.+/,
          'x-ks-hdr-a': '555',
          'x-ks-hdr-b': '555',
          'content-type': 'application/octet-stream',
          'content-length': '3',
        });
        should (allres[1].hdrs.a).be.undefined();

        done(err);
      });
    });


    it('does pop + timeout ok', done => {
      const t0 = new Date().getTime();
      async.series([
        cb => get_msg_timeout(namespace, 'q1', 2000, cb)
      ], (err, allres) => {
        allres[0].should.match({
          timeout: true,
          tid: /.+/
        });

        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(2000, 100);

        done(err);
      });
    });

    it('does pop + delay + push ok', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      const t0 = new Date().getTime();
      async.parallel([
        cb => get_msg_hdrs(namespace, 'q1', cb),
        cb => setTimeout(() => put_msg (namespace, 'q1', msg, cb), 1000),
      ], (err, allres) => {

        allres[0].body.should.eql (msg);
        allres[0].hdrs.should.match({
          'x-ks-tries': '0'
        });

        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 700);

        done(err);
      });
    });

    it('does pop + delay + cancel + push + pop ok', done => {
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
