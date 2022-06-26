const _ =        require ('lodash');
const async =    require ('async');
const uuid =     require ('uuid');
const Log =      require ('winston-log-space');
const evaluate = require ('static-eval');
const parse =    require ('esprima').parse;


class Destination {
  ///////////////////////////////////////////
  constructor (name, q, selector, logger) {
    this._name = name || q.name ();
    this._q = q;
    this._selector_str = selector;
    this._logger = logger;

    if (selector && _.isString (selector)) {
      this._logger.verbose ('Destination [%s]: parsing selector [%s]', this._name, selector);

      try {
        this._selector_ast = parse (selector).body[0].expression;
      }
      catch (e) {
        throw new Error (`parse error in line ${e.lineNumber}, pos ${e.index} : ${e.description}`);
      }
    }

    this._logger.verbose ('Destination [%s]: created', this._name);
  }


  ///////////////////////////////////////////
  apply (item, cb) {
    let really_apply = (!this._selector_ast);

    if (this._selector_ast) {
      try {
        this._logger.verbose ('eval on %j', item)
        really_apply = evaluate (this._selector_ast, {msg: item});
        this._logger.verbose ('eval is %j', really_apply)
      }
      catch (e) {
        this._logger.error (e);
        really_apply = false;
      }
    }

    if (really_apply) {
      this._logger.verbose ('Destination [%s]: really apply', this._name);
      this._q.push (item.payload, {hdrs: item.hdrs}, cb);
    }
    else {
      this._logger.verbose ('Destination [%s]: ignore apply', this._name);
      setImmediate (cb);
    }
  }


  ///////////////////////////////////////////
  name () {return this._name;}
}


class QConsumer {
  ///////////////////////////////////////////
  constructor (exchange, src, dests, opts, context) {
    this._src = src;
    this._dests = dests;
    this._opts = opts || {};
    this._context = context;
    this._exchange = exchange;
    this._logger = exchange._logger;

    this._pop_opts = {
      reserve: this._opts.reserve || false
    };

    this._parallel = this._opts.parallel || 1;
    this._wsize =    this._opts.wsize || 1000;

    this._cid = uuid.v4();
    this._pending_acks = {};
    this._pending_tids = {};
    this._waiting_for_window = [];

    this._logger.verbose ('QConsumer %s: created', this._cid);
  }


  ///////////////////////////////////////////
  _window_used () {
    return _.size (this._pending_acks) + _.size (this._pending_tids);
  }


  ///////////////////////////////////////////
  _window_release () {
    this._logger.debug ('QConsumer %s: trying window releases, (max %d, used %d), %d in wait, releasing a waiting consumer' , this._cid, this._wsize, this._window_used (), this._waiting_for_window.length);

    if (this._waiting_for_window.length == 0) return;

    this._logger.debug ('QConsumer %s: window release, (max %d, used %d), releasing a waiting consumer' , this._cid, this._wsize, this._window_used ());
    const elem = this._waiting_for_window.shift();
    setImmediate (elem);
  }


  ///////////////////////////////////////////
  _a_single_iteration (pcid) {
    if (this._window_used () >= this._wsize) {
      this._logger.verbose ('QConsumer %s: window full (max %d, used %d), waiting for release' , pcid, this._wsize, this._window_used ());
      this._waiting_for_window.push (() => this._a_single_iteration (pcid));
      return;
    }

    const metric = (this._pop_opts.reserve ? this._metrics.keuss_q_reserve : this._metrics.keuss_q_pop);

    const tid = this._src.pop (pcid, this._pop_opts, (err, item) => {
      delete this._pending_tids[tid];

      if (err == 'cancel') {
        // consumer cancelled, end loop
        metric.labels ('exchange', this._src.ns(), this._src.name(), 'cancel').inc ();
        this._logger.debug ('QConsumer %s: cancelled while pop from queue %s, tid is %s', pcid, this._src.name(), tid);
        return;
      }
      else if (err) {
        // got an error
        this._logger.error ('QConsumer %s: error while popping from queue %s: %o. Pausing for 5 secs...', pcid, this._src.name(), err);
        setTimeout (() => this._a_single_iteration (pcid), 5000);
      }
      else {
        this._logger.debug ('QConsumer %s: return from pop from queue %s, tid is %s', pcid, this._src.name(), tid);

        if (this._pop_opts.reserve && item) {
          this._pending_acks[item._id] = { t: new Date(), msg: item };
          this._logger.debug ('QConsumer %s: new pending ack [%s]', pcid, item._id);
        }
        else {
          this._logger.debug ('QConsumer %s: popped: window is -> (max %d, used %d)', pcid, this._wsize, this._window_used ());
          this._window_release ();
        }

        this._fanout (item, (err, res) => {
          if (err) {
            this._logger.error ('error in fanout [%s]: %j', item._id, err);
            const next_t = new Date().getTime() + 5000;
            this.nack (item._id, next_t, () => this._a_single_iteration (pcid));
          }
          else {
            this.ack (item._id, () => this._a_single_iteration (pcid));
          }
        });
      }

      metric.labels ('exchange', this._src.ns(), this._src.name(), (err ? 'ko' : 'ok')).inc ();
    });

    this._pending_tids[tid] = new Date();
    this._logger.debug ('QConsumer %s: pop: window is -> (max %d, used %d)', pcid, this._wsize, this._window_used ());
    this._logger.verbose ('QConsumer %s: getting from queue %s, tid is %s', pcid, this._src.name(), tid);
  }


  ///////////////////////////////////////////
  _fanout (item, cb) {
    const tasks = [];

    _.each (this._dests, dest => {
      tasks.push (cb => {
        this._logger.verbose ('fanout item [%s] to %s', item._id, dest.name());
        dest.apply (item, cb);
      });
    });

    async.series (tasks, cb);
  }


