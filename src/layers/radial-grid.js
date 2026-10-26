/** @import { ChartRadialAxisOptions } from '../chart.js'; */
/** @import Rect from '../rect.js'; */
/** @import { LayerLayoutCallback } from './layer.js'; */

import { measureText, updateFont } from '../helpers.js';
import { getScalePosition } from '../scale.js';
import Layer from './layer.js';

/**
 * Reserves a circular plot and draws radial guides and category labels.
 * @augments {Layer<ChartRadialAxisOptions>}
 */
export default class RadialGrid extends Layer {
    #labels = [];
    #plotRect;

    /**
     * Centers a square plot while reserving room for the surrounding labels.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {LayerLayoutCallback} next The next layout callback.
     */
    calculate(chartRect, next) {
        this.rect = chartRect.clone();

        const labels = this.chart.options.data.labels;

        this.#labels = labels;

        if (this.chart.options.type === 'polarArea') {
            this.#labels = this.chart.options.data.datasets.flatMap((dataset, datasetIndex) => {
                return labels.filter((label, index) => this.chart.isDataVisible(datasetIndex, index));
            });
        }

        let paddingX = 0;
        let paddingY = 0;

        if (this.settings.display && this.settings.ticks.display) {
            const font = this.settings.ticks.font;

            paddingY = Math.min(chartRect.height / 4, font.size * font.lineHeight / 2);
        }

        if (this.settings.display && this.settings.labels.display) {
            const { font, padding } = this.settings.labels;

            updateFont(this.context, font);

            const widths = this.#labels.map((label) => measureText(this.context, label).width);

            paddingX = Math.min(chartRect.width / 4, Math.max(0, ...widths) + padding);
            paddingY = Math.min(chartRect.height / 4, font.size * font.lineHeight + padding);
        }

        const size = Math.max(0, Math.min(chartRect.width - paddingX * 2, chartRect.height - paddingY * 2));

        chartRect.x += (chartRect.width - size) / 2;
        chartRect.y += (chartRect.height - size) / 2;
        chartRect.width = size;
        chartRect.height = size;

        this.#plotRect = chartRect.clone();
        next(chartRect);
    }

    /**
     * Includes category labels outside the circular plot.
     */
    calculateCanvas() {
        this.canvasRect = this.chart.outerRect;
    }

    /**
     * Draws polygon guides for radar or circular guides for polar area charts.
     */
    render() {
        super.render();

        if (!this.settings.display) {
            return;
        }

        const radar = this.chart.options.type === 'radar';
        const ticks = this.chart.getScale();
        const maximum = this.chart.getScaleMax();
        const radius = this.#plotRect.width / 2;
        const centerX = this.#plotRect.centerX - this.canvasRect.x;
        const centerY = this.#plotRect.centerY - this.canvasRect.y;

        this.context.save();
        this.context.translate(centerX, centerY);
        this.context.strokeStyle = this.settings.grid.lineColor;
        this.context.lineWidth = this.settings.grid.lineWidth || 1;

        for (const value of ticks) {
            if (!value) {
                continue;
            }

            const distance = radius * getScalePosition(value, 0, maximum);

            if (this.settings.grid.display && this.settings.grid.lineWidth) {
                this.#renderRing(distance, radar);
            }
        }

        if (radar && this.settings.grid.display && this.settings.grid.lineWidth) {
            for (let index = 0; index < this.#labels.length; index++) {
                const angle = index * Math.PI * 2 / this.#labels.length - Math.PI / 2;

                this.context.beginPath();
                this.context.moveTo(0, 0);
                this.context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                this.context.stroke();
            }
        }

        this.context.restore();

        if (this.settings.labels.display) {
            this.#renderLabels(centerX, centerY, radius, radar);
        }
    }

    /**
     * Draws category labels around the radial plot with outward alignment.
     * @param {number} centerX The local center x coordinate.
     * @param {number} centerY The local center y coordinate.
     * @param {number} radius The plot radius.
     * @param {boolean} radar Whether labels align with spokes instead of sectors.
     */
    #renderLabels(centerX, centerY, radius, radar) {
        const { font, padding, color } = this.settings.labels;

        updateFont(this.context, font);
        this.context.fillStyle = color;

        for (const [index, label] of this.#labels.entries()) {
            const angle = (index + (radar ? 0 : .5)) * Math.PI * 2 / this.#labels.length - Math.PI / 2;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            const x = centerX + cosine * (radius + padding);
            const y = centerY + sine * (radius + padding);

            this.context.textAlign = cosine > 0 ? 'left' : 'right';
            this.context.textBaseline = sine > 0 ? 'top' : 'bottom';

            let available = cosine > 0 ? this.canvasRect.width - x : x;

            if (Math.abs(cosine) < .01) {
                this.context.textAlign = 'center';
                available = this.canvasRect.width;
            }

            if (Math.abs(sine) < .01) {
                this.context.textBaseline = 'middle';
            }

            this.context.fillText(label, x, y, Math.max(1, available));
        }
    }

    /**
     * Draws a single radial scale ring.
     * @param {number} radius The ring radius.
     * @param {boolean} polygon Whether to connect the radar spokes.
     */
    #renderRing(radius, polygon) {
        this.context.beginPath();

        if (polygon && this.#labels.length >= 3) {
            for (let index = 0; index < this.#labels.length; index++) {
                const angle = index * Math.PI * 2 / this.#labels.length - Math.PI / 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                if (index) {
                    this.context.lineTo(x, y);
                } else {
                    this.context.moveTo(x, y);
                }
            }

            this.context.closePath();
        } else {
            this.context.arc(0, 0, radius, 0, Math.PI * 2);
        }

        this.context.stroke();
    }
}
