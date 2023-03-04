const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const env = nx.getEnv('chatgpt', true);

const {Configuration, OpenAIApi} = require("openai");

const configuration = new Configuration({
  apiKey: env.openai_api_key
});
const openai = new OpenAIApi(configuration);

// Set up the server
const app = express();
app.use(bodyParser.json());
app.use(cors())

// Set up the ChatGPT endpoint
app.post("/chat", async (req, res) => {

  // Get the prompt from the request
  let body ='';
  req.on('data', function (chunk) {
    body += chunk;
  });
  req.on('end', async function () {
    try {
      // Generate a response with ChatGPT
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: body,
        temperature: 0,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["\"\"\""],
      });

      const ans = `\n${completion.data.choices[0].text}\n`;
      console.log(ans);
      res.send(ans);
    } catch (err) {
      console.error(err.message);
    }
  });
});

// Start the server
const port = env.proxy.proxyServerPort;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
