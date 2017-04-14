'use strict';

var express =    require ('express');
var bodyParser = require ('body-parser');
var path =       require ('path');
var async =      require ('async');
var basicAuth =  require ('express-basic-auth');

var routes_q =     require ('./routes/q');
var routes_utils = require ('./routes/utils');

var B_MongoDB =   require ('keuss/backends/mongo');
var B_RedisList = require ('keuss/backends/redis-list');
var B_RedisOQ =   require ('keuss/backends/redis-oq');

var Config = require ('./config');
var Scope =  require ('./Scope');


function app (cb) {
  var scope = new Scope ({logger: Config.logger});
  var app = express ();
  
  app.set ('views', path.join (__dirname, 'views'));
  app.set ('view engine', 'jade');
  
  app.use(basicAuth({
    users: (Config.http && config.http.users) || { 'root': 'Waiwah0G' },
    challenge: true,
    realm: 'Keuss'
  }));

  app.use ('/public', express.static (path.join (__dirname, 'public')));
  app.use (bodyParser.urlencoded ({extended: true}));
  app.use (bodyParser.json ());
  
  app.use ('/q',     routes_q (scope));
  app.use ('/utils', routes_utils ());
  
  app.use (function (err, req, res, next) 
  {
    console.error (err.stack);
    res.status (err.status || 500).send (err);
  });
  
  // main page
  app.get ('/', function (req, res) {
    res.render ('index', {title: 'Job Queues'});
  });
  
  async.series ([
    function (cb) {scope.init (cb)},
    function (cb) {scope.refresh (cb)}
  ], function (err) {cb (err, app)});
}

module.exports = app;
