#!/usr/bin/env node

var http =    require ('http');
var BaseApp = require ('./app');

BaseApp (function (err, app) {
  if (err) {
    return console.log (err);
  }
  
  var server = http.createServer (app);
  
  server.listen (3444, function () {
    console.log ('keuss server listening at port %s', 3444);
  });
});
