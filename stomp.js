'use strict';

var net =    require ('net');
var uuid =   require ('uuid');
var util =   require ('util');
var _ =      require ('lodash');
var SF =     require ('stomp-frames');
var Log =    require ('winston-log-space');


var logger = Log.logger ('stomp');



class QConsumer {
  ///////////////////////////////////////////
  constructor (q, opts, cb) {
    this._q = q;
    this._opts = opts || {};
    this._cb = cb;

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
    var self = this;

    if (this._window_used () >= this._wsize) {
      logger.verbose ('QConsumer %s: window full (max %d, used %d), waiting for release' , pcid, this._wsize, this._window_used ());

      this._waiting_for_window.push (function () {
        self._a_single_iteration (pcid);
      });
      
      return;
    }

    var tid = this._q.pop (pcid, this._pop_opts, function (err, res) {
      delete self._pending_tids[tid];

      // TODO manage error?

      logger.debug ('QConsumer %s: return from pop from queue %s, tid is %s', pcid, self._q.name(), tid);
      
      if (self._pop_opts.reserve && res) {
        self._pending_acks[res._id] = new Date();
        logger.debug ('QConsumer %s: new pending ack [%s]', pcid, res._id);
      }
      else {
        logger.debug ('QConsumer %s: popped: window is -> (max %d, used %d)', pcid, self._wsize, self._window_used ());
        self._window_release ();
      }

      self._cb (err, res);
      setImmediate (function () {self._a_single_iteration (pcid);});
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
    var self = this;

    // rollback pending acks
    var next_t = new Date().getTime (); 
    _.forEach (this._pending_acks, function (val, id) {
      self._q.ko (id, next_t, function (err) {
        if (err) {
          logger.error ('QConsumer %s: error while rolling back pending ack [%s]: %s', self._cid, id, '' + err);
        }
        else {
          logger.verbose ('QConsumer %s: rolled back pending ack [%s]', self._cid, id);
        }
      });
    });

    // cancel pending tids
    _.forEach (this._pending_tids, function (val, tid) {
      self._q.cancel (tid);
      logger.verbose ('QConsumer %s: cancelled pending TID [%s]', self._cid, tid);
    });

    logger.verbose ('QConsumer %s: stopped', this._cid);
  }

  ///////////////////////////////////////////
  ack (id, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    var self = this;

    this._q.ok (id, function (err) {
      delete self._pending_acks[id];
      logger.debug ('QConsumer %s: ack: window is -> (max %d, used %d)', self._cid, self._wsize, self._window_used ());
      self._window_release ();
      if (cb) cb (err);
    });
  }

  ///////////////////////////////////////////
  nack (id, next_t, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    var self = this; 
    
    logger.debug ('QConsumer %s: nacking id [%s], next_t is %s', this._cid, id, new Date (next_t));

    this._q.ko (id, next_t, function (err) {
      delete self._pending_acks[id];
      logger.debug ('QConsumer %s: nack: window is -> (max %d, used %d)', self._cid, self._wsize, self._window_used ());
      self._window_release ();
      if (cb) cb (err);
    });
  }

  ///////////////////////////////////////////
  status () {
    return {
      q:            this._q.name(),
      opts:         this._opts,
      cid:          this._cid,
      pending_acks: this._pending_acks,
      pending_tids: this._pending_tids,
      wsize:        this._wsize
    };
  }
}


class STOMP {
  ///////////////////////////////////////////
  constructor (config, scope) {
    this._config = config.stomp || {};
    this._scope = scope;

    // active sessions. entries are:
    // {
    //   socket: net socket for session
    //   s: status (fresh, connected)
    //   sess: SF session 
    //   subscrs: {} 
    // }
    this._sessions = {};

    var self = this;
    setInterval (function () {self._keep_alive ()}, this._config.keepalive_interval || 1000);
  }


  ///////////////////////////////////////////////////////////////////////////
  run (cb) {
    var self = this;
    this._server = net.createServer (function(socket) {
      self._server_new_connection (socket);
    });

    var port = this._config.port || 61613;
    this._server.listen (port, function (err) {
      if (err) return cb (err);
      logger.info ('STOMP server listening on port %d', port);
      cb ();
    });
  }


  ///////////////////////////////////////////////////////////////////////////
  end (cb) {
    this._server.close (function () {
      // end all sessions
      _.forEach (this._sessions, function (v, k) {
        v.s = 'ended';
        v.sess.destroy();
      });

      cb ();
    });
  }


  ///////////////////////////////////////////////////////////////////////////
  status () {
    var res = {};

    _.forEach (this._sessions, function (s, id) {
      var subscrs_status = {};

      _.forEach (s.subscrs, function (subscr, subscr_id) {
        subscrs_status[subscr_id] = {
          destination: subscr.destination,
          qc: subscr.qc.status()
        };
      });

      res[id] = {
        status: s.s,
        last_read: s.sess.last_read(),
        subscrs: subscrs_status
      };
    });

    return {sessions: res};
  }


  ///////////////////////////////////////////////////////////////////////////
  _keep_alive () {
    logger.debug ('keepalive!');

    var self = this;

    _.forEach (this._sessions, function (s, id) {
      var rdelta_t = (new Date ().getTime()) - (s.sess.last_read().getTime ());
      var wdelta_t = (new Date ().getTime()) - (s.sess.last_write().getTime ());

      logger.debug ('keepalive@%s: checking, rdelta is %s, wdelta is %s, hb is %j', id, rdelta_t, wdelta_t, s.heartbeat);

      // do we need to cut it off?
      if (rdelta_t > s.heartbeat[0]) {
        logger.info ('keepalive@%s: channel silent for too long (%d msecs), closing it', id, rdelta_t);
        s.s = 'ended';
        s.sess.destroy ();
      }
      else {
        // do we need to send ping?
        if (
          (s.heartbeat[1] > self._config.keepalive_interval) && 
          (wdelta_t > (s.heartbeat[1] - self._config.keepalive_interval))
        ) {
          logger.verbose ('keepalive@%s: sending ping', id);
          s.sess.ping ();
        }
      }
    });
  }


  ///////////////////////////////////////////////////////////////////////////
  _server_new_connection (socket) {
    var id = uuid.v4();
    var self = this;

    socket.on ('end', function () {
      logger.verbose ('STOMP socket ended (session %s)', id);
    });

    socket.on ('close', function () {
      logger.verbose ('STOMP socket closed (session %s)', id);
      var sess = self._sessions[id];

      if (sess) {
        // stop subscriptions' qconsumers
        _.forEach (sess.subscrs, function (subscr, subscr_id) {
          logger.verbose ('STOMP session %s closed, ending subscription %s on %s', id, subscr_id, subscr.destination);
          subscr.qc.stop ();
        });

        delete self._sessions[id];

        logger.info ('STOMP session %s closed', id);
      }
      else {
        logger.error ('STOMP session %s reported close but was not found', id);
      }
    });

    var ss = new SF.StompSession(socket);

    ss.on ('frame', function (frm) {
      logger.debug ('[STOMP session %s] got frame %j', id, frm, {});
      
      var sess = self._sessions[id];

      if (!sess) {
        logger.warn ('[STOMP session %s] got frame %j on nonexisting session, ignoring', id, frm, {});
        return;
      }

      if (sess.s == 'ended') {
        logger.warn ('[STOMP session %s] got frame %j on ended session, ignoring', id, frm, {});
        return;
      }

      self['_frame_' + frm.command ()] (sess, frm);
    });

    this._sessions[id] = {
      id : id,
      socket: socket,
      s: 'fresh',
      v: null,
      sess: ss,
      heartbeat: [
        this._config.read_timeout,
        0
      ],
      subscrs: {}
    };

    logger.info ('STOMP session %s created', id);
  }


  ///////////////////////////////////////////////////////////////////////////
  _write_frm (sess, frm) {
    logger.debug ('%s@stomp: returning frame, %j', sess.id, frm);

    try {
      sess.sess.send (frm);
    }
    catch (e) {
      logger.error ('%s@stomp: error while writing frame: %s', sess.id, '' + e);
    }
  }


  ///////////////////////////////////////////////////////////////////////////
  _error_in_session (sess, frm, err) {
    var err_frm = new SF.Frame ();
    err_frm.command (SF.Commands.ERROR);
    err_frm.body (err);

    if (frm) {
      var rcpt = frm.header ('receipt');
      if ((rcpt != undefined) && (rcpt != null)) err_frm.header ('receipt-id', rcpt);
    }

    this._write_frm (sess, err_frm);

    // fire session end
    sess.s = 'ended';
    sess.sess.destroy ();
  }


  ///////////////////////////////////////////////////////////////////////////
  _not_implemented (sess, frm) {
    this._error_in_session (sess, frm, util.format ('not implemented command %s', frm.command()));
  }


  ///////////////////////////////////////////////////////////////////////////
  _unexpected (sess, frm) {
    this._error_in_session (sess, frm, util.format ('unexpected command %s', frm.command()));
  }


  ///////////////////////////////////////////////////////////////////////////
  _honor_receipt (sess, frm) {
    var rcpt = frm.header ('receipt');
    if ((rcpt === undefined) || (rcpt === null)) return;

    var rcpt_frm = new SF.Frame ();
    rcpt_frm.command (SF.Commands.RECEIPT);
    rcpt_frm.header ('receipt-id', rcpt);
    this._write_frm (sess, rcpt_frm);
    logger.verbose ('%s@stomp: sent receipt frame %j', sess.id, rcpt_frm);
  }


  ///////////////////////////////////////////////////////////////////////////
  _get_queue (destination) {
    // dest must be /type/queue
    if (!destination.match (/^\/[a-zA-Z0-9\\-_:]+\/[a-zA-Z0-9\\-_]+$/)) {
      return 'destination must match /<type>/<queue>';
    }

    var arr = destination.split('/');
    var type = this._scope.type (arr[1]);
    var qname = arr[2];

    if (!type.q_repo.has(qname)) {
      type.q_repo.set(qname, type.factory.queue(qname, {}));
    }

    var q = type.q_repo.get(qname);
    return q;
  }


  ///////////////////////////////////////////////////////////////////////////
  _frame_CONNECT (sess, frm) {
    this._frame_STOMP (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_STOMP (sess, frm) {
    logger.debug ('%s@stomp: got STOMP/CONNECT, %j', sess.id, frm);
    if (sess.s != 'fresh') return this._error_in_session (sess, frm, 'already connected');
    
    sess.s = 'connected';
    var vers = frm['accept-version'];

    // error if 1.2 not accepted
    if (!vers['1.2']) {
      return this._error_in_session (sess, frm, 'only STOMP version 1.2 is supported');
    }

    // store heartbeat data
    var hb = frm['heart-beat'];
    sess.heartbeat = [
      hb[0] || this._config.read_timeout,
      hb[1]
    ];

    var res_frm = new SF.Frame ();
    res_frm.command (SF.Commands.CONNECTED);
    res_frm.header ('version', '1.2');
    res_frm.header ('heart-beat', hb[1] + ',' + hb[0]);
    this._write_frm (sess, res_frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_SEND (sess, frm) {
    var self = this;
    logger.debug ('%s@stomp: got SEND, %j', sess.id, frm);

    // must be json
    var ct = frm.header('content-type') || '';
    if (!ct.match (/^application\/json/)) {
      return self._error_in_session (sess, frm, 'content-type must be application/json');
    }

    var body;

    try {
      body = JSON.parse (frm.body());
    }
    catch (e) {
      return self._error_in_session (sess, frm, 'error while parsing json body: ' + e);
    }

    var x_next_t =  parseInt (frm.header ('x-next-t'));
    var x_delta_t = parseInt (frm.header ('x-delta-t'));
    var opts = {};

    if (x_next_t) opts.mature = x_next_t;
    if (x_delta_t) opts.delay = Math.floor(x_delta_t / 1000);

    var q = this._get_queue (frm.destination);
    if (_.isString (q)) return self._error_in_session (sess, frm, q);

    q.push (body, opts, function (err, id) {
      if (err) {
        self._error_in_session (sess, frm, err);
      } else {
        self._honor_receipt (sess, frm);
      }
    });
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_SUBSCRIBE (sess, frm) {
    var self = this;
    logger.debug ('%s@stomp: got SUBSCRIBE, %j', sess.id, frm);
    
    var subscribe_opts = {};
    var q = this._get_queue (frm.destination);

    if (_.isString (q)) return this._error_in_session (sess, frm, q);

    // check ack level
    switch (frm.ack) {
      case 'auto':
        subscribe_opts.reserve = false;
        break;

      case 'client-individual':
        // check if queue actualy supports reserve
        if (!q.capabilities().reserve) {
          return this._error_in_session (sess, frm, util.format ('ack level [%s] not supported by queue backend. Use "auto" instead', frm.ack));
        }

        subscribe_opts.reserve = true;
        break;

      default:
        return this._error_in_session (sess, frm, util.format ('ack level [%s] not supported', frm.ack));
    }

    if (frm.header('x-parallel')) subscribe_opts.parallel = (parseInt (frm.header('x-parallel')) || 1);
    if (frm.header('x-wsize'))    subscribe_opts.wsize =    (parseInt (frm.header('x-wsize'))    || 1000);

    var qc = new QConsumer (q, subscribe_opts, function (err, item) {
      logger.debug ('got elem for subscr: %j - %j', err, item, {});

      if (sess.s == 'ended') {
        logger.warn ('[STOMP session %s] got item for subscr on ended session, ignoring', sess.id);

        // TODO nack it if possible

        return;
      }
      
      // pass error if no payload
      if (!item.payload) {
        return self._error_in_session (sess, frm, util.format ('subscription %s got an empty message. Queue may not support ack level "client-individual"', frm.id));
      }

      var m_frm = new SF.Frame ();
      m_frm.command (SF.Commands.MESSAGE);
      m_frm.body (JSON.stringify (item.payload));
      m_frm.header ('subscription', frm.id);
      m_frm.header ('message-id', frm.id + '-' + (item._id ? item._id.toString() : 'none'));
      m_frm.header ('destination', q.name()); 
      m_frm.header ('x-mature', item.mature.toString ());
      m_frm.header ('x-tries', item.tries + '');
      m_frm.header ('content-type', 'application/json ; charset=utf8');
      
      self._write_frm (sess, m_frm);
    });

    qc.start ();

    sess.subscrs[frm.id] = {
      destination: frm.destination,
      id: frm.id,
      qc: qc
    };

    logger.info ('%s@stomp: subscribed to %s, id %s', sess.id, frm.destination, frm.id);
    this._honor_receipt (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_UNSUBSCRIBE (sess, frm) {
    var subscr = sess.subscrs[frm.id];

    if (!subscr) {
      return this._error_in_session (sess, frm, util.format ('no subscription [%s] found', frm.id));
    }

    logger.info ('%s@stomp: subscription %s ended (destination %s)', sess.id, frm.id, subscr.destination);
    subscr.qc.stop ();
    
    delete sess.subscrs[frm.id];
    this._honor_receipt (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_ACK (sess, frm) {
    logger.debug ('%s@stomp: got ACK, %j', sess.id, frm);
 
    var arr = frm.id.split('-');

    if (arr.length != 2) return this._error_in_session (sess, frm, util.format ('invalid message id %s', frm.id));

    var subscr_id = arr[0];
    var msg_id =    arr[1];

    var subscr = sess.subscrs[subscr_id];

    if (!subscr) return this._error_in_session (sess, frm, util.format ('nonexistent subscription %s', subscr_id));

    var self = this;
    var ack = subscr.qc.ack (msg_id, function (err) {
      if (err) return self._error_in_session (sess, frm, util.format ('error in ack of %s', msg_id) + ': ' + err);
      logger.verbose ('%s@stomp: acked %s', sess.id, frm.id);
    });
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_NACK (sess, frm) {
    logger.debug ('%s@stomp: got NACK, %j', sess.id, frm);
 
    var arr = frm.id.split('-');

    if (arr.length != 2) return this._error_in_session (sess, frm, util.format ('invalid message id %s', frm.id));

    var subscr_id = arr[0];
    var msg_id =    arr[1];

    var subscr = sess.subscrs[subscr_id];

    if (!subscr) return this._error_in_session (sess, frm, util.format ('nonexistent subscription %s', subscr_id));

    var next_t;
    var x_next_t = parseInt (frm.header ('x-next-t'));
  
    if (x_next_t){
      next_t = x_next_t;
    } else {
      var x_delta_t = parseInt (frm.header ('x-delta-t')) || 5000;
      next_t = new Date().getTime () + x_delta_t;
    }

    var self = this;

    var ack = subscr.qc.nack (msg_id, next_t, function (err) {
      if (err) return self._error_in_session (sess, frm, util.format ('error in ack of %s', msg_id) + ': ' + err);
      logger.verbose ('%s@stomp: nacked %s', sess.id, frm.id);
    });
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_DISCONNECT (sess, frm) {
    logger.debug ('%s@stomp: got DISCONNECT, %j', sess.id, frm);
    this._honor_receipt (sess, frm);

    // fire session end
    sess.sess.end ();
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_RECEIPT (sess, frm) {
    this._unexpected (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_CONNECTED (sess, frm) {
    this._unexpected (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_ERROR (sess, frm) {
    this._unexpected (sess, frm);
  }


  ///////////////////////////////////////////////////////////////////////////
  _frame_MESSAGE (sess, frm) {
    this._unexpected (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_BEGIN (sess, frm) {
    this._not_implemented (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_COMMIT (sess, frm) {
    this._not_implemented (sess, frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_ABORT (sess, frm) {
    this._not_implemented (sess, frm);
  } 
}

module.exports = STOMP;
