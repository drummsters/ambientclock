/**
 * LEDClock class for the Ambient Clock application
 * A digital LED-style clock face
 */

import { Element } from '../element.js';
import { getState } from '../../state.js';
import { updateText } from '../../utils/dom.js';
import { getCurrentTime, formatHours, padZero } from '../../utils/time.js';

/**
 * LEDClock class that inherits from Element
 */
export class LEDClock extends Element {
    /**
     * Creates a new LEDClock instance
     */
    constructor() {
        super('clock', 'clock-container', 'led-clock');
        this.hoursElement = null;
        this.minutesElement = null;
        this.secondsElement = null;
        this.ampmElement = null;
    }

    /**
     * Initializes the LED clock
     */
    init() {
        // Call parent init method
        if (!super.init()) {
            return false;
        }
        
        // Get DOM elements
        this.hoursElement = document.getElementById('led-hours');
        this.minutesElement = document.getElementById('led-minutes');
        this.secondsElement = document.getElementById('led-seconds');
        this.ampmElement = document.getElementById('led-ampm');
        
        if (!this.hoursElement || !this.minutesElement || !this.secondsElement || !this.ampmElement) {
            console.error("LED clock elements not found");
            return false;
        }
        
        return true;
    }

    /**
     * Updates the LED clock display
     */
    update() {
        if (!this.hoursElement || !this.minutesElement || !this.secondsElement || !this.ampmElement) {
            return;
        }
        
        const { hours, minutes, seconds, ampm } = getCurrentTime();
        const state = getState();
        const timeFormat = state.timeFormat || (state.global && state.global.timeFormat) || '24';
        const showSeconds = state.showSeconds || (state.global && state.global.showSeconds) || true;
        
        // Format hours based on time format
        const displayHours = formatHours(hours, timeFormat);
        
        // Update hours display
        if (this.hoursElement) {
            updateText(this.hoursElement, padZero(displayHours));
        }
        
        // Update minutes display
        if (this.minutesElement) {
            updateText(this.minutesElement, padZero(minutes));
        }
        
        // Update seconds display based on showSeconds
        if (showSeconds) {
            if (this.secondsElement) {
                updateText(this.secondsElement, padZero(seconds));
                this.secondsElement.style.display = '';
                
                // Show the colon before seconds
                const colonBeforeSeconds = this.secondsElement.previousSibling;
                if (colonBeforeSeconds && colonBeforeSeconds.style) {
                    colonBeforeSeconds.style.display = '';
                }
            }
        } else {
            if (this.secondsElement) {
                this.secondsElement.style.display = 'none';
                
                // Hide the colon before seconds
                const colonBeforeSeconds = this.secondsElement.previousSibling;
                if (colonBeforeSeconds && colonBeforeSeconds.style) {
                    colonBeforeSeconds.style.display = 'none';
                }
            }
        }
        
        // Update AM/PM indicator for 12-hour format
        if (timeFormat === '12') {
            if (this.ampmElement) {
                updateText(this.ampmElement, ampm);
                this.ampmElement.style.display = '';
            }
        } else {
            if (this.ampmElement) {
                this.ampmElement.style.display = 'none';
            }
        }
    }
}
