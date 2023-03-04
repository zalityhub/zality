const fs = require('fs');
const readline = require('readline');
const stringify = require('json-stringify-safe');


const nx = require('@zality/nodejs/util');

const env = nx.getEnv('chatgpt', true);


function Ask(question, dialog, config) {
  const _config = {
    type:     'http',
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

  if ( nx.isNull(config) )
    config = {};
  config = {..._config, ...config};

  const http = require(config.type);
  const req = http.request(config, (res) => {
    res.setEncoding('utf8');
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      let response;
      try {
        response = JSON.parse(body);
        if (nx.isNull(response) || nx.isNull(response.choices)
          || response.choices.length <= 0 || nx.isNull(response.choices[0].text))
          response = `${stringify(body, null, 4)} is an unexpected response`;
        else
          response = response.choices[0].text.toString();
      } catch (err)
      {
        response = body;
      }

      console.log(`${response}\n`);
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

// write data to request body
  const _dialog = {
    model: "text-davinci-003",
    temperature: 0,
    max_tokens: 1000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: ["\"\"\""]
  };

  if ( nx.isNull(dialog) )
    dialog = {};
  dialog = {..._dialog, ...dialog};
  dialog.prompt = question;
  req.write(JSON.stringify(dialog));
  req.end();
}


const question = process.argv.slice(2).join(' ').toString();
if (question.length > 0) {
  Ask(question, env.dialog, env.protocol_config);
} else {
  readline.createInterface(process.stdin, process.stdout).on('line', (question) => {
    if( question.length <= 0 )
      process.exit(0);
    Ask(question, env.dialog, env.protocol_config);
  });
}
