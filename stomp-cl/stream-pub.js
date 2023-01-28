var stompit = require('stompit');

var count = 0;

function send_item (client) {
  if (count > 10) {
    client.disconnect();
    return;
  }

//  setTimeout (function () {
  setImmediate (() => {
    var sendHeaders = {
      'destination': '/q/streams/stomp_test_or_else',
      'content-type': 'application/json',
//      'x-delta-t': '13000'
      'x-ks-groups': 'q,w,e,r'
    };

    var body = {n: count, a:1, b:'yyyy', now: new Date()}
    var frame = client.send(sendHeaders);
    frame.write(JSON.stringify (body));
    frame.end();

//    console.log (new Date() + ': sent message:' + JSON.stringify (body));
    count++;
    send_item (client);
  });
//  }, 40);
}


var connectOptions = {
  'host': 'localhost',
  'port': 61613,
  'connectHeaders':{
    'host': '/',
    'login': 'username',
    'passcode': 'password',
    'heart-beat': '5000,5000'
  }
};

stompit.connect(connectOptions, function(error, client) {
  if (error) {
    console.log('connect error ' + error.message);
    return;
  }

  send_item (client);
});

