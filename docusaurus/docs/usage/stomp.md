---
id: stomp
title: STOMP API
sidebar_label: STOMP API
---

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
  * There is no support for auth yet. User and passwd are simply ignored
