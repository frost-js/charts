/** @import { ChartFont, ChartOptions } from './chart.js'; */

import { parseNumber, parsePositiveNumber } from './helpers.js';

/**
 * Copies nested arrays and plain objects, preserving other values by reference.
 * @param {*} value The option value.
 * @returns {*} The copied array or plain object, or the original value.
 */
function cloneOption(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneOption(item));
    }

    return isPlainObject(value) ? mergeOptions(value) : value;
}

/**
 * Freezes copied arrays and plain objects without freezing caller-owned values.
 * @param {object} options The copied options.
 * @returns {object} The frozen options.
 */
export function freezeOptions(options) {
    if (!Array.isArray(options) && !isPlainObject(options)) {
        return options;
    }

    for (const value of Object.values(options)) {
        if (Array.isArray(value) || isPlainObject(value)) {
            freezeOptions(value);
        }
    }

    return Object.freeze(options);
}

/**
 * Checks for a plain object, including objects from another realm.
 * @param {*} value The value to check.
 * @returns {boolean} Whether the value is a plain object.
 */
function isPlainObject(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === null || Object.getPrototypeOf(prototype) === null;
}

/**
 * Merges option objects, cloning arrays instead of merging their entries.
 * @param {...object} sources The option sources in precedence order.
 * @returns {object} The merged options.
 */
export function mergeOptions(...sources) {
    const options = {};

    for (const source of sources) {
        if (source == null) {
            continue;
        }

        for (const [key, value] of Object.entries(source)) {
            if (['__proto__', 'constructor', 'prototype'].includes(key)) {
                continue;
            }

            if (isPlainObject(value)) {
                const current = isPlainObject(options[key]) ? options[key] : {};

                options[key] = mergeOptions(current, value);
            } else {
                options[key] = cloneOption(value);
            }
        }
    }

    return options;
}

/**
 * Resolves an inherited font and normalizes its dimensions.
 * @param {ChartFont} font The font overrides.
 * @param {ChartFont} defaults The inherited font.
 * @returns {ChartFont} The resolved font.
 */
function normalizeFont(font, defaults) {
    const resolved = mergeOptions(defaults, font);

    resolved.size = parsePositiveNumber(resolved.size, defaults.size);
    resolved.lineHeight = parsePositiveNumber(resolved.lineHeight, defaults.lineHeight);

    return resolved;
}

/**
 * Resolves fonts and numeric options using the component defaults.
 * @param {ChartOptions} options The merged chart options.
 * @param {ChartOptions} defaults The component defaults.
 * @returns {ChartOptions} The normalized options.
 * @throws {TypeError} When the chart type is unsupported.
 */
export function normalizeOptions(options, defaults) {
    if (!['bar', 'line', 'area', 'pie', 'donut', 'scatter', 'polarArea', 'radar'].includes(options.type)) {
        throw new TypeError('Chart type must be bar, line, area, pie, donut, scatter, polarArea, or radar.');
    }

    options.font = normalizeFont(options.font, defaults.font);
    options.layout.padding = Math.max(0, parseNumber(options.layout.padding, defaults.layout.padding));
    options.animation.duration = Math.max(0, parseNumber(options.animation.duration, defaults.animation.duration));

    const cutout = parseNumber(options.cutout, defaults.cutout);

    options.cutout = cutout >= 0 && cutout < 1 ? cutout : defaults.cutout;

    for (const name of ['title', 'legend']) {
        const layer = options[name];

        if (!['top', 'right', 'bottom', 'left'].includes(layer.position)) {
            layer.position = defaults[name].position;
        }
    }

    options.title.padding = Math.max(0, parseNumber(options.title.padding, defaults.title.padding));
    options.title.font = normalizeFont(options.title.font, options.font);

    const labels = options.legend.labels;
    const defaultLabels = defaults.legend.labels;

    labels.font = normalizeFont(labels.font, options.font);
    labels.padding = Math.max(0, parseNumber(labels.padding, defaultLabels.padding));
    labels.boxWidth = Math.max(0, parseNumber(labels.boxWidth, defaultLabels.boxWidth));
    labels.boxHeight = Math.max(0, parseNumber(labels.boxHeight, defaultLabels.boxHeight));

    for (const dimension of ['maxWidth', 'maxHeight']) {
        if (options.legend[dimension] != null) {
            options.legend[dimension] = Math.max(0, parseNumber(options.legend[dimension], Infinity));
        }
    }

    for (const name of ['x', 'y']) {
        const axis = options.scales[name];
        const defaultAxis = defaults.scales[name];

        axis.grid.tickLength = Math.max(0, parseNumber(axis.grid.tickLength, defaultAxis.grid.tickLength));
        axis.grid.lineWidth = Math.max(0, parseNumber(axis.grid.lineWidth, defaultAxis.grid.lineWidth));
        axis.grid.borderWidth = Math.max(0, parseNumber(axis.grid.borderWidth, defaultAxis.grid.borderWidth));

        axis.ticks.padding = Math.max(0, parseNumber(axis.ticks.padding, defaultAxis.ticks.padding));
        axis.ticks.font = normalizeFont(axis.ticks.font, options.font);
    }

    const radial = options.scales.r;
    const defaultRadial = defaults.scales.r;

    radial.grid.lineWidth = Math.max(0, parseNumber(radial.grid.lineWidth, defaultRadial.grid.lineWidth));
    radial.labels.padding = Math.max(0, parseNumber(radial.labels.padding, defaultRadial.labels.padding));
    radial.labels.font = normalizeFont(radial.labels.font, options.font);
    radial.ticks.font = normalizeFont(radial.ticks.font, options.font);

    const tooltip = options.tooltip;
    const defaultTooltip = defaults.tooltip;

    tooltip.padding = Math.max(0, parseNumber(tooltip.padding, defaultTooltip.padding));
    tooltip.borderRadius = Math.max(0, parseNumber(tooltip.borderRadius, defaultTooltip.borderRadius));
    tooltip.arrowSize = Math.max(0, parseNumber(tooltip.arrowSize, defaultTooltip.arrowSize));
    tooltip.font = normalizeFont(tooltip.font, options.font);

    return options;
}
