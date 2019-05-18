var stompit = require('stompit');


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
  
  var subscribeHeaders = {
    destination: '/safebuckets/stomp_test_or_else',
    'x-parallel': 7,
    'x-wsize': 3,
    ack: 'client-individual'
//    ack: 'auto'
  };
  
  client.subscribe(subscribeHeaders, function(error, message) {
    if (error) {
      console.log('subscribe error ' + error.message);
      return;
    }
    
    message.readString('utf-8', function(error, body) {
      if (error) {
        console.log('read message error ' + error.message);
        return;
      }
      
//      console.log(new Date() + ': received message:' + body);
      client.ack(message);

//      client.nack(message);
//      client.disconnect();
    });
  });
});
