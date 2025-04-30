import { ComponentRegistry } from './component-registry.js';
import { ClockElement } from '../components/elements/clock-element.js';
import { DateElement } from '../components/elements/date-element.js';
import { ControlsHintElement } from '../components/elements/controls-hint-element.js';
import { BackgroundInfoElement } from '../components/elements/background-info-element.js';
import { DonateElement } from '../components/elements/donate-element.js'; // Import statically
import { FavoriteToggleElement } from '../components/elements/favorite-toggle-element.js';
import { NextBackgroundButtonElement } from '../components/elements/next-background-button.js';
import { FullscreenToggleElement } from '../components/elements/fullscreen-toggle-element.js';
import { ControlPanelToggleElement } from '../components/elements/control-panel-toggle-element.js';
import * as logger from '../utils/logger.js'; // Import the logger

/**
 * Registers all known UI element types with the ComponentRegistry.
 * @param {ConfigManager} configManager - The application's configuration manager instance.
 */
export async function registerElementTypes(configManager) { // Make async for dynamic import
    if (!configManager) {
        throw new Error('registerElementTypes requires a ConfigManager instance.');
    }
    logger.debug('Registering element types...'); // Changed to debug

    // Register Clock element
    ComponentRegistry.registerElementType('clock', ClockElement, {
        controlPanelConfig: [], // Define later if needed
        capabilities: ['draggable', 'resizable']
    });

    // Register Date element
    ComponentRegistry.registerElementType('date', DateElement, {
        controlPanelConfig: [], // Define later if needed
        capabilities: ['draggable', 'resizable']
    });

    // Register Controls Hint element
    ComponentRegistry.registerElementType('controls-hint', ControlsHintElement, {
        controlPanelConfig: [],
        capabilities: []
    });

    // Register Background Info element
    ComponentRegistry.registerElementType('background-info', BackgroundInfoElement, {
        controlPanelConfig: [],
        capabilities: []
    });

    // Conditionally register Donate element based on config
    const shouldIncludeDonate = configManager.isFeatureEnabled('includeDonate');
    if (shouldIncludeDonate) {
        ComponentRegistry.registerElementType('donate', DonateElement, {
            controlPanelConfig: [],
            capabilities: []
        });
        logger.debug('Donate element type registered.');
    } else {
        logger.debug('Skipping Donate element registration (includeDonate feature is not enabled).');
    }


    // Register Favorite Toggle element
    ComponentRegistry.registerElementType('favorite-toggle', FavoriteToggleElement, {
        controlPanelConfig: [],
        capabilities: []
    });

    // Register Next Background Button element
    ComponentRegistry.registerElementType('next-background-button', NextBackgroundButtonElement, {
        controlPanelConfig: [], // No controls needed
        capabilities: []      // No capabilities needed
    });

    // Register Fullscreen Toggle element
    ComponentRegistry.registerElementType('fullscreen-toggle', FullscreenToggleElement, {
        controlPanelConfig: [], // No controls needed
        capabilities: []      // No capabilities needed
    });

    // Register Control Panel Toggle element
    ComponentRegistry.registerElementType('control-panel-toggle', ControlPanelToggleElement, {
        controlPanelConfig: [], // No controls needed
        capabilities: []      // No capabilities needed
    });


    logger.debug('Element type registration complete.'); // Changed to debug
}
