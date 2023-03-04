const express = require('express');
const stringify = require('json-stringify-safe');
const nx = require('@zality/nodejs/util');

const app = express();
const https = require('https');
const http = require('http');

const env = nx.getEnv('proxy', true);

const targetUrl = process.env.TARGET_URL || env.targetUrl;
const proxyServerPort = process.env.PROXY_SERVER_PORT || env.proxyServerPort;

if (targetUrl === undefined || proxyServerPort === undefined) {
  console.error('Cannot continue without targetUrl and proxyServerPort');
  process.exit(1);
}


app.use('/', function (clientRequest, clientResponse) {
  function proxyReq(postBody) {
    const serverRequest = protocol.request(options, function (serverResponse) {
      let body = '';
      if (String(serverResponse.headers['content-type']).indexOf('text/html') !== -1) {
        serverResponse.on('data', function (chunk) {
          body += chunk;
        });

        serverResponse.on('end', function () {
          clientResponse.writeHead(serverResponse.statusCode, serverResponse.headers);
          clientResponse.end(body);
        });
      } else {
        serverResponse.pipe(clientResponse, {
          end: true,
        });
        clientResponse.contentType(serverResponse.headers['content-type']);
      }
    });

    serverRequest.write(postBody);
    serverRequest.end();
  }

  const parsedHost = targetUrl.split('/').splice(2).splice(0, 1).join('/');
  let parsedPort;
  let protocol;
  if (targetUrl.startsWith('https://')) {
    parsedPort = 443;
    protocol = https;
  } else if (targetUrl.startsWith('http://')) {
    parsedPort = 80;
    protocol = http;
  }

  const options = {
    hostname: parsedHost,
    port: parsedPort,
    path: clientRequest.url,
    method: clientRequest.method
  };

//copy and update the client headers
  options.headers = clientRequest.headers;
  options.headers.host = parsedHost;

  let body = '';
  clientRequest.on('data', (chunk) => {
    body += chunk;
  });
  clientRequest.on('end', () => {
    proxyReq(body);
  });
});

app.listen(proxyServerPort);
console.log(`Proxy server listening on port ${proxyServerPort} for ${targetUrl}`);
