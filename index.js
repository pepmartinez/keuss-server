#!/usr/bin/env node

var http =    require ('http');
var async =   require ('async');

var BaseApp = require ('./app');
var Scope =   require ('./Scope');
var Logger =  require ('./Logger');
var config =  require ('./config');

var logger = Logger ('main');

var scope = new Scope ();

async.series ([
  function (cb) {
    scope.init (config, cb);
  },
  function (cb) {
    // init http/rest server
    BaseApp (config, scope, function (err, app) {
      if (err) return cb (err);
        
      var server = http.createServer (app);
      var port = config.http.port || 3444;
      
      server.listen (port, function () {
        logger.info ('keuss server listening at port %s', port);
        cb ();
      });
    });
  },
  function (cb) {
    // init stomp server
    cb ();
  }
], function (err) {
  if (err) {
    logger.error (err);
    process.exit (1);
  }
});

