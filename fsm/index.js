const rq = require('./fsm.js');
for (const [key, value] of Object.entries(rq))
  exports[key] = value;
