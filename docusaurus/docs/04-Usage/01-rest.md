---
id: rest
title: REST API
sidebar_label: REST API
---

## REST API

All the REST operations on all queues are located under `/q` path; operations on exchanges are located under `/x`. All operations are protected with HTTP Basic Auth (see *configuration* above)


### List namespaces: `GET /q`

Lists all queues on all namespaces. Admits the following query parameters:

* `array=1`: lists the queues in a format resembling an array (this is the one used internally by the web console)
* `tree=1`: lists the queues in a format resembling a tree, or a hierarchy of namespaces
* `reload=1`: force a reload of the queues information on all namespaces before listing

```
$ curl -i -utest1:test1  http://localhost:3444/q/
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 51
Date: Thu, 15 Sep 2022 09:04:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

["N","ns1","ns2","ns3","fastbuckets","safebuckets"]
```

### List queues on namespace: `GET /q/:namespace`

Lists all queues on the specified namespace. *namespace* corresponds to the *name* specified in the configuration. Admits the following query parameters:

* `array=1`: lists the queues in a format resembling an array (this is the one used internally by the web console)
* `tree=1`: lists the queues in a format resembling a tree, or a hierarchy of namespaces

The result is not just the queue names, but all the info on each queue

```
$ curl -utest1:test1  http://localhost:3444/q/ns1 | python -mjson.tool
{
    "__no_route__": {
        "type": "mongo:simple",
        "capabilities": {
            "sched": true,
            "reserve": true,
            "pipeline": false,
            "tape": false,
            "remove": true
        },
        "factory": {
            "name": "ns1",
            "type": "mongo:simple",
            "opts": {
                "name": "ns1",
                "url": "mongodb://localhost/ns1_data"
            },
            "signaller": {
                "type": "signal:mongo-capped",
                "opts": {
                    "url": "mongodb://localhost/keuss_signal",
                    "mongo_opts": {},
                    "channel": "default"
                }
            },
            "stats": {
                "type": "mongo",
                "opts": {
                    "url": "mongodb://localhost/keuss_stats",
                    "coll": "keuss_stats"
                }
            }
        },
        "stats": {},
        "paused": false,
        "next_mature_t": null,
        "totalSize": 0,
        "size": 0,
        "schedSize": 0,
        "resvSize": 0
    },
    "one_dest": {
        "type": "mongo:simple",
        "capabilities": {
            "sched": true,
            "reserve": true,
            "pipeline": false,
            "tape": false,
            "remove": true
        },
        "factory": {
            "name": "ns1",
            "type": "mongo:simple",
            "opts": {
                "name": "ns1",
                "url": "mongodb://localhost/ns1_data"
            },
            "signaller": {
                "type": "signal:mongo-capped",
                "opts": {
                    "url": "mongodb://localhost/keuss_signal",
                    "mongo_opts": {},
                    "channel": "default"
                }
            },
            "stats": {
                "type": "mongo",
                "opts": {
                    "url": "mongodb://localhost/keuss_stats",
                    "coll": "keuss_stats"
                }
            }
        },
        "stats": {},
        "paused": false,
        "totalSize": 0,
        "resvSize": 0,
        "size": 0,
        "schedSize": 0,
        "next_mature_t": null
    },
    "other_dest": {
        "type": "mongo:simple",
        "capabilities": {
            "sched": true,
            "reserve": true,
            "pipeline": false,
            "tape": false,
            "remove": true
        },
        "factory": {
            "name": "ns1",
            "type": "mongo:simple",
            "opts": {
                "name": "ns1",
                "url": "mongodb://localhost/ns1_data"
            },
            "signaller": {
                "type": "signal:mongo-capped",
                "opts": {
                    "url": "mongodb://localhost/keuss_signal",
                    "mongo_opts": {},
                    "channel": "default"
                }
            },
            "stats": {
                "type": "mongo",
                "opts": {
                    "url": "mongodb://localhost/keuss_stats",
                    "coll": "keuss_stats"
                }
            }
        },
        "stats": {},
        "paused": false,
        "size": 0,
        "totalSize": 0,
        "resvSize": 0,
        "next_mature_t": null,
        "schedSize": 0
    },
    "loop_1": {
        "type": "mongo:simple",
        "capabilities": {
            "sched": true,
            "reserve": true,
            "pipeline": false,
            "tape": false,
            "remove": true
        },
        "factory": {
            "name": "ns1",
            "type": "mongo:simple",
            "opts": {
                "name": "ns1",
                "url": "mongodb://localhost/ns1_data"
            },
            "signaller": {
                "type": "signal:mongo-capped",
                "opts": {
                    "url": "mongodb://localhost/keuss_signal",
                    "mongo_opts": {},
                    "channel": "default"
                }
            },
            "stats": {
                "type": "mongo",
                "opts": {
                    "url": "mongodb://localhost/keuss_stats",
                    "coll": "keuss_stats"
                }
            }
        },
        "stats": {},
        "paused": false,
        "size": 0,
        "schedSize": 0,
        "next_mature_t": null,
        "totalSize": 0,
        "resvSize": 0
    },
    "__too_many_hops__": {
        "type": "mongo:simple",
        "capabilities": {
            "sched": true,
            "reserve": true,
            "pipeline": false,
            "tape": false,
            "remove": true
        },
        "factory": {
            "name": "ns1",
            "type": "mongo:simple",
            "opts": {
                "name": "ns1",
                "url": "mongodb://localhost/ns1_data"
            },
            "signaller": {
                "type": "signal:mongo-capped",
                "opts": {
                    "url": "mongodb://localhost/keuss_signal",
                    "mongo_opts": {},
                    "channel": "default"
                }
            },
            "stats": {
                "type": "mongo",
                "opts": {
                    "url": "mongodb://localhost/keuss_stats",
                    "coll": "keuss_stats"
                }
            }
        },
        "stats": {},
        "paused": false,
        "schedSize": 0,
        "totalSize": 0,
        "resvSize": 0,
        "next_mature_t": null,
        "size": 0
    }
}
```

