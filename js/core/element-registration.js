import { ComponentRegistry } from './component-registry.js';
import { ClockElement } from '../components/elements/clock-element.js';
import { DateElement } from '../components/elements/date-element.js';
import { ControlsHintElement } from '../components/elements/controls-hint-element.js';
import { BackgroundInfoElement } from '../components/elements/background-info-element.js';
// DonateElement is imported conditionally below
import { FavoriteToggleElement } from '../components/elements/favorite-toggle-element.js';
import { NextBackgroundButtonElement } from '../components/elements/next-background-button.js';
import { FullscreenToggleElement } from '../components/elements/fullscreen-toggle-element.js';
import { ControlPanelToggleElement } from '../components/elements/control-panel-toggle-element.js';
import * as logger from '../utils/logger.js'; // Import the logger

/**
 * Registers all known UI element types with the ComponentRegistry.
 */
export async function registerElementTypes() { // Make async for dynamic import
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

    // Conditionally register Donate element (Vercel Only)
    if (import.meta.env.INCLUDE_DONATE === 'true') {
        try {
            const { DonateElement } = await import('../components/elements/donate-element.js');
            ComponentRegistry.registerElementType('donate', DonateElement, {
                controlPanelConfig: [],
                capabilities: []
            });
            logger.debug('Donate element type registered.');
        } catch (error) {
            logger.error('Failed to dynamically import or register DonateElement:', error);
        }
    } else {
        logger.debug('Skipping Donate element registration (INCLUDE_DONATE is not true).');
    }


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
