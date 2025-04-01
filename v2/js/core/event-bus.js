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
    console.log(`[EventBus] Subscribed to event "${event}". Listener count: ${this.listeners[event].length}. Callback:`, callback); // Added log

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
        // console.log(`[EventBus] No listeners for event "${event}". Skipping publish.`); // Optional: Log if no listeners
        return;
      }
      console.log(`[EventBus] Publishing event "${event}" to ${this.listeners[event].length} listener(s). Data:`, data); // Added log

      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`EventBus: Error in subscriber for event "${event}":`, error); // More specific error
        }
      });
    } catch (error) { // Catch errors within publish itself
        console.error(`EventBus: Critical error during publish for event "${event}":`, error);
    }
  }
};
