'use strict';

var async =  require ('async');
var net =    require ('net');
var uuid =   require ('uuid');
var util =   require ('util');
var _ =      require ('lodash');

var Scope =  require ('./Scope');
var Logger = require ('./Logger');

var SF = require ('stomp-frames');

var logger = Logger ('stomp');



class QConsumer {
  constructor (q, opts, cb) {
    this._q = q;
    this._opts = opts || {};
    this._cb = cb;

    this._pop_opts = {
      reserve: this._opts.reserve || false
    };

    this._cid = uuid.v4();
    this._pending_acks = {};
    this._pending_tids = {};

    logger.info ('QConsumer %s: created', this._cid);
  }

  _a_single_iteration () {
    var self = this;
    var tid = this._q.pop (this._cid, this._pop_opts, function (err, res) {
      delete self._pending_tids[tid];

      // TODO manage error?

      logger.info ('QConsumer %s: return from pop from queue %s, tid is %s', self._cid, self._q.name(), tid);
      
      if (self._pop_opts.reserve && res) {
        self._pending_acks[res._id] = new Date();
        logger.info ('QConsumer %s: new pending ack [%s]', self._cid, res._id);
      }

      self._cb (err, res);
      self._a_single_iteration ();
    });

    this._pending_tids[tid] = new Date();
    logger.info ('QConsumer %s: getting from queue %s, tid is %s', this._cid, this._q.name(), tid);
  }

  start () {
    // TODO run parallels ?
    this._a_single_iteration ();

    logger.info ('QConsumer %s: started', this._cid);
  }

  stop () {
    var self = this;

    // rollback pending acks
    var next_t = new Date().getTime (); 
    _.forEach (this._pending_acks, function (val, id) {
      self._q.ko (id, next_t, function (err) {
        if (err) {
          logger.info ('QConsumer %s: error while rolling back pending ack [%s]: %s', self._cid, id, '' + err);
        }
        else {
          logger.info ('QConsumer %s: rolled back pending ack [%s]', self._cid, id);
        }
      });
    });

    // cancel pending tids
    _.forEach (this._pending_tids, function (val, tid) {
      self._q.cancel (tid);
      logger.info ('QConsumer %s: cancelled pending TID [%s]', self._cid, tid);
    });

    logger.info ('QConsumer %s: stopped', this._cid);
  }

  ack (id, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    var self = this;

    this._q.ok (id, function (err) {
      delete self._pending_acks[id];
      if (cb) cb (err);
    });
  }

  nack (id, cb) {
    if (!this._pending_acks[id]) return cb ('nonexistent pending message id ' + id);

    var self = this;
    var next_t = new Date().getTime () + 60000; 
    
    this._q.ko (id, next_t, function (err) {
      delete self._pending_acks[id];
      if (cb) cb (err);
    });
  }


  status () {
    return {
      q:            this._q.name(),
      opts:         this._opts,
      cid:          this._cid,
      pending_acks: this._pending_acks,
      pending_tids: this._pending_tids
    }
  }
}


