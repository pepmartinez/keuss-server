var container = require('rhea');

function between(min, max) {  
  return Math.floor (Math.random () * (max - min) + min);
}


container.on ('message', context => {
    const tag = context.delivery.tag.toString();
    console.log ('received message with tag', tag, context.message);

    setTimeout (() => {
        const dice = between (1, 3);
        switch (dice) {
            case 1: 
                context.delivery.accept();
                console.log ('acepted message %s', tag);
                break;

            case 2:  
                context.delivery.reject({condition: 'random condition', description: `message rejected just because dice was ${dice}`});
                console.log ('rejected message %s', tag);
                break;

            default: 
                console.log ('IGNORED message %s', tag);
        }
    }, between (5000,15000));
});


container
.connect ({
    port: 5672, 
    host: 'localhost', 
    idle_time_out: 5000})
.open_receiver ({
    autoaccept: false,
    source: '/queue/N/aaa'
});
