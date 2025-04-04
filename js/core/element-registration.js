import { ComponentRegistry } from './component-registry.js';
import { ClockElement } from '../components/elements/clock-element.js';
import { DateElement } from '../components/elements/date-element.js';
import { ControlsHintElement } from '../components/elements/controls-hint-element.js';
import { BackgroundInfoElement } from '../components/elements/background-info-element.js';
import { DonateElement } from '../components/elements/donate-element.js';
import { FavoriteToggleElement } from '../components/elements/favorite-toggle-element.js';
import { NextBackgroundButtonElement } from '../components/elements/next-background-button.js';
import * as logger from '../utils/logger.js'; // Import the logger

/**
 * Registers all known UI element types with the ComponentRegistry.
 */
export function registerElementTypes() {
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

    // Register Donate element
    ComponentRegistry.registerElementType('donate', DonateElement, {
        controlPanelConfig: [],
        capabilities: []
    });

    // Register Favorite Toggle element
    ComponentRegistry.registerElementType('FavoriteToggleElement', FavoriteToggleElement, {
        controlPanelConfig: [],
        capabilities: []
    });

    // Register Next Background Button element
    ComponentRegistry.registerElementType('next-background-button', NextBackgroundButtonElement, {
        controlPanelConfig: [], // No controls needed
        capabilities: []      // No capabilities needed
    });

    logger.debug('Element type registration complete.'); // Changed to debug
}
