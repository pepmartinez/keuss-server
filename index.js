#!/usr/bin/env node

var http =    require ('http');
var BaseApp = require ('./app');
var Logger =  require ('./Logger');

var logger = Logger ('main');


BaseApp (function (err, app) {
  if (err) return logger.error (err);
  
  var server = http.createServer (app);
  
  server.listen (3444, function () {
    logger.info ('keuss server listening at port %s', 3444);
  });
});
