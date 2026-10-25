/**
 * Stores a rectangle used during chart layout.
 */
export default class Rect {
    /**
     * Creates a Rect.
     * @param {number} x The X position.
     * @param {number} y The Y position.
     * @param {number} width The width.
     * @param {number} height The height.
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Gets the bottom position.
     * @returns {number} The bottom position.
     */
    get bottom() {
        return this.y + this.height;
    }

    /**
     * Gets the center X position.
     * @returns {number} The center X position.
     */
    get centerX() {
        return this.x + (this.width / 2);
    }

    /**
     * Gets the center Y position.
     * @returns {number} The center Y position.
     */
    get centerY() {
        return this.y + (this.height / 2);
    }

    /**
     * Gets the left position.
     * @returns {number} The left position.
     */
    get left() {
        return this.x;
    }

    /**
     * Gets the right position.
     * @returns {number} The right position.
     */
    get right() {
        return this.x + this.width;
    }

    /**
     * Gets the top position.
     * @returns {number} The top position.
     */
    get top() {
        return this.y;
    }

    /**
     * Creates an independent copy of the rectangle.
     * @returns {Rect} A new Rect.
     */
    clone() {
        return new Rect(this.x, this.y, this.width, this.height);
    }
}
