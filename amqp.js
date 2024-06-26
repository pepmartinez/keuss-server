const _ =     require ('lodash');
const async = require ('async');
const Rhea =  require ('rhea');
const Log =   require ('winston-log-space');

const logger = Log.logger ('amqp');

class AMQP {
  ///////////////////////////////////////////
  constructor (config, context) {
    this._config = config.amqp || {};
    this._scope = context.scope;
    this._metrics = context.metrics;
    this._context = context;

    // main rhea object, container
    this._container = Rhea.create_container ();

    this._rig_container ();

    // active sessions/connections (rhea assumes 1-to-1 sessions to connections)
    this._connections = {};

    this._create_metrics_amqp ();
    this._pending_acks = {};
    this._pending_tids = {};
    
    this._parallel =    this._config.parallel || 1;
    this._window_size = this._config.wsize || 1024;
    this._window_size = this._window_size > 2048 ? 2048 : this._window_size;

    this._c0 = _.get (this._config, 'retry.delay.c0', 3);
    this._c1 = _.get (this._config, 'retry.delay.c1', 3);
    this._c2 = _.get (this._config, 'retry.delay.c2', 3);
  }


  ///////////////////////////////////////////////////////////////////////////
  run (cb) {
    this._net_server = this._container.listen ({
      receiver_options: {
        autoaccept: false
      },
      sender_options: {
//        autosettle: false
//        snd_settle_mode: 1
      },
      port: this._config.port || 5672
    });

    this._net_server.once ('listening', () => {
      logger.info ('AMQP server listening at port %d', this._config.port || 5672);
      cb ();
    });

    this._net_server.once ('error', err => {
      logger.error ('AMQP server listening error: %o', err);
      cb (err);
    });
  }

  
  ///////////////////////////////////////////////////////////////////////////////////////
  // calculate delay to apply on a rollback. Uses a 2nd-deg polynom based on tries
  _get_delay (elem) {
    const r = elem.tries || 0;
    return (r*r*this._c2 + r*this._c1 + this._c0) * 1000;

    // TODO add some jitter

  }


  ///////////////////////////////////////////
  _window_used (sender) {
    return sender.__pending_acks + _.size (sender.__pending_tids);
  }


  ///////////////////////////////////////////////////////////////////////////
  _cancel_pending () {
    _.forEach (this._pending_tids, (val, tid) => {
      val.q.cancel (tid);
      logger.verbose ('cancelled pending TID [%s] on queue %s@%s', tid, val.q.name(), val.q.ns());
    });
  }


  ///////////////////////////////////////////////////////////////////////////
  _rollback_pending (cb) {
    const next_t = new Date().getTime ();
    const tasks = [];

    _.forEach (this._pending_acks, (val, id) => {
      tasks.push (cb => val.q.ko (val.msg, next_t, (err, res) => {
        if (err) {
          this._metrics.keuss_q_rollback .labels ('stomp', val.q.ns(), val.q.name(), 'ko').inc ();
          logger.error ('error while rolling back pending ack [%s]: %o', id, err);
        }
        else {
          if (res == 'deadletter') {
            this._metrics.keuss_q_rollback .labels ('amqp', val.q.ns(), val.q.name(), 'deadletter').inc ();
            logger.verbose ('rolled back pending ack [%s] resulted in move-to-deadletter. No more retries will happen', id);
          }
          else if (!res) {
            this._metrics.keuss_q_rollback .labels ('amqp', val.q.ns(), val.q.name(), 'notfound').inc ();
            logger.error ('while rolling back pending ack [%s]: no such element', id);
          }
          else {
            this._metrics.keuss_q_rollback .labels ('amqp', val.q.ns(), val.q.name(), 'ok').inc ();
            logger.verbose ('rolled back pending ack [%s]', id);
          }
        }
        cb ();
      }));
    });

    async.series (tasks, cb);
  }


