/**
 * Time utility functions for the Ambient Clock application
 */

/**
 * Pads a number with leading zeros (e.g., 9 -> "09")
 * @param {number} num - The number to pad
 * @returns {string} The padded number as a string
 */
export function padZero(num) {
    return num.toString().padStart(2, '0');
}

/**
 * Gets the current date
 * @returns {Date} The current date
 */
export function getCurrentDate() {
    return new Date();
}

/**
 * Formats a date according to the specified format
 * @param {Date} date - The date to format
 * @param {string} format - The format to use
 * @returns {string} The formatted date
 */
export function formatDate(date, format) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
    const monthName = date.toLocaleDateString('en-US', { month: 'long' }); // e.g., "January"
    
    switch (format) {
        case 'MM/DD/YYYY':
            return `${padZero(month)}/${padZero(day)}/${year}`;
        case 'DD/MM/YYYY':
            return `${padZero(day)}/${padZero(month)}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${padZero(month)}-${padZero(day)}`;
        case 'Day':
            return dayOfWeek;
        case 'Day, Month DD':
            return `${dayOfWeek}, ${monthName} ${day}`;
        case 'Month DD, YYYY':
            return `${monthName} ${day}, ${year}`;
        default:
            return `${padZero(month)}/${padZero(day)}/${year}`;
    }
}

/**
 * Gets the current time components
 * @returns {Object} Object containing hours, minutes, seconds, and AM/PM indicator
 */
export function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    return { hours, minutes, seconds, ampm };
}

/**
 * Formats hours based on the time format (12 or 24 hour)
 * @param {number} hours - The hours value (0-23)
 * @param {string} timeFormat - The time format ('12' or '24')
 * @returns {number} The formatted hours value
 */
export function formatHours(hours, timeFormat) {
    if (timeFormat === '12') {
        let displayHours = hours % 12;
        if (displayHours === 0) displayHours = 12; // 0 should display as 12 in 12-hour format
        return displayHours;
    }
    return hours;
}

/**
 * Calculates the rotation degrees for analog clock hands
 * @param {number} hours - The hours value (0-23)
 * @param {number} minutes - The minutes value (0-59)
 * @param {number} seconds - The seconds value (0-59)
 * @returns {Object} Object containing rotation degrees for hour, minute, and second hands
 */
export function calculateHandDegrees(hours, minutes, seconds) {
    const secondsDeg = seconds * 6; // 6 degrees per second
    const minutesDeg = minutes * 6 + seconds * 0.1; // 6 degrees per minute + slight adjustment for seconds
    const hoursDeg = (hours % 12) * 30 + minutes * 0.5; // 30 degrees per hour + adjustment for minutes
    
    return { hoursDeg, minutesDeg, secondsDeg };
}
