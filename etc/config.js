
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
    redis: {
      factory: 'redis',
      config : {
        Redis: {
          port: '#int:{keuss.redis.port:6379}',
          host: '{keuss.redis.host:localhost}',
      //    db: 5,
      //    family: 4,
      //    password: 'xxxx',
        }
      }
    },
    mongo: {
      factory: 'mongo',
      config: {
        url:  '{stats.mongo.url:mongodb://localhost:27017/keuss_stats}',
        coll: '{stats.mongo.coll:keuss_stats}'
      }
    }
  },

  signallers: {
    local: {
      factory: 'local',
      config : {}
    },
    redis: {
      factory: 'redis-pubsub',
      config : {
        Redis: {
          port: '#int:{keuss.redis.port:6379}',
          host: '{keuss.redis.host:localhost}',
      //    family: 4,
      //    password: 'xxxx',
      //    db: 6
        }
      }
    },
    mongo: {
      factory: 'mongo-capped',
      config: {
        mongo_url: '{signal.mongo.url:mongodb://localhost:27017/keuss_signal}',
        mongo_opts: {},
        channel: '{signal.mongo.channel:default}',
      }
    }
  },

  namespaces: {
    local_mongo: {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{mongo.url:mongodb://localhost:27017/keuss_local_mongo}',
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    local_plmongo: {
      factory: 'pl-mongo',
      disable: false,
      config: {
        url: '{keuss.plmongo.url:mongodb://localhost:27017/keuss_pipeline}',
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    local_psmongo: {
      factory: 'ps-mongo',
      disable: false,
      config: {
        url: '{keuss.plmongo.url:mongodb://localhost:27017/keuss_tape}',
        pollInterval: '#int:{poll_interval:17000}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    local_redislist: {
      factory: 'redis-list',
      disable: false,
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
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    local_redisoq: {
      factory: 'redis-oq',
      disable: false,
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
        stats: 'mongo',
        signaller: 'mongo'
      }
    }
  }
};

module.exports = config;
