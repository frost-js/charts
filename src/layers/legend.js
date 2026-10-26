/** @import { ChartLegendOptions } from '../chart.js'; */
/** @import { ChartDataset } from '../data.js'; */
/** @import { ChartTextMetrics } from '../helpers.js'; */
/** @import Rect from '../rect.js'; */
/** @import { LayerLayoutCallback } from './layer.js'; */

import { measureText, updateFont, wrapLines } from '../helpers.js';
import Layer from './layer.js';

/** @typedef {ChartDataset & {label: string, datasetIndex: number, index?: number, visible: boolean}} LegendItem */

/**
 * @typedef {object} LegendLabel
 * @property {LegendItem} dataset The dataset or slice represented by the entry.
 * @property {string[]} lines The wrapped label text.
 * @property {ChartTextMetrics[]} metrics The measured lines.
 * @property {number} width The total swatch and text width.
 * @property {number} height The total entry height.
 */

/**
 * Lays out dataset keys in horizontal rows or vertical columns.
 * @augments {Layer<ChartLegendOptions, LegendItem>}
 */
export default class Legend extends Layer {
    #cols;
    #lineHeight;
    #rows;
    #spacing;

    /**
     * Gets the visible legend entries in reading order.
     * @returns {LegendItem[]} The dataset or slice keys.
     */
    get items() {
        if (!this.settings.display) {
            return [];
        }

        const groups = ['top', 'bottom'].includes(this.settings.position) ? this.#rows : this.#cols;

        return (groups || []).flatMap((group) => group.labels.map((label) => label.dataset));
    }

    /**
     * Calculates the layer bounds before continuing layout.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {LayerLayoutCallback} next The next layout callback.
     */
    calculate(chartRect, next) {
        this.rect = chartRect.clone();

        if (!this.settings.display) {
            next(chartRect);

            return;
        }

        updateFont(this.context, this.settings.labels.font);

        this.#spacing = measureText(this.context, ' ').width;
        this.#lineHeight = this.settings.labels.font.lineHeight * this.settings.labels.font.size;

        this.#rows = [];
        this.#cols = [];

        const vertical = ['left', 'right'].includes(this.settings.position);
        const availableWidth = vertical ? this.rect.width / 2 : this.rect.width;
        const availableHeight = vertical ? this.rect.height : this.rect.height / 2;
        const maxWidth = Math.min(this.settings.maxWidth ?? availableWidth, availableWidth);
        const maxHeight = Math.min(this.settings.maxHeight ?? availableHeight, availableHeight);

        let datasets = this.chart.getData().map((dataset, datasetIndex) => ({
            ...dataset,
            datasetIndex,
            visible: this.chart.isDatasetVisible(datasetIndex),
        }));

        if (['pie', 'donut', 'polarArea'].includes(this.chart.options.type)) {
            const labels = this.chart.getLabels();

            datasets = datasets.flatMap((dataset) => {
                return labels.map((label, index) => ({
                    ...dataset,
                    label,
                    index,
                    visible: this.chart.isDataVisible(dataset.datasetIndex, index),
                    backgroundColor: [dataset.backgroundColor[index % dataset.backgroundColor.length]],
                    borderColor: [dataset.borderColor[index % dataset.borderColor.length]],
                }));
            });
        }

        const labels = this.#measureLabels(datasets, maxWidth);

        switch (this.settings.position) {
            case 'top':
            case 'bottom':
                this.#calculateHorizontal(chartRect, labels, maxWidth, maxHeight);
                break;
            case 'right':
            case 'left':
                this.#calculateVertical(chartRect, labels, maxWidth, maxHeight);
                break;
        }

        next(chartRect);
    }

    /**
     * Renders the layer to its offscreen canvas.
     */
    render() {
        super.render();

        if (!this.settings.display) {
            return;
        }

        updateFont(this.context, this.settings.labels.font);

        this.context.textAlign = 'left';

        switch (this.settings.position) {
            case 'top':
            case 'bottom':
                this.#renderHorizontal();
                break;
            case 'right':
            case 'left':
                this.#renderVertical();
                break;
        }
    }

    /**
     * Arranges legend items into horizontal rows.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {LegendLabel[]} labels The measured legend entries.
     * @param {number} maxWidth The maximum width.
     * @param {number} maxHeight The maximum height.
     */
    #calculateHorizontal(chartRect, labels, maxWidth, maxHeight) {
        let height = 0;

