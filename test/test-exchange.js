const should =  require('should');
const async =   require('async');
const _ =       require('lodash');
const Log =     require('winston-log-space');
const request = require('supertest');

const context = {};


const config_pop = {
  mode: 'pop',
  http: {
    users: {
      'test': 'toast'
    }
  },
  stats: {
    mongo: {
      factory: 'mongo',
      config: {
        url:  'mongodb://localhost/keuss_stats',
        coll: 'keuss_stats'
      }
    }
  },
  signallers: {
    mongo: {
      factory: 'mongo-capped',
      config: {
        mongo_url: 'mongodb://localhost/keuss_signal',
        mongo_opts: {},
        channel: 'default',
      }
    }
  },
  namespaces: {
    ns1: {
      factory: 'mongo',
      disable: false,
      config: {
        url: 'mongodb://localhost/ns1_data',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    ns2: {
      factory: 'mongo',
      disable: false,
      config: {
        url: 'mongodb://localhost/ns2_data',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
  },
  exchanges: {
    e1: {
      src: {
        ns: 'ns1',
        queue: 'ex_test_source',
      },
      dst: [{
        ns: 'ns1',
        queue: 'ex_test_dest',
        selector: env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-/)),
      },
      {
        ns: 'ns2',
        queue: 'ex_test_dest',
        selector: `env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-already/))`
      }]
    },

    loop_a :{
      src: {
        ns: 'ns1',
        queue: 'loop_0',
      },
      dst: [{
        ns: 'ns1',
        queue: 'loop_1',
        selector: env => {return {delay: 1}},
      }]
    },
    loop_b :{
      src: {
        ns: 'ns1',
        queue: 'loop_1',
      },
      dst: [{
        ns: 'ns1',
        queue: 'loop_0',
        selector: env => {return {delay: 1}},
      }]
    },

    stage_1:{
      src: {
        ns: 'ns1',
        queue: 'stage_a',
      },
      dst: [{
        ns: 'ns1',
        queue: 'stage_b1',
        selector: env => {
          if (!env.state.ct) env.state.ct = 0;
          env.state.ct++;
          env.msg.hdrs.dolkaren = 'asdfghjk';
          env.msg.hdrs.ct = 'from stage_b1 ' + env.state.ct;
          env.msg.payload.c = 'extra-666';
          return true;
        }
      },
      {
        ns: 'ns1',
        queue: 'stage_b2',
        selector: env => {
          if (!env.state.ct) env.state.ct = 0;
          env.state.ct++;
          env.msg.hdrs.dolkaren = 'asdfghjk';
          env.msg.hdrs.ct = 'from stage_b2 ' + env.state.ct;
          env.msg.payload.c = 'extra-999';
          return true;
        }
      }]
    },
    stage_2a: {
      src: {
        ns: 'ns1',
        queue: 'stage_b1',
      },
      dst: [{
        ns: 'ns1',
        queue: 'stage_c'
      }]
    },
    stage_2b: {
      src: {
        ns: 'ns1',
        queue: 'stage_b2',
      },
      dst: [{
        ns: 'ns1',
        queue: 'stage_c'
      }]
    },

  },
  main: {
    max_hops: 7
  }
};

const config_reserve = _.cloneDeep (config_pop);
config_reserve. mode = 'reserve';
_.each (config_reserve.exchanges, v => v.consumer = { reserve: true});


function put_msg (namespace, q, msg, hdrs, cb) {
  request(context.app)
    .put('/q/' + namespace + '/' + q)
    .set (hdrs)
    .send(msg)
    .auth('test', 'toast')
    .expect(200)
    .end(function (err, res) {
      cb(err, res && res.body);
    });
}

function get_msg (namespace, q, cb) {
  request(context.app)
    .get('/q/' + namespace + '/' + q)
    .expect(200)
    .auth('test', 'toast')
    .end(function (err, res) {
      cb(err, {body: res && res.body, text: res && res.text,  hdrs: res && res.headers});
    });
}

function _get_body (cb) {
  return function (err, res) {
    if (err) return cb(err);
    return cb (null, res.body);
  }
}

function get_status (namespace, q, cb) {
  request(context.app)
  .get('/q/' + namespace + '/' + q + '/status')
  .expect(200)
  .auth('test', 'toast')
  .end(_get_body (cb));
}

const metrics = {
};

_.forEach(['q_push', 'q_pop', 'q_reserve', 'q_commit', 'q_rollback', 'exchange_hops'], i => {
  metrics['keuss_' + i] = {
    labels: () => {
      return {
        inc: () => {},
        observe: () =>  {}
      };
    }
  };
});


[
  config_pop,
  config_reserve
].forEach (config => {
  describe(`Static exchanges in ${config.mode} mode`, () => {
    before (done => {
    //    Log.init (() => {
        const BaseApp = require ('../app');
        const Scope =   require ('../Scope');

        context.config = config;
        context.scope = new Scope ();

        async.series ([
          cb => BaseApp (config, context, null, (err, app) => {
            if (err) return cb (err);
            context.app = app;
            context.promster = context.app.locals.Prometheus;
            cb ();
          }),
          cb => {context.metrics = metrics; cb ();},
          cb => context.scope.init (config, context, cb),
          cb => context.scope.start (cb)
        ], done);
    //    });
    });

    after(done => {
      context.app.locals.Prometheus.register.clear();
      async.series ([
        cb => context.scope.drain (cb),
        cb => context.scope.end (cb),
      ], done);
    });

    it ('returns proper list as array', done => {
      request(context.app)
      .get('/x?array=1')
      .expect(200)
      .auth('test', 'toast')
      .end((err, res) => {
        if (err) return done (err);
        res.body.data.map (i => i.id).should.eql ([ 'e1', 'loop_a', 'loop_b', 'stage_1', 'stage_2a', 'stage_2b' ]);
        done();
      });
    });

    it ('returns proper list as list', done => {
      request(context.app)
      .get('/x')
      .expect(200)
      .auth('test', 'toast')
      .end((err, res) => {
        if (err) return done (err);
        _.map (res.body, (v, k) => k).should.eql ([ 'e1', 'loop_a', 'loop_b', 'stage_1', 'stage_2a', 'stage_2b' ]);
        done();
      });
    });


    it ('returns proper status', done => {
      request(context.app)
      .get('/x/stage_2b')
      .expect(200)
      .auth('test', 'toast')
      .end((err, res) => {
        if (err) return done (err);
        res.body.should.match ({
          src: { 
            q: 'stage_b2', 
            ns: 'ns1' 
          },
          dst: [{ 
            q: 'stage_c', 
            ns: 'ns1' 
          }],
          opts: (config.mode == 'reserve' ? { reserve: true } : {}),
          cid: /.+/,
          pending_acks: {},
          pending_tids: {
          },
          wsize: 1000
        });

        done();
      });
    });

    it ('propagates to all dests', done => {
      async.series([
        cb => get_status ('ns1', 'ex_test_source', cb),
        cb => get_status ('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns2', 'ex_test_dest', cb),
        cb => put_msg('ns1', 'ex_test_source', {a:'144', b: 144}, {'x-ks-hdr-aaa': 'yes-already-one', 'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),
        cb => get_msg('ns1', 'ex_test_dest', cb),
        cb => get_msg('ns2', 'ex_test_dest', cb),
        cb => get_status ('ns1', 'ex_test_source', cb),
        cb => get_status ('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns2', 'ex_test_dest', cb),
        cb => get_status ('ns1', '__no_route__', cb),
      ], (err, allres) => {
        allres[0].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[1].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[2].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});

        allres[3].should.match ({id: /.+/});

        allres[4].should.match ({
          body: { a: '144', b: 144 },
          hdrs: {
            'x-ks-tries': '0',
            'x-ks-mature': /.+/,
            'x-ks-id': /.+/,
            'content-type': 'application/json; charset=utf-8',
            'x-ks-hdr-aaa': 'yes-already-one',
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '1',
            'content-length': '19'
          }
        });

        allres[5].should.match ({
          body: { a: '144', b: 144 },
          hdrs: {
            'x-ks-tries': '0',
            'x-ks-mature': /.+/,
            'x-ks-id': /.+/,
            'content-type': 'application/json; charset=utf-8',
            'x-ks-hdr-aaa': 'yes-already-one',
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '1',
            'content-length': '19'
          }
        });

        allres[6].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[7].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[8].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[9].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        done(err);
      });
    });

    it ('propagates to only one dest', done => {
      async.series([
        cb => get_status ('ns1', 'ex_test_source', cb),
        cb => get_status ('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns2', 'ex_test_dest', cb),
        cb => put_msg('ns1', 'ex_test_source', {a:'144', b: 144}, {'x-ks-hdr-aaa': 'yes-one', 'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),
        cb => get_msg('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns1', 'ex_test_source', cb),
        cb => get_status ('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns2', 'ex_test_dest', cb),
        cb => get_status ('ns1', '__no_route__', cb),
      ], (err, allres) => {
        allres[0].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[1].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[2].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});

        allres[3].should.match ({id: /.+/});

        allres[4].should.match ({
          body: { a: '144', b: 144 },
          hdrs: {
            'x-ks-tries': '0',
            'x-ks-mature': /.+/,
            'x-ks-id': /.+/,
            'content-type': 'application/json; charset=utf-8',
            'x-ks-hdr-aaa': 'yes-one',
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '1',
            'content-length': '19'
          }
        });

        allres[5].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[6].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[7].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[8].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        done(err);
      });
    });

    it ('propagates to no dest, moves to __no_route__', done => {
      async.series([
        cb => get_status ('ns1', 'ex_test_source', cb),
        cb => get_status ('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns2', 'ex_test_dest', cb),
        cb => put_msg('ns1', 'ex_test_source', {a:'144', b: 144}, {'x-ks-hdr-aaa': 'nope', 'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),
        cb => get_msg('ns1', '__no_route__', cb),
        cb => get_status ('ns1', 'ex_test_source', cb),
        cb => get_status ('ns1', 'ex_test_dest', cb),
        cb => get_status ('ns2', 'ex_test_dest', cb),
        cb => get_status ('ns1', '__no_route__', cb),
      ], (err, allres) => {
        allres[0].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[1].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[2].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});

        allres[3].should.match ({id: /.+/});

        allres[4].should.match ({
          body: { a: '144', b: 144 },
          hdrs: {
            'x-ks-tries': '0',
            'x-ks-mature': /.+/,
            'x-ks-id': /.+/,
            'content-type': 'application/json; charset=utf-8',
            'x-ks-hdr-aaa': 'nope',
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '1',
            'x-ks-hdr-x-exchange-name': 'e1',
            'content-length': '19'
          }
        });

        allres[5].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[6].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[7].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[8].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        done(err);
      });
    });


    it ('loops over exchanges, ends in __too_many_hops__', done => {
      async.series([
        cb => get_status ('ns1', 'loop_0', cb),
        cb => get_status ('ns1', 'loop_1', cb),
        cb => put_msg('ns1', 'loop_0', {a:'144', b: 144}, {'x-ks-hdr-aaa': 'nope', 'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),
        cb => get_msg('ns1', '__too_many_hops__', cb),
        cb => get_status ('ns1', 'loop_0', cb),
        cb => get_status ('ns1', 'loop_1', cb),
        cb => get_status ('ns1', '__too_many_hops__', cb),
      ], (err, allres) => {
        allres[0].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[1].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});

        allres[2].should.match ({id: /.+/});

        allres[3].should.match ({
          body: { a: '144', b: 144 },
          hdrs: {
            'x-ks-tries': '0',
            'x-ks-mature': /.+/,
            'x-ks-id': /.+/,
            'content-type': 'application/json; charset=utf-8',
            'x-ks-hdr-aaa': 'nope',
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '7',
            'x-ks-hdr-x-exchange-name': 'loop_b',
            'content-length': '19'
          }
        });

        allres[4].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[5].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[6].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        done(err);
      });
    });


    it ('does graphs, keeps state and modifies mesg', done => {
      async.series([
        cb => get_status ('ns1', 'stage_a', cb),
        cb => get_status ('ns1', 'stage_b1', cb),
        cb => get_status ('ns1', 'stage_b2', cb),
        cb => get_status ('ns1', 'stage_c', cb),

        cb => put_msg('ns1', 'stage_a', {a:'144'}, {'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),
        cb => put_msg('ns1', 'stage_a', {a:'288'}, {'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),

        cb => get_msg('ns1', 'stage_c', cb),
        cb => get_msg('ns1', 'stage_c', cb),
        cb => get_msg('ns1', 'stage_c', cb),
        cb => get_msg('ns1', 'stage_c', cb),

        cb => get_status ('ns1', 'stage_a', cb),
        cb => get_status ('ns1', 'stage_b1', cb),
        cb => get_status ('ns1', 'stage_b2', cb),
        cb => get_status ('ns1', 'stage_c', cb),
      ], (err, allres) => {
        allres[0].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[1].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[2].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[3].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});

        allres[4].should.match ({id: /.+/});
        allres[5].should.match ({id: /.+/});

        allres[6].should.match ({
          body: { a: /.+/, c: /^extra-/ },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',
          }
        });

        allres[7].should.match ({
          body: { a: /.+/, c: /^extra-/ },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',
          }
        });

        allres[8].should.match ({
          body: { a: /.+/, c: /^extra-/ },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',

          }
        });

        allres[9].should.match ({
          body: { a: /.+/, c: /^extra-/ },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',
          }
        });

        allres[10].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[11].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[12].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        allres[13].should.match ({size: 0, totalSize: 0, schedSize: 0, resvSize: 0});
        done(err);
      });
    });

  });
});

