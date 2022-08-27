---
id: amqp10
title: AMQP 1.0 API
sidebar_label: AMQP 1.0 API
---

## AMQP 1.0 stack

The included AMQP 1.0 stack supports version 1.0 only, and is implemented using [rhea](https://www.npmjs.com/package/rhea):

* An AMQP server is created,
* where AMQP clients can connect and:
  * open receivers to pop elements from a queue
  * open senders to push elements to a queue
* In all cases (receviers and senders) addresses refer to queues
  
### Features

* *at-least-once consume*: by default client receivers (linked to a server sender) will work on at-least-once mode:
  elements are reserved from queues, and are later committed (in case of client accept) or rolled back (in case of client reject)
* *at-most-once consume*: in case the client receiver uses `snd-settle-mode = 1`, elements will be directly popped from queues
* *consume window*: client receivers in at-least-once mode will only get up to a maximum number of unsettled elements; that is,
  the receiver will stop receiving new elements after reaching a certain number of elements pending accept or reject  
* *delay on retry*: Elements rejected (in at-least-once mode) are rolled back to the queue with a configurable delay with quadratic increase
* *deadletter*: Elements rejected (in at-least-once mode) too many times can optionally be moved to a deadletter queue

### Limitations

* `release` is unsupported: you need to use either `accept` or `reject`
* There is no authentication/authorization yet (although `rhea` provides it, so it will be added soon)

### Conventions

#### Queue naming

Queues (that is, addresses) will need to follow one of those forms:

* `/amq/queue/{namespace}/{queue}`
* `/queue/{namespace}/{queue}`
* `{namespace}/{queue}`

Where `{namespace}` and `{queue}` are the namespace and queue names respectively

#### Headers mapping

There is a specific mapping between `keuss` headers and amqp message parts:

| AMQP msg field                     | Keuss element                      |
|------------------------------------|------------------------------------|
| `delivery-count`                   | `tries`                            |
| `application_properties.x-next-t`  | `mature`                           |
| `application_properties.x-delta-t` | `delay`                            |
| `subject`                          | `hdrs.subject`                     |
| `content-type`                     | `hdrs.content-type`                |
| `content-encoding`                 | `hdrs.content-encoding`            |
| `priority`                         | `hdrs.x-amqp-priority`             |
| `ttl`                              | `hdrs.x-amqp-ttl`                  |
| `absolute-expiry-time`             | `hdrs.x-amqp-absolute-expiry-time` |
| `creation-time`                    | `hdrs.x-amqp-creation-time`        |
| `group-sequence`                   | `hdrs.x-amqp-group-sequence`       |
| `message-id`                       | `hdrs.x-amqp-message-id`           |
| `user-id`                          | `hdrs.x-amqp-user-id`              |
| `to`                               | `hdrs.x-amqp-to`                   |
| `reply-to`                         | `hdrs.x-amqp-reply-to`             |
| `correlation-id`                   | `hdrs.x-amqp-correlation-id`       |
| `group-id`                         | `hdrs.x-amqp-group-id`             |
| `reply-to-group-id`                | `hdrs.x-amqp-reply-to-group-id`    |
| `delivery-annotations.*`           | `hdrs.x-amqp-da-*`                 |
| `message-annotations.*`            | `hdrs.x-amqp-ma-*`                 |
| `application-properties.*`         | `hdrs.x-amqp-ap-*`                 |
| `footer.*`                         | `hdrs.x-amqp-ft-*`                 |

Also, any other header in a keuss element that does not match any of the above but starts with `x-` will be passed to amqp message
inside `application-properties`

### Configuration

This is the configuration block for AMQP 1.0, along with its default values:

```js
  amqp: {
    port: 5672,  // TCP port to listen to
    wsize: 512,  // consumer window size
    parallel: 3, // number of parallel keuss consumers per server sender (ie, per client receiver)
    retry: {     // retry in seconds applied to element in case of `reject`: calculated as (tries^2 * c2 + tries * c1 + c0)
      delay: {
        c0: 3,
        c1: 3,
        c2: 3
      }
    }
  }
```

### Metrics

These are the [Prometheus](https://prometheus.io/) metrics provided for AMQP:

* `amqp_connections`: gauge, number of active amqp connections
* `amqp_senders`: gauge, number of active amqp senders
* `amqp_receivers`: gauge, number of active amqp receivers
* `amqp_pending_acks`: gauge, total sum across senders of messages pending accept or reject
* `amqp_pending_tids`: gauge, total number of idle keuss consumers
* `amqp_wsize`: gauge, total sum across senders of each wsize

### Examples

Here are a few simple clients built using `rhea`

#### Push to queue

```js
const container = require ('rhea').create_container ();

let confirmed = 0, sent = 0;
const total = 100;

container.on ('sendable', context => {
  while (context.sender.sendable () && sent < total) {
    sent++;
    console.log ('sent ' + sent);

    context.sender.send ({
      subject: 'a test message',
      message_id: sent, 
      content_type: 'application/json',
      application_properties: {
        ein: 1,
        zwei: 'dos',
        'x-delta-t': 7000  // apply an initial delay of 7 seconds
      },
      body: {sequence: sent, t: 'some text'}
    })
  }
});

container.on ('accepted', context => {
  console.log ('message confirmed');
  if (++confirmed === total) {
    console.log ('all messages confirmed');
    context.connection.close ();
  }
});

container.on ('disconnected', context => {
  if (context.error) console.error('%s %j', context.error, context.error);
  sent = confirmed;
});

container
.connect ({port: 5672, host: 'localhost'})
.open_sender ('/queue/N/aaa');

```

#### Pop from queue

```js
const container = require('rhea').create_container ();

function between (min, max) {  
  return Math.floor (Math.random () * (max - min) + min);
}

container.on ('message', context => {
  const tag = context.delivery.tag.toString ();
  console.log ('received message with tag %o, settled is %o: %o', tag, settled, context.message.body);

  setTimeout (() => {
    const dice = between (1, 100);

    if (dice < 70) {
      context.delivery.accept();
      console.log ('acepted message %s', tag);
    }
    else {
      context.delivery.reject ({condition: 'random condition', description: `message rejected just because dice was ${dice}`});
      console.log ('rejected message %s', tag);
    }
  }, between (100,1000));
});

container
.connect ({
    port: 5672, 
    host: 'localhost',
    idle_time_out: 5000
})
.open_receiver ({
  autoaccept: false,  // we want to manage the accept/reject ourselves
  source: '/queue/N/aaa',

  // uncomment this line below to do at-most-once consume
  // snd_settle_mode: 1 // at-most-once: 1
});

```
