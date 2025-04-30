import { StateManager } from '../core/state-manager.js';
import { ComponentRegistry } from '../core/component-registry.js';
import { EventBus } from '../core/event-bus.js';
import * as logger from '../utils/logger.js'; // Import the logger

/**
 * Manages the lifecycle of UI element instances based on the application state.
 * Creates, updates, and destroys elements as defined in `state.elements`.
 */
export class ElementManager {
  /**
 * Creates an ElementManager instance.
 * @param {HTMLElement} containerElement - The DOM element where element containers will be appended.
 * @param {object} dependencies - Object containing dependencies like configManager.
 */
  constructor(containerElement, dependencies = {}) {
    if (!containerElement) {
      throw new Error('ElementManager requires a valid containerElement.');
    }
    this.containerElement = containerElement;
    this.dependencies = dependencies; // Store dependencies (e.g., { configManager })
    this.elementInstances = new Map(); // Stores active element instances, keyed by element ID
    this.unsubscribeState = null;

    logger.log('ElementManager created. containerElement:', containerElement, 'Dependencies:', Object.keys(dependencies)); // Keep as log
  }

  /**
   * Initializes the ElementManager.
   * Subscribes to state changes and initializes elements based on the current state.
   * @returns {Promise<void>}
   */
  async init() {
    logger.log('ElementManager initializing...'); // Keep as log
    // Subscribe to changes in the 'elements' part of the state via EventBus
    const elementsSubscription = EventBus.subscribe('state:elements:changed', (elementsState) => {
      logger.debug('[ElementManager] EventBus state:elements:changed triggered. Received state:', elementsState); // Changed to debug
      this.syncElements(elementsState || {}); // Handle null/undefined state
    });
    // Store the unsubscribe function correctly
    this.unsubscribeState = elementsSubscription.unsubscribe;

    // Initial sync based on the state loaded by StateManager
    // Don't rely on the subscribe callback for initial state
    const initialState = StateManager.getNestedValue(StateManager.getState(), 'elements');
    logger.debug('[ElementManager] Initial state for elements:', initialState); // Changed to debug
    await this.syncElements(initialState || {});

    logger.log('ElementManager initialized.'); // Keep as log
  }

  /**
   * Synchronizes the active element instances with the provided state.
   * Creates new elements, updates existing ones (handled by elements themselves via state subscription),
   * and destroys elements that are no longer in the state.
   * @param {object} elementsState - The current state of all elements (e.g., `state.elements`).
   * @returns {Promise<void>}
   */
  async syncElements(elementsState) {
    logger.debug('[ElementManager] Syncing elements with state:', elementsState); // Changed to debug
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

    // Create a document fragment to batch DOM insertions
    const fragment = document.createDocumentFragment();

    // Add new elements present in state
    // Use Promise.all to handle asynchronous initialization
    // Pass the fragment to createElementInstance
    await Promise.all(elementsToAdd.map(id => {
        const elementConfig = elementsState[id];
        if (elementConfig && elementConfig.type) {
           return this.createElementInstance(elementConfig, fragment); // Pass fragment
        } else {
            logger.warn(`Invalid config for element ID "${id}" in state. Skipping creation.`); // Use logger.warn
            return Promise.resolve(); // Resolve immediately for invalid configs
        }
    }));

    // Append all new elements at once from the fragment
    if (fragment.hasChildNodes()) {
        this.containerElement.appendChild(fragment);
        logger.debug(`[ElementManager] Appended fragment with new elements to container.`);
    }

    logger.log(`Sync complete. Active elements: ${this.elementInstances.size}`); // Keep as log
    // Publish event after sync is fully complete
    EventBus.publish('elementmanager:sync:complete');
    logger.debug('[ElementManager] Published elementmanager:sync:complete event.');
  }

  /**
   * Creates and initializes a new element instance based on its configuration, adding it to a fragment.
   * @param {object} elementConfig - The configuration object for the element from the state.
   * @param {DocumentFragment} fragment - The document fragment to append the element's container to.
   * @returns {Promise<void>}
   */
    async createElementInstance(elementConfig, fragment) { // Added fragment parameter
    const { id, type, options } = elementConfig;
    logger.log(`Creating element instance: ID=${id}, Type=${type}`); // Keep as log

    if (this.elementInstances.has(id)) {
      logger.warn(`Element with ID "${id}" already exists. Skipping creation.`); // Use logger.warn
      return;
    }

    // Check if the component type is registered before attempting creation
    if (!ComponentRegistry.isRegistered(type)) {
        logger.error(`[ElementManager] Attempted to create element ID "${id}" but type "${type}" is not registered. Check configuration and registration logic.`);
        // Potentially publish an event or handle this case more gracefully
        return; // Skip creation
    }

    // Remove favoritesService from options to avoid overriding dependencies
    const filteredOptions = { ...options };
    if ('favoritesService' in filteredOptions) {
      delete filteredOptions.favoritesService;
    }

    // Use ComponentRegistry to get the constructor and create instance
    // Pass the dependencies object directly
    // console.log(`[ElementManager] Creating element ${id} of type ${type} with dependencies:`, this.dependencies); // Removed log
    const elementInstance = ComponentRegistry.createElement(type, id, filteredOptions, this.dependencies); // Pass this.dependencies directly

    if (elementInstance) {
      // Initialize the element (which creates its DOM, binds state, etc.)
       const initSuccess = await elementInstance.init();

       if (initSuccess && elementInstance.container) {
         // Publish event indicating this specific element is ready *before* adding to fragment
         EventBus.publish('element:ready', { id, container: elementInstance.container });
         logger.debug(`[ElementManager] Published element:ready for ${id}.`);

         // Add the element's container to the fragment instead of the main container
         fragment.appendChild(elementInstance.container);
         logger.debug(`[ElementManager] Appended element ${id} container to fragment.`);
         this.elementInstances.set(id, elementInstance);
         logger.log(`Element ${id} successfully created and prepared for DOM insertion.`);
         // Keep element:created for potential other uses, though element:ready might be more useful now
         EventBus.publish('element:created', { id, type });
         // Note: DOM insertion happens after Promise.all in syncElements
       } else {
         logger.error(`Failed to initialize element ${id} or its container is missing.`);
        // Cleanup if init failed but instance was created
        elementInstance.destroy?.();
      }
    } else {
      logger.error(`Failed to create element instance for type "${type}" with ID "${id}".`); // Use logger.error
    }
  }

  /**
   * Destroys an element instance and removes it from the manager.
   * @param {string} id - The ID of the element to destroy.
   */
  destroyElement(id) {
    const elementInstance = this.elementInstances.get(id);
    if (elementInstance) {
      logger.log(`Destroying element instance: ${id}`); // Keep as log
      try {
        elementInstance.destroy(); // Call the element's destroy method
      } catch (error) {
        logger.error(`Error destroying element ${id}:`, error); // Use logger.error
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
    logger.log('Destroying ElementManager...'); // Keep as log
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
        logger.error(`Error destroying element ${instance.id} during manager cleanup:`, error); // Use logger.error
      }
    });
    this.elementInstances.clear();

    // Clear the main container (optional, depends on desired behavior)
    // this.containerElement.innerHTML = '';

    logger.log('ElementManager destroyed.'); // Keep as log
  }
}
