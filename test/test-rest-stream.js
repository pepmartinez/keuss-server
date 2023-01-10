const should = require('should');
const async = require('async');
const request = require('supertest');
const _ = require('lodash');

const BaseApp = require ('../app');
const Scope =   require ('../Scope');

let theApp = null;

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
    stream_mongo: {
      factory: 'stream-mongo',
      config: {
        url: 'mongodb://localhost:27017/keuss-server-test__stream_mongo',
        pollInterval: 17000,
        stats: {
          provider: stats_mongo,
        },
        signaller: {
          provider: signal_mongo
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
    .query ({groups: 'G1,G2,G3'})
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

function get_msg(namespace, q, gr, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .expect(200)
    .auth('test', 'toast')
    .query ({group: gr})
    .end((err, res) => {
      cb(err, res && res.body);
    });
}


function get_msg_timeout(namespace, q, gr, timeout, cb) {
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .query({
      to:    timeout,
      group: gr
    })
    .expect(504)
    .auth('test', 'toast')
    .end((err, res) => {
      cb(err, res && res.body);
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
  'stream_mongo',
], namespace => {
  describe('REST operations on streams, namespace ' + namespace, () => {
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


    it('does push/pop with 3 consumers ok', done => {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      async.parallel([
        cb => async.parallel ([
          cb => get_msg(namespace, 'q1', 'G1', cb),
          cb => get_msg(namespace, 'q1', 'G2', cb),
          cb => get_msg(namespace, 'q1', 'G3', cb),
        ], cb),
        cb => async.series ([
          cb => setTimeout (cb, 1000),
          cb => put_msg(namespace, 'q1', msg, cb),
        ], cb),
      ], (err, allres) => {
        allres[0][0].should.eql(msg);
        allres[0][1].should.eql(msg);
        allres[0][2].should.eql(msg);
        done(err);
      });
    });


    it('does timeout on unknown group consumer', done => {
      var msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      async.parallel([
        cb => async.parallel ([
          cb => get_msg(namespace, 'q1', 'G1', cb),
          cb => get_msg(namespace, 'q1', 'G2', cb),
          cb => get_msg(namespace, 'q1', 'G3', cb),
          cb => get_msg_timeout(namespace, 'q1', 'G9', 3000, cb),
          cb => get_msg_timeout(namespace, 'q1', 'AAA', 2000, cb),
        ], cb),
        cb => async.series ([
          cb => setTimeout (cb, 1000),
          cb => put_msg(namespace, 'q1', msg, cb),
        ], cb),
      ], (err, allres) => {
        allres[0][0].should.eql(msg);
        allres[0][1].should.eql(msg);
        allres[0][2].should.eql(msg);
        allres[0][3].timeout.should.equal (true);
        allres[0][4].timeout.should.equal (true);
        done(err);
      });
    });

  });
});
