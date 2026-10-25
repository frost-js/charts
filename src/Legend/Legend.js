/**
 * @class Legend
 */
class Legend extends Layer {

    /**
     * Calclulate the layer.
     * @param {Rect} chartRect The Chart Rect.
     * @param {function} next The next layer calculate callback.
     */
    calculate(chartRect, next) {
        this._rect = chartRect.clone();

        if (!this._settings.display) {
            return next(chartRect);
        }

        this._updateFont(this._settings.labels.font);

        this._spacing = this._context.measureText(' ').width;
        this._lineHeight = this._settings.labels.font.lineHeight * this._settings.labels.font.size;

        this._rows = [];
        this._cols = [];

        const maxWidth = this._settings.maxWidth ?
            Math.min(this._settings.maxWidth, this._rect.width) :
            this._rect.width;

        const maxHeight = this._settings.maxHeight ?
            Math.min(this._settings.maxHeight, this._rect.height) :
            this._rect.height;

        const datasets = this._chart.getData();
        const labels = datasets.map(dataset => this._wrapLines(dataset.label, maxWidth));

        switch (this._settings.position) {
            case 'top':
            case 'bottom':
                this._calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight);
                break;
            case 'right':
            case 'left':
                this._calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight);
                break;
        }

        next(chartRect);
    }

    /**
     * Render the layer.
     */
    render() {
        if (!this._settings.display) {
            return;
        }

        super.render();

        this._updateFont(this._settings.labels.font);

        this._context.textAlign = 'left';

        switch (this._settings.position) {
            case 'top':
            case 'bottom':
                this._renderHorizontal();
                break;
            case 'right':
            case 'left':
                this._renderVertical();
                break;
        }
    }

}
