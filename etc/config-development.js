
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
        url:  '{stats.mongo.url:mongodb://localhost/keuss_stats}',
        coll: '{stats.mongo.coll:keuss_stats}'
      }
    }
  },

  signallers: {
    mongo: {
      factory: 'mongo-capped',
      config: {
        url: '{signal.mongo.url:mongodb://localhost/keuss_signal}',
        mongo_opts: {},
        channel: '{signal.mongo.channel:default}',
      }
    }
  },

  namespaces: {
    N: {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{data.mongo.url:mongodb://localhost/keuss}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    ns1: {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{data.mongo.url:mongodb://localhost/ns1_data}',
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
            host: '{data.redis.host:localhost}',
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
            host: '{data.redis.host:localhost}',
          }
        },
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    fastbuckets: {
      factory: 'bucket-mongo',
      disable: false,
      config: {
        url: '{data.bucket-mongo.url:mongodb://localhost/bucket_mongo_data}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    safebuckets: {
      factory: 'bucket-mongo-safe',
      disable: false,
      config: {
        url: '{data.bucket-mongo-safe.url:mongodb://localhost/bucket_mongo_data_safe}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
  },
  exchanges: {
    alba: {
      src: {
        ns: 'N',
        queue: 'one_source',
      },
      dst: [
        {
          ns: 'ns1',
          queue: 'one_dest',
          selector: env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-/)),
        },
        {
          ns: 'ns1',
          queue: 'other_dest',
          selector: `env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-already/))`
        }
      ],
      consumer: {
        parallel: 2,
        wsize: 11,
        reserve: true
      }
    },
    beta: {
      src: {
        ns: 'N',
        queue: 'other_source',
      },
      dst: [
        {
          ns: 'ns1',
          queue: 'one_dest',
        },
        {
          ns: 'ns1',
          queue: 'other_dest',
        }
      ]
    },
    loop_a :{
      src: {
        ns: 'N',
        queue: 'loop_0',
      },
      dst: [
        {
          ns: 'ns1',
          queue: 'loop_1',
          selector: env => {return {delay: 1}},
        },
	      {
          ns: 'ns1',
          queue: 'loop_1',
          selector: env => {return {delay: 2}},
        }
      ],
      consumer: {
        reserve: true
      }
    },
    loop_b :{
      src: {
        ns: 'ns1',
        queue: 'loop_1',
      },
      dst: [
        {
          ns: 'N',
          queue: 'loop_0',
          selector: env => {return {delay: 1}},
        },
	      {
          ns: 'N',
          queue: 'loop_0',
          selector: env => {return {delay: 2}},
        },
      ],
      consumer: {
        reserve: true
      }
    }
  },
  main: {
    max_hops: 11
  }
};

module.exports = config;
