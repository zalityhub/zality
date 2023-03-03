const nx = require('@zality/nodejs/util');
const fsm = require('@zality/nodejs/fsm');
const stringify = require('json-stringify-safe');


/**
 * Simple Finite State Machine
 **/
// null/initial
function null_fsm(event, args) {
  switch (event) {
    case this.events.vals.init:
      this.setState(this.states.vals.idle);
      return event;
      break;
  }
  return null;		// not processed
}


// idling
function idle_fsm(event, args) {
  switch (event) {
    case this.events.vals.tick:
      return event;
      break;

    case this.events.vals.start:
      this.setState(this.states.vals.running);
      return event;
      break;
  }
  return null; // Event not processed
}


// running
function running_fsm(event, args) {
  switch (event) {
    case this.events.vals.tick:
      return event;
      break;

    case this.events.vals.stop:
      this.setState(this.states.vals.idle);
      return event;
      break;

    case this.events.vals.pause:
      this.pushState(this.states.vals.paused);
      return event;
      break;
  }
  return null; // Event not processed
}


// paused
function paused_fsm(event, args) {
  switch (event) {
    case this.events.vals.tick:
      return event;
      break;

    case this.events.vals.stop:
      this.setState(this.states.vals.idle);
      return event;
      break;

    case this.events.vals.resume:
      this.popState();
      return event;
      break;
  }
  return null; // Event not processed
}


const engine = new fsm.engine({
    states: {null: null_fsm, idle: idle_fsm, running: running_fsm, paused: paused_fsm},
    // events: {init: 1, tick: 2, start: 3, pause: 4, stop: 5, resume: 6},
    events: ['init', 'tick', 'start', 'pause', 'stop', 'resume'],
    logSettings: {mask: {config: 1, engine: 1}},
    initial: null
  }
);


engine.setState(engine.states.vals.null);		// start in null state
engine.signalEvent(engine.events.vals.init);

// Idle Loop
let iv = 0;
setInterval(function () {
  engine.signalEvent(engine.events.vals.tick);		// declare event

  if( ++iv === 2)
    return engine.signalEvent(engine.events.vals.start);

  if( ! (iv % 10) )
    return engine.signalEvent(engine.events.vals.resume);

  if( ! (iv % 5) )
    return engine.signalEvent(engine.events.vals.pause);

}, 1000);
