
var rhea = require('rhea');


//////////////////////////////////////////////////////////////////////////////////////////////////
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


  //////////////////////////////////////////////////////////////////////////////////////////////////
  connect (cb) {
    this._connection = this._container.connect (this._conn_opts);

    this._container.once ('sendable', ctx => {
      this._sender = ctx.sender;
      cb (null, ctx)
    });

    this._container.once ('error', err => cb (err));

    this._connection.open_sender (this._snd_opts);
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  close (cb) {
    this._container.once ('disconnected', () => {
      console.log ('AMQP Snd disconnected');
      cb ();
    });

    this._connection.close();
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
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


//////////////////////////////////////////////////////////////////////////////////////////////////
class AMQPRcv {
  constructor (conn_opts, rcv_opts, opts) {
    this._conn_opts = conn_opts || {};
    this._rcv_opts =  rcv_opts || {};
    this._opts =      opts || {};
    this._on_msg = this._opts.on_msg;

    this._container = rhea.create_container ();

    this._container.on('disconnected', context => {
      if (context.error) console.error('%s %j', context.error, context.error);
      else console.log ('disconnected');
    });


    this._container.on ('message', context => {
      if (!this._on_msg) return;

      const tag = context.delivery.tag.toString();
      const msg = context.message;
      const delivery = context.delivery;

      this._on_msg (msg, tag, delivery);

//      const odelv = context.session.outgoing.deliveries;
//      const idelv = context.session.incoming.deliveries;
//      console.log ('out size %d head %d tail %d', odelv.size, odelv.head, odelv.tail)
//      console.log ('in  size %d head %d tail %d', idelv.size, idelv.head, idelv.tail)
    });
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  connect (cb) {
    this._connection = this._container.connect (this._conn_opts);

    this._container.once ('error', err => cb (err));
    this._container.once ('receiver_open', ctx => cb (ctx.error));
    this._connection.open_receiver (this._rcv_opts);
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////
  close (cb) {
    this._container.once ('disconnected', () => {
      console.log ('AMQP Rcv disconnected');
      cb ();
    });

    this._connection.close();
  }
}





//////////////////////////////////////////////////////////////////////////////////////////////////
function between(min, max) {  
  return Math.floor (Math.random () * (max - min) + min);
}

const rcv = new AMQPRcv ({
  host: 'localhost',
  port: 5672
}, {
  autoaccept: false,
  //    autosettle: true,
      source: '/queue/N/aaa',
  //    snd_settle_mode: 1,
  //    rcv_settle_mode: 0
},
{
  on_msg: function (msg, tag, delv) {
    console.log ('received message with tag %o, settled is %o: %o', tag, delv.settled, msg.body);

    setTimeout (() => {
      const dice = between (1, 100);

      if (dice < 70) {
        delv.accept();
        console.log ('acepted message %s', tag);
      }
      else {
        delv.reject({condition: 'random condition', description: `message rejected just because dice was ${dice}`});
        console.log ('rejected message %s', tag);
      }
    
    }, between (100,1000));
  }
});


const snd = new AMQPSnd ({
  host: 'localhost',
  port: 5672
}, '/queue/N/aaa');


rcv.connect (err => 
  snd.connect (err => {
    let i = 0;

    function send_one (cb) {
      if (i == 1111111) return cb ();
      snd.send ({
        subject: 'punk is not dead',
        message_id: i, 
        content_type: 'application/json',
        application_properties: {
          ein: i,
          zwei: 'dos',
//          'x-delta-t': 7000
        },
        body: {'sequence': i}
      }, () => {
        i++;
        send_one (cb);
      });

      console.log ('sent %d', i);
    }

    send_one (() => console.log ('send done'));
  })
);