  ///////////////////////////////////////////////////////////////////////////
  end (cb) {
    logger.info ('AMQP server ending');

    this._net_server.close ();
    logger.verbose ('  server listen closed');

    // end all connections
    _.forEach (this._connections, (c, id) => {
      logger.verbose ('  shutting down connection %s', id);

      c.each_link (l => {
        logger.verbose ('    detaching link %s', l.name);
        l.detach ();
      });

      c.close ();
      logger.verbose ('  connection %s closed', id);
    });

    this._cancel_pending ();
    this._rollback_pending (cb);
    logger.info ('AMQP server closed');
  }


  ///////////////////////////////////////////////////////////////////////////
  status (verbose) {
    var conns = {};

    _.forEach (this._connections, (c, id) => {
      var receivers = {};
      c.each_receiver (r => {
        receivers[r.name] = {
        }
      });

      var senders = {};
      c.each_sender (s => {
        senders[s.name] = {
          parallel:     this._parallel,
          window_size:  this._window_size,
          pending_acks: s.__pending_acks,
          pending_tids: _.size (s.__pending_tids),
          mode:         (s.__do_reserve ? 'at-least-once' : 'at-most-once')
        }
      }); 

      conns[id] = { receivers, senders };
    });

    const res = {
      connections: conns,
      pending_acks: verbose ? _.mapValues (this._pending_acks, o => {return {t: o.t, id: o.msg._id, q: o.q.name() + '@' + o.q.ns()}}) : _.size (this._pending_acks),
      pending_tids: verbose ? _.mapValues (this._pending_tids, o => {return {t: o.t, s: o.s, q: o.q.name() + '@' + o.q.ns()}}) : _.size (this._pending_tids),
    };

    return res;
  }


  //////////////////////////////////////////////////
  _rig_container () {
    _.each ([
      'connection_open',
      'connection_close',
      'connection_error',
      'session_open',
      'session_close',
//      'session_error',
      'protocol_error',
      'error',
      'disconnected',
//      'settled',
      'receiver_drained',
//      'receiver_flow',
      'receiver_error',
      'receiver_close',
      'sendable',
      'accepted',
      'released',
      'rejected',
      'modified',
      'sender_draining',
//      'sender_flow',
      'sender_error',
      'sender_close',
      'receiver_open',
      'sender_open',
      'message'
    ], ev => this._container.on (ev, context => {
      logger.debug ('got event %s', ev);
      this['_on__' + ev] (context);
    }));
  }


  //////////////////////////////////////////////////
  _on__connection_open (context) {
    const id = context.connection.options.id;
    this._connections [id] = context.connection;
    logger.info ('new connection [%s] opened', id);
  }


  //////////////////////////////////////////////////
  _on__connection_close (context) {
    const id = context.connection.options.id;
    delete this._connections [id];

    context.connection.each_sender (s => {
      logger.info ('existing dangling sender %s', s.name);
        // cancel its tids
        _.each (s.__pending_tids, (v, k) => {
          logger.info ('cancelling tid %s', k);
          v.q.cancel (k);
        });
    });
    
    context.connection.each_receiver (s => {
      logger.info ('existing dangling receiver %s', s.name);
    });

    logger.info ('connection [%s] closed', id);
  }


  //////////////////////////////////////////////////
  _on__connection_error (context) {
    logger.error ('_on__connection_error: %o', context.error);
    // do not manage (socket gets closed)
  }


  //////////////////////////////////////////////////
  _on__session_open (context) {
    logger.verbose ('new session opened');
  }


  //////////////////////////////////////////////////
  _on__session_close (context) {
    logger.verbose ('session closed');
  }


  //////////////////////////////////////////////////
//  _on__session_error (context) {
//    logger.info ('_on__session_error');
//  }


  //////////////////////////////////////////////////
  _on__protocol_error (err) {
    // nothing to do but log it: socket will be closed
    logger.error ('_on__protocol_error: %o', err);
  }


  //////////////////////////////////////////////////
  _on__error (err) {
    logger.error ('Unmanaged Error emitted: %o', err);
    // TODO manage (apparently socket gets closed)
  }


  //////////////////////////////////////////////////
  _on__disconnected (context) {
    this._on__connection_close (context); 
  }


  //////////////////////////////////////////////////
//  _on__settled (context) {
//    logger.info ('_on__settled');
// TODO see to it for exactly-once deliveries ??
//  }


