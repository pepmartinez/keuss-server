const should =  require('should');
const async =   require('async');
const _ =       require('lodash');
const stompit = require('stompit');
const Log =     require('winston-log-space');

let stomp_server;

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


//should.config.checkProtoEql = false;

////////////////////////////////////////////////////////
function stompcl (cb) {
  const connectOptions = {
    'host': 'localhost',
    'port': 61613,
    'connectHeaders':{
      'host': '/',
      'login': 'username',
      'passcode': 'password',
      'heart-beat': '10000,11000'
    }
  };

  stompit.connect(connectOptions, cb);
}


////////////////////////////////////////////////////////
function send_obj (scl, q, obj, cb) {
  const sendHeaders = {
    'destination': q,
    'content-type': 'application/json',
    'x-ks-groups': 'G1, G2, G3'
  };

  const frame = scl.send(sendHeaders, {onReceipt: cb});
  frame.write(JSON.stringify (obj));
  frame.end();
}


////////////////////////////////////////////////////////
function subscribe_and_get (scl, q, gr, cb) {
  const subscribeHeaders = {
    'destination': q,
    'ack': 'auto',
    'x-ks-group': gr
  };

  const timer = setTimeout (() => cb(null, '--timeout--'), 1000)
  scl.subscribe(subscribeHeaders, (err, message) => {
    if (err) return cb(err);

    message.readString ('utf-8', (err, body) => {
      clearTimeout(timer);
      if (err) return cb(err);
      try {
        cb (null, JSON.parse (body));
      }
      catch (e) {
        cb (e);
      }
    });
  });
}


////////////////////////////////////////////////////////
function subscribe_and_get_with_retries (scl, q, gr, tries, cb) {
  const subscribeHeaders = {
    'destination': q,
    'ack': 'client-individual',
    'x-ks-group': gr
  };

  const timer = setTimeout (() => cb(null, '--timeout--'), 8000);
  const record = [];

  scl.subscribe(subscribeHeaders, (err, message) => {
    if (err) return cb(err);

    message.readString ('utf-8', (err, body) => {
      clearTimeout(timer);
      if (err) return cb(err);
      const obj = JSON.parse (body);

      if (record.length >= tries) {
        scl.ack (message);
        cb (null, record);
      }
      else {
        record.push ({
          body: obj,
          headers: message.headers
        });

        scl.nack (message);
      }
    });
  });
}


////////////////////////////////////////////////////////
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
  'stream_mongo',
], namespace => {
  describe('STOMP operations on streams, namespace ' + namespace, () => {


    ////////////////////////////////////////////////////////
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


    ////////////////////////////////////////////////////////
    after(done => {
      stomp_server.end (() => setTimeout (done, 1000));
    });


    ////////////////////////////////////////////////////////
    it('does push/pop with 3 consumers ok', done => {
      const q = `/q/${namespace}/stomp_test_stream`;
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
 
        async.parallel ([
          cb => async.parallel ([
            cb => subscribe_and_get (cl, q, 'G1', cb),
            cb => subscribe_and_get (cl, q, 'G2', cb),
            cb => subscribe_and_get (cl, q, 'G3', cb),
          ], cb),
          cb => async.series ([
            cb => setTimeout(cb, 100),
            cb => send_obj (cl, q, msg, cb)
          ], cb)
        ], (err, res) => {
          cl.disconnect();
          if (err) return done(err);

          res[0].should.eql ([
            { a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } },
            { a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } },
            { a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } }
          ]);

          done();
        });
      });
    });


    ////////////////////////////////////////////////////////
    it('does timeout on unknown group consumer', done => {
      const q = `/q/${namespace}/stomp_test_stream`;
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
 
        async.parallel ([
          cb => async.parallel ([
            cb => subscribe_and_get (cl, q, 'G1', cb),
            cb => subscribe_and_get (cl, q, 'G2', cb),
            cb => subscribe_and_get (cl, q, 'G3', cb),
            cb => subscribe_and_get (cl, q, 'G4', cb),
            cb => subscribe_and_get (cl, q, 'G5', cb),
          ], cb),
          cb => async.series ([
            cb => setTimeout(cb, 100),
            cb => send_obj (cl, q, msg, cb)
          ], cb)
        ], (err, res) => {
          cl.disconnect();
          if (err) return done(err);

          res[0].should.eql ([
            { a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } },
            { a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } },
            { a: 'aaa', b: 666, c: { ca: 'rtrtr', cb: {} } },
            "--timeout--",
            "--timeout--",

          ]);

          done();
        });
      });
    });


    ////////////////////////////////////////////////////////
    it ('honors independent retries with delays just fine', done => {
      const q = `/q/${namespace}/stomp_test_stream`;
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
 
        async.parallel ([
          cb => async.parallel ([
            cb => subscribe_and_get_with_retries (cl, q, 'G1', 3, cb),
            cb => subscribe_and_get_with_retries (cl, q, 'G2', 3, cb),
            cb => subscribe_and_get_with_retries (cl, q, 'G3', 3, cb),
          ], cb),
          cb => async.series ([
            cb => setTimeout(cb, 100),
            cb => send_obj (cl, q, msg, cb)
          ], cb)
        ], (err, res) => {
          cl.disconnect();
          if (err) return done(err);

          res[0].forEach(r => {
            _.each (r, (trie, count) => {
              trie.body.should.eql (msg);
              trie.headers.should.match ({
                subscription: /.+/,
                'message-id': /.+/,
                destination: 'stomp_test_stream',
                'x-mature': /.+/,
                'x-tries': count + '',
                'content-type': 'application/json',
                'content-length': 46
              });
            })
          })

          done();
        });
      });
    });
    
  });
});
