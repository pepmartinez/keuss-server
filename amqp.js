const uuid = require ('uuid');
const util = require ('util');
const _ =    require ('lodash');
const Rhea = require ('rhea');
const Log =  require ('winston-log-space');

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
  }


  ///////////////////////////////////////////////////////////////////////////
  run (cb) {
    this._net_server = this._container.listen ({'port': 5672});

    this._net_server.once ('listening', () => {
      logger.info ('AMQP server listening at %d', 5672);
      cb ();
    });

    this._net_server.once ('error', err => {
      logger.error ('AMQP server listening error: %o', err);
      cb (err);
    });
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

    logger.info ('AMQP server closed');
    setImmediate (cb);
  }


  ///////////////////////////////////////////////////////////////////////////
  status () {
    var res = {};

    _.forEach (this._connections, (c, id) => {
      var receivers = {};
      c.each_receiver (r => {
        receivers[r.name] = {}
      });

      var senders = {};
      c.each_sender (r => {
        senders[r.name] = {}
      }); 

      res[id] = { receivers, senders };
    });

    return {connections: res};
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
      'receiver_flow',
      'receiver_error',
      'receiver_close',
      'sendable',
      'accepted',
      'released',
      'rejected',
      'modified',
      'sender_draining',
      'sender_flow',
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
  _on__receiver_flow (context) {
    logger.info ('_on__receiver_flow');
  }

  //////////////////////////////////////////////////
  _on__receiver_error (context) {
    logger.info ('_on__receiver_error');
  }

  //////////////////////////////////////////////////
  _on__receiver_close (context) {
    logger.info ('_on__receiver_close');
  }


  //////////////////////////////////////////////////
  _on__sendable (context) {  
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;

    logger.info ('[conn %s][sender %s] is sendable', conn_id, name);

    while (context.sender.sendable() && (this.__i < 5)) {
      const tag = 'asdfghjkl__' + this.__i + '__' 
      context.sender.send ({message_id: tag, body: {seq: this.__i, text: 'wrqwerqwreqwerqwerqwerq'}}, tag);
      this.__i++;
      logger.info ('[conn %s][sender %s][addr %s] sent #%d (%s)', conn_id, name, addr, this.__i, tag);
    }

    logger.info ('sendable burst ended');
  }


  //////////////////////////////////////////////////
  _on__accepted (context) {  
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.info ('[conn %s][sender %s][addr %s] accepted message with tag %s', conn_id, name, addr, tag);
  }


  //////////////////////////////////////////////////
  _on__released (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.info ('[conn %s][sender %s][addr %s] released message with tag %s', conn_id, name, addr, tag);
  }


  //////////////////////////////////////////////////
  _on__rejected (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.info ('[conn %s][sender %s][addr %s] rejected message with tag %s', conn_id, name, addr, tag);
  }


  //////////////////////////////////////////////////
  _on__modified (context) {
    const conn_id = context.connection.options.id;
    const addr =    context.sender.source.address;
    const name =    context.sender.name;
    const tag =     context.delivery.tag;
    logger.info ('[conn %s][sender %s][addr %s] modified message with tag %s', conn_id, name, addr, tag);
  }


  //////////////////////////////////////////////////
  _on__sender_draining (context) {
    logger.info ('_on__sender_draining');
  }

  //////////////////////////////////////////////////
  _on__sender_flow (context) {
    logger.info ('_on__sender_flow');
  }

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
    logger.info ('_on__receiver_open');
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

    this._amqp_metrics.amqp_senders.inc ();
    logger.info ('[%s] new sender [%s] opened: attached to queue %s@%s', conn_id, name, q.name (), q.ns ());

    this.__i = 0;
  }


  //////////////////////////////////////////////////
  _on__message (context) {
    logger.info ('_on__message');
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