class STOMP {
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
        subscrs: subscrs_status
      };
    });

    return res;
  }


  ///////////////////////////////////////////////////////////////////////////
  _server_new_connection (socket) {
    var id = uuid.v4();
    var self = this;

    socket.on ('end', function () {
      logger.info ('STOMP socket ended (session %s)', id);
    });

    socket.on ('close', function () {
      logger.info ('STOMP socket closed (session %s)', id);
      var sess = self._sessions[id];

      if (sess) {
        // stop subscriptions' qconsumers
        _.forEach (sess.subscrs, function (subscr, subscr_id) {
          logger.info ('STOMP session %s closed, ending subscription %s on %s', id, subscr_id, subscr.destination);
          subscr.qc.stop ();
        });

        delete self._sessions[id];

        logger.info ('STOMP session %s closed, sessions: %j', id, self.status (), {});
      }
      else {
        logger.info ('STOMP session %s reported close but was not found, sessions: %j', id, self.status (), {});
      }
    });

    var ss = new SF.StompSession(socket);

    ss.on ('frame', function (frm) {
      // TODO ensure session is active (self._sessions[id] exists)
      logger.info ('[STOMP session %s] got frame %j', id, frm, {});
      
      var sess = self._sessions[id];

      if (!sess) {
        logger.info ('[STOMP session %s] got frame %j on nonexisting session, ignoring', id, frm, {});
        return;
      }

      if (sess.s == 'ended') {
        logger.info ('[STOMP session %s] got frame %j on ended session, ignoring', id, frm, {});
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
      subscrs: {}
    };

    logger.info ('STOMP session %s created, sessions: %j', id, this.status ());
  }


  ///////////////////////////////////////////////////////////////////////////
  _write_frm (sess, frm) {
    logger.info ('%s@stomp: returning frame, %j', sess.id, frm);

    try {
      frm.write (sess.socket);
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
    sess.socket.end ();
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
    logger.info ('%s@stomp: sent receipt frame %j', sess.id, rcpt_frm);
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
    logger.info ('%s@stomp: got STOMP/CONNECT, %j', sess.id, frm);
    if (sess.s != 'fresh') return this._error_in_session (sess, frm, 'already connected');
    
    sess.s = 'connected';
    var vers = frm['accept-version'];

    // error if 1.2 not accepted
    if (!vers['1.2']) {
      return this._error_in_session (sess, frm, 'only STOMP version 1.2 is supported');
    }

    var res_frm = new SF.Frame ();
    res_frm.command (SF.Commands.CONNECTED);
    res_frm.header ('version', '1.2');
    this._write_frm (sess, res_frm);
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_SEND (sess, frm) {
    var self = this;
    logger.info ('%s@stomp: got SEND, %j', sess.id, frm);

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

    var q = this._get_queue (frm.destination);
    if (_.isString (q)) return self._error_in_session (sess, frm, q);

    q.push (body, {}, function (err, id) {
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
    logger.info ('%s@stomp: got SUBSCRIBE, %j', sess.id, frm);
    
    var subscribe_opts = {};

    // check ack level
    switch (frm.ack) {
      case 'auto':
        subscribe_opts.reserve = false;
        break;

      case 'client-individual':
        subscribe_opts.reserve = true;
        break;

      default:
        return self._error_in_session (sess, frm, util.format ('ack level [%s] not supported', frm.ack));
    }

    var q = this._get_queue (frm.destination);
    if (_.isString (q)) return self._error_in_session (sess, frm, q);

    var qc = new QConsumer (q, subscribe_opts, function (err, item) {
      logger.info ('got elem for subscr: %j - %j', err, item, {});

      if (sess.s == 'ended') {
        logger.info ('[STOMP session %s] got item for subscr on ended session, ignoring', sess.id);

        // TODO nack it if possible

        return;
      }

      var m_frm = new SF.Frame ();
      m_frm.command (SF.Commands.MESSAGE);
      m_frm.body (JSON.stringify (item.payload));
      m_frm.header ('subscription', frm.id);
      m_frm.header ('message-id', frm.id + '-' + item._id.toString());
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
    logger.info ('%s@stomp: got ACK, %j', sess.id, frm);
 
    var arr = frm.id.split('-');

    if (arr.length != 2) return this._error_in_session (sess, frm, util.format ('invalid message id %s', frm.id));

    var subscr_id = arr[0];
    var msg_id =    arr[1];

    var subscr = sess.subscrs[subscr_id];

    if (!subscr) return this._error_in_session (sess, frm, util.format ('nonexistent subscription %s', subscr_id));

    var self = this;
    var ack = subscr.qc.ack (msg_id, function (err) {
      if (err) return self._error_in_session (sess, frm, util.format ('error in ack of %s', msg_id) + ': ' + err);
      logger.info ('%s@stomp: acked %s', sess.id, frm.id);
    });
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_NACK (sess, frm) {
    logger.info ('%s@stomp: got NACK, %j', sess.id, frm);
 
    var arr = frm.id.split('-');

    if (arr.length != 2) return this._error_in_session (sess, frm, util.format ('invalid message id %s', frm.id));

    var subscr_id = arr[0];
    var msg_id =    arr[1];

    var subscr = sess.subscrs[subscr_id];

    if (!subscr) return this._error_in_session (sess, frm, util.format ('nonexistent subscription %s', subscr_id));

    var self = this;
    var ack = subscr.qc.nack (msg_id, function (err) {
      if (err) return self._error_in_session (sess, frm, util.format ('error in ack of %s', msg_id) + ': ' + err);
      logger.info ('%s@stomp: nacked %s', sess.id, frm.id);
    });
  } 


  ///////////////////////////////////////////////////////////////////////////
  _frame_DISCONNECT (sess, frm) {
    logger.info ('%s@stomp: got DISCONNECT, %j', sess.id, frm);
    this._honor_receipt (sess, frm);

    // fire session end
    sess.socket.end ();
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
