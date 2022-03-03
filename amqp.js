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
    
    this._window_size = this._config.wsize || 512;
    this._window_size = this._window_size > 2048 ? 2048 : this._window_size;
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
      port: 5672
    });

    this._net_server.once ('listening', () => {
      logger.info ('AMQP server listening at port %d', 5672);
      cb ();
    });

    this._net_server.once ('error', err => {
      logger.error ('AMQP server listening error: %o', err);
      cb (err);
    });
  }


  ///////////////////////////////////////////
  _window_used (sender) {
    return sender.__pending_acks + (sender.__sending ? 1 : 0);
  }


  ///////////////////////////////////////////////////////////////////////////
  _cancel_pending () {
    _.forEach (this._pending_tids, (val, tid) => {
      val.q.cancel (tid);
      logger.verbose ('cancelled pending TID [%s] on queue %s@%s', tid, q.name(), q.ns());
    });
  }


  ///////////////////////////////////////////////////////////////////////////
  _rollback_pending (cb) {
    const next_t = new Date().getTime ();
    const tasks = [];

    _.forEach (this._pending_acks, (val, id) => {
      tasks.push (cb => val.q.ko (val.msg, next_t, (err, res) => {
        if (err) {
//          this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'ko').inc ();
          logger.error ('error while rolling back pending ack [%s]: %o', id, err);
        }
        else {
          if (res == 'deadletter') {
//            this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'deadletter').inc ();
            logger.verbose ('rolled back pending ack [%s] resulted in move-to-deadletter. No more retries will happen', id);
          }
          else if (!res) {
//            this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'notfound').inc ();
            logger.error ('while rolling back pending ack [%s]: no such element', id);
          }
          else {
//            this._metrics.keuss_q_rollback .labels ('stomp', this._q.ns(), this._q.name(), 'ok').inc ();
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
          pending_acks: s.__pending_acks,
          pending_tids: s.__sending ? 1: 0
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
//      'session_open',
//      'session_close',
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
    this._amqp_metrics.amqp_connections.inc ();
  }


  //////////////////////////////////////////////////
  _on__connection_close (context) {
    const id = context.connection.options.id;
    delete this._connections [id];

    context.connection.each_sender (s => {
      logger.verbose ('see dangling sender %s', s.name);
      // TODO cancel its tid
      if (s.is_open ()) this._amqp_metrics.amqp_senders.dec ();
    });
    
    context.connection.each_receiver (s => {
      logger.verbose ('see dangling receiver %s', s.name);
      if (s.is_open ()) this._amqp_metrics.amqp_receivers.dec ();
    });

    this._amqp_metrics.amqp_connections.dec ();
    logger.info ('connection [%s] closed', id);
  }


  //////////////////////////////////////////////////
  _on__connection_error (context) {
    logger.info ('_on__connection_error');
  }

  //////////////////////////////////////////////////
//  _on__session_open (context) {
//    logger.info ('_on__session_open');
//  }

  //////////////////////////////////////////////////
//  _on__session_close (context) {
//    logger.info ('_on__session_close');
//  }

  //////////////////////////////////////////////////
//  _on__session_error (context) {
//    logger.info ('_on__session_error');
//  }

  //////////////////////////////////////////////////
  _on__protocol_error (context) {
    logger.info ('_on__protocol_error');
  }


  //////////////////////////////////////////////////
  _on__error (err) {
    logger.error ('Error emitted: %o', err);
  }


  //////////////////////////////////////////////////
  _on__disconnected (context) {
    this._on__connection_close (context); 
  }


  //////////////////////////////////////////////////
//  _on__settled (context) {
//    logger.info ('_on__settled');
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
    logger.info ('_on__receiver_error');
  }

  //////////////////////////////////////////////////
  _on__receiver_close (context) {
    logger.info ('_on__receiver_close');
  }


  //////////////////////////////////////////////////
  _send_one (conn_id, sender, q) {
    if (! sender.sendable ()) {
      logger.debug ('[conn %s][sender %s] sendable burst ended', conn_id, sender.name);
      return;
    }

    if (sender.__sending) {
      logger.debug ('[conn %s][sender %s] already sending', conn_id, sender.name);
      return;
    }

    if (this._window_used (sender) >= this._window_size) {
      logger.verbose ('[conn %s][sender %s] too many pending acks, waiting', conn_id, sender.name);
      return;
    }

    const cid = sender.name;
    const opts = {
      reserve: true
    };

    logger.debug ('[conn %s][sender %s] getting element from queue %s@%s', conn_id, sender.name, q.name(), q.ns());
    const tid = q.pop (cid, opts, (err, res) => {
      delete this._pending_tids[tid];
      delete sender.__sending;

      if (err) {
        if (err == 'cancel') {
          // consumer cancelled, end intent
          logger.debug ('sender %s: send cancelled while pop from queue %s@%s', cid, q.name(), q.ns());
          return;
        }
        else {
          logger.error ('sender %s: error while pop from queue %s@%s: %o. Wait 5 secs...', cid, q.name(), q.ns(), err);
          return setTimeout (() => this._send_one (conn_id, sender, q), 5000);
        }
      }

      // no error
      logger.debug ('[conn %s][sender %s] got element from queue %s@%s: %o', conn_id, sender.name, q.name(), q.ns(), res);

      const tag = res._id.toString();

      this._pending_acks[tag] = {
        t: new Date(),
        msg: res,
        q: q
      };

      sender.__pending_acks++;

      logger.debug ('[conn %s][sender %s] new pending ack [%s]', conn_id, cid, tag);

      sender.send ({message_id: tag, body: res.payload}, tag);
      logger.debug ('[conn %s][sender %s] sent (%s)', conn_id, cid, tag);

      this._send_one (conn_id, sender, q);
    });

    // mark this sender as 'sending already'
    sender.__sending = tid;

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

    logger.debug ('[conn %s][sender %s] signalled as sendable', conn_id, sender.name);
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

      logger.debug ('[conn %s][sender %s] accepted message with tag %s', conn_id, name, tag);
    });
  }


  //////////////////////////////////////////////////
  _on__rejected (context) {
    const conn_id = context.connection.options.id;
    const sender =  context.sender;
    const name =    sender.name;
    const tag =     context.delivery.tag;
    const q =       sender.__q;

    logger.debug ('[conn %s][sender %s] received rejected with tag %s', conn_id, name, tag);

    const entry = this._pending_acks[tag];
    if (!entry) return logger.warn ('[conn %s][sender %s] nonexistent pending message with tag %s', conn_id, name, tag);

    q.ko (entry.msg, (err, res) => {
      // TODO log if deadletter-ed
      if (err) return logger.error ('[conn %s][sender %s] while rolling-back message with tag %s: %o', conn_id, name, tag, err);

      delete this._pending_acks[tag];
      sender.__pending_acks--;

      if (this._window_used (sender) == (this._window_size - 1)) {
        logger.debug ('REARM: wused %d, wsize %d', this._window_used (sender), this._window_size);
        this._send_one (conn_id, sender, q);
      }

      logger.debug ('[conn %s][sender %s] rolled-back message with tag %s', conn_id, name, tag);
    });
  }


  //////////////////////////////////////////////////
  _on__released (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.warn ('[conn %s][sender %s][addr %s] UNSUPPORTED released message with tag %s, ignored', conn_id, name, addr, tag);
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
    logger.info ('_on__sender_error');
  }


  //////////////////////////////////////////////////
  _on__sender_close (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;

    this._amqp_metrics.amqp_senders.dec ();
    logger.info ('[conn %s][sender %s][addr %s] sender is now closed', conn_id, name, addr);
  }


  //////////////////////////////////////////////////
  _on__receiver_open (context) {
    const conn_id = context.connection.options.id;
    const target =  context.receiver.remote.attach.target;
    const name =    context.receiver.name;

    var q = this._get_queue (target.address);
    if (_.isString (q)) {
      logger.error ('while opening a receiver: %s', q);
      return context.receiver.close ({
        condition: 'a.b.c',
        description: q
      });
    }

    context.receiver.set_target (target);
    context.receiver.__q = q;

    this._amqp_metrics.amqp_receivers.inc ();
    logger.info ('[%s] new receiver [%s] opened: attached to queue %s', conn_id, name, target.address);
  }


  //////////////////////////////////////////////////
  _on__sender_open (context) {    
    const conn_id = context.connection.options.id;
    const src =     context.sender.remote.attach.source;
    const name =    context.sender.name;

    var q = this._get_queue (src.address);
    if (_.isString (q)) {
      logger.error ('while opening a sender: %s', q);
      return context.sender.close ({
        condition: 'a.b.c',
        description: q
      });
    }

    context.sender.set_source (src);
    context.sender.__q = q;
    context.sender.__pending_acks = 0;

    this._amqp_metrics.amqp_senders.inc ();
    logger.info ('[%s] new sender [%s] opened: attached to queue %s@%s', conn_id, name, q.name (), q.ns ());
  }


  //////////////////////////////////////////////////
  _on__message (context) {
    const conn_id = context.connection.options.id;
    const name =    context.receiver.name;
    const addr =    context.receiver.target.address;

    logger.info ('[%s][%s] got message: %o', conn_id, name, context.message);
    
    const q = context.receiver.__q;

    q.push (context.message, (err, res) => {
      if (err) {

      }
      logger.info ('pushed to %s@%s: %o %o', q.name(), q.ns(), err, res)
      context.delivery.accept ();
    });
  }


  //////////////////////////////////////////////////
  _create_metric_amqp (id, help) {
    let the_metric = this._context.promster.register.getSingleMetric('amqp_' + id);

    if (the_metric) {
      this._amqp_metrics['amqp_' + id] = the_metric;
    }
    else {
      this._amqp_metrics['amqp_' + id] = new this._context.promster.Gauge ({
        name: 'amqp_' + id,
        help: help
      });
    }
  }


  //////////////////////////////////////////////////
  _create_metrics_amqp () {
    this._amqp_metrics = {};
    this._create_metric_amqp ('connections',  'active amqp connections');
    this._create_metric_amqp ('senders',      'active amqp senders');
    this._create_metric_amqp ('receivers',    'active amqp receivers');
  }


  ///////////////////////////////////////////////////////////////////////////
  _get_queue (destination) {
    // dest must be one of : /amq/queue/(R) /queue/(R) (R)
    // where (R) is one of: ns/queue
    const match = destination.match (/^(?:\/amq\/queue\/|\/queue\/)?(?<ns>[a-zA-Z0-9\\-_:]+)\/(?<q>[a-zA-Z0-9\\-_:]+)$/);

    if (!match) return `address ${destination} must match <ns>/<queue> or /queue/<ns>/<queue> or /amq/queue/<ns>/<queue>`;

    const ns = this._scope.namespace (match.groups.ns);

    if (!ns) return `unknown namespace ${ns} on address ${destination}`;

    var qname = match.groups.q;

    if (!ns.q_repo.has(qname)) {
      ns.q_repo.set (qname, ns.factory.queue (qname, {}));
    }

    const q = ns.q_repo.get(qname);
    return q;
  }





}

module.exports = AMQP;
