
var config = {
  http: {
    users: {
    }
  },
  amqp: {
    wsize: 128,
    parallel: 3
  },
  stats: {
    memory: {
      factory: 'mem',
      config : {}
    }
  },
  signallers: {
    local: {
      factory: 'local',
      config : {}
    }
  },

  namespaces: {
  }
};

module.exports = config;
