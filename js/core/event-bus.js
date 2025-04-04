import * as logger from '../utils/logger.js'; // Import the logger

/**
 * A simple EventBus for publish/subscribe functionality.
 */
export const EventBus = {
  listeners: {},

  /**
   * Subscribes a callback function to an event.
   * @param {string} event - The name of the event to subscribe to.
   * @param {Function} callback - The function to call when the event is published.
   * @returns {object} An object with an unsubscribe method.
   */
  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    logger.debug(`[EventBus] Subscribed to event "${event}". Listener count: ${this.listeners[event].length}. Callback:`, callback); // Changed to debug

    return {
      unsubscribe: () => {
        this.listeners[event] = this.listeners[event]?.filter(listener => listener !== callback) || [];
      }
    };
  },

  /**
   * Publishes an event, calling all subscribed callbacks.
   * @param {string} event - The name of the event to publish.
   * @param {*} [data] - Optional data to pass to the callbacks.
   */
  publish(event, data) {
    try { // Add try block around the whole function
      if (!this.listeners[event]) {
        // logger.debug(`[EventBus] No listeners for event "${event}". Skipping publish.`); // Optional: Log if no listeners
        return;
      }
      logger.debug(`[EventBus] Publishing event "${event}" to ${this.listeners[event].length} listener(s). Data:`, data); // Changed to debug

      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`EventBus: Error in subscriber for event "${event}":`, error); // Use logger.error
        }
      });
    } catch (error) { // Catch errors within publish itself
        logger.error(`EventBus: Critical error during publish for event "${event}":`, error); // Use logger.error
    }
  }
};
