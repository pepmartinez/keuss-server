var should = require('should');
var async = require('async');
var request = require('supertest');
var _ = require('lodash');
var Chance = require('chance');

var chance = new Chance();

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

function get_msg_hdrs (namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, {body: res && res.body, text: res && res.text,  hdrs: res && res.headers});
    });
}

function reserve_msg(namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query ({reserve: 1})
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function reserve_msg_hdrs(namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query ({reserve: 1})
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

function reserve_msg_timeout(namespace, q, timeout, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query({
      to: timeout,
      reserve: 1
    })
    .expect(504)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function commit_msg(namespace, q, id, cb) {
  request(theApp)
    .patch('/q/' + namespace + '/' + q + '/commit/' + id)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function rollback_msg(namespace, q, id, cb) {
  request(theApp)
    .patch('/q/' + namespace + '/' + q + '/rollback/' + id)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function rollback_msg_unknown(namespace, q, id, cb) {
  request(theApp)
    .patch('/q/' + namespace + '/' + q + '/rollback/' + id)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res);
    });
}

function rollback_msg_delay(namespace, q, id, delay, cb) {
  request(theApp)
    .patch('/q/' + namespace + '/' + q + '/rollback/' + id)
    .query ({delay: delay})
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function commit_or_rollback_msg(namespace, q, id, commit, cb) {
  request(theApp)
    .patch('/q/' + namespace + '/' + q + '/' + (commit ? 'commit' : 'rollback') + '/' + id)
    .expect(200)
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
  'mongo_tape',
  'mongo_pipeline',
  'bucket_mongo_safe'
], namespace =>{
  describe('REST reserve-commit-rollback operations on queue namespace ' + namespace, () => {
    before (done => {
      var scope = new Scope ();
      scope.init (config, {}, err => {
        if (err) return done (err);
        BaseApp(config, {scope, metrics}, () => {}, (err, app) => {
          theApp = app;
          done(err);
        });
      });
    });

    after (done => {
      theApp.locals.Prometheus.register.clear();
      done();
    });

    it('does reserve+commit ok', done => {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      var id;
      var t0 = new Date().getTime();
      async.series([
        cb => put_msg(namespace, 'q1', msg, cb),
        cb => reserve_msg_hdrs (namespace, 'q1', (err, res) => {
          id = res.hdrs['x-ks-id'];
          cb (err, res.body);
        }),
        cb => setTimeout (cb, 1000),
        cb => commit_msg(namespace, 'q1', id, cb),
      ], (err, allres) => {
        if (err) return done (err);
        allres[1].should.eql(msg);

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 1000);

        done();
      });
    });

    it('does reserve+rollback+get ok', done => {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      var id;
      var t0 = new Date().getTime();
      async.series([
        cb => put_msg(namespace, 'q1', msg, cb),
        cb => reserve_msg_hdrs(namespace, 'q1', (err, res) => {
          id = res.hdrs['x-ks-id'];
          cb (err, res.body);
        }),
        cb =>setTimeout (cb, 1000),
        cb => rollback_msg(namespace, 'q1', id, cb),
        cb => get_msg(namespace, 'q1', cb),
      ],(err, allres) => {
        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 1100);

        allres[1].should.eql (msg);
        allres[4].should.eql (msg);

        done(err);
      });
    });

    it('causes reserve+reserve+rollback to go on second consumer ok', done => {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      var t0 = new Date().getTime();
      var passes = 0;

      async.parallel([
        cb => {
          var id;
          var commit = false;

          async.series ([
            cb => reserve_msg_hdrs (namespace, 'q1', (err, res) => {
              id = res.hdrs['x-ks-id'];
              passes++;
              if (passes == 1) commit = false;
              else commit = true;
              cb (err, res.body);
            }),
            cb => setTimeout (cb, 1000),
            cb => commit_or_rollback_msg (namespace, 'q1', id, commit, cb),
          ], cb);
        },
        cb => {
          var id;
          var commit;
          async.series ([
            cb => setTimeout (cb, 1000),
            cb => reserve_msg_hdrs(namespace, 'q1', (err, res) => {
              if (err) return cb (err);
              id = res.hdrs['x-ks-id'];
              passes++;
              if (passes == 1) commit = false;
              else commit = true;
              cb (err, res.body);
            }),
            cb => setTimeout (cb, 1000),
            cb => commit_or_rollback_msg (namespace, 'q1', id, commit, cb),
          ], cb);
        },
        cb => put_msg_delayed(namespace, 'q1', msg, 2, cb),
      ], (err, allres) => {
        allres[0][0].should.eql(msg);
        allres[1][1].should.eql(msg);

//        var t1 = new Date().getTime();
//        (t1 - t0).should.be.approximately(4000, 100);

        done(err);
      });
    });

    it('does reserve+commit on sched message ok', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      var id;
      var t0 = new Date().getTime();
      async.series([
        cb => put_msg_delayed(namespace, 'q1', msg, 2, cb),
        cb => reserve_msg_hdrs(namespace, 'q1', (err, res) => {
          id = res.hdrs['x-ks-id'];
          cb (err, res.body);
        }),
        cb => setTimeout (cb, 1000),
        cb => commit_msg(namespace, 'q1', id, cb),
      ],  (err, allres) => {
        allres[1].should.eql(msg);

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 500);

        done(err);
      });
    });


    it('honors rollback with custon delay', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      var id;
      var t0 = new Date().getTime();
      async.series([
        cb => put_msg(namespace, 'q1', msg, cb),
        cb => reserve_msg_hdrs(namespace, 'q1', (err, res) => {
          id = res.hdrs['x-ks-id'];
          cb (err, res.body);
        }),
        cb => setTimeout (cb, 1000),
        cb => rollback_msg_delay(namespace, 'q1', id, 2000, cb),
        cb => get_msg(namespace, 'q1', cb),
      ], (err, allres) => {
        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 1000);

        allres[1].should.eql(msg);
        allres[4].should.eql(msg);

        done(err);
      });
    });

    it('gives 404 on rollback upon invalid id', function (done) {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      async.series([
        cb => rollback_msg_unknown (namespace, 'q1', '112233445566778899001122', cb),
      ], (err, allres) => {
        should(err).equal (null);
        allres[0].status.should.equal (404)
        done(err);
      });
    });
  });
});
