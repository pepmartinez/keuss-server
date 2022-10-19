
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
        url:  'mongodb://mongo/keuss_stats',
        coll: 'stats'
      }
    }
  },

  signallers: {
    mongo: {
      factory: 'mongo-capped',
      config: {
        url: 'mongodb://mongo/keuss_signal',
        mongo_opts: {},
        channel: 'default',
      }
    }
  },

  namespaces: {
    ns1: {
      factory: 'mongo',
      disable: false,
      config: {
        url: 'mongodb://mongo/ns1_data',
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
            host: 'redis',
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
            host: 'redis',
          }
        },
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    ns4: {
      factory: 'bucket-mongo-safe',
      disable: false,
      config: {
        url: 'mongodb://mongo/bucket_mongo_safe',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
  }
};

module.exports = config;
