var should = require('should');
var async = require('async');
var request = require('supertest');
var _ = require('lodash');

var BaseApp = require('../app');
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

function reserve_msg(type, q, cb) {
  request(theApp)
    .get('/q/' + type + '/' + q)
    .query ({reserve: 1})
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

function reserve_msg_timeout(type, q, timeout, cb) {
  request(theApp)
    .get('/q/' + type + '/' + q)
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

function commit_msg(type, q, id, cb) {
  request(theApp)
    .patch('/q/' + type + '/' + q + '/commit/' + id)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function rollback_msg(type, q, id, cb) {
  request(theApp)
    .patch('/q/' + type + '/' + q + '/rollback/' + id)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function rollback_msg_unknown(type, q, id, cb) {
  request(theApp)
    .patch('/q/' + type + '/' + q + '/rollback/' + id)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res);
    });
}

function rollback_msg_delay(type, q, id, delay, cb) {
  request(theApp)
    .patch('/q/' + type + '/' + q + '/rollback/' + id)
    .query ({delay: delay})
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function commit_or_rollback_msg(type, q, id, commit, cb) {
  request(theApp)
    .patch('/q/' + type + '/' + q + '/' + (commit ? 'commit' : 'rollback') + '/' + id)
    .expect(200)
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
      var scope = new Scope ();
      scope.init (config, function (err) {
        if (err) return done (err);
        BaseApp(config, scope, function (err, app) {
          theApp = app;
          done(err);
        });
      });
    });

    after(function (done) {
      done();
    });

    it('does reserve+commit ok', function (done) {
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
        function (cb) {put_msg(type, 'q1', msg, cb)},
        function (cb) {
          reserve_msg(type, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {commit_msg(type, 'q1', id, cb)},
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 100);

        done(err);
      });
    });

    it('does reserve+rollback+get ok', function (done) {
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
        function (cb) {put_msg(type, 'q1', msg, cb)},
        function (cb) {
          reserve_msg(type, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {rollback_msg(type, 'q1', id, cb)},
        function (cb) {get_msg(type, 'q1', cb)},
      ], function (err, allres) {
        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 100);

        allres[1].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
        });

        allres[4].should.match({
          _id: /.+/,
          payload: msg,
          tries: 1
        });

        done(err);
      });
    });

    it('causes reserve+reserve+rollback to go on second consumer ok', function (done) {
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
          var id;
          var tries;
          async.series ([
            function (cb) {
              reserve_msg(type, 'q1', function (err, res) {
                id = res._id;
                tries = res.tries;
                cb (err, res);
              });
            },
            function (cb) {setTimeout (cb, 1000)},
            function (cb) {commit_or_rollback_msg (type, 'q1', id, tries, cb)},
          ], cb);
        },
        function (cb) {
          var id;
          var tries;
          async.series ([
            function (cb) {setTimeout (cb, 1000)},
            function (cb) {
              reserve_msg(type, 'q1', function (err, res) {
                id = res._id;
                tries = res.tries;
                cb (err, res);
              });
            },
            function (cb) {setTimeout (cb, 1000)},
            function (cb) {commit_or_rollback_msg (type, 'q1', id, tries, cb)},
          ], cb);
        },
        function (cb) {put_msg_delayed(type, 'q1', msg, 2, cb)},
      ], function (err, allres) {
        
        allres[0][0].should.match({
          _id: /.+/,
          payload: msg,
        });

        allres[1][1].should.match({
          _id: /.+/,
          payload: msg,
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(4000, 100);

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
        function (cb) {put_msg_delayed(type, 'q1', msg, 2, cb)},
        function (cb) {
          reserve_msg(type, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {commit_msg(type, 'q1', id, cb)},
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 100);

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
        function (cb) {put_msg(type, 'q1', msg, cb)},
        function (cb) {
          reserve_msg(type, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {rollback_msg_delay(type, 'q1', id, 2000, cb)},
        function (cb) {get_msg(type, 'q1', cb)},
      ], function (err, allres) {
        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 100);

        allres[1].should.match({
          _id: /.+/,
          payload: msg,
          tries: 0
        });

        allres[4].should.match({
          _id: /.+/,
          payload: msg,
          tries: 1
        });

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
        function (cb) {rollback_msg_unknown (type, 'q1', '112233445566778899001122', cb)},
      ], function (err, allres) {
        should(err).equal (null);
        allres[0].status.should.equal (404)
        done(err);
      });
    });
  });
});