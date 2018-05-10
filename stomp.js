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
    this._opts = opts;
    this._cb = cb;

    this._cid = uuid.v4();
    this._pending_acks = {};
    this._pending_tids = {};

    logger.info ('QConsumer %s: created', this._cid);
  }

  _a_single_iteration () {
    var self = this;
    var tid = this._q.pop (this._cid, {}, function (err, res) {
      delete self._pending_tids[tid];

      // TODO manage error

      logger.info ('QConsumer %s: return from pop from queue %s, tid is %s', self._cid, self._q.name(), tid);
      
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
    //   v: proto version (null if fresh)
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
        v: s.v,
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
        // TODO stop subscriptions' qconsumers
        _.forEach (sess.subscrs, function (subscr, subscr_id) {
          logger.info ('STOMP session %s closed, stopping subscription %s on %s', id, subscr_id, subscr.destination);
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
    frm.write (sess.socket);
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
    sess.v = frm['accept-version'];

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
    
    var q = this._get_queue (frm.destination);
    if (_.isString (q)) return self._error_in_session (sess, frm, q);

    var qc = new QConsumer (q, {}, function (err, item) {
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
      m_frm.header ('message-id', item._id.toString());
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
  } 

  ///////////////////////////////////////////////////////////////////////////
  _frame_UNSUBSCRIBE (sess, frm) {


  } 

  ///////////////////////////////////////////////////////////////////////////
  _frame_ACK (sess, frm) {


  } 

  ///////////////////////////////////////////////////////////////////////////
  _frame_NACK (sess, frm) {


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
