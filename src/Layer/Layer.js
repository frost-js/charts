/**
 * @class Layer
 */
class Layer {

    /**
     * New Layer constructor.
     * @param {Chart} chart The Chart.
     * @param {object} settings The layer settings.
     */
    constructor(chart, settings) {
        this._chart = chart;
        this._settings = settings;

        this._canvas = dom.create('canvas');
        this._context = this._canvas.getContext('2d');
    }

    /**
     * Calclulate the layer.
     * @param {Rect} chartRect The Chart Rect.
     * @param {function} next The next layer calculate callback.
     */
    calculate(chartRect, next) {
        this._rect = chartRect.clone();

        next(chartRect);
    }

    /**
     * Calculate the canvas.
     */
    calculateCanvas() {
        this._canvasRect = this._rect.clone();
    }

    /**
     * Draw the layer.
     * @param {CanvasRenderingContext2D} context The Chart context.
     */
    draw(context) {
        if (!this._canvasRect.height || !this._canvasRect.width) {
            return;
        }

        context.drawImage(this._canvas, this._canvasRect.x, this._canvasRect.y);
    }

    /**
     * Render the layer.
     */
    render() {
        this._context.clearRect(0, 0, this._rect.width, this._rect.height);
    }

    /**
     * Update the layer.
     */
    update() {
        dom.setAttribute(this._canvas, {
            width: this._canvasRect.width,
            height: this._canvasRect.height
        });
    }

}
