/**
 * @import Rect from '../rect.js';
 */

import { measureText, updateFont } from '../helpers.js';
import { getScalePosition } from '../scale.js';
import Layer from './layer.js';

/**
 * Lays out category labels or numeric scatter ticks below the plot.
 */
export default class LabelsX extends Layer {
    #gridWidth;
    #labels;
    #metrics;
    #offset;
    #values;

    /**
     * Calculates the layer bounds before continuing layout.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {Function} next The next layout callback.
     */
    calculate(chartRect, next) {
        this.rect = chartRect.clone();

        if (!this.settings.display || !this.chart.options.scales.x.display) {
            this.rect.width = 0;
            this.rect.height = 0;
            this.#gridWidth = 0;
            next(chartRect);

            return;
        }

        updateFont(this.context, this.settings.font);

        this.#values = this.chart.options.type === 'scatter' ? this.chart.getScale('x') : this.chart.getLabels();
        this.#labels = this.#values.map((value, index) => {
            const formatted = this.settings.callback ? this.settings.callback(value, index) : value;

            return String(formatted);
        });

        this.#metrics = this.#labels.map((label) => measureText(this.context, label));
        const heights = this.#metrics.map((metric) => {
            return metric.fontBoundingBoxAscent + metric.fontBoundingBoxDescent;
        });
        const maxHeight = Math.max(0, ...heights);

        this.rect.height = Math.min(chartRect.height / 2, maxHeight + this.settings.padding);
        this.rect.y = chartRect.bottom - this.rect.height;

        chartRect.height -= this.rect.height;

        next(chartRect);

        switch (this.chart.options.type) {
            case 'bar':
                this.#gridWidth = chartRect.width / Math.max(1, this.#labels.length);
                this.#offset = this.#gridWidth / 2;
                break;
            case 'line':
            case 'area':
            case 'scatter':
                this.#gridWidth = this.#labels.length > 1 ? chartRect.width / (this.#labels.length - 1) : 0;
                this.#offset = this.#labels.length === 1 ? chartRect.width / 2 : 0;
                break;
        }

        this.rect.x = chartRect.left;
        this.rect.width = chartRect.width;
    }

    /**
     * Calculates the offscreen canvas bounds.
     */
    calculateCanvas() {
        super.calculateCanvas();

        this.canvasRect.x -= this.#gridWidth / 2;
        this.canvasRect.width += this.#gridWidth;
    }

    /**
     * Renders the layer to its offscreen canvas.
     */
    render() {
        super.render();

        if (!this.settings.display || !this.chart.options.scales.x.display) {
            return;
        }

        updateFont(this.context, this.settings.font);

        this.context.textAlign = 'left';
        this.context.fillStyle = this.settings.color;

        for (const [i, value] of this.#labels.entries()) {
            const { fontBoundingBoxAscent: ascent, width } = this.#metrics[i];

            let position = i * this.#gridWidth + this.#offset;

            if (this.chart.options.type === 'scatter') {
                const fraction = getScalePosition(this.#values[i], this.#values[0], this.#values.at(-1));

                position = fraction * this.rect.width;
            }

            const labelX = position + this.#gridWidth / 2 - width / 2;
            const labelY = ascent + this.settings.padding;

            this.context.fillText(value, labelX, labelY);
        }
    }
}
