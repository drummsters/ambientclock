/**
 * Custom error class for rate limit errors.
 */
export class RateLimitError extends Error {
    constructor(message, resetTimestamp = null) {
        super(message);
        this.name = 'RateLimitError';
        this.resetTimestamp = resetTimestamp;
    }
}
