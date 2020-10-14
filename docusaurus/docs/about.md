---
id: about
title: About
sidebar_label: About
---
Job Queues' server accesible via STOMP and REST, built with keuss

Keuss-server provides STOMP and REST-like interfaces atop [keuss](https://pepmartinez.github.io/keuss/), plus a simple web console to check queues' statuses. This adds an inherently distributed (with no single point fo failure) job-queue service on top of Keuss functionalities

In brief, those are the features fully inherited from Keuss:
* Ability to use mongodb or redis as backend for queues, events and metadata. Durability and persistence guarantees vary depending on the backend chosen (see [keuss Storage](https://pepmartinez.github.io/keuss/docs/concepts#storage) for more information)
* delayed/scheduled elements
* deadletter queues
* at-least-once and at-most-once delivery guarantees
* centralized metadata
* [bucket based queues](https://pepmartinez.github.io/keuss/docs/usage/buckets) for higher throughput and performance without relinquishing durability

On top of that keuss-server offers some insight (global and per node) through prometheus metrics