  //////////////////////////////////////////////////
  _on__receiver_drained (context) {
    logger.info ('_on__receiver_drained');
  }


  //////////////////////////////////////////////////
//  _on__receiver_flow (context) {
//    logger.info ('_on__receiver_flow');
//  }


  //////////////////////////////////////////////////
  _on__receiver_error (context) {
    logger.error ('_on__receiver_error: %o', context.error);
    // do not manage (socket gets closed)
  }


  //////////////////////////////////////////////////
  _on__receiver_close (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.receiver.remote.attach.target.address;
    const name =    context.receiver.name;

    logger.info ('[conn %s][receiver %s][addr %s] receiver is now closed', conn_id, name, addr);
  }


  //////////////////////////////////////////////////
  _item_to_amqp (item, message) {
    message.durable = true;
    message.delivery_count = item.tries;
    message.body =           item.payload;
    
    if (message.application_properties == undefined) message.application_properties = {};
    if (message.message_annotations ==    undefined) message.message_annotations =    {};
    if (message.application_properties == undefined) message.application_properties = {};
    if (message.footer ==                 undefined) message.footer =                 {};

    if (item.hdrs['subject'])          message.subject =          item.hdrs['subject'];
    if (item.hdrs['content-type'])     message.content_type =     item.hdrs['content-type'];
    if (item.hdrs['content-encoding']) message.content_encoding = item.hdrs['content-encoding'];

    if (item.hdrs['x-amqp-priority'])             message.priority =             parseInt (item.hdrs['x-amqp-priority']);
    if (item.hdrs['x-amqp-ttl'])                  message.ttl =                  parseInt (item.hdrs['x-amqp-ttl']);
    if (item.hdrs['x-amqp-absolute-expiry-time']) message.absolute_expiry_time = parseInt (item.hdrs['x-amqp-absolute-expiry-time']);
    if (item.hdrs['x-amqp-creation-time'])        message.creation_time =        parseInt (item.hdrs['x-amqp-creation-time']);
    if (item.hdrs['x-amqp-group-sequence'])       message.group_sequence =       parseInt (item.hdrs['x-amqp-group-sequence']);

    if (item.hdrs['x-amqp-message-id'])        message.message_id =        item.hdrs['x-amqp-message_id'];
    if (item.hdrs['x-amqp-user-id'])           message.user_id =           item.hdrs['x-amqp-user_id'];
    if (item.hdrs['x-amqp-to'])                message.to =                item.hdrs['x-amqp-to'];
    if (item.hdrs['x-amqp-reply-to'])          message.reply_to =          item.hdrs['x-amqp-reply-to'];
    if (item.hdrs['x-amqp-correlation-id'])    message.correlation_id =    item.hdrs['x-amqp-correlation-id'];
    if (item.hdrs['x-amqp-group-id'])          message.group_id =          item.hdrs['x-amqp-group-id'];
    if (item.hdrs['x-amqp-reply-to-group-id']) message.reply_to_group_id = item.hdrs['x-amqp-reply-to-group-id'];

    _.each (item.hdrs, (v, k) => {
      if (k.startsWith ('x-amqp-da-')) {const nk = k.substr (10); message.delivery_annotations[nk] = v;}
      else if (k.startsWith ('x-amqp-ma-')) {const nk = k.substr (10); message.message_annotations[nk] = v;}
      else if (k.startsWith ('x-amqp-ap-')) {const nk = k.substr (10); message.application_properties[nk] = v;}
      else if (k.startsWith ('x-amqp-ft-')) {const nk = k.substr (10); message.footer[nk] = v;}
      else if (k.startsWith ('x-'))         {message.application_properties[k] = v;}
    });

    message.application_properties['x-mature'] = item.mature.toISOString ();
  }


