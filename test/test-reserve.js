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
  'redis:oq',
  'mongo:simple',
  'mongo:pipeline'
], function (type) {
  describe('REST reserve-commit-rollback operations on queue type ' + type, function () {
    before(function (done) {
      BaseApp(config, function (err, app) {
        theApp = app;
        done(err);
      });
    });

    after(function (done) {
      done();
    });

    it('does reserve+commit ok');
    it('does reserve+rollback+get ok');
    it('causes reserve+reserve+rollback to go on second consumer ok');
    it('does reserve+commit on sched message ok');
    it('honors rollback max retries');
    it('honors rollback with custon delay');
  });
});