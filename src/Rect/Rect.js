/**
 * @class Rect
 */
class Rect {

    /**
     * New Rect constructor.
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
     * Clone the Rect.
     * @returns {Rect} A new Rect.
     */
    clone() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    /**
     * Get the bottom position.
     * @returns {number} The bottom position.
     */
    get bottom() {
        return this.y + this.height;
    }

    /**
     * Get the center X position.
     * @returns {number} The center X position.
     */
    get centerX() {
        return this.x + (this.width / 2);
    }

    /**
     * Get the center Y position.
     * @returns {number} The center Y position.
     */
    get centerY() {
        return this.y + (this.height / 2);
    }

    /**
     * Get the left position.
     * @returns {number} The left position.
     */
    get left() {
        return this.x;
    }

    /**
     * Get the right position.
     * @returns {number} The right position.
     */
    get right() {
        return this.x + this.width;
    }

    /**
     * Get the top position.
     * @returns {number} The top position.
     */
    get top() {
        return this.y;
    }

}
