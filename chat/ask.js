const fs = require('fs');
const readline = require('readline');
const stringify = require('json-stringify-safe');


const nx = require('@zality/nodejs/util');

const env = nx.getEnv(null, 'chatgpt', true);


function Ask(question) {
  const https = require('https');

  const url = 'https://api.openai.com/v1/completions';

  const postData = {
    model: "text-davinci-003",
    prompt: 'hi',
    temperature: 0,
    max_tokens: 1000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: ["\"\"\""]
  };

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/completions',
    method: 'POST',
    headers: {
      "Accept": 'application/json',
      "Content-Type": 'application/json',
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      const response = JSON.parse(body);
      console.log(stringify(response));
      if (nx.isNull(response) || nx.isNull(response.choices)
        || response.choices.length <= 0 || nx.isNull(response.choices[0].text))
        return console.error(`${stringify(body, null, 4)} is an unexpected response`);
      let text = stringify(response.choices[0].text).toString();
      text = text.replaceAll('\\n', '');
      console.log(text);
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

// write data to request body
  postData.prompt = question;
  req.write(JSON.stringify(postData));
  req.end();
}


const question = process.argv.slice(2).join(' ');
if (question.length > 0) {
  Ask(question);
} else {
  readline.createInterface(process.stdin, process.stdout).on('line', (question) => {
    if( question.length <= 0 )
      process.exit(0);
    Ask(question);
  });
}
