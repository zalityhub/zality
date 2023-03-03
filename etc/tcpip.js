const net = require('net');
const argv = process.argv.slice(2).join(' ');

let port = 8080;
if (argv.length > 0)
  port = argv.pop();

const server = net.createServer(function (client) {

  function log(desc, data) {
    data = data ? data.toString() : '';
    console.log(`${desc.toString()}: ${data}`);
  }

// events
  client.on('connection', function (data) {

    log(`server.connection`, data);

    const proxy = new net.Socket();
    proxy.connect(8080, '127.0.0.1', function () {
      log(`proxy.connection`, 'Connected');
    });

    proxy.on('close', function (data) {
      log(`proxy.close`, data);
    })

    proxy.on('error', function (data) {
      log(`proxy.error`, data);
    })

    proxy.on('listening', function (data) {
      log(`proxy.listening`, data);
    })

    proxy.on('drop', function (data) {
      log(`proxy.drop`, data);
    })

    proxy.on('close', function (data) {
      log(`proxy.close`, data);
    })

    proxy.on('connect', function (data) {
      log(`proxy.connect`, data);
    })

    proxy.on('data', function (data) {
      log(`proxy.data`, data);
    })

    proxy.on('drain', function (data) {
      log(`proxy.drain`, data);
    })

    proxy.on('end', function (data) {
      log(`proxy.end`, data);
    })

    proxy.on('error', function (data) {
      log(`proxy.error`, data);
    })

    proxy.on('lookup', function (data) {
      log(`proxy.lookup`, data);
    })

    proxy.on('ready', function (data) {
      log(`proxy.ready`, data);
    })

    proxy.on('timeout', function (data) {
      log(`proxy.timeout`, data);
    })
  })

  client.on('close', function (data) {
    log(`server.close`, data);
  })

  client.on('error', function (data) {
    log(`server.error`, data);
  })

  client.on('listening', function (data) {
    log(`server.listening`, data);
  })

  client.on('drop', function (data) {
    log(`server.drop`, data);
  })

  client.on('close', function (data) {
    log(`server.close`, data);
  })

  client.on('connect', function (data) {
    log(`server.connect`, data);
  })

  client.on('data', function (data) {
    log(`server.data`, data);
  })

  client.on('drain', function (data) {
    log(`server.drain`, data);
  })

  client.on('end', function (data) {
    log(`server.end`, data);
  })

  client.on('error', function (data) {
    log(`server.error`, data);
  })

  client.on('lookup', function (data) {
    log(`server.lookup`, data);
  })

  client.on('ready', function (data) {
    log(`server.ready`, data);
  })

  client.on('timeout', function (data) {
    log(`server.timeout`, data);
  })
})

server.listen(port, function () {
  console.log('server listening on port http://localhost:8080');
})
