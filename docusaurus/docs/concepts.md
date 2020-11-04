---
id: concepts
title: Concepts
sidebar_label: Concepts
---

Keuss-Server is a rather shallow layer on top of [keuss](https://pepmartinez.github.io/keuss/) just to provide client-server
capabilities; all of Keuss concepts except Processors and Pipelines are used on keuss-server

## Queue
Keuss-Server provides the same queue concepts Keuss provides; queues are then grouped in namespaces. See [here](https://pepmartinez.github.io/keuss/docs/concepts#queue)

### Deadletter support
Only STOMP interfaces support deadletters (that is, move to a parking queue all elements that are rolled back too many times).
For that to work, the Namespace config has to be configured to suppor deadletter

## Storage
Queues are just simple, shallow concepts modelled on top of Storages or Backends. Keuss-Server can use any storage provided by
Keuss; see [here](https://pepmartinez.github.io/keuss/docs/concepts#storage)

## Signaller
Signallers provide the needed clustering node intercommunication; all of Keuss' signallers can be used, although for true clustering
the use of `local` signaller is not recommended. See [here](https://pepmartinez.github.io/keuss/docs/concepts#signaller) for more info

## Stats
Per-cluster Stats are also provided by Keuss; any of Keuss Stats providers can be used, but use of `mem` provider would not provide
actual per-cluster stats in a multi-node cluster

## How all fits together
1. One or more Stats objects are defined, each one with its own configuration
2. One or more Signaller are defined, each one with its own configuration
3. One or more queue namespaces are created, each one using:
  * a specific Storage and config
  * one of the Stats objects defined above
  * one of the Signallers defined above
4. One REST server is created on top of the set of queue namespaces
5. One STOMP server is created on top of the set of queue namespaces

## Configuration
Keuss-Server gets its configuration from a combination of js config files, env variables and cli flags. It uses [cascade-config](https://www.npmjs.com/package/cascade-config) and this is the exact sources of config:
* env vars prefixed by `KS_`
* cli flags
* js file `etc/config.js`
* js file `etc/config-${NODE_ENV}.js`

Args and env vars can be referenced in any of the js files

Here's a working example:

```js
// etc/config.js, default values

var config = {
  // no default users for REST
  http: {
    users: {
    }
  },

  stats: {
    // add a basic stats object, just for testing
    memory: {
      factory: 'mem',
      config : {}
    }
  },

  signallers: {
    // add a basic signaller, just for testing
    local: {
      factory: 'local',
      config : {}
    }
  },

  // no default namespaces
  namespaces: {
  }
};

module.exports = config;
```

```js
// etc/config-production.js, loaded when NODE_ENV=production

var config = {
  http: {
    // add 2 users for REST (basic auth)
    users: {
      'test1': 'test1',
      'usr1': 'pass1'
    }
  },

  stats: {
    // add one mongo-based stats object
    mongo: {
      factory: 'mongo',
      config: {
        url:  '{stats.mongo.url:mongodb://localhost/keuss_stats}',
        coll: '{stats.mongo.coll:keuss_stats}'
      }
    }
  },

  signallers: {
    // add one mongo-capped-coll based signaller
    mongo: {
      factory: 'mongo-capped',
      config: {
        mongo_url: '{signal.mongo.url:mongodb://localhost/keuss_signal}',
        mongo_opts: {},
        channel: '{signal.mongo.channel:default}',
      }
    }
  },

  // Queue namespaces...
  namespaces: {
    // defautl namespace. In keuss, the default namespace is 'N'
    // uses simple mongo storage
    N: {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{data.mongo.url:mongodb://localhost/keuss}',
        stats: 'mongo',    // uses 'mongo' stats object, defined above
        signaller: 'mongo' // uses 'mongo' signaller, defined above
      }
    },
    // another namespace with simple mongo, but on a different database
    ns1: {
      factory: 'mongo',
      disable: false,
      config: {
        url: '{data.mongo.url:mongodb://localhost/ns1_data}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    // this namespace uses queues backed by redis-list storage.
    // Still, they use the same stats and signaller based on mongo we defined above
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
    // a namespace of queues backed by redis-oq (ordered queues on redis)
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
    // queues backed by bucket-mongo storage. This storage is deprecated in favor of bucket-mongo-safe
    fastbuckets: {
      factory: 'bucket-mongo',
      disable: false,
      config: {
        url: '{data.bucket-mongo.url:mongodb://localhost/bucket_mongo_data}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
    // queues on bucket-mongo-safe. High throughput, low latency, all features kept, still strong durability guarantees
    safebuckets: {
      factory: 'bucket-mongo-safe',
      disable: false,
      config: {
        url: '{data.bucket-mongo-safe.url:mongodb://localhost/bucket_mongo_data_safe}',
        stats: 'mongo',
        signaller: 'mongo'
      }
    },
  }
};

module.exports = config;


```

