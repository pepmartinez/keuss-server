var http =  require ('http');
var async = require ('async');
var CC =    require ('cascade-config');
var Log =   require ('winston-log-space');

var cconf = new CC();

var defaults = {
  main: {
    max_hops: 11
  },
  http: {
    port: 3444,
    users: {}
  },
  stomp: {
    port: 61613,
    keepalive_interval: 2000,
    read_timeout: 12000,
    parallel: 3,
    wsize: 1000
  },
  amqp: {
    port: 5672,
    wsize: 512,
    parallel: 3,
    retry: {
      delay: {
        c0: 3,
        c1: 3,
        c2: 3
      }
    }
  },
  namespaces: {},
  exchanges: {}
};


function _create_q_metric (context, id, help) {
  const the_metric = context.promster.register.getSingleMetric('keuss_' + id);

  if (the_metric) {
    context.metrics[id] = the_metric;
  }
  else {
    context.metrics['keuss_' + id] = new context.promster.Counter ({
      name: 'keuss_' + id,
      help: help,
      labelNames: ['proto', 'ns', 'q', 'status']
    });
  }
}


function _create_exchange_metrics (context) {
  const exchange_hops = context.promster.register.getSingleMetric('keuss_exchange_hops');

  if (exchange_hops) {
    context.metrics['keuss_exchange_hops'] = exchange_hops;
  }
  else {
    context.metrics['keuss_exchange_hops'] = new context.promster.Histogram ({
      name: 'keuss_exchange_hops',
      help: 'hops in exchanges, from src queue to dst queues',
      labelNames: ['exchange', 'status'],
      buckets: [0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000]
    });
  }
}


function _create_q_metrics (context) {
  _create_q_metric (context, 'q_push',     'counters on queue insertion through server');
  _create_q_metric (context, 'q_pop',      'counters on queue pop through server');
  _create_q_metric (context, 'q_reserve',  'counters on queue reserve through server');
  _create_q_metric (context, 'q_commit',   'counters on queue commit through server');
  _create_q_metric (context, 'q_rollback', 'counters on queue rollback through server');
}


function _create_metrics (context, cb) {
  context.metrics = {};
  _create_q_metrics (context);
  _create_exchange_metrics (context);
  cb ();
}



cconf
  .obj  (defaults)
  .env  ({prefix: 'KS_'})
  .args ()
  .file (__dirname + '/etc/config.js',                        {ignore_missing: true})
  .file (__dirname + '/etc/config-{NODE_ENV:development}.js', {ignore_missing: true})
  .env  ({prefix: 'KS_'})
  .args ()
  .done ((err, config) => {
    if (err) {
      console.error (err);
      process.exit (1);
    }

    Log.init (err => {
      if (err) return console.error (err);

      const logger = Log.logger ('main');

      const BaseApp = require ('./app');
      const Stomp =   require ('./stomp');
      const Amqp =    require ('./amqp');
      const Scope =   require ('./Scope');

      const context = {};
      context.config = config;
      context.scope = new Scope ();

      async.series ([
        cb => BaseApp (config, context, null, (err, app) => {
          if (err) return cb (err);
          context.app = app;
          context.promster = context.app.locals.Prometheus;
          cb ();
        }),
        cb => _create_metrics (context, cb),
        cb => context.scope.init (config, context, cb),
        cb => context.scope.start (cb),
        cb => {
          // init stomp server
          context.stomp_server = new Stomp (config, context);
          context.app.get ('/stomp/status', (req, res) => res.send (context.stomp_server.status (req.query && req.query.v)));
          context.stomp_server.run (cb);
        },
        cb => {
          // init amqp server
          context.amqp_server = new Amqp (config, context);
          context.app.get ('/amqp/status', (req, res) => res.send (context.amqp_server.status (req.query && req.query.v)));
          context.amqp_server.run (cb);
        },
        cb => {
          // init http/rest server
          context.server = require('http-shutdown')(http.createServer (context.app));
          const port = config.http.port || 3444;

          context.server.listen (port, err => {
            if (err) return cb (err);
            logger.info ('REST server listening at port %s', port);
            cb ();
          });
        },
        cb => {
          require ('@promster/express').signalIsUp();
          cb ();
        }
      ], err => {
        if (err) {
          logger.error (err);
          process.exit (1);
        }
      });

      function __shutdown () {
        logger.info (`shutdown init`);

        require ('@promster/express').signalIsNotUp();

        async.parallel ([
          cb => context.scope.drain (cb),
          cb => context.server.shutdown (cb),
          cb => context.amqp_server.end (cb),
          cb => context.stomp_server.end (cb),
          cb => context.scope.end (cb),
          cb => {
            if (context.promster) {
              context.promster.register.clear();
            }
          }
        ], err => {
          logger.info (`shutdown done`);

//          require('active-handles').print();

        })
      }

      process.on ('SIGINT',  __shutdown);
      process.on ('SIGTERM', __shutdown);
    });
});
