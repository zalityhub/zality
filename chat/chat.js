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


function GptText(gptResponse) {
  const result = {};

  try {
    result.gpt = JSON.parse(gptResponse);
  } catch (err) {
    result.gpt = gptResponse;
    result.text = stringify(gptResponse);
    return result;
  }

  try {
    let response = result.gpt;
    if (response.error)
      response = response.error;
    if (response.message)
      response = response.message.toString();
    if (response.choices)
      response = response.choices;
    if (nx.isArray(response)) {
      let text = '';
      for (let i = 0, ilen = response.length; i < ilen; ++i)
        if (response[i].text)
          text += response[i].text;
      response = text;
    }
    result.text = response.toString();
    return result;
  } catch (err) {
    result.text = stringify(gptResponse);
    return result;
  }
}

function SendChatReq(question, dialog, config, cb) {

  cb = cb ? cb : function () {
  };

// convert question into an object

  let query = {};
  dialog = dialog ? dialog : {};

  try {
    if (question.constructor === Object)
      query = question;
    else if (question.charAt(0) === '{')
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
        cb(null, body);
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


function StartWebService(argv) {

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
      SendChatReq(query, env.dialog, env.protocol_config, function (err, response) {
        console.log(`${GptText(response).text}\n`);
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
      SendChatReq(query, env.dialog, env.protocol_config, function (err, response) {
        console.log(`${GptText(response).text}\n`);
        res.send(response);
      });
    });
  });

  app.listen(url.port, url.hostname, () => {
    console.log(`Server listening on ${argv}`);
  });
}


function Ask(question, cb) {
  cb = cb ? cb : function () {
  };

  SendChatReq(question, env.dialog, env.protocol_config, function (err, response) {
    if (err)
      return cb(err);

    cb(null, response);
  });
}


function quizLoop() {
  let parentMessageId;

  const rl = readline.createInterface(process.stdin, process.stdout);
  rl.on('line', (question) => {
    if (question.length <= 0)
      process.exit(0);

    const query = {prompt: question};
    if (parentMessageId)
      query.parent_message_id = parentMessageId;
    Ask(query, function (err, response) {
      if (err)
        return console.error(err.toString());
      response = GptText(response);
      parentMessageId = response.gpt.id;
      console.log(`${response.text}\n`);
    });
  });
}


const argv = process.argv.slice(2);

if (argv.length) {
  switch (argv[0]) {
    default:
      Ask(question, function (err, response) {
        if (err)
          return console.error(err.toString());
        console.log(`${GptText(response).text}\n`);
      });
      break;
    case '-s':
      quizLoop(argv.slice(1));
      break;
    case '-w':
      StartWebService(argv.slice(1));
      break;
  }
} else {
  quizLoop();
}
