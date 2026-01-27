const EventEmitter = require('events');

/**
 * Central event bus for communicating between bot and background tasks
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  // Emit stream data
  emitStreamData(streamName, data) {
    this.emit(`stream:${streamName}`, data);
  }

  // Listen to stream data
  onStreamData(streamName, handler) {
    this.on(`stream:${streamName}`, handler);
  }

  // Emit errors
  emitError(source, error) {
    this.emit(`error:${source}`, error);
  }

  // Listen to errors
  onError(source, handler) {
    this.on(`error:${source}`, handler);
  }

  // Emit status updates
  emitStatus(source, status) {
    this.emit(`status:${source}`, status);
  }

  // Listen to status updates
  onStatus(source, handler) {
    this.on(`status:${source}`, handler);
  }
}

module.exports = new EventBus();
