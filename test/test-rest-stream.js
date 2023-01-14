const should =  require('should');
const async =   require('async');
const request = require('supertest');
const _ =       require('lodash');

const BaseApp = require ('../app');
const Scope =   require ('../Scope');

let theApp = null;

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


/*
opts: {
  delay:   msecs,
}
*/
function put_msg(namespace, q, msg, opts, cb) {
  if (!cb) cb = opts;
  const qry = _.merge ({groups: 'G1,G2,G3'}, opts);
  request(theApp)
    .put('/q/' + namespace + '/' + q)
    .send(msg)
    .auth('test', 'toast')
    .query (qry)
    .expect(200)
    .end((err, res) => {
      cb(err, res && res.body);
    });
}


/*
opts: {
  expect: http rescode to expect
  raw: return raw instead of just body
  delay:   msecs,
  to:    timeout in msecs,
}
*/
function get_msg(namespace, q, gr, opts, cb) {
  if (!cb) cb = opts;
  const qry = _.merge ({}, opts, {group: gr});
  request(theApp)
    .get('/q/' + namespace + '/' + q)
    .expect(opts.expect || 200)
    .auth('test', 'toast')
    .query (qry)
    .end((err, res) => {
      cb(err, opts.raw ? res : (res && res.body));
    });
}

/*
opts: {
}
*/
function commit_msg(namespace, q, gr, id, opts, cb) {
  if (!cb) cb = opts;
  const qry = _.merge ({}, opts, {group: gr});
  request(theApp)
    .patch(`/q/${namespace}/${q}/commit/${id}`)
    .expect(200)
    .auth('test', 'toast')
    .query (qry)
    .end((err, res) => {
      cb(err, res && res.body);
    });
}


/*
opts: {
  delay: delay in millisecs
}
*/
function rollback_msg(namespace, q, gr, id, opts, cb) {
  if (!cb) cb = opts;
  const qry = _.merge ({delay: 1000}, opts, {group: gr});
  request(theApp)
    .patch(`/q/${namespace}/${q}/rollback/${id}`)
    .expect(200)
    .auth('test', 'toast')
    .query (qry)
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


    //////////////////////////////////////////////////////////////////////////
    it('does push/pop with 3 consumers ok', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      const t0 = new Date().getTime();

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
        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(1000, 500);

        allres[0][0].should.eql(msg);
        allres[0][1].should.eql(msg);
        allres[0][2].should.eql(msg);
        done(err);
      });
    });


    //////////////////////////////////////////////////////////////////////////
    it('does timeout on unknown group consumer', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };

      const t0 = new Date().getTime();

      async.parallel([
        cb => async.parallel ([
          cb => get_msg(namespace, 'q1', 'G1', cb),
          cb => get_msg(namespace, 'q1', 'G2', cb),
          cb => get_msg(namespace, 'q1', 'G3', cb),
          cb => get_msg(namespace, 'q1', 'G9', {to: 3000, expect: 504}, cb),
          cb => get_msg(namespace, 'q1', 'AAA', {to: 2000, expect: 504}, cb),
        ], cb),
        cb => async.series ([
          cb => setTimeout (cb, 1000),
          cb => put_msg(namespace, 'q1', msg, cb),
        ], cb),
      ], (err, allres) => {
        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(3000, 500);

        allres[0][0].should.eql(msg);
        allres[0][1].should.eql(msg);
        allres[0][2].should.eql(msg);
        allres[0][3].timeout.should.equal (true);
        allres[0][4].timeout.should.equal (true);
        done(err);
      });
    });

    
    //////////////////////////////////////////////////////////////////////////
    it ('honors independent retries with delays just fine', done => {
      const msg = {
        a: 'aaa',
        b: 666,
        c: {
          ca: 'rtrtr',
          cb: {}
        }
      };
      
      const t0 = new Date().getTime();

      async.parallel([
        cb => async.parallel ([
          cb => {
            const scope = {};
            async.series ([
              cb => get_msg(namespace, 'q1', 'G1', {reserve: true, raw: true}, (err, res) => {scope.reserve = res; cb (err, res && res.body)}),
              cb => setTimeout (cb, 100),
              cb => rollback_msg(namespace, 'q1', 'G1', scope.reserve.headers['x-ks-id'], {delay: 4000}, cb),
              cb => get_msg(namespace, 'q1', 'G1', {reserve: true, raw: true}, (err, res) => {scope.reserve = res; cb (err, res && res.body)}),
              cb => setTimeout (cb, 100),
              cb => commit_msg(namespace, 'q1', 'G1', scope.reserve.headers['x-ks-id'], cb),
            ], cb);
          },
          cb => {
            const scope = {};
            async.series ([
              cb => get_msg(namespace, 'q1', 'G2', {reserve: true, raw: true}, (err, res) => {scope.reserve = res; cb (err, res && res.body)}),
              cb => setTimeout (cb, 100),
              cb => rollback_msg(namespace, 'q1', 'G2', scope.reserve.headers['x-ks-id'], {delay: 5000}, cb),
              cb => get_msg(namespace, 'q1', 'G2', {reserve: true, raw: true}, (err, res) => {scope.reserve = res; cb (err, res && res.body)}),
              cb => setTimeout (cb, 100),
              cb => commit_msg(namespace, 'q1', 'G2', scope.reserve.headers['x-ks-id'], cb),
            ], cb);
          },
          cb => {
            const scope = {};
            async.series ([
              cb => get_msg(namespace, 'q1', 'G3', {reserve: true, raw: true}, (err, res) => {scope.reserve = res; cb (err, res && res.body)}),
              cb => setTimeout (cb, 100),
              cb => rollback_msg(namespace, 'q1', 'G3', scope.reserve.headers['x-ks-id'], {delay: 3000}, cb),
              cb => get_msg(namespace, 'q1', 'G3', {reserve: true, raw: true}, (err, res) => {scope.reserve = res; cb (err, res && res.body)}),
              cb => setTimeout (cb, 100),
              cb => commit_msg(namespace, 'q1', 'G3', scope.reserve.headers['x-ks-id'], cb),
            ], cb);
          },
        ], cb),
        cb => async.series ([
          cb => setTimeout (cb, 1000),
          cb => put_msg(namespace, 'q1', msg, cb),
        ], cb),
      ], (err, allres) => {
        const t1 = new Date().getTime();
        (t1 - t0).should.be.approximately(6000, 500);

        allres[0][0][0].should.eql(msg);
        allres[0][0][3].should.eql(msg);
        allres[0][1][0].should.eql(msg);
        allres[0][1][3].should.eql(msg);
        allres[0][2][0].should.eql(msg);
        allres[0][2][3].should.eql(msg);
        done(err);
      });
    });


  });
});
