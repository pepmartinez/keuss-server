var express =    require ('express');
var bodyParser = require ('body-parser');
var path =       require ('path');
var basicAuth =  require ('express-basic-auth');
var Log =        require ('winston-log-space');

var routes_q =   require ('./routes/q');


function app (config, scope, extra_init, cb) {
  var app = express ();
  var logger = Log.logger ('app');

  app.set ('views', path.join (__dirname, 'views'));
  app.set ('view engine', 'pug');

  app.use(basicAuth({
    users: (config.http && config.http.users) || { 'test': 'test' },
    challenge: true,
    realm: 'Keuss'
  }));

  app.use ('/public', express.static (path.join (__dirname, 'public')));
  app.use (bodyParser.urlencoded ({extended: true}));
  app.use (bodyParser.json ());

  app.use ('/q', routes_q (config, scope));

  // main page
  app.get ('/', (req, res) => res.render ('index', {title: 'Job Queues'}));

  if (extra_init) extra_init (app);

  app.use ((err, req, res, next) => {
    logger.error (err.stack);
    res.status (err.status || 500).send (err);
  });

  cb (null, app);
}

module.exports = app;