describe(`REST mgmt of exchanges`, () => {
  before (done => {
//        Log.init (() => {
        const BaseApp = require ('../app');
        const Scope =   require ('../Scope');

        context.config = config_pop;
        context.scope = new Scope ();

        async.series ([
          cb => BaseApp (config_pop, context, null, (err, app) => {
            if (err) return cb (err);
            context.app = app;
            context.promster = context.app.locals.Prometheus;
            cb ();
          }),
          cb => {context.metrics = metrics; cb ();},
          cb => context.scope.init (config_pop, context, cb),
          cb => context.scope.start (cb)
        ], done);
//        });
    });

    after(done => {
      context.app.locals.Prometheus.register.clear();
      async.series ([
        cb => context.scope.drain (cb),
        cb => context.scope.end (cb),
      ], done);
    });


    it ('lists exchanges as tree allright', done => {
      request(context.app)
      .get('/x')
      .auth('test', 'toast')
      .expect(200)
      .end((err, res) => {
        if (err) return done (err);
        const body = res && res.body;

        _.keys (body).should.match ([ 'e1', 'loop_a', 'loop_b', 'stage_1', 'stage_2a', 'stage_2b' ]);

        _.each (body, v => {
          v.should.have.property ('src');
          v.should.have.property ('dst');
          v.should.have.property ('opts');
          v.should.have.property ('cid');
          v.should.have.property ('pending_acks');
          v.should.have.property ('pending_tids');
          v.should.have.property ('wsize');
        });

        done ();
      });
    });


    it ('lists exchanges as array allright', done => {
      request(context.app)
      .get('/x')
      .query({array: 1})
      .auth('test', 'toast')
      .expect(200)
      .end((err, res) => {
        if (err) return done (err);
        const body = res && res.body;

        _.map (body.data, v => v.id).should.match ([ 'e1', 'loop_a', 'loop_b', 'stage_1', 'stage_2a', 'stage_2b' ]);

        _.each (body.data, v => {
          v.should.have.property ('id');
          v.should.have.property ('src');
          v.should.have.property ('dst');
          v.should.have.property ('opts');
          v.should.have.property ('cid');
          v.should.have.property ('pending_acks');
          v.should.have.property ('pending_tids');
          v.should.have.property ('wsize');
        });

        done ();
      });
    });


    it ('gets exchange allright', done => {
      request(context.app)
      .get('/x/stage_2a')
      .auth('test', 'toast')
      .expect(200)
      .end((err, res) => {
        if (err) return done (err);
        const body = res && res.body;

        body.should.match ({
          src: { q: 'stage_b1', ns: 'ns1' },
          dst: [ { q: 'stage_c', ns: 'ns1' } ],
          opts: {},
          cid: /.+/,
          pending_acks: {},
          pending_tids: {},
          wsize: 1000
        });

        done ();
      });
    });


    it ('fails to get exchange if does not exist', done => {
      request(context.app)
      .get('/x/unknown_xchg')
      .auth('test', 'toast')
      .expect(404)
      .end((err, res) => {
        if (err) return done (err);
        res.text.should.equal ('no such exchange [unknown_xchg]');
        done ();
      });
    });


    it ('fails to create if wrong schema (missing bits)', done => {
      request(context.app)
      .put('/x/stage_new')
      .auth('test', 'toast')
      .send ({
        src: { ns: 'N', queue: 'zon' }
      })
      .expect(400)
      .end((err, res) => {
        if (err) return done (err);
        res.body.details.should.eql ([{
          message: '"dst" is required',
          path: [ 'dst' ],
          type: 'any.required',
          context: { label: 'dst', key: 'dst' }
        }]);

        done ();
      });
    });


    it ('fails to create if src ns does not exist', done => {
      request(context.app)
      .put('/x/stage_new')
      .auth('test', 'toast')
      .send ({
        src: { ns: 'unknown_ns', queue: 'q000' },
        dst: [ ]
      })
      .expect(404)
      .end((err, res) => {
        if (err) return done (err);
        res.text.should.equal ('namespace unknown_ns not defined');
        done ();
      });
    });


    it ('fails to create (deferred) if dst ns does not exist', done => {
      request(context.app)
      .put('/x/stage_new')
      .auth('test', 'toast')
      .send ({
        src: { ns: 'ns1', queue: 'q000' },
        dst: [ { ns: 'unknown_ns', queue: 'q001' }]
      })
      .expect(201)
      .end((err, res) => {
        if (err) return done (err);
        async.series ([
          cb => setTimeout (cb, 555),
          cb => request(context.app).get('/x/stage_new').auth('test', 'toast').expect(404).end(cb)
         ], (err, res) => {
          done (err);
         });
      });
    });


    it ('fails to create if exchange exists already', done => {
      request(context.app)
      .put('/x/loop_a')
      .auth('test', 'toast')
      .send ({
        src: { ns: 'ns1', queue: 'q000' },
        dst: [ { ns: 'ns2', queue: 'q001' } ]
      })
      .expect(409)
      .end((err, res) => {
        if (err) return done (err);
        res.text.should.equal ('exchange loop_a already exists');
        done ();
      });
    });


    it ('creates exchange allright', done => {
      request(context.app)
      .put('/x/stage_new')
      .auth('test', 'toast')
      .send ({
        src: { ns: 'ns1', queue: 'q000' },
        dst: [ { ns: 'ns2', queue: 'q001' } ]
      })
      .expect(201)
      .end((err, res) => {
        if (err) return done (err);
         async.series ([
          cb => setTimeout (cb, 555),
          cb => request(context.app).get('/x/stage_new').auth('test', 'toast').expect(200).end(cb)
         ], (err, res) => {
          res[1].body.should.match ({
            src: { q: 'q000', ns: 'ns1' },
            dst: [ { ns: 'ns2', q: 'q001' } ],
            opts: {},
            cid: /.+/,
            pending_acks: {},
            pending_tids: {},
            wsize: 1000
          });

          done (err);
         });
      });
    });

    it ('fails to delete if exchange does not exist', done => {
      request(context.app)
      .delete('/x/unknown-ns')
      .auth('test', 'toast')
      .send ({
        src: { ns: 'ns1', queue: 'q000' },
        dst: [ { ns: 'ns2', queue: 'q001' } ]
      })
      .expect(404)
      .end((err, res) => {
        if (err) return done (err);
        res.text.should.equal ('exchange unknown-ns does not exist');
        done ();
      });
    });

    it ('deletes exchange allright', done => {
      async.series ([
        cb => request(context.app)
          .put('/x/stage_transient')
          .auth('test', 'toast')
          .send ({
            src: { ns: 'ns1', queue: 'q000' },
            dst: [ { ns: 'ns2', queue: 'q001' } ]
          })
          .expect(201)
          .end (cb),
        cb => setTimeout (cb, 555),
        cb => request(context.app).get('/x/stage_transient').auth('test', 'toast').expect(200).end(cb),
        cb => request(context.app).delete('/x/stage_transient').auth('test', 'toast').expect(201).end(cb),
        cb => setTimeout (cb, 555),
        cb => request(context.app).get('/x/stage_transient').auth('test', 'toast').expect(404).end(cb),
      ], (err, res) => {
        if (err) return done (err);
        res[2].body.should.match ({
          src: { q: 'q000', ns: 'ns1' },
          dst: [ { ns: 'ns2', q: 'q001' } ],
          opts: {},
          cid: /.+/,
          pending_acks: {},
          pending_tids: {},
          wsize: 1000
        });

        res[5].text.should.equal ('no such exchange [stage_transient]');
        done (err);
      });
    });

});
