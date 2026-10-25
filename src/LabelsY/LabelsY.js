/**
 * @class LabelsY
 */
class LabelsY extends Layer {

    /**
     * Calclulate the layer.
     * @param {Rect} chartRect The Chart Rect.
     * @param {function} next The next layer calculate callback.
     */
    calculate(chartRect, next) {
        this._rect = chartRect.clone();

        this._updateFont(this._settings.font);

        // TODO: generate scale

        this._labels = this._chart.getScale(); // TODO: format labels x
        this._metrics = this._labels.map(label => this._context.measureText(label));

        const maxWidth = Math.max(...this._metrics.map(metric => metric.width));

        this._rect.width = maxWidth + this._settings.padding;

        chartRect.width -= this._rect.width;
        chartRect.x = this._rect.right;

        next(chartRect);

        this._rect.y = chartRect.top;
        this._rect.height = chartRect.height;

        this._gridHeight = this._rect.height / (this._labels.length - 1);
        this._offset = 0;
    }

    /**
     * Calculate the canvas.
     */
    calculateCanvas() {
        super.calculateCanvas();

        this._canvasRect.y -= this._gridHeight / 2;
        this._canvasRect.height += this._gridHeight;
    }

    // draw(context) {
    //     context.strokeStyle = '#000';
    //     context.rect(this._rect.x, this._rect.y, this._rect.width, this._rect.height);
    //     context.stroke();
    // }

    /**
     * Render the layer.
     */
    render() {
        super.render();

        this._updateFont(this._settings.font);

        this._context.textAlign = 'right';
        this._context.fillStyle = this._settings.color;

        for (const [i, value] of this._labels.entries()) {
            const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = this._metrics[i];

            const labelX = this._rect.width - this._settings.padding;
            const labelY = ((this._labels.length - i) * this._gridHeight) - (this._gridHeight / 2) + (ascent / 2) - (descent / 2) + this._offset;

            this._context.fillText(value, labelX, labelY);
        }
    }

}
