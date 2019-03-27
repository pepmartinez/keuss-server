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


_.forEach([
  'redis_oq',
  'mongo_simple',
  'mongo_tape',
  'mongo_pipeline',
  'bucket_mongo_safe'
], function (namespace) {
  describe('REST reserve-commit-rollback operations on queue namespace ' + namespace, function () {
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
      setTimeout (done, 1000);
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
        function (cb) {put_msg(namespace, 'q1', msg, cb)},
        function (cb) {
          reserve_msg(namespace, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {commit_msg(namespace, 'q1', id, cb)},
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 1000);

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
        function (cb) {put_msg(namespace, 'q1', msg, cb)},
        function (cb) {
          reserve_msg(namespace, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {rollback_msg(namespace, 'q1', id, cb)},
        function (cb) {get_msg(namespace, 'q1', cb)},
      ], function (err, allres) {
        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 1100);

        allres[1].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        allres[4].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 1
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
      var passes = 0;

      async.parallel([
        function (cb) {
          var id;
          var commit = false;

          async.series ([
            function (cb) {
              reserve_msg(namespace, 'q1', function (err, res) {
                id = res._id;
                passes++;
                if (passes == 1) commit = false;
                else commit = true;
                cb (err, res);
              });
            },
            function (cb) {setTimeout (cb, 1000)},
            function (cb) {commit_or_rollback_msg (namespace, 'q1', id, commit, cb)},
          ], cb);
        },
        function (cb) {
          var id;
          var commit;
          async.series ([
            function (cb) {setTimeout (cb, 1000)},
            function (cb) {
              reserve_msg(namespace, 'q1', function (err, res) {
                id = res._id;
                passes++;
                if (passes == 1) commit = false;
                else commit = true;
                cb (err, res);
              });
            },
            function (cb) {setTimeout (cb, 1000)},
            function (cb) {commit_or_rollback_msg (namespace, 'q1', id, commit, cb)},
          ], cb);
        },
        function (cb) {put_msg_delayed(namespace, 'q1', msg, 2, cb)},
      ], function (err, allres) {
        
        allres[0][0].should.match({
          _id: /.+/,
          payload: msg,
        });

        allres[1][1].should.match({
          _id: /.+/,
          payload: msg,
        });

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
        function (cb) {put_msg_delayed(namespace, 'q1', msg, 2, cb)},
        function (cb) {
          reserve_msg(namespace, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {commit_msg(namespace, 'q1', id, cb)},
      ], function (err, allres) {
        allres[1].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
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
        function (cb) {put_msg(namespace, 'q1', msg, cb)},
        function (cb) {
          reserve_msg(namespace, 'q1', function (err, res) {
            id = res._id;
            cb (err, res);
          });
        },
        function (cb) {setTimeout (cb, 1000)},
        function (cb) {rollback_msg_delay(namespace, 'q1', id, 2000, cb)},
        function (cb) {get_msg(namespace, 'q1', cb)},
      ], function (err, allres) {
        var t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 1000);

        allres[1].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 0
        });

        allres[4].should.match({
          _id: /.+/,
          payload: msg,
//          tries: 1
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
        function (cb) {rollback_msg_unknown (namespace, 'q1', '112233445566778899001122', cb)},
      ], function (err, allres) {
        should(err).equal (null);
        allres[0].status.should.equal (404)
        done(err);
      });
    });
  });
});