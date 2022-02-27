var container = require('rhea');

var received = 0;
var expected = 1;

container.on ('message', context => {
    console.log (context.delivery.tag)
    if (context.message.id && context.message.id < received) {
        // ignore duplicate message
        return;
    }
    if (expected === 0 || received < expected) {
        console.log (context.message);
        if (++received === expected) {
            context.receiver.detach();
            context.connection.close();
        }
    }
});

container
.connect ({
    port: 5672, 
    host: 'localhost', 
    idle_time_out: 5000})
.open_receiver ('queue://das.queue');
