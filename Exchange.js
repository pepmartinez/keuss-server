const _ =   require ('lodash');
const Log = require ('winston-log-space');


class QConsumer {
  ///////////////////////////////////////////
  constructor (q, opts, context, cb) {
    this._q = q;
    this._opts = opts || {};
    this._cb = cb;
    this._context = context;
    this._metrics = context.metrics;

    this._pop_opts = {
      reserve: this._opts.reserve || false
    };

    this._parallel = opts.parallel || 1;
    this._wsize =    opts.wsize || 1000;

    this._cid = uuid.v4();
    this._pending_acks = {};
    this._pending_tids = {};
    this._waiting_for_window = [];

    logger.verbose ('QConsumer %s: created', this._cid);
  }

  ///////////////////////////////////////////
  _window_used () {
    return _.size (this._pending_acks) + _.size (this._pending_tids);
  }

  ///////////////////////////////////////////
  _window_release () {
    logger.debug ('QConsumer %s: trying window releases, (max %d, used %d), %d in wait, releasing a waiting consumer' , this._cid, this._wsize, this._window_used (), this._waiting_for_window.length);

    if (this._waiting_for_window.length == 0) return;

    logger.debug ('QConsumer %s: window release, (max %d, used %d), releasing a waiting consumer' , this._cid, this._wsize, this._window_used ());
    var elem = this._waiting_for_window.shift();
    setImmediate (elem);
  }

  ///////////////////////////////////////////
  _a_single_iteration (pcid) {
    if (this._window_used () >= this._wsize) {
      logger.verbose ('QConsumer %s: window full (max %d, used %d), waiting for release' , pcid, this._wsize, this._window_used ());
      this._waiting_for_window.push (() => this._a_single_iteration (pcid));
      return;
    }

    var metric = (this._pop_opts.reserve ? this._metrics.keuss_q_reserve : this._metrics.keuss_q_pop);

    var tid = this._q.pop (pcid, this._pop_opts, (err, res) => {
      delete this._pending_tids[tid];

      // TODO manage error?

      if (err == 'cancel') {
        // consumer cancelled, end loop
        metric.labels ('stomp', this._q.ns(), this._q.name(), 'cancel').inc ();
        logger.debug ('QConsumer %s: cancelled while pop from queue %s, tid is %s', pcid, this._q.name(), tid);
        return;
      }

      logger.debug ('QConsumer %s: return from pop from queue %s, tid is %s', pcid, this._q.name(), tid);

      if (this._pop_opts.reserve && res) {
        this._pending_acks[res._id] = {
          t: new Date(),
          msg: res
        };

        logger.debug ('QConsumer %s: new pending ack [%s]', pcid, res._id);
      }
      else {
        logger.debug ('QConsumer %s: popped: window is -> (max %d, used %d)', pcid, this._wsize, this._window_used ());
        this._window_release ();
      }

      this._cb (err, res);
      setImmediate (() => this._a_single_iteration (pcid));
      metric.labels ('stomp', this._q.ns(), this._q.name(), (err ? 'ko' : 'ok')).inc ();
    });

    this._pending_tids[tid] = new Date();
    logger.debug ('QConsumer %s: pop: window is -> (max %d, used %d)', pcid, this._wsize, this._window_used ());
    logger.verbose ('QConsumer %s: getting from queue %s, tid is %s', pcid, this._q.name(), tid);
  }

  ///////////////////////////////////////////
  start () {
    for (var i = 0; i < this._parallel; i++) {
      this._a_single_iteration (this._cid + '--' + i);
    }

    logger.verbose ('QConsumer %s: started', this._cid);
  }

  ///////////////////////////////////////////
  stop () {
    // rollback pending acks
    var next_t = new Date().getTime ();
    _.forEach (this._pending_acks, (val, id) => {
      this._q.ko (val.msg, next_t, (err, res) => {
        if (err) {
          this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'ko').inc ();
          logger.error ('QConsumer %s: error while rolling back pending ack [%s]: %s', this._cid, id, '' + err);
        }
        else {
          if (res == 'deadletter') {
            this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'deadletter').inc ();
            logger.verbose ('QConsumer %s: rolled back pending ack [%s] resulted in move-to-deadletter. No more retries will happen', this._cid, id);
          }
          else if (!res) {
            this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'notfound').inc ();
            logger.error ('QConsumer %s: while rolling back pending ack [%s]: no such element', this._cid, id, '' + err);
          }
          else {
            this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'ok').inc ();
            logger.verbose ('QConsumer %s: rolled back pending ack [%s]', this._cid, id);
          }
        }
      });
    });

    // cancel pending tids
    _.forEach (this._pending_tids, (val, tid) => {
      this._q.cancel (tid);
      logger.verbose ('QConsumer %s: cancelled pending TID [%s]', this._cid, tid);
    });

    logger.verbose ('QConsumer %s: stopped', this._cid);
  }

  ///////////////////////////////////////////
  ack (id, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    this._q.ok (this._pending_acks[id].msg, err => {
      delete this._pending_acks[id];
      logger.debug ('QConsumer %s: ack: window is -> (max %d, used %d)', this._cid, this._wsize, this._window_used ());
      this._window_release ();
      if (cb) cb (err);
      this._metrics.keuss_q_commit .labels ('stomp', this._q.ns(), this._q.name(), (err ? 'ko' : 'ok')).inc ();
    });
  }

  ///////////////////////////////////////////
  nack (id, next_t, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    logger.debug ('QConsumer %s: nacking id [%s], next_t is %s', this._cid, id, new Date (next_t));

    this._q.ko (this._pending_acks[id].msg, next_t, (err, res) => {
      delete this._pending_acks[id];
      logger.debug ('QConsumer %s: nack: window is -> (max %d, used %d, rollback-result %o)', 
                    this._cid, 
                    this._wsize, 
                    this._window_used (),
                    res);

      this._window_release ();
      if (cb) cb (err);
      this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), (err ? 'ko' : ((res === false) ? 'deadletter' : 'ok'))).inc ();
    });
  }

  ///////////////////////////////////////////
  status () {
    return {
      q:            this._q.name(),
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
  constructor (scope, name, config) {
    this._scope = scope;
    this._name = name;
    this._config = config;

    this._logger = Log.logger (`scope:${name}`);
    this._logger.verbose ('created');
  }


  //////////////////////////////////////////////////////////
  init (cb) {
    this._logger.verbose ('init done');
    cb ();
  }


  //////////////////////////////////////////////////////////
  end (cb) {
    this._logger.verbose ('end done');
    cb ();
  }
};

module.exports = Exchange;
