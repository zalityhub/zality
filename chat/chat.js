const fs = require('fs');
const util = require('util');
const stringify = require('json-stringify-safe');

const nx = require('@zality/nodejs/util');
const Config = nx.getEnv('chatgpt', true);
const ChatConfig = Config.chat;
const merge = require('lodash.merge');


function LogWrite(text) {
  text = util.format.apply(this, arguments);
  fs.writeSync(1, text);
  return text;
}

function Log(text) {
  return LogWrite(text + '\n');
}

function LogError(text) {
  text = util.format.apply(this, arguments);
  console.error(text);
  return text;
}

function ElementString(name, el, indent) {
  indent = indent ? indent : '';
  const sb = new nx.StringBuilder();

  if (nx.isObject(el)) {
    sb.appendLine(indent + name + ' {');
    const keys = Object.keys(el);
    for (let i = 0, ilen = keys.length; i < ilen; ++i) {
      const key = keys[i];
      const text = ElementString(key, el[key], indent + '  ');
      sb.append(text);
    }
    sb.appendLine(indent + '}');
    return sb.toString();
  } else if (nx.isArray(el)) {
    sb.appendLine(indent + name + ' [');
    for (let i = 0, ilen = el.length; i < ilen; ++i) {
      const key = i.toString();
      const text = ElementString(key, el[i], indent + '  ');
      sb.append(text);
    }
    sb.appendLine(indent + ']');
    return sb.toString();
  } else if (el._stringbuilder) {
    const text = ElementString(name, el._array, indent);
    sb.append(text);
    return sb.toString();
  }
  const typ = typeof el;
  sb.appendLine(`${indent + name}(${typ}): "${el.toString()}"`);
  return sb.toString();
}


