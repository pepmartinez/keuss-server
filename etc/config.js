
var config = {
  http: {
    users: {
      'test': 'test',
      'usr1': 'pass1'
    }
  },
  
  stats: {
    redis: {
      factory: 'redis',
      config : {
        Redis: {
          port: 6379,
          host: 'localhost',
      //    family: 4,
      //    password: 'xxxx',
      //    db: 6
        }
      }
    }
  },

  signallers: {
    redis: {
      factory: 'redis-pubsub',
      config : {
        Redis: {
          port: 6379,
          host: 'localhost',
      //    family: 4,
      //    password: 'xxxx',
      //    db: 6
        }
      }
    }
  },

  backends: [
    {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{keuss.mongo.url:mongodb://localhost:27017/keuss}',
        pollInterval: 17000,
        stats: 'redis',
        signaller: 'redis'
      }
    },
    {
      factory: 'pl-mongo',
      disable: false,
      config: {
        url: '{keuss.plmongo.url:mongodb://localhost:27017/keuss}',
        pollInterval: 17000,
        stats: 'redis',
        signaller: 'redis'
      }
    },
    {
      factory: 'redis-list',
      disable: false,
      config: {
        redis: {
          Redis: {
            port: 6379,
            host: 'localhost',
        //    family: 4,
        //    password: 'xxxx',
        //    db: 6
          }
        },
        pollInterval: 17000,
        stats: 'redis',
        signaller: 'redis'
      }
    },
    {
      factory: 'redis-oq',
      disable: false,
      config: {
        redis: {
          Redis: {
            port: 6379,
            host: 'localhost',
        //    family: 4,
        //    password: 'xxxx',
        //    db: 6
          }
        },
        pollInterval: 17000,
        stats: 'redis',
        signaller: 'redis'
      }
    }
  ]
};

module.exports = config;
