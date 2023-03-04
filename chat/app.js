require('dotenv').config()

const {Configuration, OpenAIApi} = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function query(ask) {
  if( ! ask )
    return;
  const req = {
        model: "text-davinci-003",
        prompt: ask,
        temperature: 0,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["\"\"\""]
  };

  const completion = await openai.createCompletion(req);
  for(;completion.data.choices.length > 0;) {
    let a = completion.data.choices.pop();
    if (a !== null && a.constructor === Object && a['text'] )
      a = a.text;
    console.log(a.toString());
  }
}

const q = process.argv.slice(2).join(' ');
if (q.length > 0) {
  query(q);
}else {
  query('how are you today?');
}
