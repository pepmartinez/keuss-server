var express =    require ('express');
var path =       require ('path');
var basicAuth =  require ('express-basic-auth');
var Log =        require ('winston-log-space');
var promster =   require ('@promster/express');

var routes_q =   require ('./routes/q');


function app (config, context, extra_init, cb) {
  var app = express ();
  var logger = Log.logger ('app');

  app.set ('x-powered-by', false);
  app.set ('etag', false);
  app.set ('views', path.join (__dirname, 'views'));
  app.set ('view engine', 'pug');

  app.use (promster.createMiddleware({
    app: app,
    options: {
      normalizePath: (full_path, {req, res}) => {
        if (req.route) return path.join (req.baseUrl, req.route.path);
        return full_path.split ('?')[0];
      }
    }
  }));

  app.use('/metrics', async (req, res) => {
    res.setHeader ('Content-Type', promster.getContentType());
    res.end (await promster.getSummary());
  });

  app.use(basicAuth({
    users: (config.http && config.http.users) || { 'test': 'test' },
    challenge: true,
    realm: 'Keuss'
  }));

  app.use ('/public', express.static (path.join (__dirname, 'public')));
  app.use ('/q', routes_q (config, context));

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
