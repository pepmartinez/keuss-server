---
id: monitoring
title: Monitoring
sidebar_label: Monitoring
---

## Logging

Keuss-server uses [winston-log-space](https://github.com/pepmartinez/winston-log-space) for logging, and by default it logs to stdout only, on a `info` level. See `winston-log-space` for how to configure and tailor logging

## Prometheus metrics

Several metrics are provided at the `/metrics` endpoint:

* Base metrics: metrics added by [promster-express](https://www.npmjs.com/package/@promster/express)
* Queue operations metrics:
  * `keuss_q_push`: counter, push operations done. Use labels 'proto' (protocol), 'ns' (namespace), 'q' (queue name), 'status' (op status, ok or failed)
  * `keuss_q_pop`: counter, pop operations done. Use labels 'proto' (protocol), 'ns' (namespace), 'q' (queue name), 'status' (op status, ok or failed)
  * `keuss_q_reserve`: counter, reserve operations done. Use labels 'proto' (protocol), 'ns' (namespace), 'q' (queue name), 'status' (op status, ok or failed)
  * `keuss_q_commit`: counter, commit operations done. Use labels 'proto' (protocol), 'ns' (namespace), 'q' (queue name), 'status' (op status, ok or failed)
  * `keuss_q_rollback`: counter, rollback operations done. Use labels 'proto' (protocol), 'ns' (namespace), 'q' (queue name), 'status' (op status, ok or failed)
* STOMP metrics:
  * `stomp_sessions`: gauge, active STOMP sessions. No labels
  * `stomp_subscriptions`: gauge, active STOMP subscriptions on all sessions. No labels
  * `stomp_pending_acks`: gauge, total number of messages pending of ack. No labels
  * `stomp_pending_tids`: gauge, idle consumers. No labels
  * `stomp_wsize`: gauge, total window size on all consumers for all subscriptions. No labels
* Keuss-reflected metrics: Those are a reflection of the info maintained by keuss' own stats and therefore will be the same on all servers in a cluster if a non-local stats provider (such as mongodb or redis) is used:
  * `q_global_size`: gauge, size of queue, only available elements. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_schedSize`: gauge, elements in queue due in the future. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_totalSize`: gauge, total size of queue (all elements). Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_resvSize`: gauge, reserved elements in queue pending commit/rollback. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_next_t`: gauge, delta in milliseconds of next element due. Can be negative. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_put`: counter, number of elements intserted. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_get`: counter, number of elements extracted. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_reserve`: counter, number of elements reserved. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_commit`: counter, number of elements committed. Use labels 'ns' (namespace), 'q' (queue name)
  * `q_global_rollback`: counter, number of elements rolledback. Use labels 'ns' (namespace), 'q' (queue name)
