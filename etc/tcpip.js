// Create a TCP/IP server
const net = require('net');

const server = net.createServer(function (c) {
  // 'connection' listener
  console.log('client connected');

  function log(title, data) {
    data = data ? data.toString() : '';
    console.log(`${title}: ${data}`);
  }

  c.on('close', function (data) {
    log('close', data);
  })

  c.on('connection', function (data) {
    log('connection', data);
  })

  c.on('error', function (data) {
    log('error', data);
  })

  c.on('listening', function (data) {
    log('listening', data);
  })

  c.on('drop', function (data) {
    log('drop', data);
  })

  c.on('close', function (data) {
    log('close', data);
  })

  c.on('connect', function (data) {
    log('connect', data);
  })

  c.on('data', function (data) {
    log('data', data);
  })

  c.on('drain', function (data) {
    log('drain', data);
  })

  c.on('end', function (data) {
    log('end', data);
  })

  c.on('error', function (data) {
    log('error', data);
  })

  c.on('lookup', function (data) {
    log('lookup', data);
  })

  c.on('ready', function (data) {
    log('ready', data);
  })

  c.on('timeout', function (data) {
    log('timeout', data);
  })
})


server.listen(8000, function () {
  console.log('server listening on port http://localhost:8000');
})

