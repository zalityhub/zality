const express = require('express');
const stringify = require('json-stringify-safe');
const Url = require('url');
const nx = require('@zality/nodejs/util');

const app = express();
const https = require('https');
const http = require('http');

const env = nx.getEnv('chatgpt', true);

const targetUrl = env.proxy.targetUrl;
const proxyServerUrl = env.proxy.proxyServerUrl;

if (targetUrl === undefined || proxyServerUrl === undefined) {
  console.error('Cannot continue without targetUrl and proxyServerUrl');
  process.exit(1);
}


app.use('/', function (clientRequest, clientResponse) {
  function proxyReq(postBody) {
    console.log(`req: ${postBody}`);
    const serverRequest = protocol.request(options, function (serverResponse) {
      let body = '';
      if (true) { // String(serverResponse.headers['content-type']).indexOf('text/html') !== -1) {
        serverResponse.on('data', function (chunk) {
          body += chunk;
        });

        serverResponse.on('end', function () {
          console.log(`rsp: ${body}`);
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

const url = Url.parse(env.proxy.proxyServerUrl);
app.listen(url.port, url.hostname);
console.log(`Proxy server listening on port ${url.hostname}:${url.port} for ${targetUrl}`);
