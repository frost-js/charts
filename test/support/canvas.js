/** @import { Locator } from '@playwright/test'; */

/**
 * Reads one canvas pixel as red, green, blue, and alpha values.
 * @param {Locator} canvas The canvas locator.
 * @param {number} x The pixel's x coordinate.
 * @param {number} y The pixel's y coordinate.
 * @returns {Promise<number[]>} The pixel's RGBA values.
 */
export function getPixel(canvas, x, y) {
    return canvas.evaluate((node, [x, y]) => {
        return Array.from(node.getContext('2d').getImageData(x, y, 1, 1).data);
    }, [x, y]);
}
