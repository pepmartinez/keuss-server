var container = require('rhea');

var confirmed = 0, sent = 0;
var total = 1;

container.on('sendable', context => {
    while (context.sender.sendable() && sent < total) {
        sent++;
        console.log('sent ' + sent);
        context.sender.send ({
            subject: 'punk is not dead',
            message_id: sent, 
            content_type: 'application/json',
            application_properties: {
                ein: 1,
                zwei: 'dos',
                'x-delta-t': 7000
            },
            body: {'sequence':sent}
        })
    }
});

container.on('accepted', context => {
    console.log('message confirmed');
    if (++confirmed === total) {
        console.log('all messages confirmed');
        context.connection.close();
    }
});

container.on('disconnected', context => {
    if (context.error) console.error('%s %j', context.error, context.error);
    sent = confirmed;
});

container.connect({port: 5672, host: 'localhost'}).open_sender('/queue/N/aaa');
