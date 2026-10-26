import { parseNumber } from './helpers.js';

/**
 * @typedef {object} ChartDataset
 * @property {string} [label] The dataset label.
 * @property {Array<number|{x: number, y: number}>} data Values, or numeric x/y points for scatter charts.
 * @property {string|string[]} [backgroundColor] The fill color or repeating colors.
 * @property {string|string[]} [borderColor] The border color or repeating colors.
 * @property {number} [borderWidth=1] The border width in CSS pixels.
 * @property {number} [pointRadius=2] The point radius in CSS pixels; scatter defaults to 4.
 * @property {number} [fillOpacity=.2] The area or radar fill opacity; polar area defaults to .75.
 */

/**
 * @typedef {object} ChartData
 * @property {Array<string|number>} [labels] Category labels; optional point labels for scatter charts.
 * @property {ChartDataset[]} datasets The chart datasets.
 */

const defaultColors = [
    '#6366f1',
    '#14b8a6',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
    '#0ea5e9',
    '#f97316',
    '#84cc16',
    '#06b6d4',
    '#a855f7',
    '#e11d48',
    '#64748b',
];

/**
 * Copies a color or color array into a validated, nonempty array.
 * @param {string|string[]} colors The supplied colors.
 * @param {string} name The property name used in validation errors.
 * @returns {string[]} The copied colors.
 */
function normalizeColors(colors, name) {
    const values = Array.isArray(colors) ? Array.from(colors) : [colors];

    if (!values.length) {
        throw new TypeError(`${name} must contain at least one color.`);
    }

    for (const value of values) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new TypeError(`${name} must contain nonempty color strings.`);
        }
    }

    return values;
}

/**
 * Copies finite numbers or scatter coordinates into an independent data array.
 * @param {Array<number|string|{x: number|string, y: number|string}>} data The supplied values or points.
 * @param {string} type The chart type.
 * @param {number} index The dataset index used in errors.
 * @returns {Array<number|{x: number, y: number}>} The validated values or points.
 */
function normalizeValues(data, type, index) {
    return Array.from(data, (value) => {
        if (type === 'scatter') {
            const x = parseNumber(value?.x, NaN);
            const y = parseNumber(value?.y, NaN);

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                throw new TypeError(`Dataset ${index} points must have finite x and y coordinates.`);
            }

            return { x, y };
        }

        value = parseNumber(value, NaN);

        if (!Number.isFinite(value)) {
            throw new TypeError(`Dataset ${index} values must be finite numbers.`);
        }

        if (['pie', 'donut', 'polarArea', 'radar'].includes(type) && value < 0) {
            throw new RangeError(`Dataset ${index} circular and radial values must be nonnegative.`);
        }

        return value;
    });
}

/**
 * Validates and copies one dataset without modifying the caller's data.
 * @param {ChartDataset} dataset The supplied dataset.
 * @param {number} index The dataset index.
 * @param {number} labelCount The required number of values.
 * @param {string} type The chart type.
 * @returns {ChartDataset} The normalized dataset.
 */
function normalizeDataset(dataset, index, labelCount, type) {
    if (!dataset || !Array.isArray(dataset.data)) {
        throw new TypeError(`Dataset ${index} requires a data array.`);
    }

    if (type !== 'scatter' && dataset.data.length !== labelCount) {
        throw new RangeError(`Dataset ${index} must have one value per label.`);
    }

    const values = normalizeValues(dataset.data, type, index);

    const borderWidth = Math.max(0, parseNumber(dataset.borderWidth, 1));
    const pointRadius = Math.max(0, parseNumber(dataset.pointRadius, type === 'scatter' ? 4 : 2));
    const fillOpacity = Math.max(0, Math.min(1, parseNumber(dataset.fillOpacity, type === 'polarArea' ? .75 : .2)));

    const circular = ['pie', 'donut', 'polarArea'].includes(type);
    const defaultColor = defaultColors[index % defaultColors.length];
    const backgroundColor = dataset.backgroundColor ?? (circular ? defaultColors : defaultColor);
    const borderColor = dataset.borderColor ?? (circular ? '#ffffff' : defaultColor);

    return {
        label: String(dataset.label ?? `Dataset ${index + 1}`),
        data: values,
        backgroundColor: normalizeColors(backgroundColor, `Dataset ${index} backgroundColor`),
        borderColor: normalizeColors(borderColor, `Dataset ${index} borderColor`),
        borderWidth,
        pointRadius,
        fillOpacity,
    };
}

/**
 * Validates chart data and copies its labels, values, and colors.
 * @param {ChartData} data The supplied chart data.
 * @param {string} type The chart type.
 * @param {boolean} [stacked=false] Whether bar values will be summed.
 * @returns {ChartData} The independent, normalized chart data.
 */
export function normalizeData(data, type, stacked = false) {
    if (!data || !Array.isArray(data.datasets)) {
        throw new TypeError('Chart data requires a datasets array.');
    }

    const inputLabels = type === 'scatter' ? data.labels ?? [] : data.labels;

    if (!Array.isArray(inputLabels)) {
        throw new TypeError('Chart labels must be an array.');
    }

    const labels = Array.from(inputLabels, (label) => String(label));
    const datasets = Array.from(data.datasets, (dataset, index) => {
        return normalizeDataset(dataset, index, labels.length, type);
    });

    if (type === 'bar' && stacked) {
        for (let index = 0; index < labels.length; index++) {
            let positive = 0;
            let negative = 0;

            for (const dataset of datasets) {
                const value = dataset.data[index];

                if (value < 0) {
                    negative += value;
                } else {
                    positive += value;
                }
            }

            if (!Number.isFinite(positive) || !Number.isFinite(negative)) {
                throw new RangeError('Stack totals must be finite numbers.');
            }
        }
    }

    return { labels, datasets };
}

/**
 * Gets a dataset color, repeating its palette when necessary.
 * @param {ChartDataset} dataset The normalized dataset.
 * @param {string} property The color property.
 * @param {number} index The value index.
 * @returns {string} The color for this value.
 */
export function getColor(dataset, property, index) {
    const colors = dataset[property];

    return colors[index % colors.length];
}

/**
 * Formats a numeric value or scatter coordinates for tooltips and descriptions.
 * @param {number|{x: number, y: number}} value The data value.
 * @returns {string} The readable value.
 */
export function formatValue(value) {
    return typeof value === 'object' ? `(${value.x}, ${value.y})` : String(value);
}
