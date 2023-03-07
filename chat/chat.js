const fs = require('fs');
const readline = require('readline');
const express = require('express');
const cors = require('cors');
const Url = require('url');
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const env = nx.getEnv('chatgpt', true);


function cleanText(text) {
  return decodeURIComponent(text).trim();
}

function Chat(question, dialog, config, cb) {

  cb = cb ? cb : function () {  };

// convert question into an object

  let query = {};
  dialog = dialog ? dialog : {};

  try {

    if (question.charAt(0) === '{')
      query = JSON.parse(question);
    else
      query = {prompt: question};

    if (nx.isString(query.temperature))
      query.temperature = parseFloat(query.temperature);
    if (nx.isString(query.max_tokens))
      query.max_tokens = parseInt(query.max_tokens);
    if (nx.isString(query.top_p))
      query.top_p = parseFloat(query.top_p);
    if (nx.isString(query.frequency_penalty))
      query.frequency_penalty = parseFloat(query.frequency_penalty);
    if (nx.isString(query.presence_penalty))
      query.presence_penalty = parseFloat(query.presence_penalty);
  } catch (err) {
    query = {prompt: question};
  }

  const _dialog = {   // default values
    model: 'text-davinci-003',
    n: 5,
    temperature: 0,
    max_tokens: 1000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: ['"""']
  };

  dialog = {..._dialog, ...dialog};
  dialog = {...dialog, ...query};

  try {
    const _config = {
      type: 'https',
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/completions',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY_HERE'
      }
    }

    config = config ? config : {};
    config = {..._config, ...config};

    const protocol = require(config.type);
    const req = protocol.request(config, (res) => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          let response = json;
          if (response.error)
            response = response.error;
          if (response.message)
            response = response.message.toString();
          if (response.choices)
            response = response.choices;
          if (nx.isArray(response) && response.length && response[0].text)
            response = response[0].text;
          response = response.toString();
          cb(null, response);
        } catch (err) {
          cb(null, body);
        }
      });
    });

    req.on('error', (err) => {
      cb(err);
    });

// write data to request body
    req.write(JSON.stringify(dialog));
    req.end();
  } catch (err) {
    cb(err);
  }
}


function Ask(question, url) {
  if (url && url.length > 0) {
    const http = require('http');
    if (url.indexOf('http') !== 0)
      url = `http://${url}`
    http.get(`${url}/?${question}`, res => {
      let response = ''

      res.on('data', chunk => {
        response += chunk
      })

      res.on('end', () => {
        console.log(`${response}\n`);
      })
    })
    return;
  }

  Chat(question, env.dialog, env.protocol_config, function (err, response) {
    console.log(`${response}\n`);
  });
}


function StartWebService(argv) {

// 'http://localhost:8080/chat'

  argv = argv.join('');
  if (argv.length <= 0)
    argv = env.proxy.proxyServerUrl;

  const url = Url.parse(argv);

  const app = express();
  app.use(express.json());
  app.use(cors())
  app.get(`${url.path}*`, (req, res) => {

    try {
      let query = req.url.slice(url.path.length);
      if (query.charAt(0) === '?' || query.charAt(0) === '&') {
        query = query.slice(Math.max(1, query.indexOf('=') + 1));
      }
      console.log(`${cleanText(query)}\n`);
      Chat(query, env.dialog, env.protocol_config, function (err, response) {
        console.log(`${response}\n`);
        res.send(response);
      });
    } catch (err) {
      res.end('Internal error');
    }
  });

  app.post(`${url.path}*`, (req, res) => {
    // Get the prompt from the request
    let query = '';
    req.on('data', function (chunk) {
      query += chunk;
    });

    req.on('end', function () {
      console.log(`${query}\n`);
      Chat(query, env.dialog, env.protocol_config, function (err, response) {
        console.log(`${response}\n`);
        res.send(response);
      });
    });
  });

  app.listen(url.port, url.hostname, () => {
    console.log(`Server listening on ${argv}`);
  });
}


function quizLoop(url) {
  if (!url)
    url = [];
  url = url.join('').toString();
  readline.createInterface(process.stdin, process.stdout).on('line', (question) => {
    if (question.length <= 0)
      process.exit(0);
    Ask(question, url);
  });
}


const argv = process.argv.slice(2);

if (argv.length) {
  switch (argv[0]) {
    default:
      Ask(argv.join(' ').toString());
      break;
    case '-w':
      StartWebService(argv.slice(1));
      break;
    case '-s':
      quizLoop(argv.slice(1));
      break;
  }
} else {
  quizLoop();
}
