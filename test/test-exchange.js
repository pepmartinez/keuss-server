const should =  require('should');
const async =   require('async');
const _ =       require('lodash');
const Log =     require('winston-log-space');
const request = require('supertest');
const { mapKeys } = require('lodash');

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
        selector: `env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-already/)`
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
          env.msg.payload.c = 666;
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
          env.msg.payload.c = 999;
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

_.forEach(['q_push', 'q_pop', 'q_reserve', 'q_commit', 'q_rollback'], i => {
  metrics['keuss_' + i] = {
    labels: () => {
      return {
        inc: () => {}
      };
    }
  };
});


[
  config_pop,
  config_reserve
].forEach (config => {
  describe(`Exchanges in ${config.mode} mode`, () => {
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
            dst: { 
              q: 'stage_c', 
              ns: 'ns1' 
            } 
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

        cb => put_msg('ns1', 'stage_a', {a:'144', b: 144}, {'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),
        cb => put_msg('ns1', 'stage_a', {a:'288', b: 288}, {'x-ks-hdr-extra-hdr': 'qwertyuiop'}, cb),

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
          body: { a: '144', b: 144, c: 666 },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',
          }
        });

        allres[7].should.match ({
          body: { a: '288', b: 288, c: 666 },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',
          }
        });

        allres[8].should.match ({
          body: { a: '144', b: 144, c: 999 },
          hdrs: {
            'x-ks-hdr-extra-hdr': 'qwertyuiop',
            'x-ks-hdr-x-hop-count': '2',
            'x-ks-hdr-dolkaren': 'asdfghjk',

          }
        });

        allres[9].should.match ({
          body: { a: '288', b: 288, c: 999 },
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