  //////////////////////////////////////////////////
  _send_one (conn_id, sender, q) {
    if (! sender.sendable ()) {
      logger.debug ('[conn %s][sender %s] sender is not sendable, desist', conn_id, sender.name);
      return;
    }

    if (_.size (sender.__pending_tids) >= this._parallel) {
      logger.debug ('[conn %s][sender %s] already sending, desist', conn_id, sender.name);
      return;
    }

    if (this._window_used (sender) >= this._window_size) {
      logger.verbose ('[conn %s][sender %s] too many pending acks, waiting', conn_id, sender.name);
      return;
    }

    const cid = sender.name;

    const opts = {
      reserve: sender.__do_reserve
    };
    
    logger.debug ('[conn %s][sender %s] getting element from queue %s@%s', conn_id, sender.name, q.name(), q.ns());
    const tid = q.pop (cid, opts, (err, item) => {
      delete this._pending_tids[tid];
      delete sender.__pending_tids[tid];

      if (err) {
        if (err == 'cancel') {
          // consumer cancelled, end intent
          this._metrics.keuss_q_reserve.labels ('amqp', q.ns(), q.name(), 'cancel').inc ();
          logger.info ('sender %s: send cancelled while pop from queue %s@%s', cid, q.name(), q.ns());
          return;
        }
        else {
          logger.error ('sender %s: error while pop from queue %s@%s: %o. Wait 5 secs...', cid, q.name(), q.ns(), err);
          return setTimeout (() => this._send_one (conn_id, sender, q), 5000);
        }
      }

      // no error
      logger.debug ('[conn %s][sender %s] got element from queue %s@%s: %o', conn_id, sender.name, q.name(), q.ns(), item.payload);

      const tag = item._id.toString();

      if (sender.__do_reserve) {
        // keep track of the pending ack if we needed to reserve
        this._pending_acks[tag] = {
          t: new Date(),
          msg: item,
          q: q
        };

        sender.__pending_acks++;

        logger.debug ('[conn %s][sender %s] new pending ack [%s]', conn_id, cid, tag);
      }

      const msg = {};
      this._item_to_amqp (item, msg);
      if (!msg.message_id) msg.message_id = tag;

      sender.send (msg, tag);

      logger.debug ('[conn %s][sender %s] sent with tag %s: %o', conn_id, cid, tag, item.payload);

      this._send_one (conn_id, sender, q);

      if (sender.__do_reserve) {
        this._metrics.keuss_q_reserve.labels ('amqp', q.ns(), q.name(), (err ? 'ko' : 'ok')).inc ();
      }
      else {
        this._metrics.keuss_q_pop.labels ('amqp', q.ns(), q.name(), (err ? 'ko' : 'ok')).inc ();
      }
    });

    // count another pending tid (waiting for queue.pop())
    sender.__pending_tids[tid] = {
      t: new Date(),
      q: q
    };

    // also store the tid globally, to ease housekeeping
    this._pending_tids[tid] = {
      t: new Date(),
      q: q,
      s: sender.name
    };
  }


  //////////////////////////////////////////////////
  _on__sendable (context) {  
    const conn_id = context.connection.options.id;
    const sender =  context.sender;
    // const addr =    sender.source.address;
    const q =       sender.__q;

    if (!q) {
      logger.verbose ('[conn %s][sender %s] signalled as sendable but queue is still not ready, ignoring', conn_id, sender.name);
      return;
    }

    logger.verbose ('[conn %s][sender %s] signalled as sendable', conn_id, sender.name);
    this._send_one (conn_id, sender, q);
  }


  //////////////////////////////////////////////////
  _on__accepted (context) {  
    const conn_id = context.connection.options.id;
    const sender =  context.sender;
    const name =    sender.name;
    const tag =     context.delivery.tag;
    const q =       sender.__q;

    logger.debug ('[conn %s][sender %s] received accepted with tag %s', conn_id, name, tag);

    const entry = this._pending_acks[tag];
    if (!entry) return logger.warn ('[conn %s][sender %s] nonexistent pending message with tag %s', conn_id, name, tag);

    q.ok (entry.msg, err => {
      if (err) return logger.error ('[conn %s][sender %s] while committing message with tag %s: %o', conn_id, name, tag, err);

      delete this._pending_acks[tag];
      sender.__pending_acks--;

      if (this._window_used (sender) == (this._window_size - 1)) {
        logger.debug ('REARM: wused %d, wsize %d', this._window_used (sender), this._window_size);
        this._send_one (conn_id, sender, q);
      }

      logger.verbose ('[conn %s][sender %s] accepted message with tag %s: %o', conn_id, name, tag, entry.msg.payload);
      this._metrics.keuss_q_commit .labels ('amqp', q.ns(), q.name(), (err ? 'ko' : 'ok')).inc ();
    });
  }


