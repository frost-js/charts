/** @import { ChartScaleOptions } from '../chart.js'; */
/** @import { ChartMark } from '../layers/layer.js'; */

import { getColor } from '../data.js';
import Layer from '../layers/layer.js';

/**
 * Renders a combined pie or donut using all dataset values.
 * @augments {Layer<ChartScaleOptions, ChartMark>}
 */
export default class PieChart extends Layer {
    #oldSlices = [];
    #renderedSlices = [];
    #slices = [];

    /**
     * Calculates slice angles and retains the visible angles for transitions.
     */
    data() {
        const values = this.chart.getValues();
        const largest = values.reduce((max, value) => Math.max(max, value), 0);
        const labels = this.chart.options.data.labels;

        // Normalize before summing so large finite values cannot overflow the total.
        const total = largest ? values.reduce((sum, value) => sum + value / largest, 0) : 0;

        this.#oldSlices = this.#renderedSlices;
        this.#slices = [];

        for (const [datasetIndex, dataset] of this.chart.options.data.datasets.entries()) {
            const slices = [];

            for (const [index, value] of dataset.data.entries()) {
                slices.push({
                    angle: total && this.chart.isDataVisible(datasetIndex, index) ? value / largest / total * Math.PI * 2 : 0,
                    backgroundColor: getColor(dataset, 'backgroundColor', index),
                    borderColor: getColor(dataset, 'borderColor', index),
                    borderWidth: dataset.borderWidth,
                    label: labels[index],
                    datasetLabel: dataset.label,
                    datasetIndex,
                    index,
                    value,
                });
            }

            this.#slices.push(slices);
        }
    }

    /**
     * Interpolates slice angles with an outward offset and hover feedback.
     * @param {number} [progress=1] The elapsed animation fraction.
     */
    render(progress = 1) {
        super.render();

        const spacing = Math.min(5, this.rect.width / 4, this.rect.height / 4);
        const radius = Math.max(0, Math.min(this.rect.width, this.rect.height) / 2 - spacing);
        const cutout = this.chart.options.type === 'donut' ? this.chart.options.cutout : 0;
        const innerRadius = radius * cutout;
        const datasetCount = Math.max(this.#slices.length, this.#oldSlices.length);
        let start = 0;

        this.#renderedSlices = [];

        for (let datasetIndex = 0; datasetIndex < datasetCount; datasetIndex++) {
            const targets = this.#slices[datasetIndex] || [];
            const oldSlices = this.#oldSlices[datasetIndex] || [];
            const count = Math.max(targets.length, oldSlices.length);
            const rendered = [];

            for (let index = 0; index < count; index++) {
                const target = targets[index];
                const old = oldSlices[index];
                const next = target || { ...old, angle: 0 };
                const oldAngle = old?.angle || 0;
                const angle = oldAngle + (next.angle - oldAngle) * progress;

                if (!target && progress === 1) {
                    continue;
                }

                rendered.push({ ...next, angle });

                if (!angle) {
                    continue;
                }

                const middle = start + angle / 2;
                const x = this.rect.width / 2 + Math.cos(middle) * spacing;
                const y = this.rect.height / 2 + Math.sin(middle) * spacing;
                const path = new Path2D();

                path.arc(x, y, radius, start, start + angle);

                if (innerRadius) {
                    path.arc(x, y, innerRadius, start + angle, start, true);
                } else {
                    path.lineTo(x, y);
                }

                path.closePath();

                this.context.fillStyle = next.backgroundColor;
                this.context.fill(path);

                if (next.borderWidth) {
                    this.context.strokeStyle = next.borderColor;
                    this.context.lineWidth = next.borderWidth;
                    this.context.stroke(path);
                }

                if (this.active?.datasetIndex === datasetIndex && this.active.index === index) {
                    this.context.fillStyle = 'rgba(255,255,255,.3)';
                    this.context.fill(path);
                }

                if (target && target.angle) {
                    const anchorRadius = (innerRadius + radius) / 2;

                    this.addHitRegion(path, {
                        ...target,
                        anchorX: x + Math.cos(middle) * anchorRadius,
                        anchorY: y + Math.sin(middle) * anchorRadius,
                    });
                }

                start += angle;
            }

            this.#renderedSlices.push(rendered);
        }
    }
}
