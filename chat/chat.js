const fs = require('fs');
const readline = require('readline');
const stringify = require('json-stringify-safe');


const nx = require('@zality/nodejs/util');

const env = nx.getEnv('chatgpt', true);


function Ask(question, dialog, config) {
  const https = require('https');

  const _config = {
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

  const req = https.request(config, (res) => {
    res.setEncoding('utf8');
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      const response = JSON.parse(body);
      // console.log(stringify(response));
      if (nx.isNull(response) || nx.isNull(response.choices)
        || response.choices.length <= 0 || nx.isNull(response.choices[0].text))
        return console.error(`${stringify(body, null, 4)} is an unexpected response`);
      let text = response.choices[0].text.toString();
      // text = text.replaceAll('\\n', '');
      console.log(`${text}\n`);
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


const question = process.argv.slice(2).join(' ');
if (question.length > 0) {
  Ask(question, env.dialog, env.config);
} else {
  readline.createInterface(process.stdin, process.stdout).on('line', (question) => {
    if( question.length <= 0 )
      process.exit(0);
    Ask(question, env.dialog, env.config);
  });
}
