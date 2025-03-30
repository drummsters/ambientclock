/**
 * CleanClock class for the Ambient Clock application
 * A clock face that can show or hide seconds
 */

import { Element } from '../element.js';
import { getState, updateState } from '../../state.js';
import { updateText } from '../../utils/dom.js';
import { getCurrentTime, formatHours, padZero } from '../../utils/time.js';

/**
 * CleanClock class that inherits from Element
 */
export class CleanClock extends Element {
    /**
     * Creates a new CleanClock instance
     */
    constructor() {
        super('clock', 'clock-container', 'clean-clock');
        this.hoursElement = null;
        this.minutesElement = null;
        this.secondsElement = null;
    }

    /**
     * Initializes the clean clock
     */
    init() {
        // Call parent init method
        if (!super.init()) {
            return false;
        }
        
        // Get DOM elements
        this.hoursElement = document.getElementById('clean-hours');
        this.minutesElement = document.getElementById('clean-minutes');
        this.secondsElement = document.getElementById('clean-seconds');
        
        if (!this.hoursElement || !this.minutesElement || !this.secondsElement) {
            console.error("Clean clock elements not found");
            return false;
        }
        
        // Apply color
        this.applyColor();
        
        return true;
    }

    /**
     * Applies the color to the clean clock
     */
    applyColor() {
        if (!this.face) return;
        
        const state = getState();
        const cleanClockColor = state.cleanClockColor || (state.clock && state.clock.cleanClockColor) || '#FFFFFF';
        if (cleanClockColor) {
            this.face.style.color = cleanClockColor;
        }
    }

    /**
     * Updates the clean clock display
     */
    update() {
        if (!this.hoursElement || !this.minutesElement || !this.secondsElement) {
            return;
        }
        
        const { hours, minutes, seconds, ampm } = getCurrentTime();
        const state = getState();
        const timeFormat = state.timeFormat || (state.global && state.global.timeFormat) || '24';
        
        // Check if showSeconds is explicitly defined in state
        let showSeconds;
        if (state.showSeconds !== undefined) {
            showSeconds = state.showSeconds;
        } else if (state.global && state.global.showSeconds !== undefined) {
            showSeconds = state.global.showSeconds;
        } else {
            showSeconds = true; // Default value if not specified
        }
        
        // Format hours based on time format
        const displayHours = formatHours(hours, timeFormat);
        
        // Update hours display
        if (this.hoursElement) {
            if (timeFormat === '12') {
                updateText(this.hoursElement, displayHours); // No padding in 12-hour format
            } else {
                updateText(this.hoursElement, padZero(displayHours));
            }
        }
        
        // Get the colon after minutes (it's the text node between minutes and seconds)
        const colonAfterMinutes = this.secondsElement ? this.secondsElement.previousSibling : null;
        
        // Update minutes and seconds display based on showSeconds
        if (showSeconds && this.secondsElement) {
            // Show seconds element and the colon before it
            if (this.secondsElement && this.secondsElement.style) {
                this.secondsElement.style.display = '';
            }
            
            if (colonAfterMinutes && typeof colonAfterMinutes.textContent !== 'undefined') {
                colonAfterMinutes.textContent = ':';
            }
            
            // Update minutes display
            if (this.minutesElement) {
                updateText(this.minutesElement, padZero(minutes));
            }
            
            // Update seconds display
            if (this.secondsElement) {
                if (timeFormat === '12') {
                    updateText(this.secondsElement, `${padZero(seconds)} ${ampm}`);
                } else {
                    updateText(this.secondsElement, padZero(seconds));
                }
            }
        } else {
            // Hide seconds element and the colon before it
            if (this.secondsElement && this.secondsElement.style) {
                this.secondsElement.style.display = 'none';
            }
            
            if (colonAfterMinutes && typeof colonAfterMinutes.textContent !== 'undefined') {
                colonAfterMinutes.textContent = '';
            }
            
            // Update minutes display with AM/PM if in 12-hour format
            if (this.minutesElement) {
                if (timeFormat === '12') {
                    updateText(this.minutesElement, `${padZero(minutes)} ${ampm}`);
                } else {
                    updateText(this.minutesElement, padZero(minutes));
                }
            }
        }
    }

    /**
     * Updates the clean clock color
     * @param {string} color - The color to set
     */
    updateColor(color) {
        if (!this.face) return;
        
        this.face.style.color = color;
        
        // Update state using the new structure
        updateState({
            clock: {
                cleanClockColor: color
            }
        });
    }
}
