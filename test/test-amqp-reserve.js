var should =  require('should');
var async =   require('async');
var _ =       require('lodash');
var rhea =    require('rhea');

var Scope =   require ('../Scope');

var amqp_server;

var stats_redis =  require('keuss/stats/redis');
var signal_redis = require('keuss/signal/redis-pubsub');

var stats_mongo =  require('keuss/stats/mongo');
var signal_mongo = require('keuss/signal/mongo-capped');


//////////////////////////////////////////////////////////////////////////////////////////////////
class AMQPSnd {
  constructor (conn_opts, snd_opts) {
    this._conn_opts = conn_opts || {host: 'localhost', port: 5672};
    this._snd_opts =  snd_opts || {};

    this._container = rhea.create_container ();


    this._container.on ('accepted', context => {
//      console.log('message confirmed');
    //        context.connection.close();
    });


    this._container.on('disconnected', context => {
      if (context.error) console.error('%s %j', context.error, context.error);
      else console.log ('disconnected');
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  connect (cb) {
    this._connection = this._container.connect (this._conn_opts);

    this._container.once ('sendable', ctx => {
      this._sender = ctx.sender;
      cb (null, ctx)
    });

    this._container.once ('error', err => cb (err));

    this._connection.open_sender (this._snd_opts);
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  close (cb) {
    this._connection.close();
    cb ();
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  send (obj, cb) {
    if (this._sender.sendable()) {
      this._sender.send (obj);
      setImmediate (cb);
    }
    else {
      console.log ('can not send now, waiting for sendable event...');
      this._container.once ('sendable', ctx => {
        console.log ('can send now');
        this._sender.send (obj);
        cb ();
      });
    }
  }
}


//////////////////////////////////////////////////////////////////////////////////////////////////
class AMQPRcv {
  constructor (conn_opts, rcv_opts, opts) {
    this._conn_opts = conn_opts || {host: 'localhost', port: 5672};
    this._rcv_opts =  rcv_opts || {};
    this._opts =      opts || {};
    this._on_msg = this._opts.on_msg;

    this._container = rhea.create_container ();

    this._container.on('disconnected', context => {
      if (context.error) console.error('%s %j', context.error, context.error);
      else console.log ('disconnected');
    });


    this._container.on ('message', context => {
      if (!this._on_msg) return;

      const tag = context.delivery.tag.toString();
      const msg = context.message;
      const delivery = context.delivery;

      this._on_msg (msg, tag, delivery);

//      const odelv = context.session.outgoing.deliveries;
//      const idelv = context.session.incoming.deliveries;
//      console.log ('out size %d head %d tail %d', odelv.size, odelv.head, odelv.tail)
//      console.log ('in  size %d head %d tail %d', idelv.size, idelv.head, idelv.tail)
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  connect (cb) {
    this._connection = this._container.connect (this._conn_opts);

    this._container.once ('error', err => cb (err));
    this._container.once ('receiver_open', ctx => cb (ctx.error));
    this._connection.open_receiver (this._rcv_opts);
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  close (cb) {
    this._connection.close();
    cb ();
  }
}


var config = {
  http: {
    users: {
      'test': 'toast'
    }
  },
  amqp: {
    port: 5672,
    wsize: 512,
    parallel: 1,
    retry: {
      delay: {
        c0: 1,
        c1: 1,
        c2: 1
      }
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
    }
  }
};


//should.config.checkProtoEql = false;

var promster = {
  register: {
    getSingleMetric: function () {return null;}
  },
  Gauge: class __Gauge__ {
    constructor() {}
    set () {}
  }
}

var metrics = {};
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
  'bucket_mongo_safe'
], namespace => {

//  before (done => {
//    var Log = require ('winston-log-space');
//    Log.init ({level: {default: 'info', amqp: 'verbose',}}, done);
//  });

  describe ('AMQP reserve operations on queue namespace ' + namespace, () => {
    before (done => {
      var scope = new Scope ();
      scope.init (config, {}, err => {
        if (err) return done (err);
        var AMQP = require ('../amqp');
        amqp_server = new AMQP (config, {scope, metrics, promster});
        amqp_server.run (done);
      });
    });

    after (done => {
      amqp_server.end (() => setTimeout (done, 1000));
    });


    it ('does push/reserve/commit ok', done => {
      const q = `/queue/${namespace}/amqp_test_1`;

      let rogue_cb = null;
      
      const rcv = new AMQPRcv ({}, {source: q}, {
        on_msg: function (msg, tag, delv) {
          delv.accept();
          rogue_cb (null, msg);
        }
      });
      
      const snd = new AMQPSnd ({}, q);

      async.series ([
        cb => async.parallel ([
          cb => rcv.connect (cb),
          cb => snd.connect (cb)
        ], cb),
        cb => async.parallel ([
          cb => {rogue_cb = cb;},
          cb => snd.send ({
            subject: 'punk is not dead',
            message_id: 6666, 
            content_type: 'application/json',
            application_properties: {
              ein: 1,
              zwei: 'dos',
  //          'x-delta-t': 7000
            },
            body: {'sequence': 7}
          }, cb)
        ], cb),
        cb => async.parallel ([
          cb => rcv.close (cb),
          cb => snd.close (cb)
        ], cb),
      ], (err, res) => {
        if (err) return done (err);

        res[1][0].should.match ({
          durable: true,
          delivery_count: 0,
          message_annotations: {},
          message_id: /.+/,
          subject: 'punk is not dead',
          content_type: 'application/json',
          application_properties: { ein: '1', zwei: 'dos', 'x-mature': /.+/ },
          footer: {},
          body: { sequence: 7 }
        });

        done ();
      });
    });


    it('does push/reserve/nack cycle (2 nacks, 1 ack) ok', done => {
      const q = `/queue/${namespace}/amqp_test_2`;

      let rogue_cb = null;
      
      const rcv = new AMQPRcv ({}, {autoaccept: false, source: q}, {
        on_msg: function (msg, tag, delv) {
          if (msg.delivery_count < 2) {
            setTimeout (() => {
//              console.log ('******** reject:', msg.body, new Date());
              delv.reject({condition: 'random condition', description: 'message rejected just because'});
            }, 1000);
          }
          else {
            delv.accept();
//            console.log ('******** accepted:', msg.body, new Date());
            rogue_cb (null, msg);
          }
        }
      });
      
      const snd = new AMQPSnd ({}, q);

      async.series ([

        cb => async.parallel ([
          cb => rcv.connect (cb),
          cb => snd.connect (cb)
        ], cb),

        cb => setTimeout (cb, 1000),

        cb => async.parallel ([
          cb => {rogue_cb = cb;},
          cb => snd.send ({
            subject: 'punk is not dead',
            message_id: 6666, 
            content_type: 'application/json',
            application_properties: {
              ein: 1,
              zwei: 'dos',
  //          'x-delta-t': 7000
            },
            body: {'sequence': 7}
          }, cb)
        ], cb),

        cb => setTimeout (cb, 1000),

        cb => async.parallel ([
          cb => rcv.close (cb),
          cb => snd.close (cb)
        ], cb),
      ], (err, res) => {
        if (err) return done (err);

        res[2][0].should.match ({
          durable: true,
          delivery_count: 2,
          message_annotations: {},
          message_id: /.+/,
          subject: 'punk is not dead',
          content_type: 'application/json',
          application_properties: { ein: '1', zwei: 'dos', 'x-mature': /.+/ },
          footer: {},
          body: { sequence: 7 }
        });

        done ();
      });
    });


    it('does push/reserve/nack cycle up to deadletter ok', done => {
      const q =   `/queue/${namespace}/amqp_test_3`;
      const dlq = `/queue/${namespace}/__deadletter__`;

      let rogue_cb = null;
      
      const rcv = new AMQPRcv ({}, {autoaccept: false, source: q}, {
        on_msg: function (msg, tag, delv) {
          setTimeout (() => {
//            console.log ('******** reject:', msg.body, new Date());
            delv.reject({condition: 'random condition', description: 'message rejected just because'});
          }, 1000);
        }
      });

      const dl_rcv = new AMQPRcv ({}, {autoaccept: true, source: dlq}, {
        on_msg: function (msg, tag, delv) {
//          console.log ('******** deadlettered:', msg.body, new Date());
          rogue_cb (null, msg);
        }
      });
      
      const snd = new AMQPSnd ({}, q);

      async.series ([

        cb => async.parallel ([
          cb => rcv.connect (cb),
          cb => dl_rcv.connect (cb),
          cb => snd.connect (cb)
        ], cb),

        cb => setTimeout (cb, 1000),

        cb => async.parallel ([
          cb => {rogue_cb = cb;},
          cb => snd.send ({
            subject: 'punk is not dead',
            message_id: 6666, 
            content_type: 'application/json',
            application_properties: {
              ein: 1,
              zwei: 'dos',
  //          'x-delta-t': 7000
            },
            body: {'sequence': 7}
          }, cb)
        ], cb),

        cb => setTimeout (cb, 1000),

        cb => async.parallel ([
          cb => rcv.close (cb),
          cb => dl_rcv.close (cb),
          cb => snd.close (cb)
        ], cb),
      ], (err, res) => {
        if (err) return done (err);

        res[2][0].should.match ({
          durable: true,
          delivery_count: 0,
          message_annotations: {},
          message_id: /.+/,
          subject: 'punk is not dead',
          content_type: 'application/json',
          application_properties: { 
            ein: '1', 
            zwei: 'dos', 
            'x-mature': /.+/ ,
            'x-dl-from-queue': 'amqp_test_3',
            'x-dl-t': /.+/,
            'x-dl-tries': 5,
          },
          footer: {},
          body: { sequence: 7 }
        });

        done ();
      });
    });

  });
});
