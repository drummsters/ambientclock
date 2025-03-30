/**
 * AnalogClock class for the Ambient Clock application
 * A traditional analog clock face with hour, minute, and second hands
 */

import { Element } from '../element.js';
import { getState } from '../../state.js';
import { getCurrentTime, calculateHandDegrees } from '../../utils/time.js';

/**
 * AnalogClock class that inherits from Element
 */
export class AnalogClock extends Element {
    /**
     * Creates a new AnalogClock instance
     */
    constructor() {
        super('clock', 'clock-container', 'analog-clock');
        this.hourHand = null;
        this.minuteHand = null;
        this.secondHand = null;
    }

    /**
     * Initializes the analog clock
     */
    init() {
        // Call parent init method
        if (!super.init()) {
            return false;
        }
        
        // Get DOM elements
        this.hourHand = document.getElementById('analog-hour');
        this.minuteHand = document.getElementById('analog-minute');
        this.secondHand = document.getElementById('analog-second');
        
        if (!this.hourHand || !this.minuteHand || !this.secondHand) {
            console.error("Analog clock elements not found");
            return false;
        }
        
        return true;
    }

    /**
     * Updates the analog clock display
     */
    update() {
        if (!this.hourHand || !this.minuteHand || !this.secondHand) {
            return;
        }
        
        const { hours, minutes, seconds } = getCurrentTime();
        const state = getState();
        const showSeconds = state.showSeconds || (state.global && state.global.showSeconds) || true;
        
        // Calculate rotation degrees for each hand
        const { hoursDeg, minutesDeg, secondsDeg } = calculateHandDegrees(hours, minutes, seconds);
        
        // Update hand rotations
        if (this.hourHand && this.hourHand.style) {
            this.hourHand.style.transform = `rotate(${hoursDeg}deg)`;
        }
        
        if (this.minuteHand && this.minuteHand.style) {
            this.minuteHand.style.transform = `rotate(${minutesDeg}deg)`;
        }
        
        // Update second hand only if seconds are shown
        if (showSeconds) {
            if (this.secondHand && this.secondHand.style) {
                this.secondHand.style.transform = `rotate(${secondsDeg}deg)`;
                this.secondHand.style.display = '';
            }
        } else {
            if (this.secondHand && this.secondHand.style) {
                this.secondHand.style.display = 'none';
            }
        }
    }
}
