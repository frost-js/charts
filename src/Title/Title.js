/**
 * @class Title
 */
class Title extends Layer {

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

        this._updateFont(this._settings.font);

        const maxWidth = ['right', 'left'].includes(this._settings.position) ?
            this._rect.height :
            this._rect.width;

        this._lines = this._wrapLines(this._settings.text, maxWidth);
        this._metrics = this._lines.map(line => this._context.measureText(line));

        this._lineHeight = this._settings.font.lineHeight * this._settings.font.size;

        const height = this._lines.length * this._lineHeight;

        switch (this._settings.position) {
            case 'top':
                this._rect.height = height;
                chartRect.height -= height + this._settings.padding;
                chartRect.y += height + this._settings.padding;
                break;
            case 'right':
                this._rect.width = height;
                this._rect.x = chartRect.right - height;
                chartRect.width -= height + this._settings.padding;
                break;
            case 'bottom':
                this._rect.height = height;
                this._rect.y = chartRect.bottom - height;
                chartRect.height -= height + this._settings.padding;
                break;
            case 'left':
                this._rect.width = height;
                chartRect.width -= height + this._settings.padding;
                chartRect.x += height + this._settings.padding;
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

        this._updateFont(this._settings.font);

        this._context.textAlign = this._settings.align;
        this._context.fillStyle = this._settings.color;

        let x = 0;
        let y = 0;

        switch (this._settings.position) {
            case 'top':
            case 'bottom':
                switch (this._settings.align) {
                    case 'center':
                        x = this._rect.width / 2;
                        break;
                    case 'right':
                        x = this._rect.width;
                        break;
                }
                break;
            case 'right':
                x = this._rect.width;
                break;
        }

        switch (this._settings.position) {
            case 'right':
            case 'left':
                switch (this._settings.align) {
                    case 'center':
                        y = this._rect.height / 2;
                        break;
                    case 'left':
                        y = this._rect.height;
                        break;
                }
                break;
        }

        for (const [i, line] of this._lines.entries()) {
            const { fontBoundingBoxAscent: ascent } = this._metrics[i];

            let lineX = x;
            let lineY = y;

            switch (this._settings.position) {
                case 'top':
                case 'bottom':
                    lineY += ascent;
                    break;
                case 'right':
                    lineX -= ascent;
                    break;
                case 'left':
                    lineX += ascent;
                    break;
            }

            this._context.save();
            this._context.translate(lineX, lineY);

            switch (this._settings.position) {
                case 'right':
                    this._context.rotate(Math.PI / 2);
                    break;
                case 'left':
                    this._context.rotate(-Math.PI / 2);
                    break;
            }

            this._context.fillText(line, 0, 0);
            this._context.restore();

            switch (this._settings.position) {
                case 'top':
                case 'bottom':
                    y += this._lineHeight;
                    break;
                case 'right':
                    x -= this._lineHeight;
                    break;
                case 'left':
                    x += this._lineHeight;
                    break;
            }
        }
    }

}
