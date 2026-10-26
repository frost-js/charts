/** @import { ChartFont } from './chart.js'; */

/**
 * @typedef {object} ChartTextMetrics
 * @property {number} width The measured text width.
 * @property {number} fontBoundingBoxAscent The distance above the baseline.
 * @property {number} fontBoundingBoxDescent The distance below the baseline.
 */

/**
 * Measures text using a font-metric fallback for older canvas implementations.
 * @param {CanvasRenderingContext2D} context The measuring context.
 * @param {string|number} text The text to measure.
 * @returns {ChartTextMetrics} The text width, ascent, and descent.
 */
export function measureText(context, text) {
    const metrics = context.measureText(String(text));
    const match = context.font.match(/([\d.]+)px/);
    const fontSize = match ? Number(match[1]) : 12;

    return {
        width: metrics.width,
        fontBoundingBoxAscent: metrics.fontBoundingBoxAscent ?? fontSize * .8,
        fontBoundingBoxDescent: metrics.fontBoundingBoxDescent ?? fontSize * .2,
    };
}

/**
 * Parses a finite numeric value, using a fallback for missing or invalid input.
 * @param {*} value The value to parse.
 * @param {number} fallback The fallback value.
 * @returns {number} The parsed value or fallback.
 */
export function parseNumber(value, fallback) {
    if (
        !['number', 'string'].includes(typeof value) ||
        `${value}`.trim() === ''
    ) {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

/**
 * Parses a positive finite number, using a fallback for invalid input.
 * @param {*} value The value to parse.
 * @param {number} fallback The positive fallback value.
 * @returns {number} The positive number or fallback.
 */
export function parsePositiveNumber(value, fallback) {
    const number = parseNumber(value, fallback);

    return number > 0 ? number : fallback;
}

/**
 * Sets a canvas font from the resolved chart font options.
 * @param {CanvasRenderingContext2D} context The drawing context.
 * @param {ChartFont} font The resolved font options.
 */
export function updateFont(context, font) {
    const style = font.style || 'normal';

    context.font = `${style} ${font.weight} ${font.size}px ${font.family}`;
}

/**
 * Wraps text at word boundaries and splits words wider than the available space.
 * @param {CanvasRenderingContext2D} context The measuring context.
 * @param {string} text The text to wrap.
 * @param {number} maxWidth The maximum line width.
 * @returns {string[]} The wrapped lines.
 */
export function wrapLines(context, text, maxWidth) {
    if (maxWidth <= 0) {
        return [];
    }

    const lines = [];

    for (const paragraph of String(text).split('\n')) {
        let line = '';

        for (const word of paragraph.split(/\s+/)) {
            const nextLine = line ? `${line} ${word}` : word;

            if (measureText(context, nextLine).width <= maxWidth) {
                line = nextLine;
                continue;
            }

            if (line) {
                lines.push(line);
                line = '';
            }

            for (const character of word) {
                if (line && measureText(context, line + character).width > maxWidth) {
                    lines.push(line);
                    line = '';
                }

                line += character;
            }
        }

        lines.push(line);
    }

    return lines;
}
