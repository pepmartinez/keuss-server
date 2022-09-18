---
id: clustering
title: Clustering
sidebar_label: Clustering
---

`keuss-server` can be run as a cluster out of the box with no extra configuration; all the needed bits are provided by `keuss`. All that is needed is, each node uses the same configuration so they end up with queues backed by the same mongodb or redis instance/cluster. Also, exchanges are copied and kept aligned on all cluster nodes (each node runs its own instances of the push-pop loops inside each exchange)

The clustering support improves if a Signaller other than `local` is used (and all nodes use the same configuration for it), cause insertions and rollbacks in queues will be known to all the cluster.

Cluster support improves even further if a Stats object other than `mem` is used (and all nodes use the same configuration for it): this would provide cluster-wide statistics and metrics.

Each exchange publishes its events on the signaller of its source queue; therefore, exchanges with source queues using a `local` signaller will not be propagated to the rest of the cluster
