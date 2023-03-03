const nx = require('@zality/nodejs/util');
const stringify = require('json-stringify-safe');

fsm = exports;

fsm.engine = function (opts) {
  if (opts.logger)
    this.logger = opts.logger;
  else
    this.logger = new nx.logger(opts.logSettings);

  if (nx.isNull(opts.name))
    opts.name = require('uuid').v4();
  this.name = opts.name;
  this.currentStateHandler = opts.initial;
  this.stateStack = require('stackjs');
  this.stateStack = new this.stateStack();

  this.setStates(opts.states);
  this.setEvents(opts.events);

  const tval = this.valueOfState(this.currentStateHandler);
  this.logger.mLog('config', `Setting initial state to ${tval}`);
  return this;
}

fsm.engine.prototype.setLogger = function (logger) {
  this.logger = logger;
}

fsm.engine.prototype.setStates = function (states) {
  const fkeys = Object.keys(nx.nullTo(this.states, {}));
  const tkeys = Object.keys(nx.nullTo(states, {}));
  this.logger.mLog('config', `Changing states from ${stringify(fkeys)} to ${stringify(tkeys)}`);
  return this.states = new nx.enum(states);
}

fsm.engine.prototype.setEvents = function (events) {
  const fkeys = Object.keys(nx.nullTo(this.events, {}));
  const tkeys = Object.keys(nx.nullTo(events, {}));
  this.logger.mLog('config', `Changing events from ${stringify(fkeys)} to ${stringify(tkeys)}`);
  return this.events = new nx.enum(events);
}

fsm.engine.prototype.valueOfState = function(state) {
  return stringify(this.states.valueOf(state));
}

fsm.engine.prototype.setState = function (state) {
  if (nx.isNull(this.states.vals[state]))
    return this.logger.logError(state + ' is not a valid state');
  const fval = this.valueOfState(this.currentStateHandler);
  const tval = this.valueOfState(state);
  this.logger.mLog('engine', `Changing state from ${fval} to ${tval}`);
  this.currentStateHandler = state;
  return state;
}

fsm.engine.prototype.pushState = function (state) {
  this.logger.mLog('engine', `Saving state ${this.valueOfState(this.currentStateHandler)} to stack`);
  this.stateStack.push(this.currentStateHandler);
  return this.setState(state);
}


fsm.engine.prototype.popState = function () {
  if (this.stateStack.size() < 1)
    return this.logger.logError('Can\'t popState; underflow');
  this.setState(this.stateStack.pop());
  this.logger.mLog('engine', `Restoring state ${this.valueOfState(this.currentStateHandler)} from stack`);
  return this.currentStateHandler;
}

fsm.engine.prototype.signalEvent = function (event, args) {
  if (nx.isNull(this.events.vals[event]))
    return this.logger.logError(state + ' is not a valid event');
  this.logger.mLog('engine', `Signaling event ${this.events.valueOf(event)} in state ${this.valueOfState(this.currentStateHandler)}`);
  if (!this.currentStateHandler(event, args)) {		// process the event
    this.logger.logError(this.states.valueOf(this.currentStateHandler) + ': Did not handle ' + this.events.valueOf(event));
  }
  return event;
}

return fsm;