  //////////////////////////////////////////////////
  _on__rejected (context) {
    const conn_id = context.connection.options.id;
    const sender =  context.sender;
    const name =    sender.name;
    const tag =     context.delivery.tag;
    const q =       sender.__q;
    const error =   context.delivery?.remote_state?.error || {};

    logger.verbose ('[conn %s][sender %s] received rejected with tag %s: %s', conn_id, name, tag, error.description || error.condition || error.info);

    const entry = this._pending_acks[tag];
    if (!entry) return logger.warn ('[conn %s][sender %s] nonexistent pending message with tag %s', conn_id, name, tag);

    const delay = this._get_delay (entry.msg);
    q.ko (entry.msg, (new Date().getTime () + delay), (err, res) => {
      // TODO log if deadletter-ed
      // TODO set delay based on rejections
      if (err) return logger.error ('[conn %s][sender %s] while rolling-back message with tag %s: %o', conn_id, name, tag, err);

      delete this._pending_acks[tag];
      sender.__pending_acks--;

      if (this._window_used (sender) == (this._window_size - 1)) {
        logger.debug ('REARM: wused %d, wsize %d', this._window_used (sender), this._window_size);
        this._send_one (conn_id, sender, q);
      }

      logger.debug ('[conn %s][sender %s] rolled-back message [%s] with delay of %d sec, rollback-result %o', conn_id, name, tag, delay, res);
      this._metrics.keuss_q_rollback .labels ('amqp', q.ns(), q.name(), (err ? 'ko' : ((res === false) ? 'deadletter' : 'ok'))).inc ();
    });
  }


  //////////////////////////////////////////////////
  _on__released (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.warn ('[conn %s][sender %s][addr %s] UNSUPPORTED released message with tag %s, ignored', conn_id, name, addr, tag);
    // TODO Assume rejected or ignored?
  }


  //////////////////////////////////////////////////
  _on__modified (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.warn ('[conn %s][sender %s][addr %s] UNSUPPORTED modified message with tag %s, ignored', conn_id, name, addr, tag);
  }


  //////////////////////////////////////////////////
  _on__sender_draining (context) {
    logger.info ('_on__sender_draining');
  }

  //////////////////////////////////////////////////
//  _on__sender_flow (context) {
//    logger.info ('_on__sender_flow');
//  }

  //////////////////////////////////////////////////
  _on__sender_error (context) {
    logger.error ('_on__sender_error: %o', context.error);
    // do not manage (socket gets closed)
  }


  //////////////////////////////////////////////////
  _on__sender_close (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;

    logger.info ('closing sender %s', name);
      
    // cancel its tids
    _.each (context.sender.__pending_tids, (v, k) => {
      logger.info ('cancelling tid %s', k);
      v.q.cancel (k);
    });

    logger.info ('[conn %s][sender %s][addr %s] sender is now closed', conn_id, name, addr);
  }


  //////////////////////////////////////////////////
  _on__receiver_open (context) {
    const conn_id = context.connection.options.id;
    const target =  context.receiver.remote.attach.target;
    const name =    context.receiver.name;

    this._get_queue (target.address, (err, q) => {
      if (err) {
        logger.error ('while opening a receiver: %s', err);
        return context.receiver.close ({
          condition: 'amqp:not-found',
          description: `while trying to get queue [${target.address}] for receiver: ${err}`
        });
      }

      context.receiver.set_target (target);
      context.receiver.__q = q;

      // drain in-mem buffer while queue was being created, if exists
      if (context.receiver.__rcv_buffer) {
        logger.verbose ('draining %d messages from in-mem buffer (while queue gets created)', context.receiver.__rcv_buffer.length);
        _.each (context.receiver.__rcv_buffer, item => this._push_a_mesg (q, item.delivery, item.msg, item.opts));
        delete context.receiver.__rcv_buffer;
      }

      logger.verbose ('[%s] new receiver [%s] opened: attached to queue %s@%s', conn_id, name, q.name (), q.ns ());
    });
  }


