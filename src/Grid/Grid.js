/**
 * @class Grid
 */
class Grid extends Layer {

    /**
     * Calclulate the layer.
     * @param {Rect} chartRect The Chart Rect.
     * @param {function} next The next layer calculate callback.
     */
    calculate(chartRect, next) {
        this._rect = chartRect.clone();

        this._labelsY = this._chart.getScale();
        this._labelsX = this._chart.getLabels();

        chartRect.x += this._settings.y.grid.tickLength;
        chartRect.width -= this._settings.y.grid.tickLength;
        chartRect.height -= this._settings.x.grid.tickLength;

        next(chartRect);
    }

    /**
     * Calculate the canvas.
     */
    calculateCanvas() {
        super.calculateCanvas();

        this._canvasRect.x -= this._settings.y.grid.borderWidth;
        this._canvasRect.y -= this._settings.x.grid.lineWidth;
        this._canvasRect.width += this._settings.y.grid.borderWidth + (this._settings.y.grid.lineWidth * 2);
        this._canvasRect.height += this._settings.x.grid.lineWidth + this._settings.y.grid.borderWidth;
    }

    // draw(context) {
    //     context.strokeStyle = '#000';
    //     context.rect(this._rect.x + this._innerRect.x, this._rect.y + this._innerRect.y, this._innerRect.width, this._innerRect.height);
    //     context.stroke();
    // }

    /**
     * Render the layer.
     */
    render() {
        super.render();

        this._renderGridX();
        this._renderGridY();
        this._renderTicksX();
        this._renderTicksY();
        this._renderAxisX();
        this._renderAxisY();
    }

}
