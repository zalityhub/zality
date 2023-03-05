/**
 * Module setup.
 */

const fs = require('fs');
const process = require('process');
const path = require('path');
const readline = require('readline');
const stringify = require('json-stringify-safe');
const nx = require('@zality/nodejs/util');


// Main starts here
//
run = function (main) {

  nx.log(`starting ${this.name} Version ${main.runMode} ${this.version}`);

  switch (main.runMode) {
    default:
      nx.fatal(`Unable to run in mode [${main.runMode}]`);
      break;

    case main.runModes.vals.prod:
    case main.runModes.vals.dev:
      break;
  }

// Setup Web Engine
  const rootDir = main.rootDir = __dirname;
  const pubDir = main.pubDir = rootDir + '/public';
  const routesDir = main.routesDir = rootDir + '/routes';
  const viewsDir = main.viewsDir = rootDir + '/views';
  const partialsDir = main.partialsDir = viewsDir + '/partials';
  const linksDir = main.linksDir = rootDir + '/links';

  const express = main.express = require('express');
  const bodyParser = require('body-parser');
  const hbs = require('hbs');

  const app = main.app = express();
  app.main = main;
  app.use(express.static(rootDir + pubDir));
  app.use('/public', express.static(pubDir));
  app.use('/favicon.ico', express.static(`${pubDir}/images/favicon.ico`));

  app.set('view engine', 'hbs');
  hbs.registerPartials(partialsDir);

  hbs.registerHelper('json', function (context) {
    return stringify(context);
  });

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

  app.set('port', main.listenPort);
  app.set('views', viewsDir);

  pages = {};

// Register express WebPages
  function registerRouter(url, fun) {
    if (url !== '/')
      url += '*';
    const page = {};
    pages[url] = page;
    const file = `./${path.basename(routesDir)}/${fun}.js`;
    nx.log(`registering url ${url} to ${file}`);
    const router = require(file);
    // router must must have .init, .geted and .posted functions
    if (!(nx.isFunction(router.init) && nx.isFunction(router.geted) && nx.isFunction(router.posted)))
      return nx.log(`the function ${file} must have an 'init', 'geted' and 'posted' function`);
    router.init(main, fun, url);
    app.get(url, router.geted);
    app.post(url, router.posted);
    page.url = url;
    page.function = fun;
    page.router = router;
  }

  // const functions = ['index', 'privacy', 'auth', 'uauth'];
  const files = nx.fsGet(routesDir, '.*\.js$');
  for (let i = 0; i < files.length; ++i) {
    const name = path.basename(files[i].name, '.js');
    let fun = name.toLowerCase().replaceAll(' ', '').replaceAll('&', '_');
    registerRouter(`/${fun}`, fun);
    if (fun === 'index')
      registerRouter(`/`, fun);
  }

// create server instance
  http = require('http');
  const stdin = process.stdin;
  const stdout = process.stdout;

  const webServer = http.createServer(app).listen(app.get('port'), '127.0.0.1', function () {
    const url = `http://${webServer.address().address}:${webServer.address().port}`;
    nx.log(`listening at ${url}`);

    if (nx.platform === 'win32' && (main.argv <= 0 || main.argv[0] != '-c')) {
      function doCommand(cmd) {
        nx.puts('\n');
        if (nx.isNull(cmd) || cmd.length <= 0)
          cmd = 'h';    // help is default
        cmd = cmd.toString().charAt(0).toLowerCase();
        switch (cmd) {
          default:
            nx.puts(`o: open a browser for ${url}\n`);
            nx.puts(`q: quit (stop) ${url}\n`);
            break;
          case 'q':
            nx.log(`stopping ${url}`);
            process.exit(0);
            break;
          case 'o':
            nx.launchBrowser(url);
            break;
        }
        nx.getchar(function (err, len, bfr) {
          if (err)
            nx.fatal(err.toString());
          doCommand(bfr);
        });
      }

      doCommand('h');   // initial help
    }

    /*
    readline.createInterface(stdin, stdout).on('line', (line) => {
      line = line.toString().toLowerCase().trim();
      doCommand(line);
    });
    */
  });
}

module.exports = {
  run: run,
  name: 'Zality',
  version: '1.x'
};
