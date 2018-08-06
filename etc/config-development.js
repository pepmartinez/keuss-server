
var config = {
  http: {
    users: {
      'test1': 'test1',
      'usr1': 'pass1'
    }
  },
  
  stats: {
    mongo: {
      factory: 'mongo',
      config: {
        url:  '{mongo.url:mongodb://localhost/keuss_stats}',
        coll: '{mongo.coll:keuss_stats}'
      }
    }
  },

  signallers: {
    mongo: {
      factory: 'mongo-capped',
      config: {
        mongo_url: '{mongo.url:mongodb://localhost/keuss_signal}',
        mongo_opts: {},
        channel: '{mongo.channel:default}',
      }
    }
  },

  namespaces: {
    ns1: {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{mongo.url:mongodb://localhost/ns1_data}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    ns2: {
      factory: 'redis-list',
      disable: false,
      config: {
        redis: {
          Redis: {
            host: '{redis.host:localhost}',
          }
        },
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    ns3: {
      factory: 'redis-oq',
      disable: false,
      config: {
        redis: {
          Redis: {
            host: '{redis.host:localhost}',
          }
        },
        stats: 'mongo',
        signaller: 'mongo'
      }
    }
  }
};

module.exports = config;
