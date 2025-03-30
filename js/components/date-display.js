/**
 * DateDisplay class for the Ambient Clock application
 * Manages the date display and its interactions
 */

import { Element } from './element.js';
import { getState, updateState } from '../state.js';
import { getCurrentDate, formatDate } from '../utils/time.js';
import { CUSTOM_POSITION_INDEX } from '../config.js';

/**
 * DateDisplay class that inherits from Element
 */
export class DateDisplay extends Element {
    /**
     * Creates a new DateDisplay instance
     */
    constructor() {
        super('date', 'date-container', 'date-face');
    }

    /**
     * Initializes the date display
     */
    init() {
        // Call parent init method
        if (!super.init()) {
            return false;
        }
        
        // Set initial styles
        this.applyFontFamily();
        this.applyColor();
        
        // Set initial visibility
        const state = getState();
        
        // Check if showDate is explicitly defined in state
        let showDate;
        if (state.showDate !== undefined) {
            showDate = state.showDate;
        } else if (state.date && state.date.showDate !== undefined) {
            showDate = state.date.showDate;
        } else {
            showDate = false; // Default value if not specified
        }
        
        this.container.style.display = showDate ? 'block' : 'none';
        
        // Initial update
        this.update();
        
        return true;
    }

    /**
     * Applies the font family to the date display
     */
    applyFontFamily() {
        if (!this.face) return;
        
        const { fontFamily } = getState();
        if (fontFamily) {
            this.face.style.fontFamily = fontFamily;
        }
    }

    /**
     * Applies the color to the date display
     */
    applyColor() {
        if (!this.face) return;
        
        const { dateColor } = getState();
        if (dateColor) {
            this.face.style.color = dateColor;
        }
    }

    /**
     * Updates the date display
     */
    update() {
        if (!this.face) return;
        
        const state = getState();
        
        // Check if showDate is explicitly defined in state
        let showDate;
        if (state.showDate !== undefined) {
            showDate = state.showDate;
        } else if (state.date && state.date.showDate !== undefined) {
            showDate = state.date.showDate;
        } else {
            showDate = false; // Default value if not specified
        }
        
        const dateFormat = state.dateFormat || (state.date && state.date.dateFormat) || 'MM/DD/YYYY';
        
        // Update visibility
        this.container.style.display = showDate ? 'block' : 'none';
        
        if (showDate) {
            const date = getCurrentDate();
            const formattedDate = formatDate(date, dateFormat);
            this.face.textContent = formattedDate;
            
            // Ensure the date has the correct styles
            this.applyColor();
            this.applyScale();
            
            // Check if date position is valid (within viewport)
            const { dateCustomPositionX, dateCustomPositionY, datePositionIndex } = getState();
            
            // Only apply position if we're not in custom position mode or if the position is invalid
            if (dateCustomPositionX > 100 || dateCustomPositionY > 100 || 
                dateCustomPositionX < 0 || dateCustomPositionY < 0) {
                // Reset to default position
                this.resetPosition();
            } else if (datePositionIndex !== CUSTOM_POSITION_INDEX) {
                // Only apply position if we're not in custom position mode
                // This prevents overriding the position during dragging
                this.applyPosition();
            }
        }
    }

    /**
     * Updates the date color
     * @param {string} color - The color to set
     */
    updateColor(color) {
        if (!this.face) return;
        
        this.face.style.color = color;
        
        // Update state
        updateState({ dateColor: color });
    }

    /**
     * Resets the date position to default (centered below the clock)
     */
    resetPosition() {
        if (!this.container) return;
        
        // Default position (centered horizontally, below the clock)
        const defaultX = 50;
        const defaultY = 60;
        
        // Update state to indicate we're not in custom position mode
        updateState({
            datePositionIndex: 0, // Default position
            dateCustomPositionX: defaultX,
            dateCustomPositionY: defaultY
        }, false, true); // Don't save immediately, skip notifying subscribers
        
        // Apply the new position
        this.applyPosition();
    }

    /**
     * Sets the date format
     * @param {string} format - The date format to use
     */
    setFormat(format) {
        // Update state
        updateState({ dateFormat: format });
        
        // Update display
        this.update();
    }

    /**
     * Shows or hides the date display
     * @param {boolean} show - Whether to show the date
     */
    setVisibility(show) {
        // Update state using the new structure
        updateState({
            date: {
                showDate: show
            }
        });
        
        // Update visibility
        if (this.container) {
            this.container.style.display = show ? 'block' : 'none';
        }
        
        // Update display if showing
        if (show) {
            this.update();
        }
    }
}
