/**
 * @typedef {object} ChartDataset
 * @property {string} [label] The dataset label.
 * @property {number[]} data The values, one per chart label.
 * @property {string|string[]} [backgroundColor] The fill color or repeating colors.
 * @property {string|string[]} [borderColor] The border color or repeating colors.
 * @property {number} [borderWidth=1] The border width in CSS pixels.
 * @property {number} [pointRadius=2] The line point radius in CSS pixels.
 */

/**
 * @typedef {object} ChartData
 * @property {Array<string|number>} labels The category labels.
 * @property {ChartDataset[]} datasets The chart datasets.
 */

const defaultColors = [
    '#2563eb',
    '#dc2626',
    '#059669',
    '#9333ea',
    '#d97706',
    '#0891b2',
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

    if (dataset.data.length !== labelCount) {
        throw new RangeError(`Dataset ${index} must have one value per label.`);
    }

    const values = Array.from(dataset.data);

    for (const value of values) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new TypeError(`Dataset ${index} values must be finite numbers.`);
        }

        if (type === 'pie' && value < 0) {
            throw new RangeError(`Dataset ${index} pie values must be nonnegative.`);
        }
    }

    const borderWidth = dataset.borderWidth ?? 1;
    const pointRadius = dataset.pointRadius ?? 2;

    if (!Number.isFinite(borderWidth) || borderWidth < 0) {
        throw new RangeError(`Dataset ${index} borderWidth must be a finite, nonnegative number.`);
    }

    if (!Number.isFinite(pointRadius) || pointRadius < 0) {
        throw new RangeError(`Dataset ${index} pointRadius must be a finite, nonnegative number.`);
    }

    const defaultColor = defaultColors[index % defaultColors.length];
    const backgroundColor = dataset.backgroundColor ?? (type === 'pie' ? defaultColors : defaultColor);
    const borderColor = dataset.borderColor ?? (type === 'pie' ? '#ffffff' : defaultColor);

    return {
        label: String(dataset.label ?? `Dataset ${index + 1}`),
        data: values,
        backgroundColor: normalizeColors(backgroundColor, `Dataset ${index} backgroundColor`),
        borderColor: normalizeColors(borderColor, `Dataset ${index} borderColor`),
        borderWidth,
        pointRadius,
    };
}

/**
 * Validates chart data and copies its labels, values, and colors.
 * @param {ChartData} data The supplied chart data.
 * @param {string} type The chart type.
 * @returns {ChartData} The independent, normalized chart data.
 */
export function normalizeData(data, type) {
    if (!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) {
        throw new TypeError('Chart data requires labels and datasets arrays.');
    }

    const labels = Array.from(data.labels, (label) => String(label));
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
