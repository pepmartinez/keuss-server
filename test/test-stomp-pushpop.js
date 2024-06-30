const should =  require('should');
const async =   require('async');
const _ =       require('lodash');
const stompit = require('stompit');
const Log =     require('winston-log-space');


let stomp_server;

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


//should.config.checkProtoEql = false;


function stompcl (cb) {
  const connectOptions = {
    'host': 'localhost',
    'port': 61613,
    'connectHeaders':{
      'host': '/',
      'login': 'username',
      'passcode': 'password',
      'heart-beat': '5000,6000'
    }
  };

  stompit.connect(connectOptions, cb);
}

function send_obj (scl, q, obj, cb) {
  const sendHeaders = {
    'destination': q,
    'content-type': 'application/json'
  };

  const frame = scl.send(sendHeaders, {onReceipt: cb});
  frame.write(JSON.stringify (obj));
  frame.end();
}



const promster = {
  register: {
    getSingleMetric: function () {return null;}
  },
  Gauge: class __Gauge__ {
    constructor() {}
    set () {}
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
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape',
  'bucket_mongo_safe',
  'postgres'
], namespace => {
  describe('STOMP push/pop operations on queue namespace ' + namespace, () => {

    before (done => async.series ([
//      cb => Log.init (cb),
      cb => {
        const Stomp = require ('../stomp');
        const Scope = require ('../Scope');

        const scope = new Scope ();
        scope.init (config, {}, err  => {
          if (err) return cb (err);
          stomp_server = new Stomp (config, {scope, metrics, promster});
          stomp_server.run (cb);
        });
      }
    ], done));

    after(done => {
      stomp_server.end (() => setTimeout (done, 1000));
    });


    it('does push/pop ok, ack to auto', done => {
      const q = '/q/' + namespace + '/stomp_test_1';
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      stompcl ((err, cl) => {
        if (err) return done(err);

        const subscribeHeaders = {
          'destination': q,
          'ack': 'auto'
        };

        cl.subscribe(subscribeHeaders, (err, message) => {
          if (err) return done(err);

          message.readString ('utf-8', (err, body) => {
            if (err) return done(err);
            JSON.parse (body).should.eql (msg);
            cl.disconnect();
            done();
          });
        });

        // send it
        send_obj (cl, q, msg, r => {});
      });
    });


    it('does push/pop ok with string content (ctype is text/plain)', done => {
      const q = '/q/' + namespace + '/stomp_test_2';
      const msg = 'qwertyuiopasdfghjkl';

      stompcl ((err, cl) => {
        if (err) return done(err);

        const subscribeHeaders = {
          'destination': q,
          'ack': 'auto'
        };

        cl.on ('error', err => {
          done (err)
        })

        cl.subscribe(subscribeHeaders, (err, message) => {
          if (err) return done(err);

          message.headers['content-type'].should.equal ('text/plain');
          message.headers['x-ks-hdr-a'].should.equal ('1234');
          message.headers['x-tries'].should.equal ('0');
          should.exist (message.headers['message-id']);
          should.exist (message.headers['subscription']);
          should.exist (message.headers['x-mature']);
          should.exist (message.headers['destination']);

          message.readString ('utf-8', (err, body) => {
            if (err) return done(err);
            body.should.eql (msg);
            cl.disconnect();
            done();
          });
        });

        // send it
        const frame = cl.send ({
          'destination': q,
          'content-type': 'text/plain',
          a: '666',
          'x-ks-hdr-a': '1234'
        }, {onReceipt: () => {}});
        frame.write (msg);
        frame.end ();
      });
    });


/*
    it('does push/pop ok with Buffer content (ctype is bin/bytes)', done => {
      const q = '/q/' + namespace + '/stomp_test_2';
      const msg = Buffer.from ([0x10, 0x11, 0x12, 0x13, 0x00, 0x15, 0x16, 0x17]);

      stompcl ((err, cl) => {
        if (err) return done(err);

        const subscribeHeaders = {
          'destination': q,
          'ack': 'auto'
        };

        cl.on ('error', err => {
          done (err)
        })

        cl.subscribe(subscribeHeaders, (err, message) => {
          if (err) return done(err);

          message.headers['content-type'].should.equal ('bin/bytes');

          message.on('readable', () => {
            const b = message.read ().slice (0,8);
            cl.destroy();
            b.should.eql (msg)
            done();
          });

          message.on('error', err => {
            cl.destroy();
            done(err);
          });

        });

        // send it
        const frame = cl.send ({
          'destination': q,
          'content-type': 'bin/bytes',
          'content-length': 9
        }, {onReceipt: () => {}});
        frame.write (msg);
        frame.end ();
      });
    });
*/
  });
});
