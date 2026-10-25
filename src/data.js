/**
 * @typedef {object} ChartDataset
 * @property {string} [label] The dataset label.
 * @property {Array<number|{x: number, y: number}>} data Values, or numeric x/y points for scatter charts.
 * @property {string|string[]} [backgroundColor] The fill color or repeating colors.
 * @property {string|string[]} [borderColor] The border color or repeating colors.
 * @property {number} [borderWidth=1] The border width in CSS pixels.
 * @property {number} [pointRadius=2] The point radius in CSS pixels; scatter defaults to 4.
 * @property {number} [fillOpacity=.2] The area fill opacity.
 */

/**
 * @typedef {object} ChartData
 * @property {Array<string|number>} [labels] Category labels; optional point labels for scatter charts.
 * @property {ChartDataset[]} datasets The chart datasets.
 */

const defaultColors = [
    '#2563eb',
    '#dc2626',
    '#059669',
    '#9333ea',
    '#d97706',
    '#0891b2',
    '#db2777',
    '#65a30d',
    '#ea580c',
    '#4f46e5',
    '#0d9488',
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
 * @param {Array} data The supplied values or points.
 * @param {string} type The chart type.
 * @param {number} index The dataset index used in errors.
 * @returns {Array} The validated values or points.
 */
function normalizeValues(data, type, index) {
    return Array.from(data, (value) => {
        if (type === 'scatter') {
            if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
                throw new TypeError(`Dataset ${index} points must have finite x and y coordinates.`);
            }

            return { x: value.x, y: value.y };
        }

        if (!Number.isFinite(value)) {
            throw new TypeError(`Dataset ${index} values must be finite numbers.`);
        }

        if (['pie', 'donut'].includes(type) && value < 0) {
            throw new RangeError(`Dataset ${index} pie and donut values must be nonnegative.`);
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

    const borderWidth = dataset.borderWidth ?? 1;
    const pointRadius = dataset.pointRadius ?? (type === 'scatter' ? 4 : 2);
    const fillOpacity = dataset.fillOpacity ?? .2;

    if (!Number.isFinite(borderWidth) || borderWidth < 0) {
        throw new RangeError(`Dataset ${index} borderWidth must be a finite, nonnegative number.`);
    }

    if (!Number.isFinite(pointRadius) || pointRadius < 0) {
        throw new RangeError(`Dataset ${index} pointRadius must be a finite, nonnegative number.`);
    }

    if (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1) {
        throw new RangeError(`Dataset ${index} fillOpacity must be between zero and one.`);
    }

    const circular = ['pie', 'donut'].includes(type);
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
 * @returns {ChartData} The independent, normalized chart data.
 */
export function normalizeData(data, type) {
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
