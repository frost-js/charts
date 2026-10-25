/**
 * @import Rect from './rect.js';
 */

import { measureText, updateFont, wrapLines } from './helpers.js';
import Layer from './layer.js';

/**
 * Lays out dataset keys in horizontal rows or vertical columns.
 */
export default class Legend extends Layer {
    #cols;
    #lineHeight;
    #rows;
    #spacing;

    /**
     * Calculates the layer bounds before continuing layout.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {Function} next The next layout callback.
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

        let datasets = this.chart.getData();

        if (this.chart.options.type === 'pie') {
            const labels = this.chart.getLabels();

            datasets = datasets.flatMap((dataset) => {
                return labels.map((label, index) => ({
                    ...dataset,
                    label,
                    backgroundColor: [dataset.backgroundColor[index % dataset.backgroundColor.length]],
                    borderColor: [dataset.borderColor[index % dataset.borderColor.length]],
                }));
            });
        }

        const labelWidth = maxWidth - this.settings.labels.boxWidth - this.#spacing;
        const labels = datasets.map((dataset) => {
            return wrapLines(this.context, dataset.label, labelWidth);
        });

        switch (this.settings.position) {
            case 'top':
            case 'bottom':
                this.#calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight);
                break;
            case 'right':
            case 'left':
                this.#calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight);
                break;
        }

        next(chartRect);
    }

    /**
     * Renders the layer to its offscreen canvas.
     */
    render() {
        if (!this.settings.display) {
            return;
        }

        super.render();

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
     * @param {object[]} datasets The datasets.
     * @param {string[][]} labels The wrapped labels.
     * @param {number} maxWidth The maximum width.
     * @param {number} maxHeight The maximum height.
     */
    #calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight) {
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

        for (const [i, lines] of labels.entries()) {
            const metrics = lines.map((line) => measureText(this.context, line));

            const labelHeight = lines.length * this.#lineHeight;
            const labelWidth = Math.max(0, ...metrics.map((metric) => metric.width));

            const legendHeight = Math.max(this.settings.labels.boxHeight, labelHeight);
            const legendWidth = this.settings.labels.boxWidth + labelWidth + this.#spacing;

            const label = {
                dataset: datasets[i],
                lines,
                metrics,
            };

            if (row.width + legendWidth + (row.width ? this.settings.labels.padding : 0) > maxWidth) {
                if (addRow(row) === false) {
                    row = null;
                    break;
                }

                row = {
                    width: legendWidth,
                    height: legendHeight,
                    labels: [label],
                };

                continue;
            }

            if (row.width) {
                row.width += this.settings.labels.padding;
            }

            row.width += legendWidth;
            row.height = Math.max(row.height, legendHeight);
            row.labels.push(label);
        }

        if (row && row.width && row.height) {
            addRow(row);
        }

        const rectWidth = Math.max(0, ...rows.map((row) => row.width));
        const rectHeight = rows.reduce((acc, v) => acc + v.height, 0) + (this.settings.labels.padding * Math.max(0, rows.length - 1));

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
     * @param {object[]} datasets The datasets.
     * @param {string[][]} labels The wrapped labels.
     * @param {number} maxWidth The maximum width.
     * @param {number} maxHeight The maximum height.
     */
    #calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight) {
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

        for (const [i, lines] of labels.entries()) {
            const metrics = lines.map((line) => measureText(this.context, line));

            const labelHeight = lines.length * this.#lineHeight;
            const labelWidth = Math.max(0, ...metrics.map((metric) => metric.width));

            const legendHeight = Math.max(this.settings.labels.boxHeight, labelHeight);
            const legendWidth = this.settings.labels.boxWidth + labelWidth + this.#spacing;

            const label = {
                dataset: datasets[i],
                lines,
                metrics,
                width: legendWidth,
            };

            if (col.height + legendHeight + (col.height ? this.settings.labels.padding : 0) > maxHeight) {
                if (addCol(col) === false) {
                    col = null;
                    break;
                }

                col = {
                    width: legendWidth,
                    height: legendHeight,
                    labels: [label],
                };

                continue;
            }

            if (col.height) {
                col.height += this.settings.labels.padding;
            }

            col.width = Math.max(col.width, legendWidth);
            col.height += legendHeight;
            col.labels.push(label);
        }

        if (col && col.width && col.height) {
            addCol(col);
        }

        const rectWidth = cols.reduce((acc, v) => acc + v.width, 0) + (this.settings.labels.padding * Math.max(0, cols.length - 1));
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
     * Renders the horizontal legend rows.
     */
    #renderHorizontal() {
        let x;
        let y = 0;

        for (const row of this.#rows) {
            x = 0;

            switch (this.settings.labels.textAlign) {
                case 'center':
                    x += (this.rect.width - row.width) / 2;
                    break;
                case 'right':
                case 'end':
                    x = this.rect.width - row.width;
                    break;
            }

            for (const label of row.labels) {
                let labelY = y;

                const labelHeight = label.lines.length * (this.#lineHeight);

                if (labelHeight < this.settings.labels.boxHeight) {
                    labelY += (this.settings.labels.boxHeight - labelHeight) / 2;
                }

                const boxX = x;
                const boxY = labelY + ((labelHeight - this.settings.labels.boxHeight) / 2);

                const boxPath = new Path2D();
                boxPath.rect(boxX, boxY, this.settings.labels.boxWidth, this.settings.labels.boxHeight);

                this.context.fillStyle = label.dataset.backgroundColor[0];
                this.context.strokeStyle = label.dataset.borderColor[0];
                this.context.fill(boxPath);

                if (label.dataset.borderWidth) {
                    this.context.lineWidth = label.dataset.borderWidth;
                    this.context.stroke(boxPath);
                }

                x += this.settings.labels.boxWidth + this.#spacing;

                const labelX = x;

                this.context.fillStyle = this.settings.labels.color;

                for (const [i, line] of label.lines.entries()) {
                    const metric = label.metrics[i];

                    this.context.fillText(
                        line,
                        labelX,
                        labelY + metric.fontBoundingBoxAscent,
                    );

                    labelY += this.#lineHeight;
                }

                x += Math.max(0, ...label.metrics.map((metric) => metric.width)) + this.settings.labels.padding;
            }

            y += row.height + this.settings.labels.padding;
        }
    }

    /**
     * Renders the vertical legend columns.
     */
    #renderVertical() {
        let x = 0;
        let y;

        for (const col of this.#cols) {
            y = 0;

            for (const label of col.labels) {
                const labelHeight = label.lines.length * (this.#lineHeight);

                let boxX = x;
                const boxY = y + ((labelHeight - this.settings.labels.boxHeight) / 2);

                switch (this.settings.labels.textAlign) {
                    case 'center':
                        boxX += (col.width - label.width) / 2;
                        break;
                    case 'right':
                    case 'end':
                        boxX += col.width - label.width;
                        break;
                }

                const boxPath = new Path2D();
                boxPath.rect(boxX, boxY, this.settings.labels.boxWidth, this.settings.labels.boxHeight);

                this.context.fillStyle = label.dataset.backgroundColor[0];
                this.context.strokeStyle = label.dataset.borderColor[0];
                this.context.fill(boxPath);

                if (label.dataset.borderWidth) {
                    this.context.lineWidth = label.dataset.borderWidth;
                    this.context.stroke(boxPath);
                }

                this.context.fillStyle = this.settings.labels.color;

                const labelX = boxX + this.settings.labels.boxWidth + this.#spacing;
                let labelY = y;

                for (const [i, line] of label.lines.entries()) {
                    const { fontBoundingBoxAscent: ascent } = label.metrics[i];

                    this.context.fillText(
                        line,
                        labelX,
                        labelY + ascent,
                    );

                    labelY += this.#lineHeight;
                }

                y += Math.max(labelHeight, this.settings.labels.boxHeight) + this.settings.labels.padding;
            }

            x += col.width + this.settings.labels.padding;
        }
    }
}
