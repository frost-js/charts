/**
 * Legend Calculate
 */
Object.assign(Legend.prototype, {

    /**
     * Calculate a horizontal legend.
     * @param {Rect} chartRect The Chart Rect.
     * @param {Array} datasets The datasets.
     * @param {Array} labels The wrapped labels.
     * @param {number} maxWidth The maximum width.
     * @param {number} maxHeight The maximum height.
     */
    _calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight) {
        let height = 0;

        let row = {
            width: 0,
            height: 0,
            labels: []
        };

        const rows = [];

        const addRow = row => {
            if (height + row.height > maxHeight) {
                return false;
            }

            rows.push(row);
            height += row.height;
        };

        for (const [i, lines] of labels.entries()) {
            const metrics = lines.map(line => this._context.measureText(line));

            const labelHeight = lines.length * this._lineHeight;
            const labelWidth = Math.max(...metrics.map(metric => metric.width));

            const legendHeight = Math.max(this._settings.labels.boxHeight, labelHeight);
            const legendWidth = this._settings.labels.boxWidth + labelWidth + this._spacing;

            const label = {
                dataset: datasets[i],
                lines,
                metrics
            };

            if (row.width + legendWidth > maxWidth) {
                if (addRow(row) === false) {
                    row = null;
                    break;
                }

                row = {
                    width: legendWidth,
                    height: legendHeight,
                    labels: [label]
                };

                continue;
            }

            if (row.width) {
                row.width += this._settings.labels.padding;
            }

            row.width += legendWidth;
            row.height = Math.max(row.height, legendHeight);
            row.labels.push(label);
        }

        if (row && row.width && row.height) {
            addRow(row);
        }

        const rectWidth = Math.max(...rows.map(row => row.width));
        const rectHeight = rows.reduce((acc, v) => acc + v.height, 0) + (this._settings.labels.padding * (rows.length - 1));

        this._rows = rows;

        switch (this._settings.align) {
            case 'center':
                this._rect.x += (this._rect.width - rectWidth) / 2;
                break;
            case 'end':
                this._rect.x = this._rect.right - rectWidth;
                break;
        }

        this._rect.width = rectWidth;
        this._rect.height = rectHeight;

        switch (this._settings.position) {
            case 'top':
                chartRect.y += this._rect.height + this._settings.labels.padding;
                break;
            case 'bottom':
                this._rect.y = chartRect.bottom - this._rect.height;
                break;
        }

        chartRect.height -= this._rect.height + this._settings.labels.padding;
    },

    /**
     * Calculate a vertical legend.
     * @param {Rect} chartRect The Chart Rect.
     * @param {Array} datasets The datasets.
     * @param {Array} labels The wrapped labels.
     * @param {number} maxWidth The maximum width.
     * @param {number} maxHeight The maximum height.
     */
    _calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight) {
        let width = 0;

        let col = {
            width: 0,
            height: 0,
            labels: []
        };

        const cols = [];

        const addCol = col => {
            if (width + col.width > maxWidth) {
                return false;
            }

            cols.push(col);
            width += col.width;
        };

        for (const [i, lines] of labels.entries()) {
            const metrics = lines.map(line => this._context.measureText(line));

            const labelHeight = lines.length * this._lineHeight;
            const labelWidth = Math.max(...metrics.map(metric => metric.width));

            const legendHeight = Math.max(this._settings.labels.boxHeight, labelHeight);
            const legendWidth = this._settings.labels.boxWidth + labelWidth + this._spacing;

            const label = {
                dataset: datasets[i],
                lines,
                metrics,
                width: legendWidth
            };

            if (col.height + legendHeight > maxHeight) {
                if (addCol(col) === false) {
                    col = null;
                    break;
                }

                col = {
                    width: legendWidth,
                    height: legendHeight,
                    labels: [label]
                };

                continue;
            }

            if (col.height) {
                col.height += this._settings.labels.padding;
            }

            col.width = Math.max(col.width, legendWidth);
            col.height += legendHeight;
            col.labels.push(label);
        }

        if (col && col.width && col.height) {
            addCol(col);
        }

        const rectWidth = cols.reduce((acc, v) => acc + v.width, 0) + (this._settings.labels.padding * (cols.length - 1));
        const rectHeight = Math.max(...cols.map(col => col.height));

        this._cols = cols;

        switch (this._settings.align) {
            case 'center':
                this._rect.y += (this._rect.height - rectHeight) / 2;
                break;
            case 'end':
                this._rect.y = this._rect.bottom - rectHeight;
                break;
        }

        this._rect.width = rectWidth;
        this._rect.height = rectHeight;

        switch (this._settings.position) {
            case 'right':
                this._rect.x = chartRect.right - this._rect.width;
                break;
            case 'left':
                chartRect.x += this._rect.width + this._settings.labels.padding;
                break;
        }

        chartRect.width -= this._rect.width + this._settings.labels.padding;
    }

});
