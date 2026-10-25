/**
 * Legend Render
 */
Object.assign(Legend.prototype, {

    /**
     * Render the layer for a horizontal legend.
     */
    _renderHorizontal() {
        let x;
        let y = 0;

        for (const row of this._rows) {
            x = 0;

            switch (this._settings.labels.textAlign) {
                case 'center':
                    x += (this._rect.width - row.width) / 2;
                    break;
                case 'end':
                    x = this._rect.right - row.width;
                    break;
            }

            for (const label of row.labels) {
                let labelY = y;

                const labelHeight = label.lines.length * (this._lineHeight);

                if (labelHeight < this._settings.labels.boxHeight) {
                    labelY += (this._settings.labels.boxHeight - labelHeight) / 2;
                } else {
                    labelY += (labelHeight / this._settings.labels.boxHeight) / 2;
                }

                const boxX = x;
                const boxY = labelY + ((labelHeight - this._settings.labels.boxHeight) / 2);

                const boxPath = new Path2D();
                boxPath.rect(boxX, boxY, this._settings.labels.boxWidth, this._settings.labels.boxHeight);

                this._context.fillStyle = label.dataset.backgroundColor[0];
                this._context.strokeStyle = label.dataset.borderColor[0];
                this._context.fill(boxPath);
                this._context.stroke(boxPath);

                x += this._settings.labels.boxWidth + this._spacing;

                let labelX = x;

                this._context.fillStyle = this._settings.labels.color;

                for (const [i, line] of label.lines.entries()) {
                    const metric = label.metrics[i];

                    this._context.fillText(
                        line,
                        labelX,
                        labelY + metric.fontBoundingBoxAscent
                    );

                    labelY += this._lineHeight
                }

                x += Math.max(...label.metrics.map(metric => metric.width)) + this._settings.labels.padding;
            }

            y += row.height + this._settings.labels.padding;
        }
    },

    /**
     * Render the layer for a vertical legend.
     */
    _renderVertical() {
        let x = 0;
        let y;

        for (const col of this._cols) {
            y = 0;

            for (const label of col.labels) {
                const labelHeight = label.lines.length * (this._lineHeight);

                let boxX = x;
                const boxY = y + ((labelHeight - this._settings.labels.boxHeight) / 2);

                switch (this._settings.labels.textAlign) {
                    case 'center':
                        boxX += (col.width - label.width) / 2;
                        break;
                    case 'end':
                        boxX += col.width - label.width;
                        break;
                }

                const boxPath = new Path2D();
                boxPath.rect(boxX, boxY, this._settings.labels.boxWidth, this._settings.labels.boxHeight);

                this._context.fillStyle = label.dataset.backgroundColor[0];
                this._context.strokeStyle = label.dataset.borderColor[0];
                this._context.fill(boxPath);
                this._context.stroke(boxPath);

                this._context.fillStyle = this._settings.labels.color;

                const labelX = boxX + this._settings.labels.boxWidth + this._spacing;
                let labelY = y;

                for (const [i, line] of label.lines.entries()) {
                    const { fontBoundingBoxAscent: ascent } = label.metrics[i];

                    this._context.fillText(
                        line,
                        labelX,
                        labelY + ascent
                    );

                    labelY += this._lineHeight
                }

                y += labelHeight + this._settings.labels.padding;
            }

            x += col.width + this._settings.labels.padding;
        }
    }

});
