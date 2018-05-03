'use strict';

var express =    require ('express');
var bodyParser = require ('body-parser');
var path =       require ('path');
var basicAuth =  require ('express-basic-auth');

var routes_q =   require ('./routes/q');

var Logger = require ('./Logger');
var logger = Logger ('app');


function app (config, scope, cb) {
  var app = express ();
  
  app.set ('views', path.join (__dirname, 'views'));
  app.set ('view engine', 'jade');
  
  app.use(basicAuth({
    users: (config.http && config.http.users) || { 'test': 'test' },
    challenge: true,
    realm: 'Keuss'
  }));

  app.use ('/public', express.static (path.join (__dirname, 'public')));
  app.use (bodyParser.urlencoded ({extended: true}));
  app.use (bodyParser.json ());
  
  app.use ('/q', routes_q (scope));
    
  // main page
  app.get ('/', function (req, res) {
    res.render ('index', {title: 'Job Queues'});
  });

  app.use (function (err, req, res, next) {
    logger.error (err.stack);
    res.status (err.status || 500).send (err);
  });

  cb (null, app);
}

module.exports = app;
