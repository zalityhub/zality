const fs = require('fs');
const readline = require('readline');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Url = require('url');
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const env = nx.getEnv('chatgpt', true);


function Chat(question, dialog, config, cb) {

  let response = '';
  cb = cb ? cb : function () {
  };

  try {
    const _config = {
      type: 'https',
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/completions',
      method: 'POST',
      headers: {
        "Accept": 'application/json',
        "Content-Type": 'application/json',
        "Authorization": 'Bearer YOUR_API_KEY_HERE'
      }
    }

    config = config ? config : {};
    config = {..._config, ...config};

    const _dialog = {
      model: "text-davinci-003",
      temperature: 0,
      max_tokens: 1000,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: ["\"\"\""]
    };

    dialog = dialog ? dialog : {};
    dialog = {..._dialog, ...dialog};
    dialog.prompt = question;

    const protocol = require(config.type);
    const req = protocol.request(config, (res) => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          response = JSON.parse(body);
          response = response.choices[0].text.toString();
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


function Ask(question) {
  Chat(question, env.dialog, env.protocol_config, function (err, response) {
    console.log(`${response}\n`);
  });
}


function Web(argv) {

// "http://localhost:8080/chat"

  argv = argv.join('');
  if (argv.length <= 0)
    argv = env.proxy.proxyServerUrl;

  const url = Url.parse(argv);

  const app = express();
  app.use(bodyParser.json());
  app.use(cors())
  app.get(`${url.path}*`, (req, res) => {
    try {
      let query = req.url.slice(url.path.length);
      if(query.charAt(0) === '?' || query.charAt(0) === '&' ) {
        query = query.slice(Math.max(1,query.indexOf('=')+1));
      }
      console.log(`${query}\n`);
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


const argv = process.argv.slice(2);
if (argv.length) {
  if (argv[0] === '-w')
    Web(argv.slice(1));
  else
    Ask(argv.join(' ').toString());
} else {
  readline.createInterface(process.stdin, process.stdout).on('line', (question) => {
    if (question.length <= 0)
      process.exit(0);
    Ask(question);
  });
}
