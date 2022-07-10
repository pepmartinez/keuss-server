const _ =   require ('lodash');
const Log = require ('winston-log-space');
const Joi = require ('joi');



const Destination = require ('./Destination');
const QConsumer =   require ('./QConsumer');
const { min } = require('lodash');



const schema_config_exchange = Joi.object({
  consumer: Joi.object({
    parallel: Joi.number().integer ().min(1).max(16),
    wsize: Joi.number().integer ().min(1).max(4096),
    reserve: Joi.boolean()
  }).unknown (false),
  src: Joi.object({
    ns: Joi.string().required(),
    queue: Joi.string ().required()
  }).unknown (false),
  dst: Joi.array().items(Joi.object ({
    ns: Joi.string().required(),
    queue: Joi.string ().required(),
    selector: [
        Joi.string(),
        Joi.function()
    ],
  }).unknown (false))
}).unknown (false);


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


  ///////////////////////////////////////////
  name () {
    return this._name;
  }


  ///////////////////////////////////////////
  status () {
    const status = this._qconsumer.status ();
//    status.config = this._config;
    return status;
  }


  //////////////////////////////////////////////////////////  
  _create_qconsumer_from_config () {
    // validate config
    const val_ret = schema_config_exchange.validate (this._config);
    if (val_ret.error) throw val_ret.error;

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

    this._qconsumer = new QConsumer (this, src_q, dsts, this._config.consumer || {}, this._context);
  } 
};

module.exports = Exchange;
