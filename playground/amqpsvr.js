const container = require('rhea');




container.on ('connection_open', context => {
    console.log ('==== connection_open: ', context.connection.options.id);
});
container.on ('connection_close', context => {
    console.log ('==== connection_close: ', context.connection.options.id);
});
container.on ('connection_error', context => {
    console.log ('==== connection_error: ');
});

//container.on ('session_open', context => {
//    console.log ('==== session_open: ');
//});
//container.on ('session_close', context => {
//    console.log ('==== session_close: ');
//});
//container.on ('session_error', context => {
//    console.log ('==== session_error: ');
//});

container.on ('protocol_error', context => {
    console.log ('==== protocol_error: ');
});
container.on ('error', context => {
    console.log ('==== error: ');
});
container.on ('disconnected', context => {
    console.log ('==== disconnected: ', context.connection.options.id);
});
container.on ('settled', context => {
    console.log ('==== %s %s settled: settled message with tag %s', context.connection.options.id, context.sender.source.address, context.delivery.tag);
});


container.on ('receiver_drained', context => {
    console.log ('==== receiver_drained: ');
});
container.on ('receiver_flow', context => {
    console.log ('==== receiver_flow: ');
});
container.on ('receiver_error', context => {
    console.log ('==== receiver_error: ');
});
container.on ('receiver_close', context => {
    console.log ('==== receiver_close: ');
});

let i = 0;
container.on ('sendable', context => {
    console.log('==== %s %s Sendable', context.connection.options.id, context.sender.source.address);

    while (context.sender.sendable() && (i < 5)) {
      const tag = 'asdfghjkl__' + i + '__' 
      context.sender.send ({message_id: tag, body: {seq: i, text: 'wrqwerqwreqwerqwerqwerq'}}, tag);
      i++;
      console.log ('sent #%d (%s)', i, tag);
    }

    console.log ('sendable burst ended');
});

container.on ('accepted', context => {
    console.log ('==== %s %s accepted: accepted message with tag %s', context.connection.options.id, context.sender.source.address, context.delivery.tag);
});

container.on ('released', context => {
    console.log ('==== %s %s released: accepted message with tag %s', context.connection.options.id, context.sender.source.address, context.delivery.tag);
});

container.on ('rejected', context => {
    console.log ('==== %s %s rejected: accepted message with tag %s', context.connection.options.id, context.sender.source.address, context.delivery.tag);
});

container.on ('modified', context => {
    console.log ('==== %s %s modified: accepted message with tag %s', context.connection.options.id, context.sender.source.address, context.delivery.tag);
});

container.on ('sender_draining', context => {
    console.log ('==== sender_draining: ');
});
container.on ('sender_flow', context => {
    console.log ('==== sender_flow: ');
});
container.on ('sender_error', context => {
    console.log ('==== sender_error: ');
});
container.on ('sender_close', context => {
    console.log ('==== sender_close: ');
});


container.on ('receiver_open', context => {
    console.log ('==== receiver_open: remote target is ', context.receiver.remote.attach.target.address);
    context.receiver.set_target({address: context.receiver.remote.attach.target.address});
});


container.on ('sender_open', context => {
    console.log ('==== %s sender_open: we want attach to %s', context.connection.options.id, context.sender.remote.attach.source.address);
    console.log ('ssm',  context.sender.remote.attach.rcv_settle_mode);
});


container.on ('message', context => {
    console.log('==== %s %o Received: %o', context.connection.options.id, context.sender.source.address, context.message);

    var request = context.message;
    var reply_to = request.reply_to;
    var response = {to: reply_to};

    if (request.correlation_id) {
        response.correlation_id = request.correlation_id;
    }

    var upper = request.body.toString().toUpperCase();
});


const server = container.listen ({
    port: 5672,
    receiver_options: {
//        autoaccept: false
      },
      sender_options: {
//        autosettle: true,
//        autoaccept: true,
//        snd_settle_mode: 0
      },
});

server.once ('listening', () => {
    console.log ('now listening');
});

server.once ('error', err => {
    console.error ('listening error:', err);
});
