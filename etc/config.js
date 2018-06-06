
var stats_redis = require('keuss/stats/redis');
var stats_mem = require('keuss/stats/mem');

var signal_redis_pubsub = require('keuss/signal/redis-pubsub');
var signal_local = require('keuss/signal/local');

var config = {
  http: {
    users: {
      'test': 'test',
      'usr1': 'pass1'
    }
  },
  backends: [{
      factory: 'mongo',
      //      disable: true,
      config: {
        url: 'mongodb://localhost:27017/keuss',
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    {
      factory: 'pl-mongo',
      //      disable: true,
      config: {
        url: 'mongodb://localhost:27017/keuss',
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    {
      factory: 'redis-list',
      config: {
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    },
    {
      factory: 'redis-oq',
      config: {
        pollInterval: 17000,
        stats: {
          provider: new stats_redis(),
        },
        signaller: {
          provider: new signal_redis_pubsub()
        }
      }
    }
  ]
};

module.exports = config;
