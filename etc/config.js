
var config = {
  http: {
    users: {
      'test': 'test',
      'usr1': 'pass1'
    }
  },
  
  stats: {
    memory: {
      factory: 'mem',
      config : {}
    },
//    redis: {
//      factory: 'redis',
//      config : {
//        Redis: {
//          port: '#int:{keuss.redis.port:6379}',
//          host: '{keuss.redis.host:localhost}',
      //    db: 3,
      //    family: 4,
      //    password: 'xxxx',
//        }
//      }
//    },
    mongo: {
      factory: 'mongo',
      config: {
        url:  '{keuss.stats.mongo.url:mongodb://localhost:27017/keuss_stats}',
        coll: '{keuss.stats.mongo.coll:keuss_stats}'
      }
    }
  },

  signallers: {
    local: {
      factory: 'local',
      config : {}
    },
//    redis: {
//      factory: 'redis-pubsub',
//      config : {
//        Redis: {
//          port: '#int:{keuss.redis.port:6379}',
//          host: '{keuss.redis.host:localhost}',
      //    family: 4,
      //    password: 'xxxx',
      //    db: 6
//        }
//      }
//    },
    mongo: {
      factory: 'mongo-capped',
      config: {
        mongo_url: '{keuss.signal.mongocapped.url:mongodb://localhost:27017/keuss_signal}',
        mongo_opts: {},
        channel: '{keuss.signal.mongocapped.channel:default}',
      }
    }
  },

  backends: [
    {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{keuss.mongo.url:mongodb://localhost:27017/keuss}',
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    {
      factory: 'pl-mongo',
      disable: true,
      config: {
        url: '{keuss.plmongo.url:mongodb://localhost:27017/keuss}',
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'redis',
        signaller: 'redis'
      }
    },
    {
      factory: 'redis-list',
      disable: true,
      config: {
        redis: {
          Redis: {
            port: '#int:{keuss.redis.port:6379}',
            host: '{keuss.redis.host:localhost}',
        //    family: 4,
        //    password: 'xxxx',
        //    db: 6
          }
        },
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'redis',
        signaller: 'redis'
      }
    },
    {
      factory: 'redis-oq',
      disable: true,
      config: {
        redis: {
          Redis: {
            port: '#int:{keuss.redis.port:6379}',
            host: '{keuss.redis.host:localhost}',
        //    family: 4,
        //    password: 'xxxx',
        //    db: 6
          }
        },
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'redis',
        signaller: 'redis'
      }
    }
  ]
};

module.exports = config;
