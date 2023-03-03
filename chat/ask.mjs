import {ChatGPTAPI} from 'chatgpt';
import * as fs from 'fs';
import * as readline from 'readline';


function parseJsonFile(file) {
  try {
    const text = fs.readFileSync(file).toString();
    return JSON.parse(text);
  } catch (e) {
    console.error(e.toString());
    return null;
  }
}


const env = parseJsonFile('c:/cygwin64/home/hbray/etc/env.json');
const api = new ChatGPTAPI({
  apiKey: env.chatgpt.OPENAI_API_KEY,
  completionParams: {
    temperature: 0.5,
    top_p: 0.8
  }
})

function Ask(question) {
  if (question.length > 0) {
    const res = api.sendMessage(question, {
      timeout: 2 * 60 * 1000
      // onProgress: (partialResponse) => console.log(partialResponse.text)
    }).then(
      console.log(res.text)
    )
  }
}

const question = process.argv.slice(2).join(' ');
if (question.length > 0) {
  Ask(question);
} else {
  readline.createInterface(process.stdin, process.stdout).on('line', (question) => {
    Ask(question);
  });
}
