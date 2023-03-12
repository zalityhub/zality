const util = require('util');
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const env = nx.getEnv('chatgpt', true);
const merge = require('lodash.merge');


function LogWrite(text) {
  text = util.format.apply(this, arguments);
  process.stdout.write(text);
  return text;
}


function Log(text) {
  text = util.format.apply(this, arguments);
  console.log(text);
  return text;
}

function LogError(text) {
  text = util.format.apply(this, arguments);
  console.error(text);
  return text;
}


function BuildContext(context, apiKey) {
  // check the given context, merge default for any missing properties...

  context = context ? context : {};

  // get a list of properties
  const keys = Object.keys(env);
  const properties = [];
  for (let i = 0, ilen = keys.length; i < ilen; ++i)
    properties.push(context[keys[i]]);

// merge given properties into the defaults from env
  for (let i = 0, ilen = keys.length; i < ilen; ++i) {
    const key = keys[i];
    context[key] = {};
    merge(context[key], env[key]);
    if (properties[i])
      merge(context[key], properties[i]);
    if (context[key]._stringbuilder)
      context[key] = new nx.StringBuilder(context[key]);
  }

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

  context.config.headers.Authorization = apiKey;
  return context;
}


function FormatGptResponse(gptResponse) {
  const response = {json: gptResponse};

  // extract the response text
  let json = gptResponse;
  try {
    let text = '';
    if (json.error) {
      json = json.error;
      if (json.type && json.message)
        json = `${json.type.toString()}: ${json.message.toString()}`;
      else if (json.message)
        json = json.message.toString();
    }
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

  try {
    context = BuildContext(context, env.config.headers.Authorization);
    context.question = question;

    const protocol = require(context.config.type);  // select http or https
    const req = protocol.request(context.config, (res) => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        context.response = FormatGptResponse(JSON.parse(body));
        if (context.debug.protocol)
          Log(stringify(context.response));
        if (context.config.headers.Authorization)
          context.config.headers.Authorization = 'YOUR_API_KEY_GOES_HERE';    // mask the key...
        context.history.appendLine(context.response.text);
        cb(null, context);
      });
    });

    req.on('error', (err) => {
      LogError(err.toString());
      cb(err);
    });


// build prompt

    let hb = new nx.StringBuilder();    // none is the default
    if (context.enabled.history) { // optimize the history by selectng similar topics
      hb = context.history.selectSimilar(context.question, 0.5);
      if (hb._array.length <= 5)    // too few, revert to full history, if any
        merge(hb, context.history);
    }

    if (context.debug.history) {
      const tmp = hb.toString({pre: '  '}).trim();
      Log('\nusing history:');
      Log('  ----------------------------------------------');
      Log(`  ${tmp}`);
      Log('  ----------------------------------------------\n');
    }

    question = `${context.dialog.user}: ${question}`;
    context.history.appendLine(question);
    context.dialog.prompt = `${hb.toString().trim()}\n${question}`;

// send request data
    const reqData = stringify(context.dialog);
    if (context.debug.protocol)
      Log(reqData);
    req.write(reqData);
    req.end();
  } catch (err) {
    LogError(err.toString());
    cb(err);
  }

  return context;
}


function Ask(context, question, cb) {
  if (!cb)   // no call back
    cb = function (err, result) {
      if (err)
        return LogError(err.toString());
      Log(`${result.response.text}\n`);
    }
  return SendChatReq(context, question, cb);
}


function StartWebService(argv) {

  const express = require('express');
  const cors = require('cors');
  const Url = require('url');

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
      if (context.history)
        context.history = new nx.StringBuilder(context.history);
      Ask(context, context.question, function (err, result) {
        res.send(stringify(result));
      });
    });
  });

  app.listen(url.port, url.hostname, () => {
    Log(`Server listening on ${argv}`);
  });
}


function Hits(args, cmds) {
  function nextArg(args) {
    const arg = args.trim();
    const i = arg.indexOf(' ');   // first space
    if (i > 0)
      return arg.slice(0, i);
    return arg.trim();
  }

  let hits = [];

  args = args.trim();
  const arg = nextArg(args);
  if (!arg.length)
    return {tail: args, hits: hits, length: hits.length};

  Object.keys(cmds).forEach(function (key) {
    if (key.indexOf(arg) === 0)
      hits.push(cmds[key]);
  });

  if (hits.length === 1 && !nx.isFunction(hits[0])) {    // single hit, continue looking...
    const nhits = Hits(args.slice(arg.length + 1), hits[0]);
    hits = nhits.length ? nhits : hits;
  }

  return {tail: args.slice(arg.length + 1).trim(), hits: hits, length: hits.length};
}


