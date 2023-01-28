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


function get_q_details(namespace, q, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q + '/status')
    .auth('test', 'toast')
    .expect(200)
    .end((err, res) => {
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

function del_msg(namespace, q, id, cb) {
  request(theApp)
    .delete('/q/' + namespace + '/' + q + '/' + id)
    .expect(204)
    .auth('test', 'toast')
    .end((err, res) => {
      cb(err, res && res.body);
    });
}

function del_unknown_msg(namespace, q, id, cb) {
  request(theApp)
    .delete('/q/' + namespace + '/' + q + '/' + id)
    .expect(404)
    .auth('test', 'toast')
    .end(cb);
}



var metrics = {
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
  'bucket_mongo_safe'
], namespace => {
  describe('REST delete-msg operations on queue namespace ' + namespace, () => {
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


    after(done => {
      theApp.locals.Prometheus.register.clear();
      done();
    });


    it('returns 404 upon deletion on an unknown id', done => {
      del_unknown_msg(namespace, 'q1', '11223344556677889900aabb', done);
    });


    it ('removes a previously-inserted element', done => {
      let id = null;
      async.series([
        cb => get_q_details (namespace, 'q1', cb),
        cb => put_msg_delayed(namespace, 'q1', {a:12, b:33}, 5, (err, res) => {
          id = res.id;
          cb (err);
        }),
        cb => setTimeout (cb, 1000),
        cb => del_msg(namespace, 'q1', id, cb),
        cb => setTimeout (cb, 1000),
        cb => get_q_details (namespace, 'q1', cb),
      ], (err, res) => {
        if (err) return done(err);

        res[0].should.match ({
          totalSize: 0,
          schedSize: 0,
          size: 0
        });

        res[5].should.match ({
          totalSize: 0,
          schedSize: 0,
          size: 0
        });

        done(err);
      });
    });

    it ('returns 404 on a previously removed id', done => {
      let id = null;
      async.series([
        cb => get_q_details (namespace, 'q1', cb),
        cb => put_msg_delayed(namespace, 'q1', {a:12, b:33}, 5, (err, res) => {
          id = res.id;
          cb (err);
        }),
        cb => setTimeout (cb, 1000),
        cb => del_msg(namespace, 'q1', id, cb),
        cb => setTimeout (cb, 1000),
        cb => del_unknown_msg(namespace, 'q1', id, cb),
        cb => get_q_details (namespace, 'q1', cb),
      ], (err, res) => {
        if (err) return done(err);
        
        res[0].should.match ({
          totalSize: 0,
          schedSize: 0,
          size: 0
        });

        res[6].should.match ({
          totalSize: 0,
          schedSize: 0,
          size: 0
        });

        done(err);
      });
    });

  });
});