  //////////////////////////////////////////////////
  _on__sender_open (context) {    
    const conn_id = context.connection.options.id;
    const src =     context.sender.remote.attach.source;
    const name =    context.sender.name;

    logger.info ('[%s] sender_open received for q %s, name %s', conn_id, src.address, name);

    this._get_queue (src.address, (err, q) => {
      if (err) {
        logger.error ('while opening a sender: %s', err);
        return context.sender.close ({
          condition: 'amqp:not-found',
          description: `while trying to get queue [${src.address}] for sender: ${err}`
        });
      }
    
      // honor remote value for snd_settle_mode
      context.sender.local.attach.snd_settle_mode = context.sender.snd_settle_mode;

      context.sender.set_source (src);
      context.sender.__q = q;
      context.sender.__pending_acks = 0;
      context.sender.__pending_tids = {};
      context.sender.__do_reserve = context.sender.snd_settle_mode != 1;

      logger.info ('[%s] new sender [%s] opened: attached to queue %s@%s, snd_settle_mode is %d', conn_id, name, q.name (), q.ns (), context.sender.snd_settle_mode);

      // force init of sending loops
      this._send_one (conn_id, context.sender, q);
    });
  }


  //////////////////////////////////////////////////
  _amqp_to_hdrs (message, opts) {
    if (message.delivery_count)   opts.tries =                    message.delivery_count;
    
    if (message.subject)          opts.hdrs['subject'] =          message.subject;
    if (message.content_type)     opts.hdrs['content-type'] =     message.content_type;
    if (message.content_encoding) opts.hdrs['content-encoding'] = message.content_encoding;

    if (message.priority)             opts.hdrs['x-amqp-priority'] =             message.priority + '';
    if (message.ttl)                  opts.hdrs['x-amqp-ttl'] =                  message.ttl + '';
    if (message.absolute_expiry_time) opts.hdrs['x-amqp-absolute-expiry-time'] = message.absolute_expiry_time + '';
    if (message.creation_time)        opts.hdrs['x-amqp-creation-time'] =        message.creation_time + '';
    if (message.group_sequence)       opts.hdrs['x-amqp-group-sequence'] =       message.group_sequence + '';

    if (message.message_id)        opts.hdrs['x-amqp-message-id'] =        message.message_id;
    if (message.user_id)           opts.hdrs['x-amqp-user-id'] =           message.user_id;
    if (message.to)                opts.hdrs['x-amqp-to'] =                message.to;
    if (message.reply_to)          opts.hdrs['x-amqp-reply-to'] =          message.reply_to;
    if (message.correlation_id)    opts.hdrs['x-amqp-correlation-id'] =    message.correlation_id;
    if (message.group_id)          opts.hdrs['x-amqp-group-id'] =          message.group_id;
    if (message.reply_to_group_id) opts.hdrs['x-amqp-reply-to-group-id'] = message.reply_to_group_id;

    if (message.application_properties) {
      const x_next_t =  parseInt (message.application_properties['x-next-t']);  delete message.application_properties['x-next-t'];
      const x_delta_t = parseInt (message.application_properties['x-delta-t']); delete message.application_properties['x-delta-t'];

      if (x_next_t)  opts.mature = x_next_t;
      if (x_delta_t) opts.delay = Math.floor(x_delta_t / 1000);
    }

    _.each (message.delivery_annotations,   (v, k) => opts.hdrs['x-amqp-da-' + k] = v + '');
    _.each (message.message_annotations,    (v, k) => opts.hdrs['x-amqp-ma-' + k] = v + '');
    _.each (message.application_properties, (v, k) => opts.hdrs['x-amqp-ap-' + k] = v + '');
    _.each (message.footer,                 (v, k) => opts.hdrs['x-amqp-ft-' + k] = v + '');
  }


