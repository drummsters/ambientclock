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
    if (!this.listeners[event]) {
      return;
    }

    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`EventBus: Error publishing event "${event}":`, error);
      }
    });
  }
};
