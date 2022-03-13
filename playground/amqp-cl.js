
var rhea = require('rhea');



class AMQPSnd {
  constructor (conn_opts, snd_opts) {
    this._conn_opts = conn_opts || {};
    this._snd_opts =  snd_opts || {};

    this._container = rhea.create_container ();


    this._container.on ('accepted', context => {
//      console.log('message confirmed');
    //        context.connection.close();
    });


    this._container.on('disconnected', context => {
      if (context.error) console.error('%s %j', context.error, context.error);
      else console.log ('disconnected');
    });
  }


  connect (cb) {
    this._connection = this._container.connect (this._conn_opts);

    this._container.once ('sendable', ctx => {
      this._sender = ctx.sender;
      cb (null, ctx)
    });

    this._container.once ('error',    err => cb (err));

    this._connection.open_sender (this._snd_opts);
  }


  send (obj, cb) {
    if (this._sender.sendable()) {
      this._sender.send (obj);
      setImmediate (cb);
    }
    else {
      console.log ('can not send now, waiting for sendable event...');
      this._container.once ('sendable', ctx => {
        console.log ('can send now');
        this._sender.send (obj);
        cb ();
      });
    }
  }
}


const cl = new AMQPSnd ({
  host: 'localhost',
  port: 5672
}, '/queue/N/aaa');


cl.connect (err => {

  let i = 0;

  function send_one (cb) {
    if (i == 111111) return cb ();
    cl.send ({
      subject: 'punk is not dead',
      message_id: i, 
      content_type: 'application/json',
      application_properties: {
        ein: i,
        zwei: 'dos',
//      'x-delta-t': 7000
      },
      body: {'sequence': i}
    }, () => {
      i++;
      send_one (cb);
    });

    console.log ('sent %d', i);
  }

  send_one (() => console.log ('send done'));
});


