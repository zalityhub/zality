const express = require('express');
const readline = require('readline');
const cors = require('cors');
const Url = require('url');
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const env = nx.getEnv('chatgpt', true);


function GetGptText(gptResponse) {
  const response = {json: gptResponse};

  // extract the response text
  let json = gptResponse;
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
          text += `${json[i].text}\n`;
    } else
      text = json.toString();
    response.text = text.toString().trim();
  } catch (err) {
    response.text = stringify(gptResponse);
  }

  return response;
}


function SendChatReq(context, question, cb) {

  cb = cb ? cb : function () {
  };

  question = (!question) ? '' : question.toString().trim();
  if (!question.length) {
    cb(new Error('no question given'));
    return context;
  }
  context = context ? context : {};
  context.question = question;

  try {
// build config (merge passed value)
    context.config = context.config ? context.config : {};
    context.config = {
      ...{   // default values
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
      }, ...context.config
    };

// build dialog (merge passed value)
    context.dialog = context.dialog ? context.dialog : {};
    context.dialog = {
      ...{   // default values
        model: 'text-davinci-003',
        user: 'You',
        temperature: 0,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: [`"""`]
      }, ...context.dialog
    };

// convert any strings to numerics...
    if (nx.isString(context.dialog.temperature))
      context.dialog.temperature = parseFloat(context.dialog.temperature);
    if (nx.isString(context.dialog.max_tokens))
      context.dialog.max_tokens = parseInt(context.dialog.max_tokens);
    if (nx.isString(context.dialog.top_p))
      context.dialog.top_p = parseFloat(context.dialog.top_p);
    if (nx.isString(context.dialog.frequency_penalty))
      context.dialog.frequency_penalty = parseFloat(context.dialog.frequency_penalty);
    if (nx.isString(context.dialog.presence_penalty))
      context.dialog.presence_penalty = parseFloat(context.dialog.presence_penalty);

    const protocol = require(context.config.type);
    const req = protocol.request(context.config, (res) => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        context.response = GetGptText(JSON.parse(body));
        if (context.debug)
          console.log(stringify(context.response));
        context.config.headers.Authorization = 'YOUR_API_KEY_GOES_HERE';
        context.history.appendLine(context.response.text);
        cb(null, context);
      });
    });

    req.on('error', (err) => {
      console.error(err.toString());
      cb(err);
    });


// build prompt
    if (!context.history)
      context.history = new nx.StringBuilder();

// optimize the history, select similar topics
    let hb = context.history.selectSimilar(context.question, 0.5);
    if (hb.length() <= 0)
      hb = context.history;

    question = `${context.dialog.user}: ${question}`;
    context.history.appendLine(question);
    context.dialog.prompt = `${hb.toString().trim()}\n${question}`;

// send request data
    const reqData = stringify(context.dialog);
    if (context.debug)
      console.log(reqData);
    req.write(reqData);
    req.end();
  } catch (err) {
    console.error(err.toString());
    cb(err);
  }

  return context;
}


function Ask(context, question, cb) {
  if (!context)
    context = {};
  if (!context.config)
    context.config = {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    };

  context.config.headers.Authorization = `Bearer ${env.openai_api_key}`;
  return SendChatReq(context, question, cb);
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
      let question = req.url.slice(url.path.length);
      if (question.charAt(0) === '?' || question.charAt(0) === '&')
        question = question.slice(Math.max(1, question.indexOf('=') + 1));

      Ask(null, question, function (err, result) {
        res.send(result.response.text);
      });
    } catch (err) {
      res.end('Internal error');
    }
  });

  app.post(`${url.path}*`, (req, res) => {
    // Get the prompt from the request
    let body = '';
    req.on('data', function (chunk) {
      body += chunk;
    });

    req.on('end', function () {
      let context = {};
      if (body.length) 
        context = JSON.parse(body);
      if(context.history)
        context.history = new nx.StringBuilder(context.history);
      Ask(context, context.question, function (err, result) {
        res.send(stringify(result));
      });
    });
  });

  app.listen(url.port, url.hostname, () => {
    console.log(`Server listening on ${argv}`);
  });
}


function QuizLoop() {

  let context;
  const rl = readline.createInterface(process.stdin, process.stdout);

  rl.on('line', (question) => {
    if (question.length <= 0)
      process.exit(0);

    context = Ask(context, question, function (err, result) {
      if (err)
        return console.error(err.toString());
      console.log(`${result.response.text}\n`);
      context = result;
    });
  });
}


let argv = process.argv.slice(2);

if (argv.length) {
  while (argv.length) {
    switch (argv[0]) {
      default:
        return Ask(null, argv.join(' '), function (err, result) {
          if (err)
            return console.error(err.toString());
          console.log(`${result.response.text}\n`);
        });
        break;
      case '-d':
        env.protocol_config.debug = true;
        break;
      case '-q':
        return QuizLoop(argv.slice(1));
        break;
      case '-w':
        return StartWebService(argv.slice(1));
        break;
    }
    argv = argv.slice(1);   // next arg
  }
} else {
  return QuizLoop();
}
