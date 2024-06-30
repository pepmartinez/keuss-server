---
id: about
title: About
sidebar_label: About
slug: /
---
Job Queues server accessible via STOMP, AMQP 1.0 and REST, built with `keuss`

`keuss-server` provides STOMP, AMQP 1.0 and REST-like interfaces atop [keuss](https://pepmartinez.github.io/keuss/), plus a simple web console to check queues' statuses. This adds an inherently distributed (with no single point of failure) job-queue service on top of Keuss functionalities

It also offers *exchanges*: a functionality to automatically move or copy messages between queues, with the ability to modify them  

In brief, these are the features fully inherited from Keuss:

* Ability to use `mongodb`, `redis` or `postgres` as backend for queues, events and metadata. Durability and persistence guarantees vary depending on the backend chosen (see [keuss Storage](https://pepmartinez.github.io/keuss/docs/concepts#storage) for more information)
* Delayed/scheduled elements
* Deadletter queues
* At-least-once and at-most-once delivery guarantees
* Centralized metadata
* [bucket based queues](https://pepmartinez.github.io/keuss/docs/usage/buckets) for higher throughput and performance without relinquishing durability
* Exchanges: build flow graphs to move and replicate messages over a network of job queues
* `prometheus` metrics on queues, exchanges and protocol servers
* [Exchanges](/docs/Usage/exchanges): server-side, fully clustered connectors between queues
* Support for [simple stream-like queues](https://pepmartinez.github.io/keuss/docs/usage/streaming/stream-mongo), not just job-like queues: any element can be consumed more than once, in a totally independent manner