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

            if (Array.isArray(value)) {
                options[key] = value.map((item) => {
                    return item && typeof item === 'object' ? mergeOptions(item) : item;
                });
            } else if (value && typeof value === 'object') {
                options[key] = mergeOptions(options[key], value);
            } else {
                options[key] = value;
            }
        }
    }

    return options;
}

/**
 * Validates a nonnegative numeric option.
 * @param {number} value The supplied value.
 * @param {string} name The option path used in the error message.
 */
function validateDimension(value, name) {
    if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`${name} must be a finite, nonnegative number.`);
    }
}

/**
 * Validates the resolved font used by a chart layer.
 * @param {object} font The font settings.
 * @param {string} name The option path used in the error message.
 */
function validateFont(font, name) {
    if (!Number.isFinite(font.size) || font.size <= 0) {
        throw new RangeError(`${name}.size must be a positive, finite number.`);
    }

    if (!Number.isFinite(font.lineHeight) || font.lineHeight <= 0) {
        throw new RangeError(`${name}.lineHeight must be a positive, finite number.`);
    }

    if (typeof font.family !== 'string' || !font.family.trim()) {
        throw new TypeError(`${name}.family must be a nonempty string.`);
    }
}

/**
 * Validates the layout settings shared by titles and legends.
 * @param {object} settings The layer settings.
 * @param {string} name The option path used in the error message.
 */
function validatePosition(settings, name) {
    const positions = ['top', 'right', 'bottom', 'left'];
    const alignments = ['start', 'center', 'end', 'left', 'right'];

    if (!positions.includes(settings.position)) {
        throw new TypeError(`${name}.position must be top, right, bottom, or left.`);
    }

    if (!alignments.includes(settings.align)) {
        throw new TypeError(`${name}.align must be start, center, end, left, or right.`);
    }
}

/**
 * Validates an axis and resolves its tick font.
 * @param {object} axis The axis settings.
 * @param {object} font The base chart font.
 * @param {string} name The option path used in validation errors.
 */
function validateAxis(axis, font, name) {
    if (!axis?.grid || !axis.ticks) {
        throw new TypeError(`${name} requires grid and ticks settings.`);
    }

    validateDimension(axis.grid.tickLength, `${name}.grid.tickLength`);
    validateDimension(axis.grid.lineWidth, `${name}.grid.lineWidth`);
    validateDimension(axis.grid.borderWidth, `${name}.grid.borderWidth`);
    validateDimension(axis.ticks.padding, `${name}.ticks.padding`);

    const callback = axis.ticks.callback;

    if (callback != null && typeof callback !== 'function') {
        throw new TypeError(`${name}.ticks.callback must be a function.`);
    }

    axis.ticks.font = mergeOptions(font, axis.ticks.font);
    validateFont(axis.ticks.font, `${name}.ticks.font`);
}

/**
 * Validates merged options and resolves the fonts inherited by each layer.
 * @param {object} options The merged chart options.
 * @returns {object} The validated options with resolved fonts.
 */
export function normalizeOptions(options) {
    if (!['bar', 'line', 'area', 'pie', 'donut', 'scatter'].includes(options.type)) {
        throw new TypeError('Chart type must be bar, line, area, pie, donut, or scatter.');
    }

    if (!options.font || !options.title || !options.legend?.labels || !options.tooltip) {
        throw new TypeError('Chart options require font, title, legend, and tooltip settings.');
    }

    validateFont(options.font, 'font');
    validateDimension(options.layout?.padding, 'layout.padding');
    validateDimension(options.animation?.duration, 'animation.duration');

    if (!['linear', 'easeOutQuad', 'easeInOutQuad'].includes(options.animation.easing)) {
        throw new TypeError('Animation easing must be linear, easeOutQuad, or easeInOutQuad.');
    }

    if (!Number.isFinite(options.cutout) || options.cutout < 0 || options.cutout >= 1) {
        throw new RangeError('Donut cutout must be at least zero and less than one.');
    }

    if (!['cursor', 'fixed'].includes(options.tooltip.position)) {
        throw new TypeError('Tooltip position must be cursor or fixed.');
    }

    validatePosition(options.title, 'title');
    validateDimension(options.title.padding, 'title.padding');
    options.title.font = mergeOptions(options.font, options.title.font);
    validateFont(options.title.font, 'title.font');

    validatePosition(options.legend, 'legend');
    validateDimension(options.legend.labels.padding, 'legend.labels.padding');
    validateDimension(options.legend.labels.boxWidth, 'legend.labels.boxWidth');
    validateDimension(options.legend.labels.boxHeight, 'legend.labels.boxHeight');
    options.legend.labels.font = mergeOptions(options.font, options.legend.labels.font);
    validateFont(options.legend.labels.font, 'legend.labels.font');

    if (options.legend.maxWidth != null) {
        validateDimension(options.legend.maxWidth, 'legend.maxWidth');
    }

    if (options.legend.maxHeight != null) {
        validateDimension(options.legend.maxHeight, 'legend.maxHeight');
    }

    validateAxis(options.scales?.x, options.font, 'scales.x');
    validateAxis(options.scales?.y, options.font, 'scales.y');

    validateDimension(options.tooltip.padding, 'tooltip.padding');
    options.tooltip.font = mergeOptions(options.font, options.tooltip.font);
    validateFont(options.tooltip.font, 'tooltip.font');

    return options;
}