### Status of queue: `GET /q/:namespace/:queue/status`

Get status of a single queue

```
$ curl -utest1:test1  http://localhost:3444/q/ns1/loop_1/status | python -mjson.tool
{
    "type": "mongo:simple",
    "capabilities": {
        "sched": true,
        "reserve": true,
        "pipeline": false,
        "tape": false,
        "remove": true
    },
    "factory": {
        "name": "ns1",
        "type": "mongo:simple",
        "opts": {
            "name": "ns1",
            "url": "mongodb://localhost/ns1_data"
        },
        "signaller": {
            "type": "signal:mongo-capped",
            "opts": {
                "url": "mongodb://localhost/keuss_signal",
                "mongo_opts": {},
                "channel": "default"
            }
        },
        "stats": {
            "type": "mongo",
            "opts": {
                "url": "mongodb://localhost/keuss_stats",
                "coll": "keuss_stats"
            }
        }
    },
    "stats": {},
    "paused": false,
    "schedSize": 0,
    "size": 0,
    "totalSize": 0,
    "resvSize": 0,
    "next_mature_t": null
}
```


### Insert in queue: `PUT /q/:namespace/:queue` or `POST /q/:namespace/:queue`

Inserts an object into a queue. All parameters in the querystring are passed to keuss' `push` operation as *options*:

* `mature`: unix timestamp where the element would be eligible for extraction. It is guaranteed that the element won't be extracted before this time
* `delay`: delay in seconds to calculate the mature timestamp, if mature is not provided. For example, a delay=120 guarantees the element won't be extracted until 120 secs have elapsed at least
* `tries`: value to initialize the retry counter, defaults to 0 (still no retries)

Any type of body is supported (json, string, Buffer); for that matter, the `content-type` header is stored aonlgside the body as a keuss element header; also, any http header with name starting with `x-ks-hdr-` is also stored

Returns a json object with the following fields:
* `id`: identifier of the inserted element

```
$ curl -utest1:test1 \
-X PUT  \
-H 'content-type: text/plain' \
--data-bin 'test test test' \
-H 'x-ks-hdr-header-1: val1'  \
http://localhost:3444/q/ns1/test_queue_42?delay=3
{"id":"6322ecffaf9be003dcfaaaac"}
```

### Get/reserve from queue: `GET /q/:namespace/:queue`

Attempts a `pop` or a `reserve` on a queue. If there is no eligible elements the call would block indefinitely, *to* milliseconds passes, or until a cancel operation is called.
Admits the following query parameters:

* `to`: timeout in millisecs if the operation needs to block. Blocks indefinitely by default
* `tid`: optional identifier for the consumer, needed if `cancel` on this call is to be supported. By defaut no tid is used (and therefore no `cancel` is possible)
* `reserve`: if truthy, the operation attempts a `reserve` rather than a `pop`. By default, a `pop` is attempted

The response body will be the element body, as it was inserted (json object, string, Buffer) and with its original `content-type`. Any element header (for example, those passed via REST or STOMP with name starting with `x-ks-hdr-`) will be added as response headers (prefixed by `x-ks-hdr-`)

Other response headers are:
* `x-ks-tries`: failed reserve tries (ie, rolled back) so far
* `x-ks-mature`: mature timestamp of the element,
* `x-ks-id`: element id, to be used later on at commit/rollback

```
# plain pop, no reserve
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_42
HTTP/1.1 200 OK
x-ks-tries: 0
x-ks-mature: 2022-09-15T09:14:42.746Z
x-ks-id: 6322ecffaf9be003dcfaaaac
Content-Type: text/plain; charset=utf-8
x-ks-hdr-header-1: val1
Content-Length: 14
Date: Thu, 15 Sep 2022 09:20:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5

test test test
```

### Get pending get/reserve operations: `GET /q/:type/:q/consumers`

Lists the IDs of all the pending/blocked `get` or `reserve` operations on the given queue

```
$ curl -utest1:test1  http://localhost:3444/q/ns1/test_queue_6/consumers | python -mjson.tool
[
    {
        "tid": "db2f88ff-12fd-4716-91ee-c7d3cf29ecdc",
        "since": "2022-09-15T09:39:13.825Z",
        "callback": "set",
        "cleanup_timeout": "unset",
        "wakeup_timeout": "set"
    }
]
```


### Cancel pending get/reserve: `DELETE /q/:type/:q/consumer/:id`

Cancels a pending/blocked `get`/`reserve` call. To do so, such `get`/`reserve` call must have been done with a `tid` value, which is passed as `:id` in the cancel

```
# get an element on a new (and therefore empty) queue. Call will block awaiting for elements...
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_6

# on separate shell, get pending consumer
$ curl  -utest1:test1  http://localhost:3444/q/ns1/test_queue_6/consumers | python -mjson.tool
[
    {
        "tid": "cf34bd28-c77e-4a00-8a04-9490a4538ed3",
        "since": "2022-09-15T09:43:11.047Z",
        "callback": "set",
        "cleanup_timeout": "unset",
        "wakeup_timeout": "set"
    }
]


# ... and cancel it
$ curl -i -utest1:test1 -X DELETE  http://localhost:3444/q/ns1/test_queue_6/consumer/cf34bd28-c77e-4a00-8a04-9490a4538ed3
HTTP/1.1 200 OK
Date: Thu, 15 Sep 2022 09:44:22 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0


# immediately, in the first shell, the pop call will end:
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_6


HTTP/1.1 410 Queue Pop Cancelled
Content-Type: text/html; charset=utf-8
Content-Length: 6
Date: Thu, 15 Sep 2022 09:44:22 GMT
Connection: keep-alive
Keep-Alive: timeout=5

cancel

```

### Commit in queue: `PATCH /q/:type/:q/commit/:id`

Commits a previous `reserve` operation. `id` is the `x-ks-id` header returned in the reserve request

```
# reserve element
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_42?reserve=1
HTTP/1.1 200 OK
x-ks-tries: 0
x-ks-mature: 2022-09-15T09:16:31.430Z
x-ks-id: 6322ed6caf9be003dcfaaaae
Content-Type: text/plain; charset=utf-8
x-ks-hdr-header-1: val1
Content-Length: 14
Date: Thu, 15 Sep 2022 09:22:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

test test test

# .. and then commit it
$ curl -i -utest1:test1 -X PATCH http://localhost:3444/q/ns1/test_queue_42/commit/6322ed6caf9be003dcfaaaae
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Thu, 15 Sep 2022 09:23:27 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{}
```

### Rollback in queue: `PATCH /q/:type/:q/rollback/:id`