        let row = {
            width: 0,
            height: 0,
            labels: [],
        };

        const rows = [];

        const addRow = (row) => {
            if (!row.labels.length) {
                return true;
            }

            if (row.width > maxWidth) {
                return false;
            }

            if (height + row.height + (rows.length ? this.settings.labels.padding : 0) > maxHeight) {
                return false;
            }

            rows.push(row);
            height += row.height + (rows.length > 1 ? this.settings.labels.padding : 0);

            return true;
        };

        for (const label of labels) {
            if (row.width + label.width + (row.width ? this.settings.labels.padding : 0) > maxWidth) {
                if (addRow(row) === false) {
                    row = null;
                    break;
                }

                row = {
                    width: label.width,
                    height: label.height,
                    labels: [label],
                };

                continue;
            }

            if (row.width) {
                row.width += this.settings.labels.padding;
            }

            row.width += label.width;
            row.height = Math.max(row.height, label.height);
            row.labels.push(label);
        }

        if (row && row.width && row.height) {
            addRow(row);
        }

        const rowHeight = rows.reduce((total, row) => total + row.height, 0);
        const rowSpacing = this.settings.labels.padding * Math.max(0, rows.length - 1);
        const rectWidth = Math.max(0, ...rows.map((row) => row.width));
        const rectHeight = rowHeight + rowSpacing;

        const padding = rows.length ? Math.min(this.settings.labels.padding, chartRect.height - rectHeight) : 0;

        this.#rows = rows;

        switch (this.settings.align) {
            case 'center':
                this.rect.x += (this.rect.width - rectWidth) / 2;
                break;
            case 'right':
            case 'end':
                this.rect.x = this.rect.right - rectWidth;
                break;
        }

        this.rect.width = rectWidth;
        this.rect.height = rectHeight;

        switch (this.settings.position) {
            case 'top':
                chartRect.y += this.rect.height + padding;
                break;
            case 'bottom':
                this.rect.y = chartRect.bottom - this.rect.height;
                break;
        }

