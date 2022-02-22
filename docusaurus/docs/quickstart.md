---
id: quickstart
title: Quickstart
sidebar_label: Quickstart
---

## Install & run

### As Docker Container

Easiest way is to use the docker image available at [docker hub](https://hub.docker.com/repository/docker/pepmartinez/keuss-server):

```sh
docker run --rm -d --net host --name keuss-server pepmartinez/keuss-server:1.6.7
```

The docker image comes with a default (suitable for test & demo) configuration which requires both a redis server and a mongodb server running in localhost (hence the `--net host`).

You can access the web gui at `https://localhost:3444` (user `test1`, pass `test1`). You will see no queues upon start, since queues are created on demand when they're accessed

You can provide your own config by mounting the directory containing it as `/usr/src/app/etc`; if you use a non-local redis/mongodb server you might prefer to loose the `--net host` and publish the REST & STOMP ports instead:

```sh
docker run --rm -d -p 3444:3444 -p 61613:61613 -v /opt/ks/etc:/usr/src/app/etc --name keuss-server pepmartinez/keuss-server:1.6.7
```

### As node.js package

As an alternative it is also possible to install the node.js package directly:

```sh
npm install keuss-server
```

then, edit the config.js file at will and run `node index.js`.
