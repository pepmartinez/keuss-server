var http =  require ('http');
var async = require ('async');
var CC =    require ('cascade-config');
var Log =   require ('winston-log-space');

var cconf = new CC();

var defaults = {
  http: {
    port: 3444,
    users: {}
  },
  stomp: {
    port: 61613,
    keepalive_interval: 2000,
    read_timeout: 12000
  },
  namespaces: {}
};


function _create_q_metric (context, id, help) {
  let the_metric = context.promster.register.getSingleMetric('keuss_' + id);

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

function _create_metrics (context, cb) {
  // create extra metrics
  context.metrics = {};
  _create_q_metric (context, 'q_push',     'counters on queue insertion through server');
  _create_q_metric (context, 'q_pop',      'counters on queue pop through server');
  _create_q_metric (context, 'q_reserve',  'counters on queue reserve through server');
  _create_q_metric (context, 'q_commit',   'counters on queue commit through server');
  _create_q_metric (context, 'q_rollback', 'counters on queue rollback through server');

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
  .done (function (err, config) {
    if (err) {
      console.error (err);
      process.exit (1);
    }

    Log.init (err => {
      if (err) return console.error (err);

      var logger = Log.logger ('main');

      var BaseApp = require ('./app');
      var Stomp =   require ('./stomp');
      var Scope =   require ('./Scope');

      var context = {};
      context.scope = new Scope ();

      async.series ([
        cb => context.scope.init (config, cb),
        cb => BaseApp (config, context, null, (err, app) => {
          if (err) return cb (err);
          context.app = app;
          context.promster = context.app.locals.Prometheus;
          cb ();
        }),
        cb => _create_metrics (context, cb),
        cb => {
          // init stomp server
          context.stomp_server = new Stomp (config, context);
          context.app.get ('/stomp/status', (req, res) => res.send (context.stomp_server.status()));
          context.stomp_server.run (cb);
        },
        cb => {
          // init http/rest server
          context.server = require('http-shutdown')(http.createServer (context.app));
          var port = config.http.port || 3444;

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
          cb => context.stomp_server.end (cb),
          cb => context.scope.end (cb),
          cb => {
            if (context.promster) {
              clearInterval(context.promster.collectDefaultMetrics());
              context.promster.register.clear();
            }
          }
        ], err => {
          logger.info (`shutdown done`);
        })
      }

      process.on ('SIGINT', __shutdown);
      process.on ('SIGTERM', __shutdown);
    });
});
