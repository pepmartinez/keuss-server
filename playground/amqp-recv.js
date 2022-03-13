var container = require('rhea').create_container ();

function between(min, max) {  
  return Math.floor (Math.random () * (max - min) + min);
}


container.on ('message', context => {
  const tag = context.delivery.tag.toString();
  console.log ('received message with tag %o, settled is %o: %o', tag, context.delivery.settled, context.message.body);

  setTimeout (() => {
  
    const dice = between (1, 100);

    if (dice < 70) {
      context.delivery.accept();
      console.log ('acepted message %s', tag);
    }
    else {
      context.delivery.reject({condition: 'random condition', description: `message rejected just because dice was ${dice}`});
      console.log ('rejected message %s', tag);
    }
    
  }, between (100,1000));

  const odelv = context.session.outgoing.deliveries;
  const idelv = context.session.incoming.deliveries;
  console.log ('out size %d head %d tail %d', odelv.size, odelv.head, odelv.tail)
  console.log ('in  size %d head %d tail %d', idelv.size, idelv.head, idelv.tail)
});


container
.connect ({
    port: 5672, 
    host: 'localhost',
    idle_time_out: 5000
})
.open_receiver ({
    autoaccept: false,
//    autosettle: true,
    source: '/queue/N/aaa',
//    snd_settle_mode: 1,
//    rcv_settle_mode: 0
});
