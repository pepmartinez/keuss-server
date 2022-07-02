const _ =   require ('lodash');
const Log = require ('winston-log-space');


const Destination = require ('./Destination');
const QConsumer =   require ('./QConsumer');


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