function Misses(cmds, indent) {
  indent = indent ? indent : '';

  const sb = new nx.StringBuilder();
  let first;

  if (cmds.hits) {   // these are from hits...
    const hits = cmds.hits;
    for (let i = 0, ilen = hits.length; i < ilen; ++i) {
      const name = hits[i].name;
      sb.append(`\n${indent}${name}`);
      if (i === 0)
        first = name;
    }
  } else {
    const keys = Object.keys(cmds);
    for (let i = 0, ilen = keys.length; i < ilen; ++i) {
      sb.append(`\n${indent}${keys[i]}`);
      if (i === 0)
        first = keys[i];
      if (nx.isObject(cmds[keys[i]]))
        sb.append(Misses(cmds[keys[i]], indent + '  '));
    }
  }

  if (sb._array.length !== 1)
    return sb.toString();
  return `${first.toString()} `;
}


function DoCommand(ocmd, cmd, cmds) {

  const hits = Hits(cmd, cmds);

  if (!hits.length)
    return console.log(`I cannot do ${cmd}\nTry: ${Misses(cmds, '  ')}`);

  if (hits.length > 1)
    return console.log(`Try: ${Misses(hits, '  ')}`);

// possible command function
  if (nx.isFunction(hits.hits[0]))    // resolved to a command function
    return hits.hits[0](hits.tail)    // call the command

  return console.log(`Try: ${ocmd} ${Misses(hits, '  ')}`);
}


function ChatCommand(context, cmd) {
  function buildKeyList(it) {
    const sb = new nx.StringBuilder();
    const keys = Object.keys(it);
    for (let i = 0, ilen = keys.length; i < ilen; ++i)
      sb.append(`${i ? ' or' : ''} ${keys[i]}`);
    const text = sb.toString().trim();
    if (keys.length > 1)
      return '[' + text + ']';
    return text;
  }

  const cmds =
    {
      show:
        {
          history: function (opts) {
            if (!context)
              return console.log('no context');
            if (!context.history || !context.history._array.length)
              return console.log('there is no history to show');
            return console.log(`history:\n${context.history.toString('\n')}`)
          },
          enabled: function (opts) {
            if (!context)
              return console.log('no context');
            Object.keys(context.enabled).forEach(function (key) {
              const p = context.enabled[key];
              console.log(`${key} ${p ? 'enabled' : 'disabled'}`);
            });
            Object.keys(context.debug).forEach(function (key) {
              const p = context.debug[key];
              console.log(`debug ${p ? 'enabled' : 'disabled'} for ${key}`);
            });
          }
        },
      enable:
        function (opts) {
          if (!context)
            return console.log('no context');
          opts = (opts ? opts : '').toString().trim();
          if (!opts.length || context.enabled[opts] === undefined)
            return console.log(`Try: Enable ${buildKeyList(context.enabled)}`);
          if (context.enabled[opts])
            return console.log(`${opts} is not disabled`);
          context.enabledd[opts] = true;
          return console.log(`${opts} enabled`);
        },
      disable:
        function (opts) {
          if (!context)
            return console.log('no context');
          opts = (opts ? opts : '').toString().trim();
          if (!opts.length || context.enabled[opts] === undefined)
            return console.log(`Try: Disable ${buildKeyList(context.enabled)}`);
          context.enabled[opts] = false;
          return console.log(`${opts} disabled`);
        },
      debug:
        function (opts) {
          if (!context)
            return console.log('no context');
          opts = (opts ? opts : '').toString().trim();

          // const hits = Hits(opts, context.debug);

          if (!opts.length || context.debug[opts] === undefined)
            return console.log(`Try: Debug ${buildKeyList(context.debug)}`);
          context.debug[opts] = true;
          return console.log(`debug for ${opts} enabled`);
        },
      nodebug:
        function (opts) {
          if (!context)
            return console.log('no context');
          opts = (opts ? opts : '').toString().trim();
          if (!opts.length || context.debug[opts] === undefined)
            return console.log(`Try: NoDebug ${buildKeyList(context.debug)}`);
          context.debug[opts] = false;
          return console.log(`debug for ${opts} disabled`);
        },
    }

  if (!context)
    return console.log('no context');
  return DoCommand(cmd, cmd, cmds);
}


function ChatExit(context, status) {
  LogWrite('\nExiting... ');
  if (context.enabled.save.history) {
    // save current history
    Log(`Saving ${context.history._array.length} history items`);
    const current = nx.getEnv('chatgpt', true);
    current.history = {};
    merge(current.history, context.history);
    nx.putEnv('chatgpt', current);
  } else
    Log('nothing saved');
  LogWrite('\n');
  process.exit(status);
}

function QuizLoop() {

  const readline = require('readline');

  const context = BuildContext(null, env.config.headers.Authorization);
  context.history = new nx.StringBuilder();
  const rl = readline.createInterface(process.stdin, process.stdout);

  rl.on('line', (question) => {
    question = question.trim();

    if (question.length <= 0)
      ChatExit(context, 0);

    if (question.indexOf('.') === 0)
      return ChatCommand(context, question.slice(1).trim());

    Ask(context, question);
  });
}


const argv = process.argv.slice(2);

if (argv.length)
  return Ask(null, argv.join(' '));
return QuizLoop();
