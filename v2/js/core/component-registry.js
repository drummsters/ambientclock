/**
 * Manages the registration and instantiation of UI element types.
 */
export const ComponentRegistry = {
  elementTypes: new Map(), // Stores { constructor, controlPanelConfig, capabilities }

  /**
   * Registers a new element type.
   * @param {string} type - The unique identifier for the element type (e.g., 'clock', 'date').
   * @param {Function} constructor - The class constructor for the element.
   * @param {object} config - Configuration object for the element type.
   * @param {object[]} config.controlPanelConfig - Configuration for generating control panel UI.
   * @param {string[]} [config.capabilities=[]] - List of capabilities the element possesses (e.g., ['draggable', 'resizable']).
   */
  registerElementType(type, constructor, config = {}) {
    if (this.elementTypes.has(type)) {
      console.warn(`ComponentRegistry: Element type "${type}" is already registered. Overwriting.`);
    }
    if (typeof constructor !== 'function') {
      console.error(`ComponentRegistry: Constructor for type "${type}" must be a class/function.`);
      return;
    }

    this.elementTypes.set(type, {
      constructor,
      controlPanelConfig: config.controlPanelConfig || [],
      capabilities: config.capabilities || []
    });
    console.log(`ComponentRegistry: Registered element type "${type}".`);
  },

  /**
   * Creates an instance of a registered element type.
   * @param {string} type - The type of element to create.
   * @param {string} id - The unique ID for this element instance.
   * @param {object} [options={}] - Initial options for the element instance.
   * @param {object} [dependencies={}] - Dependencies to inject (e.g., { configManager }).
   * @returns {object|null} An instance of the element, or null if the type is not registered.
   */
  createElement(type, id, options = {}, dependencies = {}) {
    const typeInfo = this.elementTypes.get(type);
    if (!typeInfo) {
      console.error(`ComponentRegistry: Attempted to create unknown element type "${type}".`);
      return null;
    }

    try {
      // Pass necessary info and dependencies to the constructor
      const elementInstance = new typeInfo.constructor({
        id,
        type,
        options,
        capabilities: typeInfo.capabilities, // Pass capabilities defined during registration
        ...dependencies // Spread dependencies (e.g., configManager) into the constructor args object
      });
      return elementInstance;
    } catch (error) {
      console.error(`ComponentRegistry: Error creating element of type "${type}" with ID "${id}":`, error);
      return null;
    }
  },

  /**
   * Retrieves the control panel configuration for a given element type.
   * @param {string} type - The element type.
   * @returns {object[]} The control panel configuration array, or an empty array if not found.
   */
  getControlPanelConfig(type) {
    const typeInfo = this.elementTypes.get(type);
    return typeInfo ? typeInfo.controlPanelConfig : [];
  },

  /**
   * Retrieves the capabilities for a given element type.
   * @param {string} type - The element type.
   * @returns {string[]} The capabilities array, or an empty array if not found.
   */
  getCapabilities(type) {
    const typeInfo = this.elementTypes.get(type);
    return typeInfo ? typeInfo.capabilities : [];
  },

  /**
   * Gets a list of all registered element type names.
   * @returns {string[]} An array of registered element type names.
   */
  getRegisteredTypes() {
    return Array.from(this.elementTypes.keys());
  }
};