        chartRect.height -= this.rect.height + padding;
    }

    /**
     * Arranges legend items into vertical columns.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {LegendLabel[]} labels The measured legend entries.
     * @param {number} maxWidth The maximum width.
     * @param {number} maxHeight The maximum height.
     */
    #calculateVertical(chartRect, labels, maxWidth, maxHeight) {
        let width = 0;

        let col = {
            width: 0,
            height: 0,
            labels: [],
        };

        const cols = [];

        const addCol = (col) => {
            if (!col.labels.length) {
                return true;
            }

            if (col.height > maxHeight) {
                return false;
            }

            if (width + col.width + (cols.length ? this.settings.labels.padding : 0) > maxWidth) {
                return false;
            }

            cols.push(col);
            width += col.width + (cols.length > 1 ? this.settings.labels.padding : 0);

            return true;
        };

        for (const label of labels) {
            if (col.height + label.height + (col.height ? this.settings.labels.padding : 0) > maxHeight) {
                if (addCol(col) === false) {
                    col = null;
                    break;
                }

                col = {
                    width: label.width,
                    height: label.height,
                    labels: [label],
                };

                continue;
            }

            if (col.height) {
                col.height += this.settings.labels.padding;
            }

            col.width = Math.max(col.width, label.width);
            col.height += label.height;
            col.labels.push(label);
        }

        if (col && col.width && col.height) {
            addCol(col);
        }

        const columnWidth = cols.reduce((total, col) => total + col.width, 0);
        const columnSpacing = this.settings.labels.padding * Math.max(0, cols.length - 1);
        const rectWidth = columnWidth + columnSpacing;
        const rectHeight = Math.max(0, ...cols.map((col) => col.height));

        const padding = cols.length ? Math.min(this.settings.labels.padding, chartRect.width - rectWidth) : 0;

        this.#cols = cols;

        switch (this.settings.align) {
            case 'center':
                this.rect.y += (this.rect.height - rectHeight) / 2;
                break;
            case 'right':
            case 'end':
                this.rect.y = this.rect.bottom - rectHeight;
                break;
        }

        this.rect.width = rectWidth;
        this.rect.height = rectHeight;

        switch (this.settings.position) {
            case 'right':
                this.rect.x = chartRect.right - this.rect.width;
                break;
            case 'left':
                chartRect.x += this.rect.width + padding;
                break;
        }

        chartRect.width -= this.rect.width + padding;
    }

    /**
     * Measures entries once for horizontal and vertical layout and rendering.
     * @param {LegendItem[]} datasets The dataset or slice keys.
     * @param {number} maxWidth The maximum entry width.
     * @returns {LegendLabel[]} The measured legend entries.
     */
    #measureLabels(datasets, maxWidth) {
        const { boxWidth, boxHeight } = this.settings.labels;
        const availableWidth = maxWidth - boxWidth - this.#spacing;

        return datasets.map((dataset) => {
            const lines = wrapLines(this.context, dataset.label, availableWidth);
            const metrics = lines.map((line) => measureText(this.context, line));
            const textWidth = Math.max(0, ...metrics.map((metric) => metric.width));
            const textHeight = lines.length * this.#lineHeight;

            return {
                dataset,
                lines,
                metrics,
                width: boxWidth + textWidth + this.#spacing,
                height: Math.max(boxHeight, textHeight),
            };
        });
    }

    /**
     * Renders the horizontal legend rows.
     */
    #renderHorizontal() {
        let y = 0;

        for (const row of this.#rows) {
            let x = 0;

            switch (this.settings.labels.textAlign) {
                case 'center':
                    x = (this.rect.width - row.width) / 2;
                    break;
                case 'right':
                case 'end':
                    x = this.rect.width - row.width;
                    break;
            }

            for (const label of row.labels) {
                this.#renderLabel(label, x, y, label.width, row.height);
                x += label.width + this.settings.labels.padding;
            }

            y += row.height + this.settings.labels.padding;
        }
    }

    /**
     * Draws a legend swatch, label, hidden state, and interactive hit area.
     * @param {LegendLabel} label The measured legend entry.
     * @param {number} x The left edge.
     * @param {number} y The top edge.
     * @param {number} width The item width.
     * @param {number} height The item height.
     */
    #renderLabel(label, x, y, width, height) {
        const { dataset, lines, metrics } = label;
        const { boxWidth, boxHeight, color } = this.settings.labels;
        const textX = x + boxWidth + this.#spacing;
        const textY = y + (height - lines.length * this.#lineHeight) / 2;
        const box = new Path2D();

        box.rect(x, y + (height - boxHeight) / 2, boxWidth, boxHeight);

        this.context.save();
        this.context.globalAlpha = dataset.visible ? 1 : .4;
        this.context.fillStyle = dataset.backgroundColor[0];
        this.context.fill(box);

        if (dataset.borderWidth) {
            this.context.lineWidth = dataset.borderWidth;
            this.context.strokeStyle = dataset.borderColor[0];
            this.context.stroke(box);
        }

        this.context.fillStyle = color;

        for (const [index, line] of lines.entries()) {
            const baseline = textY + index * this.#lineHeight + metrics[index].fontBoundingBoxAscent;

            this.context.fillText(line, textX, baseline);

            if (!dataset.visible) {
                const middle = baseline - this.settings.labels.font.size / 3;

                this.context.beginPath();
                this.context.moveTo(textX, middle);
                this.context.lineTo(textX + metrics[index].width, middle);
                this.context.strokeStyle = color;
                this.context.lineWidth = 1;
                this.context.stroke();
            }
        }

        this.context.restore();

        const hit = new Path2D();

        hit.rect(x, y, width, height);
        this.addHitRegion(hit, dataset);

        if (this.active?.datasetIndex === dataset.datasetIndex && this.active.index === dataset.index) {
            this.context.strokeStyle = color;
            this.context.lineWidth = 1;
            this.context.stroke(hit);
        }
    }

    /**
     * Renders the vertical legend columns with a shared label edge.
     */
    #renderVertical() {
        let x = 0;

        for (const col of this.#cols) {
            let y = 0;

            for (const label of col.labels) {
                let labelX = x;

                switch (this.settings.labels.textAlign) {
                    case 'center':
                        labelX += (col.width - label.width) / 2;
                        break;
                    case 'right':
                    case 'end':
                        labelX += col.width - label.width;
                        break;
                }

                this.#renderLabel(label, labelX, y, label.width, label.height);
                y += label.height + this.settings.labels.padding;
            }

            x += col.width + this.settings.labels.padding;
        }
    }
}
