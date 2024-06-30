const _ =     require ('lodash');
const async = require ('async');
const Log =   require ('winston-log-space');
const Joi =   require ('joi');


const Destination = require ('./Destination');
const QConsumer =   require ('./QConsumer');


const schema_config_exchange = Joi.object({
  consumer: Joi.object({
    parallel: Joi.number().integer ().min(1).max(16),
    wsize: Joi.number().integer ().min(1).max(4096),
    reserve: Joi.boolean()
  }).unknown (false),
  src: Joi.object({
    ns: Joi.string().required(),
    queue: Joi.string ().required()
  }).unknown (false).required(),
  dst: Joi.array().items(Joi.object ({
    ns: Joi.string().required(),
    queue: Joi.string ().required(),
    selector: [
        Joi.string(),
        Joi.function()
    ],
  }).unknown (false)).required ()
}).unknown (false);


class Exchange {
  //////////////////////////////////////////////////////////
  constructor (name, config, context) {
    this._scope = context.scope;
    this._context = context;
    this._name = name;
    this._config = config;

    this._logger = Log.logger (`exchange:${name}`);

    // validate config
    Exchange.validate_config();

    this._logger.verbose ('created with config %j', config);
  }


  //////////////////////////////////////////////////////////
  init (cb) {
    async.series ([
      cb => this._create_qconsumer_from_config (cb),
      cb => this._qconsumer.init(cb),
    ], err => {
      if (err) return cb (err, this);
      this._logger.verbose ('init done');
      cb (null, this);
    });
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
    if (this._qconsumer) return this._qconsumer.status ();
    return {pending_initialization: true};
  }


  ////////////////////////////////////////////////////////// 
  static validate_config (config) {
    const val_ret = schema_config_exchange.validate (config);
    return val_ret.error;
  }


  //////////////////////////////////////////////////////////  
  _create_qconsumer_from_config (cb) {
    const src_ns = this._scope.namespace (this._config.src.ns);
    if (!src_ns) return cb (`src namespace ${this._config.src.ns} not defined`);

    this._scope.queue_from_ns (src_ns, this._config.src.queue, null, (err, src_q) => {
      if (err) return cb (err);

      const tasks = [];

      _.each (this._config.dst, dst => {
        const dst_ns = this._scope.namespace(dst.ns);
        if (!dst_ns) return cb (`dst namespace ${dst.ns} not defined`);

        tasks.push (cb => this._scope.queue_from_ns (dst_ns, dst.queue, null, (err, q) => {
          if (err) return cb (err);
          cb (null, {q, dst, selector: dst.selector});
        }));
      });
      
      async.series (tasks, (err, dst_qs) => {
        if (err) return cb (err);

        const dsts = [];
        _.each (dst_qs, dst => {
          try {
            const d = new Destination (dst.name, dst.q, dst.selector, this._logger);
            dsts.push (d);
          }
          catch (e) {
            this._logger.error ('error in Destination %j: %s. Destination IGNORED', dst, e.message);
          }
        });

        this._qconsumer = new QConsumer (this, src_q, dsts, this._config.consumer || {}, this._context);
        cb();
      });
    });
  } 
};

module.exports = Exchange;
