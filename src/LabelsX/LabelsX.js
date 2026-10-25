/**
 * @class LabelsX
 */
class LabelsX extends Layer {

    /**
     * Calclulate the layer.
     * @param {Rect} chartRect The Chart Rect.
     * @param {function} next The next layer calculate callback.
     */
    calculate(chartRect, next) {
        this._rect = chartRect.clone();

        this._updateFont(this._settings.font);

        this._labels = this._chart.getLabels(); // TODO: format labels Y

        this._metrics = this._labels.map(label => this._context.measureText(label));
        const maxHeight = Math.max(...this._metrics.map(metric => metric.fontBoundingBoxAscent + metric.fontBoundingBoxDescent));

        this._rect.y = chartRect.bottom - maxHeight - this._settings.padding;
        this._rect.height = maxHeight + this._settings.padding;

        chartRect.height -= this._rect.height;

        next(chartRect);

        switch (this._chart._settings.type) {
            case 'bar':
                this._gridWidth = chartRect.width / this._labels.length;
                this._offset = this._gridWidth / 2;
                break;
            case 'line':
                this._gridWidth = chartRect.width / (this._labels.length - 1);
                this._offset = 0;
                break;
        }

        this._rect.x = chartRect.left;
        this._rect.width = chartRect.width;
    }

    /**
     * Calculate the canvas.
     */
    calculateCanvas() {
        super.calculateCanvas();

        this._canvasRect.x -= this._gridWidth / 2;
        this._canvasRect.width += this._gridWidth;
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

        this._context.textAlign = 'left';
        this._context.fillStyle = this._settings.color;

        for (const [i, value] of this._labels.entries()) {
            const { fontBoundingBoxAscent: ascent, width } = this._metrics[i];

            const labelX = (i * this._gridWidth) + (this._gridWidth / 2) - (width / 2) + this._offset;
            const labelY = ascent + this._settings.padding;

            this._context.fillText(value, labelX, labelY);
        }
    }

}