  //////////////////////////////////////////////////
  _on__message (context) {
    const conn_id = context.connection.options.id;
    const name =    context.receiver.name;
    const addr =    context.receiver.target.address;

    logger.verbose ('[%s][%s] got message: %o', conn_id, name, context.message);
    
    const q = context.receiver.__q;
    const msg = context.message.body;
    const opts = {
      // TODO mature: 
      // TODO delay: 
      hdrs: {}
    }

    this._amqp_to_hdrs (context.message, opts) ;

    if (!q) {
      // keuss queue is created async. buffer pushes in mem meanwhile
      if (!context.receiver.__rcv_buffer) context.receiver.__rcv_buffer = [];
      context.receiver.__rcv_buffer.push ({delivery: context.delivery, msg, opts});
      logger.verbose ('buffered received message on addr %s while queue gets created', addr);
    }
    else {
      this._push_a_mesg (q, context.delivery, msg, opts);
    }
  }


  //////////////////////////////////////////////////
  _push_a_mesg (q, delivery, msg, opts) {
    q.push (msg, opts, (err, res) => {
      if (err) {
        logger.error ('Could not push to %s@%s: %o', q.name(), q.ns(), err);

        return delivery.reject ({
          condition: 'amqp:internal-error',
          description: err.toString ()
        });
      }

      logger.verbose ('pushed new mesg to %s@%s: %o', q.name(), q.ns(), res);
      delivery.accept ();
      this._metrics.keuss_q_push.labels ('amqp', q.ns(), q.name(), (err ? 'ko' : 'ok')).inc ();
    });
  }


  //////////////////////////////////////////////////
  _create_metric_amqp (id, help, collect) {
    let the_metric = this._context.promster.register.getSingleMetric('amqp_' + id);

    if (the_metric) {
      this._amqp_metrics['amqp_' + id] = the_metric;
    }
    else {
      this._amqp_metrics['amqp_' + id] = new this._context.promster.Gauge ({
        name:    'amqp_' + id,
        help:    help,
        collect: collect
      });
    }
  }


  //////////////////////////////////////////////////
  _create_metrics_amqp () {
    const self = this;
    this._amqp_metrics = {};
    this._create_metric_amqp ('connections',  'active amqp connections',         function () {this.set (_.size (self._connections))} );
    this._create_metric_amqp ('senders',      'active amqp senders',             function () {
      let count = 0;
      _.forEach (self._connections, c => c.each_sender (() => count++));
      this.set (count);
    });
    this._create_metric_amqp ('receivers',    'active amqp receivers',           function () {
      let count = 0;
      _.forEach (self._connections, c => c.each_receiver (() => count++));
      this.set (count);
    });
    this._create_metric_amqp ('pending_acks', 'in-flight messages, pending ack', function () {this.set (_.size (self._pending_acks))} );
    this._create_metric_amqp ('pending_tids', 'idle consumers',                  function () {this.set (_.size (self._pending_tids))});
    this._create_metric_amqp ('wsize',        'total window size',               function () {
      let wsize = 0;
      _.forEach (self._connections, (c, id) => {
        c.each_sender (s => wsize += self._window_size);
      });
      this.set (wsize);
    });
  };


  ///////////////////////////////////////////////////////////////////////////
  _get_queue (destination, cb) {
    // dest must be one of : /amq/queue/(R) /queue/(R) (R)
    // where (R) is one of: ns/queue
    const match = destination.match (/^(?:\/amq\/queue\/|\/queue\/)?(?<ns>[a-zA-Z0-9\\-_:]+)\/(?<q>[a-zA-Z0-9\\-_:]+)$/);
    if (!match) return cb (`address ${destination} must match <ns>/<queue> or /queue/<ns>/<queue> or /amq/queue/<ns>/<queue>`);

    const ns = this._scope.namespace (match.groups.ns);
    if (!ns) return cb (`unknown namespace ${ns} on address ${destination}`);

    const qname = match.groups.q;
    this._scope.queue_from_ns (ns, qname, null, cb);
  }
}

module.exports = AMQP;
