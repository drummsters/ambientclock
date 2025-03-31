import { StateManager } from '../core/state-manager.js';
import { ComponentRegistry } from '../core/component-registry.js';
import { EventBus } from '../core/event-bus.js';

/**
 * Manages the lifecycle of UI element instances based on the application state.
 * Creates, updates, and destroys elements as defined in `state.elements`.
 */
export class ElementManager {
  /**
   * Creates an ElementManager instance.
   * @param {HTMLElement} containerElement - The DOM element where element containers will be appended.
   */
  constructor(containerElement) {
    if (!containerElement) {
      throw new Error('ElementManager requires a valid containerElement.');
    }
    this.containerElement = containerElement;
    this.elementInstances = new Map(); // Stores active element instances, keyed by element ID
    this.unsubscribeState = null;

    console.log('ElementManager created. containerElement:', containerElement);
  }

  /**
   * Initializes the ElementManager.
   * Subscribes to state changes and initializes elements based on the current state.
   * @returns {Promise<void>}
   */
  async init() {
    console.log('ElementManager initializing...');
    // Subscribe to changes in the 'elements' part of the state via EventBus
    const elementsSubscription = EventBus.subscribe('state:elements:changed', (elementsState) => {
      console.log('[ElementManager] EventBus state:elements:changed triggered. Received state:', elementsState);
      this.syncElements(elementsState || {}); // Handle null/undefined state
    });
    // Store the unsubscribe function correctly
    this.unsubscribeState = elementsSubscription.unsubscribe;

    // Initial sync based on the state loaded by StateManager
    // Don't rely on the subscribe callback for initial state
    const initialState = StateManager.getNestedValue(StateManager.getState(), 'elements');
    console.log('[ElementManager] Initial state for elements:', initialState);
    await this.syncElements(initialState || {});

    console.log('ElementManager initialized.');
  }

  /**
   * Synchronizes the active element instances with the provided state.
   * Creates new elements, updates existing ones (handled by elements themselves via state subscription),
   * and destroys elements that are no longer in the state.
   * @param {object} elementsState - The current state of all elements (e.g., `state.elements`).
   * @returns {Promise<void>}
   */
  async syncElements(elementsState) {
    console.log('[ElementManager] Syncing elements with state:', elementsState);
    const currentStateIds = Object.keys(elementsState);
    const currentInstanceIds = Array.from(this.elementInstances.keys());

    // Elements to add/create
    const elementsToAdd = currentStateIds.filter(id => !this.elementInstances.has(id));

    // Elements to remove/destroy
    const elementsToRemove = currentInstanceIds.filter(id => !elementsState[id]);

    // Remove elements no longer in state
    elementsToRemove.forEach(id => {
      this.destroyElement(id);
    });

    // Add new elements present in state
    // Use Promise.all to handle asynchronous initialization
    await Promise.all(elementsToAdd.map(id => {
        const elementConfig = elementsState[id];
        if (elementConfig && elementConfig.type) {
           return this.createElementInstance(elementConfig);
        } else {
            console.warn(`Invalid config for element ID "${id}" in state. Skipping creation.`);
            return Promise.resolve(); // Resolve immediately for invalid configs
        }
    }));

    console.log(`Sync complete. Active elements: ${this.elementInstances.size}`);
  }

  /**
   * Creates and initializes a new element instance based on its configuration.
   * @param {object} elementConfig - The configuration object for the element from the state.
   * @returns {Promise<void>}
   */
  async createElementInstance(elementConfig) {
    const { id, type, options } = elementConfig;
    console.log(`Creating element instance: ID=${id}, Type=${type}`);

    if (this.elementInstances.has(id)) {
      console.warn(`Element with ID "${id}" already exists. Skipping creation.`);
      return;
    }

    // Use ComponentRegistry to get the constructor and create instance
    const elementInstance = ComponentRegistry.createElement(type, id, options);

    if (elementInstance) {
      // Initialize the element (which creates its DOM, binds state, etc.)
      const initSuccess = await elementInstance.init();

      if (initSuccess && elementInstance.container) {
        // Add the element's container to the main elements container
        if (this.containerElement) {
          this.containerElement.appendChild(elementInstance.container);
          console.log(`[ElementManager] Appended element ${id} to container.`);
          this.elementInstances.set(id, elementInstance);
          console.log(`Element ${id} successfully created and added to DOM.`);
          EventBus.publish('element:created', { id, type });
        } else {
          console.error('[ElementManager] containerElement is null. Cannot append element.');
        }
      } else {
        console.error(`Failed to initialize element ${id} or its container is missing.`);
        // Cleanup if init failed but instance was created
        elementInstance.destroy?.();
      }
    } else {
      console.error(`Failed to create element instance for type "${type}" with ID "${id}".`);
    }
  }

  /**
   * Destroys an element instance and removes it from the manager.
   * @param {string} id - The ID of the element to destroy.
   */
  destroyElement(id) {
    const elementInstance = this.elementInstances.get(id);
    if (elementInstance) {
      console.log(`Destroying element instance: ${id}`);
      try {
        elementInstance.destroy(); // Call the element's destroy method
      } catch (error) {
        console.error(`Error destroying element ${id}:`, error);
      }
      this.elementInstances.delete(id);
      EventBus.publish('element:destroyed', { id });
    }
  }

  /**
   * Gets a specific element instance by its ID.
   * @param {string} id - The ID of the element.
   * @returns {BaseUIElement|undefined} The element instance or undefined if not found.
   */
  getElementInstance(id) {
      return this.elementInstances.get(id);
  }

  /**
   * Gets all active element instances.
   * @returns {Map<string, BaseUIElement>} A map of element instances.
   */
  getAllElementInstances() {
      return this.elementInstances;
  }


  /**
   * Cleans up the ElementManager, destroying all managed elements.
   */
  destroy() {
    console.log('Destroying ElementManager...');
    // Unsubscribe from state changes
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }

    // Destroy all managed element instances
    this.elementInstances.forEach(instance => {
      try {
        instance.destroy();
      } catch (error) {
        console.error(`Error destroying element ${instance.id} during manager cleanup:`, error);
      }
    });
    this.elementInstances.clear();

    // Clear the main container (optional, depends on desired behavior)
    // this.containerElement.innerHTML = '';

    console.log('ElementManager destroyed.');
  }
}
