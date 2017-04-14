
var stats_redis = require ('keuss/stats/redis');
var stats_mem =   require ('keuss/stats/mem');

var signal_redis_pubsub = require ('keuss/signal/redis-pubsub');
var signal_local =        require ('keuss/signal/local');

var winston = require ('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({level: 'info'})
  ]
});

var config = {
  logger: logger,
  queues: {
    logger: logger,
    pollInterval: 17000,
    stats: {
      provider: stats_redis,
      opts: {}
    },
    signaller: {
      provider: signal_redis_pubsub,
      opts: {}
    }
  },
  backends: [
    {
      factory: 'mongo',
//      disable: true,
      config: {
        url: 'mongodb://localhost:27017/keuss'
      }
    },
    {
      factory: 'redis-list',
    },
    {
      factory: 'redis-oq',
    }
  ]
};

module.exports = config;
