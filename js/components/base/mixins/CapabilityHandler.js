// Import known plugins - This might need to become more dynamic or use a registry
import { DragPlugin } from '../../plugins/drag-plugin.js';
// Removed ResizePlugin import

/**
 * Mixin/Helper class for applying capabilities (which often map to plugins) to a BaseUIElement.
 */
export class CapabilityHandler {
    /**
     * Creates an instance of CapabilityHandler.
     * @param {BaseUIElement} elementInstance - The BaseUIElement instance this handler is attached to.
     * @param {PluginManager} pluginManager - The PluginManager instance for the element.
     */
    constructor(elementInstance, pluginManager) {
        if (!elementInstance || !elementInstance.id) {
            throw new Error("CapabilityHandler requires a valid element instance with id.");
        }
        if (!pluginManager || typeof pluginManager.usePlugin !== 'function') {
            throw new Error("CapabilityHandler requires a valid PluginManager instance.");
        }
        this.element = elementInstance; // Reference to the BaseUIElement instance
        this.pluginManager = pluginManager; // Reference to the PluginManager
        console.log(`[CapabilityHandler] Initialized for ${this.element.id}`);
    }

    /**
     * Applies capabilities (mixins/plugins) to the element instance based on the capabilities array.
     * This implementation maps capability names directly to known plugins.
     * A more robust system might use a dedicated CapabilityRegistry.
     * @param {string[]} capabilities - Array of capability names defined for the element type.
     */
    applyCapabilities(capabilities = []) {
        console.log(`[CapabilityHandler ${this.element.id}] Applying capabilities:`, capabilities);

        if (capabilities.includes('draggable')) {
            // Check if DragPlugin is available (imported)
            if (typeof DragPlugin !== 'undefined') {
                this.pluginManager.usePlugin(DragPlugin); // Use the plugin manager to attach
            } else {
                console.warn(`[CapabilityHandler ${this.element.id}] DragPlugin not found.`);
            }
        }

        // Removed ResizePlugin application

        // Add checks and plugin attachments for other capabilities here
        // Example:
        // if (capabilities.includes('resizable')) {
        //     if (typeof ResizePlugin !== 'undefined') {
        //         this.pluginManager.usePlugin(ResizePlugin);
        //     } else {
        //         console.warn(`[CapabilityHandler ${this.element.id}] ResizePlugin not found.`);
        //     }
        // }
    }

    /**
     * Cleans up (currently no specific cleanup needed for capabilities themselves).
     */
    destroy() {
        console.log(`[CapabilityHandler] Destroying for ${this.element.id}`);
        this.element = null; // Release reference
        this.pluginManager = null; // Release reference
    }
}
