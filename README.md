# keuss-server
Job Queues' server accesible via STOMP and REST, built with keuss

Keuss-server provides STOMP and REST-like interfaces atop [keuss](https://github.com/pepmartinez/keuss), plus a simple web console to check queues' statuses. It aims to offer all functionalities provided by keuss

## Install & run
Easiest way is to `npm install keuss-server`; then, edit the config.js file at will and run `node index.js`. 

Keuss-server dumps a not-very-verbose log to stdout; setting env var `KEUSS_SERVER_SILENT=1` will remove the logging altogether

keuss-server comes with mocha tests, runnable with the usual `npm test`. It expects a local running redis server, and a local running mongodb server (just as they are once installed in ubuntu, for example)

## Configuration 
Keuss-server's core functionality is provided by a set of keuss client objects, plus a REST iterface (express) and a STOMP layer on top; as such, it works largely as if it were any other keuss app

This concerns more specifically to the stats and signaller providers used: if the defaut ones are used (backed by memory and therefore bound to a single process) the keuss-server will work pretty much fine, but will be totally self-contain: the queues could be used externally, but only in a degraded state where the stats are not shared and no signalling is present (see keuss' docs for more info)

It is recommended to use a shared-state stats and signaller such as redis; in this way all the queues are effectively shared, and one can fire seeral keuss-server instances (or use external keuss clients) that would work as a single cluster. 

The config is composed using [cascade-config](https://github.com/pepmartinez/cascade-config) with the following loaders:
* defaults: 
  ```
  { 
    http: {
      port: 3444,
      users: {}
    },
    stomp: {
      port: 61613,
      keepalive_interval: 2000,
      read_timeout: 12000
    },
    backends: []
  }
  ```
* file at `__dirname + '/etc/config.js`, optional
* file at   `__dirname + '/etc/config-{env}.js`, optional
* env vars starting with `KEUSS_`
* command line args

For more information about how the config is specified and composed please see [here](https://github.com/pepmartinez/cascade-config/blob/master/README.md). Those are the valid conguration items:
* `http.port`: port to listen to for HTTP interface, defaults to 3444
* `http.users`: all http is protected with Basic Auth; this specifies an object containing the user:password pairs
* `log.level`: a `winston` textual log level, such as `debug` or `verbose`. Defaults to `info`
*  `stomp.port`: port to listen to for STOMP clients, defaults to 61613
*  `stomp.keepalive_interval`: period in millisecs for the timeout checks, defaults to 2000. The stomp stack would check all active connections every so millisecs to see if a keepalive is needed, or a connection is to be closed
*  `stomp.read_timeout`: millisecs of inactivity that would cause a connection to be deemed dead, when no session is yet opened or when the client states it will send no keepaives. Defaults to 12000
* `backends`: the queue backends to connect to; they define instances of keuss queue factories, and follow this schema:
  * `factory`: a name for the factory
  * `disable`: whether to disable it, defaults to false
  * `config`: the keuss config for the queue factory

keuss-server allows all backend types offered by keuss v1.3.7: redis-list, redis-ordered, mongo-simple and mongo-pipeline. However, the pipeline-specific operations are not yet supported by keuss-server

Keuss-server comes with a sample config.js with queues of the 4 types supported by keuss, using local redis & mongodb servers

## Web Console
If you're running keuss-server in localhost, and the http.port is set to 3456, open a browser at `http://localhost:3456` and you will get a simple web console showing a table with all the queues found and information about them

## REST API
All the REST operations on all queues are locted under `/q` path. Also, all operations are protected with HTTP Basic Auth (see *configuration* above)

### List backends: `GET /q`
Lists all queues on all backends. Admits the following query parameters:
* `array=1`: lists the queues in a format resembing an array (this is the one used internally by the web console)
* `tree=1`: lists the queue in a format resembling a tree, or a hierarchy of backends
* `reload=1`: force a reload of the queue information on all backends before listing

### List queues on backend: `GET /q/:backend`
Lists all queues on the specified backend. *backend* corresponds to the *name* specified in the configurationAdmits the following query parameters:
* `array=1`: lists the queues in a format resembing an array (this is the one used internally by the web console)
* `tree=1`: lists the queue in a format resembling a tree, or a hierarchy of backends

### Status of queue: `GET /q/:backend/:queue/status`
Get status of a single queue

### Insert in queue: `PUT /q/:backend/:queue` or `POST /q/:backend/:queue`
Inserts an object into a queue. All parameters in the querystring are passed to keuss' push operation as *options*:
* `mature`: unix timestamp where the element would be elligible for extraction. It is guaranteed that the element won't be extracted before this time
* `delay`: delay in seconds to calculate the mature timestamp, if mature is not provided. For example, a delay=120 guarantees the element won't be extracted until 120 secs have elapsed at least
* `tries`: value to initialize the retry counter, defaults to 0 (still no retries).

### Get/reserve from queue: `GET /q/:backend/:queue`
Attempts a pop or a reserve on a queue. If there is no elligible elements the call would block indefinitely, or until *to* milliseconds elapse, or until a cancel operation is called
Admits the following query parameters:
* `to`: timeout in millsecs if the operation needs to block. Blocks indefinitely by default
* `tid`: optional identifier for the consumer, needed if Cancel on this call is to be supported. By defaut no tid is used (and therefore no cancel is possible)
* `reserve`: if truthy, the operation attempts a reserve rather than a pop. By default, a pop is attempted

### Get pending get/reserve operations: `DELETE /q/:type/:q/consumers`
Lists the IDs of all the pending/blocked get or reserve operations on the given queue

### Cancel pending get/reserve: `DELETE /q/:type/:q/consumer/:id`
Cancels a pending/blocked get/reserve call. To do so, such get/reserve call must have been done with a `tid` value, which is passed as `:id` in the cancel

### Commit in queue: `PATCH /q/:type/:q/commit/:id`
Commits a previous reserve operation. `id` is the `_id` inside the object returned in a previous commit

### Rollback in queue: `PATCH /q/:type/:q/rollback/:id`
Commits a previous reserve operation. `id` is the `_id` inside the object returned in a previous commit
Admits the following query parameters:
* `delay`: delay in millsecs to apply to the rolled back object: it will be available for get/reserver after *delay* milliseconds. Defaults to 0, so rolled back elements are immediately available for others

## STOMP stack
The included STOMP stack supports version 1.2 only of STOMP, with the following exceptions:
* there is no support for transactions, so frames BEGIN, COMMIT and ABORT are not supported
* On SUBSCRIBE, ack type *client* is not supported; you'd need to use *client-individual* and emit ack/nack for each message. Also, *client-individual* is also not supported on queues lacking reserve support (type redis:list)
* the *content-type* is limited to be `application/json` only
* On NACK frames:
  * a NACKed message will be delayed by 5 secs; that is, a NACKed message will not be reserved again (by any keuss client) until at least 5 secs have elapsed 
  * there is no limit of retries

There are also a few additions on top of the standard STOMP:
* support for parallel *consumers* on subscriptions: more than one consumer can be used on any given subscription to pop/reserve elements from the underlying queue, just pass an extra header `x-parallel` on the SUBSCRIBE frame with the desired number of parallel consumers (defaults to 1)
* support for window size to limit the number of *in flight* messages on subscriptions: *in flight* messages are messages waiting to be acked/nacked, but also consumers waiting for a pop-from-queue. Default window size is 1000, but it can be specified by passing a header `x-wsize` on the SUBSCRIBE frame
* delay/scheduling in SEND/NACK: messages can be delayed or scheduled for later on SEND frames, but also when NACKing a message. Simply use one of those headers (if none used, it will assume `x-delta-t: 0`):
  * `x-next-t`: UNIX time in milliseconds, to set an absolute time
  * `x-delta-t`: a delta in milliseconds from mow, for a relative time
* extra info in MESSAGE: some extra info is included on each MESSAGE frame returned, to ease retries and/or better management:
  * `x-mature`: ISO timestamp when the message became elligible for pop/reserve (mature)
  * `x-tries`: number of tries of this message. Each NACK increments this value, so this can be used in conjunction with `x-delta-t` to implement custom delays on failing elements, or limiting the number fo retries