function BuildContext(context, apiKey) {
  // check the given context, merge default for any missing properties...

  context = context ? context : {};

  // get a list of properties
  const keys = Object.keys(ChatConfig);
  const properties = [];
  for (let i = 0, ilen = keys.length; i < ilen; ++i)
    properties.push(context[keys[i]]);

// merge given properties into the defaults from ChatConfig
  for (let i = 0, ilen = keys.length; i < ilen; ++i) {
    const key = keys[i];
    context[key] = {};
    merge(context[key], ChatConfig[key]);
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

  if (context.debug.context)
    Log(ElementString('context', context));
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

  cb = cb ? cb : function () { };

  question = (!question) ? '' : question.toString().trim();
  if (!question.length) {
    cb(new Error('no question given'));
    return context;
  }

  try {
    context = BuildContext(context, ChatConfig.config.headers.Authorization);
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
        if (context.enabled.usage)
          Log(stringify(context.response.json.usage));
        if (context.config.headers.Authorization)
          context.config.headers.Authorization = 'YOUR_API_KEY_GOES_HERE';    // mask the key...
        context.history.appendLine(context.response.text);
        if (context.debug.dialog)
          Log(context.response.text);
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
    if (context.debug.dialog)
      Log(question.toString());
    context.history.appendLine(question);
    context.dialog.prompt = `${hb.toString().trim()}\n${question}`;

// Make a copy of the dialog object
// adjust the max_tokens count
// then send request data
    const dialog = {};
    merge(dialog, context.dialog);
    dialog.max_tokens -= dialog.prompt.length;
    const reqData = stringify(dialog);
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
      Log(`\n${result.response.text}\n`);
    }
  return SendChatReq(context, question, cb);
}


function StartWebService(argv) {

  const express = require('express');
  const cors = require('cors');
  const Url = require('url');

  argv = argv.join('');
  if (argv.length <= 0)
    argv = Config.proxy.proxyServerUrl;

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


function FindHits(args, obj, typ) {
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

  const keys = Object.keys(obj);
  for (let i = 0, ilen = keys.length; i < ilen; ++i) {
    const key = keys[i];
    if (key.indexOf(arg) === 0)
      hits.push({hit: obj, val: obj[key], key: key, what: nx.isWhat(obj[key])});
  }

  if (hits.length === 1 && !hits[0].what[typ]) {    // single hit, not the desired type, keep looking...
    const nhits = FindHits(args.slice(arg.length + 1), hits[0].val, typ);
    if (nhits.length === 1)
      return nhits;
    hits = nhits.length ? nhits : hits;
  }

  const result = {length: hits.length, tail: args.slice(arg.length + 1).trim()};

  if ((hits.length === 1 && hits[0].what[typ]))
    result.matched = hits[0];
  else
    result.hits = hits;
  return result;
}

function FindMisses(obj, indent) {
  indent = indent ? indent : '';

  const sb = new nx.StringBuilder();
  let first;

  if (obj.hits) {   // these are from hits...
    const hits = obj.hits;
    for (let i = 0, ilen = hits.length; i < ilen; ++i) {
      const hit = hits[i];
      if (i === 0)
        first = hit.key;
      sb.append(`\n${indent}${hit.key}`);
      if (hit.what.isObject)
        sb.append(FindMisses(hit.val, indent + '  '));
    }
  } else {
    const keys = Object.keys(obj);
    for (let i = 0, ilen = keys.length; i < ilen; ++i) {
      sb.append(`\n${indent}${keys[i]}`);
      if (i === 0)
        first = keys[i];
      if (nx.isObject(obj[keys[i]]))
        sb.append(FindMisses(obj[keys[i]], indent + '  '));
    }
  }

  if (sb._array.length !== 1)
    return sb.toString();
  return `${first.toString()} `;
}


function DoCommand(ocmd, cmd, cmds) {

  let hits = FindHits(cmd, cmds, 'isFunction');

  if (!hits.length)       // a miss, try to split the command string
    hits = FindHits(`${cmd.charAt(0)} ${cmd.slice(1)}`, cmds, 'isFunction');


  if (!hits.length)
    return Log(`I cannot do ${ocmd}\nTry: ${FindMisses(cmds, '  ')}`);

  if (hits.length > 1)      // more than one hit, need to narrow it down
    return Log(`Try: ${FindMisses(hits, '  ')}`);

  if (!hits.matched)  // The hit did not resolve to a command function
    return Log(`Try: ${ocmd} ${FindMisses(hits, '  ')}`); // give some options

  return hits.matched.val(hits.tail)    // call the command
}


function ChatCommand(context, cmd) {

  function getBooleans(pfx, obj, pkey) {
    const sb = new nx.StringBuilder();

    Object.keys(obj).forEach(function (key) {
      const it = obj[key];
      if (!nx.isObject(it))
        sb.appendLine(`${pfx}${pkey ? pkey + '.' : ''}${key} ${it ? 'enabled' : 'disabled'}`);
      else
        sb.append(getBooleans(pfx, it, key));
    });

    return sb.toString();
  }

  const cmds =
    {
      show:
        {
          history: function (opts) {
            if (!context.history || !context.history._array.length)
              return Log('there is no history to show');
            return Log(`history:\n${context.history.toString('\n')}`)
          },
          enabled: function (opts) {
            Log(`${getBooleans('', context.enabled).trim()}`);
            Log(`\n${getBooleans('debug for ', context.debug).trim()}`);
          }
        },
      enable:
        function (opts) {
          opts = (opts ? opts : '').toString().trim();
          const hits = FindHits(opts, context.enabled, 'isBoolean');
          if (hits.matched) {
            const matched = hits.matched;
            matched.hit[matched.key] = true;
            return Log(`${matched.key} enabled`);
          }
          if (hits.length)
            return Log(`Try: Enable ${FindMisses(hits, '  ')}`);
          return Log(`Try: Enable ${FindMisses(context.enabled, '  ')}`);
        },
      disable:
        function (opts) {
          opts = (opts ? opts : '').toString().trim();
          const hits = FindHits(opts, context.enabled, 'isBoolean');
          if (hits.matched) {
            const matched = hits.matched;
            matched.hit[matched.key] = false;
            return Log(`${matched.key} disabled`);
          }
          if (hits.length)
            return Log(`Try: Disable ${FindMisses(hits, '  ')}`);
          return Log(`Try: Disable ${FindMisses(context.enabled, '  ')}`);
        },
      debug:
        function (opts) {
          opts = (opts ? opts : '').toString().trim();
          const hits = FindHits(opts, context.debug, 'isBoolean');
          if (hits.matched) {
            const matched = hits.matched;
            matched.hit[matched.key] = true;
            return Log(`debug for ${matched.key} enabled`);
          }
          if (hits.length)
            return Log(`Try: Debug ${FindMisses(hits, '  ')}`);
          return Log(`Try: Debug ${FindMisses(context.debug, '  ')}`);
        },
      nodebug:
        function (opts) {
          opts = (opts ? opts : '').toString().trim();
          const hits = FindHits(opts, context.debug, 'isBoolean');
          if (hits.matched) {
            const matched = hits.matched;
            matched.hit[matched.key] = false;
            return Log(`debug for ${matched.key} disabled`);
          }
          if (hits.length)
            return Log(`Try: NoDebug ${FindMisses(hits, '  ')}`);
          return Log(`Try: NoDebug ${FindMisses(context.debug, '  ')}`);
        }
    }

  if (!context)
    return Log('no context');
  return DoCommand(cmd, cmd, cmds);
}


function ChatExit(context, status) {
  LogWrite('\nExiting... ');
  if (context && context.enabled.save.history) {
  Log('this needs work');
/* TODO
    // save current history
    Log(`Saving ${context.history._array.length} history items`);
    const current = nx.getEnv('chatgpt', true).chat;
    current.history = {};
    merge(current.history, context.history);
    nx.putEnv('chatgpt', current);
*/
  } else
    Log('nothing saved');
  LogWrite('\n');
  process.exit(status);
}


function QuizLoop() {

  const readline = require('readline');

  const context = BuildContext(null, ChatConfig.config.headers.Authorization);
  context.history = new nx.StringBuilder();
  const rl = readline.createInterface(process.stdin, process.stdout);

  Log('Ready');
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
