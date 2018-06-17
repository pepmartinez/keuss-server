var http =    require ('http');
var async =   require ('async');
var CC =      require ('cascade-config');

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
  backends: []
};

cconf
  .obj (defaults)
  .file (__dirname + '/etc/config.js',       {ignore_missing: true})
  .file (__dirname + '/etc/config-{env}.js', {ignore_missing: true})
  .env ({prefix: 'KEUSS_'})
  .args ()
  .done (function (err, config) {
    if (err) {
      console.error (err);
      process.exit (1);
    }
    
    var Logger =  require ('./Logger');
    Logger.init (config.log);
    var logger = Logger.logger ('main');

    var BaseApp = require ('./app');
    var Stomp =   require ('./stomp');
    var Scope =   require ('./Scope');

    var stomp_server;
    var app;
    var scope = new Scope ();

    async.series ([
      function (cb) {
      scope.init (config, cb);
    },
    function (cb) {
      // init stomp server
      stomp_server = new Stomp (config, scope);
      stomp_server.run (cb);
    },
    function (cb) {
      // init http/rest server
      var extra_init = function (app) {
        app.get ('/stomp/status', function (req, res){
          res.send (stomp_server.status());
        });
      };
    
      BaseApp (config, scope, extra_init, function (err, app) {
        if (err) return cb (err);
        
        var server = http.createServer (app);
        var port = config.http.port || 3444;
      
        server.listen (port, function () {
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
});


