const nx = require('@zality/nodejs/util');
const {platform} = require('os');

module.nx = nx;
module.runModes = new nx.enum({dev: 'dev', prod: 'prod'});
module.runMode = null;
module.osPlatform = platform();

module.argv = process.argv.slice(2);    // arg list

if (nx.getProcessOption('-mode') > 0)
  module.runMode = nx.getProcessArg(GetProcessOption('-mode') + 1);
else if (nx.getCpuInfo().indexOf('ARMv7') < 0)
  module.runMode = module.runModes.vals.dev;
else
  module.runMode = module.runModes.vals.prod;


switch (module.runMode) {
  default:
    Fatal(`Unable to run in mode [${module.runMode}]`);
    break;

  case module.runModes.vals.prod:
    module.listenPort = 3000;
    break;

  case module.runModes.vals.dev:
    module.listenPort = 3000;
    break;
}

const server = require('./main.js');
module.server = server;
module.server.run(module);
