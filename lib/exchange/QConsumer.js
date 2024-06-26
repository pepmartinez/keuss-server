const _ =        require ('lodash');
const async =    require ('async');
const uuid =     require ('uuid');


const HopCountHdr = 'x-hop-count';

class QConsumer {
  ///////////////////////////////////////////
  constructor (exchange, src, dests, opts, context) {
    this._src = src;
    this._dests = dests;
    this._opts = opts || {};
    this._context = context;
    this._exchange = exchange;
    this._stop = null;
    this._logger = exchange._logger;

    this._pop_opts = {
      reserve: this._opts.reserve || false
    };

    this._logger.verbose ('pop-opts is %j', this._pop_opts);

    this._parallel = this._opts.parallel || 1;
    this._wsize =    this._opts.wsize || 1000;
    this._max_hops = _.get (this._context, 'config.main.max_hops', 17);

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
    // bail if signalled to stop
    if (this._stop == true) {
      this._logger.verbose ('QConsumer %s: stopping as signalled' , pcid);
      return;
    }

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

            if (this._pop_opts.reserve) {
              this.nack (item._id, next_t, () => this._a_single_iteration (pcid));
            }
            else {
              setImmediate (() => this._a_single_iteration (pcid));
            }
          }
          else {
            if (this._pop_opts.reserve) {
              this.ack (item._id, () => this._a_single_iteration (pcid));
            }
            else {
              setImmediate (() => this._a_single_iteration (pcid));
            }
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

    const hrt = process.hrtime ();

    // check hops
    const hops = item.hdrs[HopCountHdr] + 0;
    if (hops >= this._max_hops) {
      this._logger.warn (
        'too many hops (%d, max is %d) for item [%s]. Moving to %s@%s',
        hops,
        this._max_hops,
        item._id,
        this._too_many_hops_q.name (),
        this._too_many_hops_q.ns ()
      );

      const opts = {
        hdrs: item.hdrs
      };

      opts.hdrs['x-exchange-name'] = this._exchange._name ;
      return this._too_many_hops_q.push (item.payload, opts, err => {
        const rt = process.hrtime (hrt);
        const ms = (rt[0] * 1e9 + rt[1]) / 1e6;
        this._metrics.keuss_exchange_hops.labels (this._exchange._name, 'too-many-hops').observe (ms);
        cb (err);
      });
    }

    // one more hop
    if (! _.isInteger (item.hdrs[HopCountHdr])) {
      item.hdrs[HopCountHdr] = 1;
    }
    else {
      item.hdrs[HopCountHdr]++;
    }

    const state = {};
    _.each (this._dests, dest => {
      tasks.push (cb => {
        this._logger.verbose ('fanout item [%s] to %s, %d hops', item._id, dest.name(), item.hdrs[HopCountHdr]);
        dest.apply (item, state, cb);
      });
    });

    let relays = 0;
    async.series (tasks, (err, res) => {
      if (err) {
        const rt = process.hrtime (hrt);
        const ms = (rt[0] * 1e9 + rt[1]) / 1e6;
        this._metrics.keuss_exchange_hops.labels (this._exchange._name, 'ko').observe (ms);
        return cb (err, res);
      }

      _.each (res, r => {if (r) relays++});

      this._logger.verbose ('fanout item [%s], %d relays done', item._id, relays);

      if (!relays) {
        this._logger.warn (
          'no relays for item [%s]. Moving to %s@%s',
          item._id,
          this._no_route_q.name (),
          this._no_route_q.ns ()
        );
        
        const opts = {
          hdrs: item.hdrs
        };
  
        opts.hdrs['x-exchange-name'] = this._exchange._name ;
        return this._no_route_q.push (item.payload, opts, err => {
          const rt = process.hrtime (hrt);
          const ms = (rt[0] * 1e9 + rt[1]) / 1e6;
          this._metrics.keuss_exchange_hops.labels (this._exchange._name, 'no-route').observe (ms);
          cb (err);
        });
      }
      else {
        const rt = process.hrtime (hrt);
        const ms = (rt[0] * 1e9 + rt[1]) / 1e6;
        this._metrics.keuss_exchange_hops.labels (this._exchange._name, 'ok').observe (ms);
        cb (null, res);
      }
    });
  }


  ///////////////////////////////////////////
  init (cb) {
    this._metrics = this._context.metrics;

    const src_ns = this._context.scope.namespace (this._src.ns ());

    async.series ([
      cb => this._context.scope.queue_from_ns (src_ns, '__too_many_hops__', null, cb),
      cb => this._context.scope.queue_from_ns (src_ns, '__no_route__', null, cb),
    ], (err, queues) => {
      if (err) return cb(err);
      this._too_many_hops_q = queues[0];
      this._no_route_q =      queues[1];
      cb();
    });
  }


  ///////////////////////////////////////////
  start () {
    if (this._stop == false) {
      this._logger.info ('QConsumer %s: already started, ignoring start operation', this._cid);
      return;
    }

    this._stop = false;

    for (let i = 0; i < this._parallel; i++) {
      this._a_single_iteration (this._cid + '--' + i);
    }

    this._logger.verbose ('QConsumer %s: started', this._cid);
  }


  ///////////////////////////////////////////
  stop () {
    if (this._stop == true) {
      this._logger.info ('QConsumer %s: already stopped, ignoring stop operation', this._cid);
      return;
    }

    this._stop = true;

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
      src: {
        q: this._src.name(),
        ns: this._src.ns()
      },
      dst:          this._dests.map (i => i.status ()),
      opts:         this._opts,
      cid:          this._cid,
      pending_acks: _.mapValues (this._pending_acks, o => {return {t: o.t, id: o.msg._id}}),
      pending_tids: this._pending_tids,
      wsize:        this._wsize,
      stopped:      this._stop
    };
  }
}


module.exports = QConsumer;