  ///////////////////////////////////////////
  init () {
    this._metrics = this._context.metrics;
  }


  ///////////////////////////////////////////
  start () {
    for (let i = 0; i < this._parallel; i++) {
      this._a_single_iteration (this._cid + '--' + i);
    }

    this._logger.verbose ('QConsumer %s: started', this._cid);
  }


  ///////////////////////////////////////////
  stop () {
    // rollback pending acks
    const next_t = new Date().getTime ();
    _.forEach (this._pending_acks, (val, id) => {
      this._src.ko (val.msg, next_t, (err, res) => {
        if (err) {
          this._metrics.keuss_q_rollback .labels ('exchange', this._src.ns(), this._src.name(), 'ko').inc ();
          this._logger.error ('QConsumer %s: error while rolling back pending ack [%s]: %s', this._cid, id, '' + err);
        }
        else {
          if (res == 'deadletter') {
            this._metrics.keuss_q_rollback .labels ('exchange', this._src.ns(), this._src.name(), 'deadletter').inc ();
            this._logger.verbose ('QConsumer %s: rolled back pending ack [%s] resulted in move-to-deadletter. No more retries will happen', this._cid, id);
          }
          else if (!res) {
            this._metrics.keuss_q_rollback .labels ('exchange', this._src.ns(), this._src.name(), 'notfound').inc ();
            this._logger.error ('QConsumer %s: while rolling back pending ack [%s]: no such element', this._cid, id, '' + err);
          }
          else {
            this._metrics.keuss_q_rollback .labels ('exchange', this._src.ns(), this._src.name(), 'ok').inc ();
            this._logger.verbose ('QConsumer %s: rolled back pending ack [%s]', this._cid, id);
          }
        }
      });
    });

    // cancel pending tids
    _.forEach (this._pending_tids, (val, tid) => {
      this._src.cancel (tid);
      this._logger.verbose ('QConsumer %s: cancelled pending TID [%s]', this._cid, tid);
    });

    this._logger.verbose ('QConsumer %s: stopped', this._cid);
  }


  ///////////////////////////////////////////
  ack (id, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    this._src.ok (this._pending_acks[id].msg, err => {
      delete this._pending_acks[id];
      this._logger.debug ('QConsumer %s: ack: window is -> (max %d, used %d)', this._cid, this._wsize, this._window_used ());
      this._window_release ();
      if (cb) cb (err);
      this._metrics.keuss_q_commit .labels ('exchange', this._src.ns(), this._src.name(), (err ? 'ko' : 'ok')).inc ();
    });
  }


  ///////////////////////////////////////////
  nack (id, next_t, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    this._logger.debug ('QConsumer %s: nacking id [%s], next_t is %s', this._cid, id, new Date (next_t));

    this._src.ko (this._pending_acks[id].msg, next_t, (err, res) => {
      delete this._pending_acks[id];
      this._logger.debug (
        'QConsumer %s: nack: window is -> (max %d, used %d, rollback-result %o)', 
        this._cid, 
        this._wsize, 
        this._window_used (),
        res
      );

      this._window_release ();
      if (cb) cb (err);
      this._metrics.keuss_q_rollback .labels ('exchange', this._src.ns(), this._src.name(), (err ? 'ko' : ((res === false) ? 'deadletter' : 'ok'))).inc ();
    });
  }


  ///////////////////////////////////////////
  status () {
    return {
      q:            this._src.name(),
      opts:         this._opts,
      cid:          this._cid,
      pending_acks: _.mapValues (this._pending_acks, o => {return {t: o.t, id: o.msg._id}}),
      pending_tids: this._pending_tids,
      wsize:        this._wsize
    };
  }
}


class Exchange {
  //////////////////////////////////////////////////////////
  constructor (name, config, context) {
    this._scope = context.scope;
    this._context = context;
    this._name = name;
    this._config = config;

    this._logger = Log.logger (`exchange:${name}`);
    this._logger.verbose ('creating with config %j', config);
    this._create_qconsumer_from_config ();

    this._logger.verbose ('created with config %j', config);
  }


  //////////////////////////////////////////////////////////
  init (cb) {
    this._qconsumer.init();
    this._logger.verbose ('init done');
    cb ();
  }


  //////////////////////////////////////////////////////////
  start (cb) {
    this._qconsumer.start();
    this._logger.verbose ('start done');
    cb ();
  }


  //////////////////////////////////////////////////////////
  end (cb) {
    this._qconsumer.stop();
    this._logger.verbose ('end done');
    cb ();
  }

  //////////////////////////////////////////////////////////  
  /*
  config is
  src: 
    ns: string
    queue: string
  dst:
    - ns: string
      queue: string
      name?: string
      selector?: string
  */
  _create_qconsumer_from_config () {
    const src_ns = this._scope.namespace (this._config.src.ns);
    if (!src_ns) throw ReferenceError (`namespace ${this._config.src.ns} not defined`);
    const src_q = this._scope.queue_from_ns (src_ns, this._config.src.queue);

    const dsts = [];
    _.each (this._config.dst, dst => {
      const dst_ns = this._scope.namespace(dst.ns);
      if (!dst_ns) throw ReferenceError (`namespace ${dst.ns} not defined`);
      const dst_q = this._scope.queue_from_ns (dst_ns, dst.queue);

      try {
        const d = new Destination (dst.name, dst_q, dst.selector, this._logger);
        dsts.push (d);
      }
      catch (e) {
        this._logger.error ('error in Destination %j: %s. Destination IGNORED', dst, e.message);
      }
    });

    this._qconsumer = new QConsumer (this, src_q, dsts, {}, this._context);
  } 
};

module.exports = Exchange;
