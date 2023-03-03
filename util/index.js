const rq = require('./util.js');
for (const [key, value] of Object.entries(rq))
  exports[key] = value;
