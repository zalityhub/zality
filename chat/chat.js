const fs = require('fs');
const readline = require('readline');
const express = require('express');
const cors = require('cors');
const Url = require('url');
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const env = nx.getEnv('chatgpt', true);


function cleanText(text) {
  return decodeURIComponent(text.toString()).toString().trim();
}


function ParseGptPayload(payload) {
  payload = payload ? payload : '';

  const result = {text: payload, json: {raw: payload}};
  try {
    if (payload.constructor === Object) {  // the Result is an object
      result.json.obj = payload;
      result.text = result.json.raw = stringify(payload);
    } else { // otherwise, try to parse as json string
      result.json.obj = JSON.parse(payload);
    }
  } catch (err) {
    result.json.error = err.toString();
    console.error(result.json.error);
    result.text = payload;
    result.json.obj = result.json.raw = stringify(payload);
  }

  return result;
}

function MakeGptResponse(gptResponse) {
  gptResponse = gptResponse ? gptResponse : '';

  const result = ParseGptPayload(gptResponse);

  // rebuild the response text
  let json = result.json.obj;
  try {
    let text = '';
    if (json.error)
      json = json.error;
    if (json.message)
      json = json.message.toString();
    if (json.choices)
      json = json.choices;
    if (nx.isArray(json)) {
      for (let i = 0, ilen = json.length; i < ilen; ++i)
        if (json[i].text)
          text += `${cleanText(json[i].text)}\n`;
    } else
      text = json.toString();
    result.text = cleanText(text.toString());
  } catch (err) {
    result.text = cleanText(stringify(gptResponse));
  }

  return result;
}


function MakeChatReq(question, dialog, config, cb) {

  cb = cb ? cb : function () {
  };

  dialog = dialog ? dialog : {};
  config = config ? config : {};

// convert question into a query object

  let query = {};
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

  const _config = {
    type: 'https',
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/completions',
    method: 'POST',
    debug: false,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY_HERE'
    }
  }
  config = {..._config, ...config};

  const gptRequest = ParseGptPayload(dialog);

  if (config.debug)
    console.log(`request: ${gptRequest.text}`);

  try {
    const protocol = require(config.type);
    const req = protocol.request(config, (res) => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const gptResponse = MakeGptResponse(body);
        if (config.debug)
          console.log(`response: ${stringify(gptResponse.json.obj)}`);
        cb(null, {request: gptRequest, response: gptResponse});
      });
    });

    req.on('error', (err) => {
      console.error(err.toString());
      cb(err);
    });

// write data to request body
    req.write(gptRequest.text);
    req.end();
  } catch (err) {
    console.error(err.toString());
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
      MakeChatReq(query, env.dialog, env.protocol_config, function (err, result) {
        res.send(result.response.text);
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
      MakeChatReq(query, env.dialog, env.protocol_config, function (err, result) {
        res.send(result.response.text);
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

  MakeChatReq(question, env.dialog, env.protocol_config, function (err, result) {
    if (err)
      return cb(err);
    cb(null, result);
  });
}


function quizLoop() {

  const rl = readline.createInterface(process.stdin, process.stdout);
  rl.on('line', (question) => {
    if (question.length <= 0)
      process.exit(0);

    const query = {prompt: question};
    Ask(query, function (err, result) {
      if (err)
        return console.error(err.toString());
      result = MakeGptRequest(result);
      console.log(`${result.response.text}\n`);
    });
  });
}


let argv = process.argv.slice(2);

if (argv.length) {
  while (argv.length) {
    switch (argv[0]) {
      default:
        return Ask(argv.join(' '), function (err, result) {
          if (err)
            return console.error(err.toString());
          console.log(`${result.response.text}\n`);
        });
        break;
      case '-d':
        env.protocol_config.debug = true;
        break;
      case '-l':
        return quizLoop(argv.slice(1));
        break;
      case '-w':
        return StartWebService(argv.slice(1));
        break;
    }
    argv = argv.slice(1);   // next arg
  }
} else {
  return quizLoop();
}
