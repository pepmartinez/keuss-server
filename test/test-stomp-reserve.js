const should =  require('should');
const async =   require('async');
const _ =       require('lodash');
const stompit = require('stompit');

const Stomp =   require ('../stomp');
const Scope =   require ('../Scope');

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
        },
        deadletter: {
          max_ko: 4
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
        },
        deadletter: {
          max_ko: 4
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
        },
        deadletter: {
          max_ko: 4
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
        },
        deadletter: {
          max_ko: 4
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
        },
        deadletter: {
          max_ko: 4
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
        },
        deadletter: {
          max_ko: 4
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
      'heart-beat': '15000,15000'
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
  'mongo_simple',
  'mongo_pipeline',
  'mongo_tape',
  'bucket_mongo_safe',
  'postgres'
], function (namespace) {
//  before (function (done) {
//    const Log = require ('winston-log-space');
//    Log.init ({level: {default: 'verbose'}}, done);
//  });

  describe('STOMP reserve operations on queue namespace ' + namespace, () => {
    before(done => {
      const scope = new Scope ();
      scope.init (config, {}, err => {
        if (err) return done (err);
        stomp_server = new Stomp (config, {scope, metrics, promster});
        stomp_server.run (done);
      });
    });

    after(done => {
      stomp_server.end (() => setTimeout (done, 1000));
    });

    it('does push/reserve/commit ok', done => {
      const q = '/q/' + namespace + '/stomp_test_2';
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
          'ack': 'client-individual'
        };

        cl.subscribe(subscribeHeaders, (err, message) => {
          if (err) return done(err);

          message.readString ('utf-8', (err, body) => {
            if (err) return done(err);
            JSON.parse (body).should.eql (msg);
            cl.ack (message);
            cl.disconnect();
            done();
          });
        });

        // send it
        send_obj (cl, q, msg, r => {});
      });
    });

    it('does push/reserve/nack cycle (2 nacks, 1 ack) ok', done => {
      const q = '/q/' + namespace + '/stomp_test_3';
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
          'ack': 'client-individual'
        };

        const record = [];

        cl.subscribe(subscribeHeaders, (err, message) => {
          if (err) return done(err);

          message.readString ('utf-8', (err, body) => {
            if (err) return done(err);
            const objbody = JSON.parse (body);

            if (record.length > 2) {
              cl.ack (message);
              cl.disconnect();

              record.length.should.equal (3);
              for (let i = 0; i++; i < record.length) {
                record[i].body.shoud.eql (msg);
                record[i].headers['message-id'].should.equal (record[0].headers['message-id']);
                record[i].headers.destination.should.equal (record[0].headers.destination);
                record[i].headers.subscription.should.equal (record[0].headers.subscription);
                record[i].headers['x-tries'].should.equal (i);
              }

              done();
            }
            else {
              record.push ({
                body: objbody,
                headers: message.headers
              });

              cl.nack (message);
            }
          });
        });

        // send it
        send_obj (cl, q, msg, r => {});
      });
    });

    it('does push/reserve/nack cycle up to deadletter ok', done => {
      const q = '/q/' + namespace + '/stomp_test_4';
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
          'ack': 'client-individual'
        };

        const subscribeHeaders_deadletter = {
          'destination': '/q/' + namespace + '/__deadletter__',
          'ack': 'client-individual'
        };

        const record = [];

        cl.subscribe(subscribeHeaders_deadletter, (err, message) => {
          if (err) return done(err);

          message.readString ('utf-8', (err, body) => {
            if (err) return done(err);

            const objbody = JSON.parse (body);
            cl.ack (message);
            cl.disconnect();

//            record.length.should.equal (6);

            objbody.should.eql ({ a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } });
           
            message.headers.should.match ({
              subscription: /.+/,
              'message-id': /.+/,
              destination: '__deadletter__',
              'x-mature': /.+/,
              'x-tries': /.+/,
              'content-type': /^application\/json/,
              'content-length': 46,
              'x-ks-hdr-x-dl-from-queue': 'stomp_test_4',
              'x-ks-hdr-x-dl-t': /.+/,
              'x-ks-hdr-x-dl-tries': '5',
            });

            done ();
          });
        });

        cl.subscribe(subscribeHeaders, (err, message) => {
          if (err) return done(err);

          message.readString ('utf-8', (err, body) => {
            if (err) return done(err);
            const objbody = JSON.parse (body);
            record.push ({
              body: objbody,
              headers: message.headers
            });

            cl.nack (message);
          });
        });

        // send it
        send_obj (cl, q, msg, r => {});
      });
    });

  });
});
