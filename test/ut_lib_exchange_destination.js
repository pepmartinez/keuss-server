const should = require('should');
const async =  require('async');
const _ =      require('lodash');


const Destination = require ('../lib/exchange/Destination');

class mock_q {
  constructor (name) {
    this._name = name;
  }

  push (payload, opts, cb) {
    this._payload = payload;
    this._opts = opts;
    cb ();
  }

  status () {return {payload: this._payload, opts: this._opts}}
}

const VERBOSE = false;
const logger = {
  _do_log (...args) { if (VERBOSE) console.log (...args)  },
  info (...args)    {this._do_log (...args)},
  verbose (...args) {this._do_log (...args)},
  error (...args)   {this._do_log (...args)},
  debug (...args)   {this._do_log (...args)}
}


should.config.checkProtoEql = false;


//////////////////////////////////////////////////////////////////////////////////////////////////////////
describe('Unit tests on lib/exchange/Destination class', () => {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  before (done => {
    done();
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  after(done => {
    done();
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe('Creation', () => {
    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('creates ok with null selector', done => {
      const d = new Destination ('someone', new mock_q (), null, logger);
      done ();
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('creates ok with undefined selector', done => {
      const d = new Destination ('someone', new mock_q (), undefined, logger);
      done ();
    });
 
    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('creates ok with function selector', done => {
      const d = new Destination ('someone', new mock_q (), msg => msg.hdrs.aaa.match (/^xxxxx/), logger);
      done ();
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('creates ok with string selector with a correct expression', done => {
      const d = new Destination ('someone', new mock_q (), 'msg => (msg.hdrs["abc"] == "66")', logger);
      done ();
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('creates ok with wrong-type selector', done => {
      const d = new Destination ('someone', new mock_q (), 666, logger);
      done ();
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('fails on creation if selector is a string containing a wrong expression', done => {
      try {
        const d = new Destination ('someone', new mock_q (), 'a++3', logger);
        done ('did not fail');
      }
      catch (e) {
        e.toString ().should.match (/Unexpected number/);
        done();
      }
    });
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe('apply() behaviour', () => {
    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('applies when null selector specified', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, null, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.true();
        q.status ().should.eql ({payload: item.payload, opts: {hdrs: item.hdrs}});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('applies when wrong-type selector specified', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, 666, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.true();
        q.status ().should.eql ({payload: item.payload, opts: {hdrs: item.hdrs}});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('applies when fn selector returns true', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, env => (env.msg.hdrs.a==123), logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.true();
        q.status ().should.eql ({payload: item.payload, opts: {hdrs: item.hdrs}});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('applies when string selector returns true', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, 'env => (env.msg.hdrs.a==123)', logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.true();
        q.status ().should.eql ({payload: item.payload, opts: {hdrs: item.hdrs}});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('does not apply when fn selector returns false', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, env => (env.msg.hdrs.a==456), logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.false();
        q.status ().should.eql ({payload: undefined, opts: undefined});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('does not apply when string selector returns false', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, 'env => (env.msg.hdrs.a==555)', logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.false();
        q.status ().should.eql ({payload: undefined, opts: undefined});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('does not apply when fn selector throws', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, env => {throw new Error ('thown error')}, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.false();
        q.status ().should.eql ({payload: undefined, opts: undefined});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('does not apply when string selector throws', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, `env => {throw new Error ('thown error')}`, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.false();
        q.status ().should.eql ({payload: undefined, opts: undefined});
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('use opts from selector (fn) to insert in dst', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, () => {return {mature:333, delay: 6, tries: 2, aaa: 5656}}, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.eql ({mature:333, delay: 6, tries: 2, aaa: 5656});
        q.status ().should.eql ({
          payload: 'abd',
          opts: { hdrs: { a: 123 }, mature: 333, delay: 6, tries: 2 }
        });
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('use opts from selector (string) to insert in dst', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, '() => {return {mature:333, delay: 6, tries: 2, aaa: 5656}}', logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      d.apply (item, {}, (err, res) => {
        (_.isNil (err)).should.be.true();
        should (res).eql ({mature:333, delay: 6, tries: 2, aaa: 5656});
        q.status ().should.eql ({
          payload: 'abd',
          opts: { hdrs: { a: 123 }, mature: 333, delay: 6, tries: 2 }
        });
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('keeps state correctly on fn selector', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, env => {env.state.cnt = {a:22, b: '666'}; return true;}, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      const state = {};

      d.apply (item, state, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.eql (true);
        q.status ().should.eql ({ payload: 'abd', opts: { hdrs: { a: 123 }} });
        state.should.eql ({ cnt: { a: 22, b: '666' } });
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('keeps state correctly on string selector', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, `env => {env.state.cnt = {a:22, b: '666'}; return true;}`, logger);
      const item = { payload: 'abd', hdrs: { a: 123 } };

      const state = {};

      d.apply (item, state, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.eql (true);
        q.status ().should.eql ({ payload: 'abd', opts: { hdrs: { a: 123 }} });
        state.should.eql ({ cnt: { a: 22, b: '666' } });
        done ();
      })
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('modifies message correctly on fn selector', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, env => {env.msg.payload.aaa = 666; env.msg.hdrs['a-b-c'] = 1234; return true;}, logger);
      const item = { payload: {aaa: 'abd'}, hdrs: { a: 123 } };

      const state = {};

      d.apply (item, state, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.true();
        q.status ().should.eql ({ payload: {aaa: 666}, opts: { hdrs: { a: 123, 'a-b-c': 1234 }} });
        state.should.eql ({});
        done ();
      });
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('modifies message correctly on string selector', done => {
      const q = new mock_q ();
      const d = new Destination ('someone', q, `env => {env.msg.payload.aaa = 666; env.msg.hdrs['a-b-c'] = 1234; return true;}`, logger);
      const item = { payload: {aaa: 'abd'}, hdrs: { a: 123 } };

      const state = {};

      d.apply (item, state, (err, res) => {
        (_.isNil (err)).should.be.true();
        res.should.be.true();
        q.status ().should.eql ({ payload: {aaa: 666}, opts: { hdrs: { a: 123, 'a-b-c': 1234 }} });
        state.should.eql ({});
        done ();
      });
    });

  });
});
