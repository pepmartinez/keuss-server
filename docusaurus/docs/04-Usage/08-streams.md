---
id: streams
title: Streams
sidebar_label: Streams
---

Starting with version 2.0.1 `keuss` offers a storage backend that offers capabilities beyond job queues: in a job queue each 
element in the queue can be consumed by exacty one consumer; this backend extends this to several consumers, although the set 
of potential consumers must be fixed and known at insertion time. You can read in detail about this at 
(stream-mongo backend)[https://pepmartinez.github.io/keuss/docs/usage/streaming/stream-mongo]

Queeus backed by `stream-mongo` can be managed as regular job queues at `keuss`, but the extra, stream features are only available
through `REST` and `STOMP` APIs

## Streams in REST API
The extra details are specified via querystring parameters:
* `groups`: set of potential consumer groups, in the insert operations
* `group`: consumer group to use, in get, reserve, commit and rollback operations

### Insert in queue
Just specify the set of possible consumer groups for the element, as a comma-separated string:

```
$ curl -utest1:test1 \
-X PUT  \
-H 'content-type: text/plain' \
--data-bin 'test test test' \
-H 'x-ks-hdr-header-1: val1'  \
http://localhost:3444/q/ns1/test_queue_42?delay=3?groups=GR1,GR2,GR3
```

:::info
Different elements pushed in the same queue can have different 'groups'
:::

### Get from queue
Just specify the consumer group as `group`:

```
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_42?group=GR2
```

### Reserve from queue
Just specify the consumer group as `group`:

```
$ curl -i -utest1:test1 http://localhost:3444/q/ns1/test_queue_42?group=GR2&reserve=true
```

### Commit in queue
Just specify the consumer group as `group`. It is important to specify the *same* value specified in the reserve:

```
curl -i -X PATCH http://localhost:3444/q/ns1/test_queue_42/commit/6322ed6caf9be003dcfaaaae?group=GR2
```

### Rollback in queue
Just specify the consumer group as `group`. It is important to specify the *same* value specified in the reserve:

```
curl -i -X PATCH http://localhost:3444/q/ns1/test_queue_42/rollback/6322ed6caf9be003dcfaaaae?group=GR2&delay=5000
```

