---
id: about
title: About
sidebar_label: About
---
Job Queues' server accessible via STOMP and REST, built with keuss

Keuss-server provides STOMP and REST-like interfaces atop [keuss](https://pepmartinez.github.io/keuss/), plus a simple web console to check queues' statuses. This adds an inherently distributed (with no single point of failure) job-queue service on top of Keuss functionalities

In brief, these are the features fully inherited from Keuss:

* Ability to use mongodb or redis as backend for queues, events and metadata. Durability and persistence guarantees vary depending on the backend chosen (see [keuss Storage](https://pepmartinez.github.io/keuss/docs/concepts#storage) for more information)
* Delayed/scheduled elements
* Deadletter queues
* At-least-once and at-most-once delivery guarantees
* Centralized metadata
* [bucket based queues](https://pepmartinez.github.io/keuss/docs/usage/buckets) for higher throughput and performance without relinquishing durability

On top of that, keuss-server offers some insight (global and per node) through Prometheus metrics
