---
id: rest
title: REST API
sidebar_label: REST API
---

## REST API

All the REST operations on all queues are located under `/q` path. All operations are protected with HTTP Basic Auth (see *configuration* above)

### List namespaces: `GET /q`

Lists all queues on all namespaces. Admits the following query parameters:

* `array=1`: lists the queues in a format resembling an array (this is the one used internally by the web console)
* `tree=1`: lists the queues in a format resembling a tree, or a hierarchy of namespaces
* `reload=1`: force a reload of the queues information on all namespaces before listing

### List queues on namespace: `GET /q/:namespace`

Lists all queues on the specified namespace. *namespace* corresponds to the *name* specified in the configuration. Admits the following query parameters:

* `array=1`: lists the queues in a format resembling an array (this is the one used internally by the web console)
* `tree=1`: lists the queues in a format resembling a tree, or a hierarchy of namespaces

### Status of queue: `GET /q/:namespace/:queue/status`

Get status of a single queue

### Insert in queue: `PUT /q/:namespace/:queue` or `POST /q/:namespace/:queue`

Inserts an object into a queue. All parameters in the querystring are passed to keuss' `push` operation as *options*:

* `mature`: unix timestamp where the element would be eligible for extraction. It is guaranteed that the element won't be extracted before this time
* `delay`: delay in seconds to calculate the mature timestamp, if mature is not provided. For example, a delay=120 guarantees the element won't be extracted until 120 secs have elapsed at least
* `tries`: value to initialize the retry counter, defaults to 0 (still no retries)

Any type of body is supported (json, string, Buffer); for that matter, the `content-type`header is stored aonlgside the body as a keuss element header; also, any http header with name starting with `x-ks-hdr-` is also stored

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

### Get pending get/reserve operations: `DELETE /q/:type/:q/consumers`

Lists the IDs of all the pending/blocked `get` or `reserve` operations on the given queue

### Cancel pending get/reserve: `DELETE /q/:type/:q/consumer/:id`

Cancels a pending/blocked `get`/`reserve` call. To do so, such `get`/`reserve` call must have been done with a `tid` value, which is passed as `:id` in the cancel

### Commit in queue: `PATCH /q/:type/:q/commit/:id`

Commits a previous `reserve` operation. `id` is the `x-ks-id` header returned in the reserve request

### Rollback in queue: `PATCH /q/:type/:q/rollback/:id`

Rollbacks a previous `reserve` operation. `id` is the `x-ks-id` header returned in the reserve request
Admits the following query parameters:

* `delay`: delay in millisecs to apply to the rolled back object: it will be available for `get`/`reserve` after *delay* milliseconds. Defaults to 0, so rolled back elements are immediately available to others

### Pause all consumers to a queue: `PATCH /q/:namespace/:q/pause`

Pauses all consumers of a queue. It affects all keuss consumers (not only local ones) provided a non-local signaller is used by the queue.
Takes no body

### Resume all consumers to a queue: `PATCH /q/:namespace/:q/resume`

Resumes all consumers of a queue. It affects all keuss consumers (not only local ones) provided a non-local signaller is used by the queue.
Takes no body
