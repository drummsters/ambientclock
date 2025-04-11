import * as logger from '../utils/logger.js';
import { StateManager } from '../core/state-manager.js';
import { FavoritesStorage } from './storage/FavoritesStorage.js';
import { EventBus } from '../core/event-bus.js'; // Import EventBus

const favoritesStorage = new FavoritesStorage();
const SETTINGS_FILE_NAME = 'clock_page_settings.json';

/**
 * @class SettingsIOService
 * @description Handles exporting and importing user settings and favorites.
 */
export class SettingsIOService {
    constructor() {
        logger.log('[SettingsIOService] Initialized.');
    }

    /**
     * Gathers current settings and favorites and triggers a download.
     */
    exportSettings() {
        try {
            const currentState = StateManager.getState(); // Use correct StateManager object
            const favorites = favoritesStorage.getAll();

            const exportData = {
                version: 2, // Add a version number for future compatibility
                timestamp: new Date().toISOString(),
                state: {
                    settings: currentState.settings,
                    elements: currentState.elements,
                    // Exclude potentially sensitive or transient state like currentImageMetadata
                },
                favorites: favorites
            };

            const jsonString = JSON.stringify(exportData, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = SETTINGS_FILE_NAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            logger.log('[SettingsIOService] Settings exported successfully.');
            // Optionally show a success toast/message to the user

        } catch (error) {
            logger.error('[SettingsIOService] Error exporting settings:', error);
            // Optionally show an error toast/message to the user
        }
    }

    /**
     * Reads the provided settings file and applies the settings.
     * @param {File} file - The file object selected by the user.
     */
    async importSettings(file) {
        if (!file) {
            logger.error('[SettingsIOService] No file provided for import.');
            return;
        }

        if (file.name !== SETTINGS_FILE_NAME) {
            // Basic check, could be more robust
            logger.warn(`[SettingsIOService] Imported file name "${file.name}" does not match expected "${SETTINGS_FILE_NAME}". Proceeding cautiously.`);
            // Optionally ask user for confirmation
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const importData = JSON.parse(content);

                // --- Start Validation ---
                // 1. Basic structure validation
                if (!importData || typeof importData !== 'object' || !importData.state || !importData.favorites || !Array.isArray(importData.favorites)) {
                    throw new Error('Invalid settings file format: Missing top-level keys (state, favorites).');
                }
                // 2. Version check (Warning only)
                if (importData.version !== 2) {
                    logger.warn(`[SettingsIOService] Settings file version (${importData.version}) does not match current version (2). Compatibility issues may arise.`);
                }
                // 3. Detailed structure validation
                if (!this._validateImportData(importData)) {
                    // Error will be thrown inside _validateImportData if invalid
                    // This check is slightly redundant if _validateImportData throws, but good practice
                    throw new Error('Imported data failed detailed validation.');
                }
                // --- End Validation ---


                // Apply settings - Use StateManager's update method
                logger.log('[SettingsIOService] Applying validated imported state:', importData.state);
                StateManager.update({
                    settings: importData.state.settings,
                    elements: importData.state.elements
                    // This will merge/overwrite the settings and elements sections
                });

                // Apply favorites
                const success = favoritesStorage.saveAll(importData.favorites);
                if (!success) {
                    throw new Error('Failed to save imported favorites.');
                }

                logger.log('[SettingsIOService] Settings imported successfully. Publishing event.');

                // Publish an event indicating settings have been imported
                EventBus.publish('settings:imported', { state: importData.state, favorites: importData.favorites });

                // Inform the user that a manual refresh might be needed
                alert('Settings imported. Some changes might require a manual page refresh to take full effect.');

            } catch (error) {
                logger.error('[SettingsIOService] Error processing imported settings:', error);
                alert(`Error importing settings: ${error.message}`); // Show error to user
            }
        };

        reader.onerror = (error) => {
            logger.error('[SettingsIOService] Error reading file:', error);
            alert(`Error reading file: ${error.message}`); // Show error to user
        };

        reader.readAsText(file); // Read the file content
    }

    /**
     * Performs detailed validation on the structure and types of imported data.
     * Throws an error if validation fails.
     * @param {object} data - The parsed data from the imported file.
     * @returns {boolean} True if data is valid.
     * @private
     */
    _validateImportData(data) {
        const state = data.state;
        if (!state || typeof state !== 'object') throw new Error('Validation failed: Missing or invalid "state" object.');

        // Validate settings structure
        const settings = state.settings;
        if (!settings || typeof settings !== 'object') throw new Error('Validation failed: Missing or invalid "state.settings" object.');
        if (!settings.background || typeof settings.background !== 'object') throw new Error('Validation failed: Missing or invalid "state.settings.background" object.');
        if (typeof settings.background.type !== 'string') throw new Error('Validation failed: Invalid "settings.background.type".');
        if (typeof settings.background.provider !== 'string') throw new Error('Validation failed: Invalid "settings.background.provider".');
        if (typeof settings.background.overlayOpacity !== 'number') throw new Error('Validation failed: Invalid "settings.background.overlayOpacity".');
        // Add more settings checks as needed...

        // Validate elements structure
        const elements = state.elements;
        if (!elements || typeof elements !== 'object') throw new Error('Validation failed: Missing or invalid "state.elements" object.');

        for (const id in elements) {
            if (Object.hasOwnProperty.call(elements, id)) {
                const element = elements[id];
                if (!element || typeof element !== 'object') throw new Error(`Validation failed: Invalid element object for id "${id}".`);
                if (typeof element.type !== 'string') throw new Error(`Validation failed: Invalid "type" for element "${id}".`);
                if (typeof element.id !== 'string' || element.id !== id) throw new Error(`Validation failed: Invalid or mismatched "id" for element "${id}".`);
                if (element.position && (typeof element.position !== 'object' || typeof element.position.x !== 'number' || typeof element.position.y !== 'number')) throw new Error(`Validation failed: Invalid "position" for element "${id}".`);
                if (element.scale !== undefined && typeof element.scale !== 'number') throw new Error(`Validation failed: Invalid "scale" for element "${id}".`);
                if (element.opacity !== undefined && typeof element.opacity !== 'number') throw new Error(`Validation failed: Invalid "opacity" for element "${id}".`);
                if (!element.options || typeof element.options !== 'object') throw new Error(`Validation failed: Missing or invalid "options" for element "${id}".`);
                // Add more element checks as needed...
            }
        }

        logger.debug('[SettingsIOService] Import data passed detailed validation.');
        return true; // Data is valid
    }
}
