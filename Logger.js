var winston = require('winston');


var _logger;

function init (config) {
  if (_logger) return;

//  console.log ('log init with %j', config)
  var cfg = config || {level: 'info'};
  
  if (process.env.KEUSS_SERVER_SILENT) {
    _logger = {
      silly: function () {},
      debug: function () {},
      verbose: function () {},
      info: function () {},
      warn: function () {},
      error: function () {}
    }
  }
  else {
    _logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({ 
          level: cfg.level || 'info',
          colorize: true,
          humanReadableUnhandledException: true,
          timestamp: true
        })
      ]
    });
  }
}


function logger (area) {
//  console.log ('get logger %s', area)
  init ();
  return _logger;
}

module.exports = {
  init,
  logger
}
