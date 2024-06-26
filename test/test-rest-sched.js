const should = require('should');
const async = require('async');
const request = require('supertest');
const _ = require('lodash');

const BaseApp = require ('../app');
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

function get_msg_hdrs(namespace, q, cb) {
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

function get_msg_timeout_hdrs(namespace, q, timeout, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query({
      to: timeout
    })
    .expect(504)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, {body: res && res.body, text: res && res.text,  hdrs: res && res.headers});
    });
}



const metrics = {
};
_.forEach(['q_push', 'q_pop', 'q_reserve', 'q_commit', 'q_rollback'], i => {
  metrics['keuss_' + i] = {
    labels: () => {
      return {
        inc: () => {}
      };
    }
  };
});

_.forEach([
  'redis_oq',
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape',
  'bucket_mongo_safe',
  'postgres'
], namespace => {
  describe('REST scheduled operations on queue namespace ' + namespace, () => {
    before (done => {
      const scope = new Scope ();
      scope.init (config, {}, err => {
        if (err) return done (err);
        BaseApp(config, {scope, metrics}, () => {}, (err, app) => {
          theApp = app;
          done(err);
        });
      });
    });

    after(done => {
      theApp.locals.Prometheus.register.clear();
      done();
    });

    it('does push/pop ok', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      async.series([
        cb => put_msg(namespace, 'q1', msg, cb),
        cb => get_msg(namespace, 'q1', cb),
        cb => setTimeout (cb, 1000)
      ], (err, allres) => {
        allres[1].should.eql(msg);
        done(err);
      });
    });

    it('does pop + timeout ok', done => {
      const t0 = new Date().getTime();
      async.series([
        cb => get_msg_timeout(namespace, 'q1', 2000, cb),
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

    it('does push-delayed + pop ok', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      const t0 = new Date().getTime();
      async.series([
        cb => put_msg_delayed(namespace, 'q1', msg, 2, cb),
        cb => get_msg(namespace, 'q1', cb),
        cb => setTimeout (cb, 1000)
      ], (err, allres) => {
        allres[1].should.eql(msg);

        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 100);

        done(err);
      });
    });

    it('does pop + delay + push-delayed ok', done => {
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
        cb => get_msg(namespace, 'q1', cb),
        cb => setTimeout(() => put_msg_delayed(namespace, 'q1', msg, 2, cb), 1000),
      ], (err, allres) => {
        allres[0].should.eql(msg);

        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 100);

        done(err);
      });
    });

    it('does push-delayed + deny + pop ok', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      const t0 = new Date().getTime();
      async.series([
        cb => put_msg_delayed(namespace, 'q1', msg, 2, cb),
        cb => setTimeout(cb, 1000),
        cb => get_msg(namespace, 'q1', cb),
        cb => setTimeout (cb, 1000)
      ], (err, allres) => {
        allres[2].should.eql(msg);

        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 100);

        done(err);
      });
    });


  });
});
