const container = require('rhea');
const server = container.listen ({'port': 5672});


function match_source_address(link, address) {
    console.log ('==== match [%s] - [%s]', link, address);
    return link && link.local && link.local.attach && link.local.attach.source
        && link.local.attach.source.value[0].toString() === address;
}


container.on ('connection_open', context => {
    console.log ('==== connection_open: ');
});
container.on ('connection_close', context => {
    console.log ('==== connection_close: ');
});
container.on ('connection_error', context => {
    console.log ('==== connection_error: ');
});

container.on ('session_open', context => {
    console.log ('==== session_open: ');
});
container.on ('session_close', context => {
    console.log ('==== session_close: ');
});
container.on ('session_error', context => {
    console.log ('==== session_error: ');
});

container.on ('protocol_error', context => {
    console.log ('==== protocol_error: ');
});
container.on ('error', context => {
    console.log ('==== error: ');
});
container.on ('disconnected', context => {
    console.log ('==== disconnected: ');
});
container.on ('settled', context => {
    console.log ('==== settled: ');
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

container.on ('sendable', context => {
    console.log ('==== sendable: ');
});
container.on ('accepted', context => {
    console.log ('==== accepted: ');
});
container.on ('released', context => {
    console.log ('==== released: ');
});
container.on ('rejected', context => {
    console.log ('==== rejected: ');
});
container.on ('modified', context => {
    console.log ('==== modified: ');
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
    console.log ('==== sender_open: we want attach to ', context.sender.remote.attach.source.address);
    if (context.sender.source.dynamic) {
        var id = container.generate_uuid();
        context.sender.set_source({address:id});
    }
});


container.on ('message', context => {
    console.log('==== Received: ', context.message);

    var request = context.message;
    var reply_to = request.reply_to;
    var response = {to: reply_to};

    if (request.correlation_id) {
        response.correlation_id = request.correlation_id;
    }

    var upper = request.body.toString().toUpperCase();
    response.body = upper;

    var o = context.connection.find_sender (s => match_source_address (s, reply_to));
    if (o) {
        o.send(response);
    }
});
