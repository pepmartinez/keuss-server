var winston = require('winston');

var _logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ 
      level: 'info',
      colorize: true,
      humanReadableUnhandledException: true,
      timestamp: true
    })
  ]
});


function logger () {
  return _logger;
}

module.exports = logger;