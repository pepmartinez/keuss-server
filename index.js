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

cconf
  .obj  (defaults)
  .env  ({prefix: 'KS_'})
  .args ()
  .file (__dirname + '/etc/config.js',       {ignore_missing: true})
  .file (__dirname + '/etc/config-{NODE_ENV:development}.js', {ignore_missing: true})
  .env  ({prefix: 'KS_'})
  .args ()
  .done (function (err, config) {
    if (err) {
      console.error (err);
      process.exit (1);
    }
    
    Log.init (function (err) {
      if (err) {
        console.error (err);
        return;
      }

      var logger = Log.logger ('main');

      var BaseApp = require ('./app');
      var Stomp =   require ('./stomp');
      var Scope =   require ('./Scope');

      var context = {};
      context.scope = new Scope ();

      async.series ([
        function (cb) {
          context.scope.init (config, cb);
        },
        function (cb) {
          // init stomp server
          context.stomp_server = new Stomp (config, context.scope);
          context.stomp_server.run (cb);
        },
        function (cb) {
          // init http/rest server
          var extra_init = function (app) {
            app.get ('/stomp/status', function (req, res){
              res.send (context.stomp_server.status());
            });
          };
    
          BaseApp (config, context.scope, extra_init, function (err, app) {
            if (err) return cb (err);
        
            context.server = require('http-shutdown')(http.createServer (app));
            var port = config.http.port || 3444;
      
            context.server.listen (port, function () {
              logger.info ('REST server listening at port %s', port);
              cb ();
            });
          });
        }
      ], function (err) {
        if (err) {
          logger.error (err);
          process.exit (1);
        }
      });

      function __shutdown () {
        logger.info (`shutdown init`);
        async.parallel ([
          (cb) => context.scope.drain (cb),
          (cb) => context.server.shutdown (cb),
          (cb) => context.stomp_server.end (cb),
          (cb) => context.scope.end (cb)
        ], (err) => {
          logger.info (`shutdown done`)
        })
      }

      process.on ('SIGINT', __shutdown);
      process.on ('SIGTERM', __shutdown);
    });
});
