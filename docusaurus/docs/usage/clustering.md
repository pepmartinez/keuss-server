---
id: clustering
title: Clustering
sidebar_label: Clustering
---

Keuss-server can be run as a cluster out of the box with no extra configuration; all the needed bits are provided by `keuss`. all that is needed is, each node uses the same configuration so they end up with queues backed by the same mongodb or redis instance/cluster.

The clustering support improves if a Signaller other than `local` is used (and all nodes use the same configuration for it), cause insertions and rollbacks in queues will be known to all the cluster

Cluster support improves even further if a Stats object other than `mem` is used (and all nodes use the same confiruation for it): this would provide cluster-wide statistics and metrics

