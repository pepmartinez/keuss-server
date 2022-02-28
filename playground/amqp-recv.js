var container = require('rhea');

function between(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }

container.on ('message', context => {
    console.log ('received message with tag', context.delivery.tag, context.message);

    setTimeout (() => {
        const dice = between (1, 4);
        switch (dice) {
            case 1: 
                context.delivery.accept();
                console.log ('acepted message %s', context.delivery.tag);
                break;

            case 2:  
                context.delivery.reject();
                console.log ('rejected message %s', context.delivery.tag);
                break;

            default:
                context.delivery.release();
                console.log ('released message %s', context.delivery.tag);
                break;
        }
    }, between (1000,15000));
});


container
.connect ({
    port: 5672, 
    host: 'localhost', 
    idle_time_out: 5000})
.open_receiver ({
    autoaccept: false,
    source: 'queue://das.queue'
});