Rollbacks a previous `reserve` operation. `id` is the `x-ks-id` header returned in the reserve request
Admits the following query parameters:

* `delay`: delay in millisecs to apply to the rolled back object: it will be available for `get`/`reserve` after *delay* milliseconds. Defaults to 0, so rolled back elements are immediately available to others

```
# reserve element
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_42?reserve=1
HTTP/1.1 200 OK
x-ks-tries: 0
x-ks-mature: 2022-09-15T09:22:23.002Z
x-ks-id: 6322eeccaf9be003dcfaaab0
Content-Type: text/plain; charset=utf-8
x-ks-hdr-header-1: val1
Content-Length: 14
Date: Thu, 15 Sep 2022 09:24:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

test test test

# ... and then rollback it
$ curl -i -utest1:test1 -X PATCH http://localhost:3444/q/ns1/test_queue_42/rollback/6322eeccaf9be003dcfaaab0
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 2
Date: Thu, 15 Sep 2022 09:24:55 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{}
```

### Remove from queue: `DELETE /q/:type/:q/:id`
Removes an element from a queue, by id. The id is the one returned in the json response body at insertion

Returns a `HTTP 204` upon success

```
$ curl -i -utest1:test1 -X PUT  -H 'content-type: text/plain' --data-bin 'test test test' -H 'x-ks-hdr-header-1: val1'  http://localhost:3444/q/ns1/test_queue_42?delay=3
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 33
Date: Thu, 15 Sep 2022 09:26:08 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"6322efb0af9be003dcfaaab7"}

$ curl -i -utest1:test1 -X DELETE  http://localhost:3444/q/ns1/test_queue_42/6322efb0af9be003dcfaaab7
HTTP/1.1 204 No Content
Date: Thu, 15 Sep 2022 09:26:41 GMT
Connection: keep-alive
Keep-Alive: timeout=5


```


### Pause all consumers to a queue: `PATCH /q/:namespace/:q/pause`

Pauses all consumers of a queue. It affects all keuss consumers (not only local ones) provided a non-local signaller is used by the queue.
Takes no body

```
$ curl -i -X PATCH -utest1:test1 http://localhost:3444/q/ns1/test_queue_6/pause
HTTP/1.1 201 Created
Date: Thu, 15 Sep 2022 09:52:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0

```

### Resume all consumers to a queue: `PATCH /q/:namespace/:q/resume`

Resumes all consumers of a queue. It affects all keuss consumers (not only local ones) provided a non-local signaller is used by the queue.
Takes no body

```
$ curl -i -X PATCH -utest1:test1 http://localhost:3444/q/ns1/test_queue_6/resume
HTTP/1.1 201 Created
Date: Thu, 15 Sep 2022 09:52:39 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0

```

:::info
Note on exchange REST API: all operations are cluster-wide: any operation altering the state of any exchange will be propagated to all nodes of the cluster, and then executed by each node; therefore:

* each node will have the same view of the cluster state about exchanges
* any operation on exchanges will be executed for all nodes regardless of the node receiving the REST call
:::


### List exchanges: `GET /x`

Lists all exchanges. Admits the following query parameters:

* `array=1`: lists the exchanges in a format resembling an array (this is the one used internally by the web console)
* `tree=1`: lists the exchanges in a format resembling a tree
* `reload=1`: force a reload of the exchanges' information before listing

```
$ curl -utest1:test1 http://localhost:3444/x | python -mjson.tool
{
    "alba": {
        "src": {
            "q": "one_source",
            "ns": "N"
        },
        "dst": [
            {
                "q": "one_dest",
                "ns": "ns1",
                "selector": "env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-/))"
            },
            {
                "q": "other_dest",
                "ns": "ns1",
                "selector": "env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-already/))"
            }
        ],
        "opts": {
            "parallel": 2,
            "wsize": 11,
            "reserve": true
        },
        "cid": "a2f92932-073b-4d30-8371-5a7a13296b70",
        "pending_acks": {},
        "pending_tids": {
            "584c71a5-b150-4f2c-98b4-2f4b3de5382b": "2022-09-18T14:52:12.469Z",
            "12eda35b-a476-47e1-9e9b-f29035514a8c": "2022-09-18T14:52:12.469Z"
        },
        "wsize": 11,
        "stopped": false
    },
    "beta": {
        "src": {
            "q": "other_source",
            "ns": "N"
        },
        "dst": [
            {
                "q": "one_dest",
                "ns": "ns1"
            },
            {
                "q": "other_dest",
                "ns": "ns1"
            }
        ],
        "opts": {},
        "cid": "516627d2-7812-414b-b386-e08b712671a1",
        "pending_acks": {},
        "pending_tids": {
            "6da462ca-e6e1-4a33-87bf-51878662fdce": "2022-09-18T14:52:12.470Z"
        },
        "wsize": 1000,
        "stopped": false
    },


}

```


