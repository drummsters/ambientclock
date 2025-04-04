/**
 * Mixin/Helper class for managing plugins attached to a BaseUIElement.
 */
export class PluginManager {
    /**
     * Creates an instance of PluginManager.
     * @param {BaseUIElement} elementInstance - The BaseUIElement instance this manager is attached to.
     */
    constructor(elementInstance) {
        if (!elementInstance || !elementInstance.id) {
            throw new Error("PluginManager requires a valid element instance with id.");
        }
        this.element = elementInstance; // Reference to the BaseUIElement instance
        this.plugins = {}; // Store attached plugins { name: { definition, instance, config } }
        console.log(`[PluginManager] Initialized for ${this.element.id}`);
    }

    /**
     * Attaches and initializes a plugin for the element instance.
     * @param {object} plugin - The plugin object/class (must have name and init method).
     * @param {object} [config={}] - Configuration for the plugin.
     */
    usePlugin(plugin, config = {}) {
        if (!plugin || typeof plugin.init !== 'function' || !plugin.name) {
            console.error(`[PluginManager ${this.element.id}] Invalid plugin provided:`, plugin);
            return;
        }
        if (this.plugins[plugin.name]) {
            console.warn(`[PluginManager ${this.element.id}] Plugin "${plugin.name}" is already attached.`);
            return;
        }

        try {
            // Pass the element instance (this.element) to the plugin's init method
            const pluginInstance = plugin.init(this.element, config);
            this.plugins[plugin.name] = {
                definition: plugin,
                instance: pluginInstance, // Store whatever init returns
                config
            };
            console.log(`[PluginManager ${this.element.id}] Plugin "${plugin.name}" attached.`);
        } catch (error) {
            console.error(`[PluginManager ${this.element.id}] Error initializing plugin "${plugin.name}":`, error);
        }
    }

    /**
     * Initializes all attached plugins by calling their attachEventListeners method (if available).
     * Called during the element's init phase after the container exists.
     */
    initPlugins() {
        console.log(`[PluginManager ${this.element.id}] Initializing attached plugins...`);
        Object.values(this.plugins).forEach(p => {
            // Plugins might need access to the container or other elements
            // The init method in usePlugin already ran, this is for post-init steps
            if (p.instance && typeof p.instance.attachEventListeners === 'function') {
                try {
                    p.instance.attachEventListeners();
                    console.log(`[PluginManager ${this.element.id}] Called attachEventListeners for plugin "${p.definition.name}".`);
                } catch (error) {
                    console.error(`[PluginManager ${this.element.id}] Error calling attachEventListeners for plugin "${p.definition.name}":`, error);
                }
            }
        });
    }

    /**
     * Destroys all attached plugins by calling their destroy method (if available).
     */
    destroyPlugins() {
        console.log(`[PluginManager ${this.element.id}] Destroying attached plugins...`);
        Object.values(this.plugins).forEach(p => {
            if (p.instance && typeof p.instance.destroy === 'function') {
                try {
                    p.instance.destroy();
                    console.log(`[PluginManager ${this.element.id}] Called destroy for plugin "${p.definition.name}".`);
                } catch (error) {
                    console.error(`[PluginManager ${this.element.id}] Error calling destroy for plugin "${p.definition.name}":`, error);
                }
            }
        });
        this.plugins = {}; // Clear the plugins map
    }

    /**
     * Cleans up the PluginManager.
     */
    destroy() {
        console.log(`[PluginManager] Destroying for ${this.element.id}`);
        this.destroyPlugins(); // Ensure plugins are destroyed
        this.element = null; // Release reference
    }
}
