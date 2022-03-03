
var config = {
  http: {
    users: {
    }
  },
  amqp: {
    wsize: 32
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
