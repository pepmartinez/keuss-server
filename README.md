# keuss-server
server stack and web console for keuss

Keuss-server provides a REST-like interface atop [keuss](https://github.com/pepmartinez/keuss), plus a simple web console to check queues' statuses. It aims to offer all functionalities provided by keuss 

## Install & run
Easiest way is to `npm install keuss-server`; then, edit the config.js file at will and run `node index.js`. 

Keuss-server dumps a not-very-verbose log to stdout; setting env var `KEUSS_SERVER_SILENT=1` will remove the logging altogether

keuss-server comes with mocha tests, runnable with the usual `npm test`. It expects a local running redis server, and a local running mongodb server (just as they are once installed in ubuntu, for example)

## Configuration 
Keuss-server comprises basically a set of keuss cleint objects plus an express app to manage them; as such, it works largely as if it were any other keuss app

This concerns more specifically to the stats and signaller providers used: if the defaut ones are used (backed by memory and therefore bound to a single process) the keuss-server will work pretty much fune, but will be totally self-contain: the queues could be used externally, but only in a degraded state where the stats are not updated and no signalling is present (see keuss' docs for more info)

It is recommended to use a shared-state stats and signaller such as redis; in this way all the queues are effectively shared, and one can fire seeral keuss-server instances (or use external keuss clients) that would work as a single cluster. 

The config is kept in a config.js file, with this schema:
* `http.port`: port to listen in, defaults to 3444
* `http.users`: all http is protected with Basic Auth; this specifies an object containing the user:password pairs
* `backends`: the queue backends to connect to; they define instances of keuss queue factories, and follow this schema:
  * `factory`: a name for the factory
  * `disable`: whether to disable it, defaults to false
  * `config`: the keuss config for the queue factory

keuss-server allows all backend types offered by keuss v. 1.3.4: redis-list, redis-ordered, mongo-simple and mongo-pipeline. However, the pipeline-specific operations are not yet supported by keuss-server

Keuss-server comes with a sample config.js

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
