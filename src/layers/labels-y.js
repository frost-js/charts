/** @import { ChartTickOptions } from '../chart.js'; */
/** @import Rect from '../rect.js'; */
/** @import { LayerLayoutCallback } from './layer.js'; */

import { measureText, updateFont } from '../helpers.js';
import { getScalePosition } from '../scale.js';
import Layer from './layer.js';

/**
 * Lays out numeric ticks or horizontal bar categories beside the plot.
 * @augments {Layer<ChartTickOptions>}
 */
export default class LabelsY extends Layer {
    #categorical;
    #gridHeight;
    #labels;
    #metrics;
    #values;

    /**
     * Calculates the layer bounds before continuing layout.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {LayerLayoutCallback} next The next layout callback.
     */
    calculate(chartRect, next) {
        this.rect = chartRect.clone();

        if (!this.settings.display || !this.chart.options.scales.y.display) {
            this.rect.width = 0;
            this.rect.height = 0;
            this.#gridHeight = 0;
            next(chartRect);

            return;
        }

        updateFont(this.context, this.settings.font);

        const { type, orientation } = this.chart.options;

        this.#categorical = type === 'bar' && orientation === 'horizontal';
        this.#values = this.#categorical ? this.chart.options.data.labels : this.chart.getScale();
        this.#labels = this.#values.map((value, index) => {
            const formatted = this.settings.callback ? this.settings.callback(value, index) : value;

            return String(formatted);
        });
        this.#metrics = this.#labels.map((label) => measureText(this.context, label));

        const maxWidth = this.#metrics.reduce((maximum, metric) => Math.max(maximum, metric.width), 0);

        this.rect.width = Math.min(chartRect.width / 2, maxWidth + this.settings.padding);

        chartRect.width -= this.rect.width;
        chartRect.x = this.rect.right;

        next(chartRect);

        this.rect.y = chartRect.top;
        this.rect.height = chartRect.height;

        this.#gridHeight = this.rect.height / Math.max(1, this.#labels.length - 1);
    }

    /**
     * Calculates the offscreen canvas bounds.
     */
    calculateCanvas() {
        super.calculateCanvas();

        this.canvasRect.y -= this.#gridHeight / 2;
        this.canvasRect.height += this.#gridHeight;
    }

    /**
     * Renders the layer to its offscreen canvas.
     */
    render() {
        super.render();

        if (!this.settings.display || !this.chart.options.scales.y.display) {
            return;
        }

        updateFont(this.context, this.settings.font);

        this.context.textAlign = 'right';
        this.context.fillStyle = this.settings.color;

        for (const [i, value] of this.#labels.entries()) {
            const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = this.#metrics[i];

            const labelX = this.rect.width - this.settings.padding;
            const position = this.#categorical ?
                1 - (i + .5) / this.#values.length :
                getScalePosition(this.#values[i], this.#values[0], this.#values.at(-1));
            const offset = this.rect.y - this.canvasRect.y;
            const labelY = (1 - position) * this.rect.height + offset + (ascent - descent) / 2;

            this.context.fillText(value, labelX, labelY);
        }
    }
}