### Status of exchange: `GET /x/:id`

Gets information and status of a single exchange

```
$ curl -utest1:test1 http://localhost:3444/x/beta | python -mjson.tool
{
    "src": {
        "q": "other_source",
        "ns": "N"
    },
    "dst": [
        {
            "q": "one_dest",
            "ns": "ns1"
        },
        {
            "q": "other_dest",
            "ns": "ns1"
        }
    ],
    "opts": {},
    "cid": "516627d2-7812-414b-b386-e08b712671a1",
    "pending_acks": {},
    "pending_tids": {
        "6da462ca-e6e1-4a33-87bf-51878662fdce": "2022-09-18T14:52:12.470Z"
    },
    "wsize": 1000,
    "stopped": false
}
```

### Stop an exchange: `POST|PUT /x/:id/stop`

Stops the consumer loop(s) of an exchange. This operation is idempotent and asynchronous

```
$ curl -i -utest1:test1 -X PUT http://localhost:3444/x/beta/stop
HTTP/1.1 201 Created
Date: Sun, 18 Sep 2022 14:58:10 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0


$ curl -q -utest1:test1 http://localhost:3444/x/beta | jq .stopped
true
```


### Starts an exchange: `POST|PUT /x/:id/start`

Starts the consumer loop(s) of an exchange. This operation is idempotent and asynchronous

```
$ curl -i -utest1:test1 -X PUT http://localhost:3444/x/beta/start
HTTP/1.1 201 Created
Date: Sun, 18 Sep 2022 14:59:49 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0


$ curl -q -utest1:test1 http://localhost:3444/x/beta | jq .stopped
false
```

### Creates an exchange: `POST|PUT /x/:id`

Creates an exchange. Requires a json payload with the specification of the exchange. The exchange is created *and* started

```
$ curl -i -utest1:test1 -X PUT -H 'content-type: application/json' --data-bin '{"src":{"queue":"entrypoint","ns":"ns1"},"dst":[{"queue":"copy1","ns":"N","selector":"env => {return {delay: 1}}"},{"queue":"copy2","ns":"ns1","selector":"env => {return {delay: 2}}"}],"consumer":{"reserve":true}}'  http://localhost:3444/x/another   
HTTP/1.1 201 Created
Date: Sun, 18 Sep 2022 15:06:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0


$ curl -q -utest1:test1 http://localhost:3444/x/another | python -mjson.tool
{
    "src": {
        "q": "entrypoint",
        "ns": "ns1"
    },
    "dst": [
        {
            "q": "copy1",
            "ns": "N",
            "selector": "env => {return {delay: 1}}"
        },
        {
            "q": "copy2",
            "ns": "ns1",
            "selector": "env => {return {delay: 2}}"
        }
    ],
    "opts": {
        "reserve": true
    },
    "cid": "707b6f0a-7ddd-4800-bec1-4eb0bdcf4bfa",
    "pending_acks": {},
    "pending_tids": {},
    "wsize": 1000,
    "stopped": null
}

```

### Deletes an existing exchange: `DELETE /x/:id`

Stops and deletes an existing exchange

```
$ curl -i -utest1:test1 -X DELETE http://localhost:3444/x/another
HTTP/1.1 201 Created
Date: Sun, 18 Sep 2022 15:09:30 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 0


$ curl -i -utest1:test1 http://localhost:3444/x/another 
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Content-Length: 26
Date: Sun, 18 Sep 2022 15:09:44 GMT
Connection: keep-alive
Keep-Alive: timeout=5

no such exchange [another]
```

:::info
Deleting an exchange will not delete any of the queues it uses, even if they were created as a result of the exchange's creation
:::