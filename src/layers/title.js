/**
 * @import Rect from '../rect.js';
 */

import { measureText, updateFont, wrapLines } from '../helpers.js';
import Layer from './layer.js';

/**
 * Lays out and renders the chart title along any edge.
 */
export default class Title extends Layer {
    #lineHeight;
    #lines;
    #metrics;

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

        updateFont(this.context, this.settings.font);

        const maxWidth = ['right', 'left'].includes(this.settings.position) ?
            this.rect.height :
            this.rect.width;

        this.#lines = wrapLines(this.context, this.settings.text, maxWidth);
        this.#metrics = this.#lines.map((line) => measureText(this.context, line));

        this.#lineHeight = this.settings.font.lineHeight * this.settings.font.size;

        const available = ['right', 'left'].includes(this.settings.position) ?
            chartRect.width : chartRect.height;
        const height = Math.min(this.#lines.length * this.#lineHeight, available / 2);
        const padding = Math.min(this.settings.padding, Math.max(0, available - height));

        switch (this.settings.position) {
            case 'top':
                this.rect.height = height;
                chartRect.height -= height + padding;
                chartRect.y += height + padding;
                break;
            case 'right':
                this.rect.width = height;
                this.rect.x = chartRect.right - height;
                chartRect.width -= height + padding;
                break;
            case 'bottom':
                this.rect.height = height;
                this.rect.y = chartRect.bottom - height;
                chartRect.height -= height + padding;
                break;
            case 'left':
                this.rect.width = height;
                chartRect.width -= height + padding;
                chartRect.x += height + padding;
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

        updateFont(this.context, this.settings.font);

        this.context.textAlign = this.settings.align === 'start' ? 'left' : this.settings.align;
        this.context.fillStyle = this.settings.color;

        let x = 0;
        let y = 0;

        switch (this.settings.position) {
            case 'top':
            case 'bottom':
                switch (this.settings.align) {
                    case 'center':
                        x = this.rect.width / 2;
                        break;
                    case 'end':
                    case 'right':
                        x = this.rect.width;
                        break;
                }
                break;
            case 'right':
                x = this.rect.width;
                break;
        }

        switch (this.settings.position) {
            case 'right':
            case 'left':
                switch (this.settings.align) {
                    case 'center':
                        y = this.rect.height / 2;
                        break;
                    case 'start':
                    case 'left':
                        y = this.rect.height;
                        break;
                }
                break;
        }

        for (const [i, line] of this.#lines.entries()) {
            const { fontBoundingBoxAscent: ascent } = this.#metrics[i];

            let lineX = x;
            let lineY = y;

            switch (this.settings.position) {
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

            this.context.save();
            this.context.translate(lineX, lineY);

            switch (this.settings.position) {
                case 'right':
                    this.context.rotate(Math.PI / 2);
                    break;
                case 'left':
                    this.context.rotate(-Math.PI / 2);
                    break;
            }

            this.context.fillText(line, 0, 0);
            this.context.restore();

            switch (this.settings.position) {
                case 'top':
                case 'bottom':
                    y += this.#lineHeight;
                    break;
                case 'right':
                    x -= this.#lineHeight;
                    break;
                case 'left':
                    x += this.#lineHeight;
                    break;
            }
        }
    }
}
