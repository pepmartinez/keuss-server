#!/usr/bin/env node

var http =    require ('http');
var BaseApp = require ('./app');
var Logger =  require ('./Logger');

var config = require ('./config');

var logger = Logger ('main');


BaseApp (config, function (err, app) {
  if (err) return logger.error (err);
  
  var server = http.createServer (app);
  var port = config.http.port || 3444;

  server.listen (port, function () {
    logger.info ('keuss server listening at port %s', port);
  });
});
