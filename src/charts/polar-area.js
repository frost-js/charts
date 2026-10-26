/** @import { ChartRadialAxisOptions } from '../chart.js'; */
/** @import { ChartMark } from '../layers/layer.js'; */

import { getColor } from '../data.js';
import Layer from '../layers/layer.js';
import { getScalePosition } from '../scale.js';

/**
 * Renders equal-angle sectors whose radius represents each value.
 * @augments {Layer<ChartRadialAxisOptions, ChartMark>}
 */
export default class PolarAreaChart extends Layer {
    #oldSectors = new Map();
    #renderedSectors = new Map();
    #sectors = new Map();

    /**
     * Calculates target radii and angles for the visible data items.
     */
    data() {
        const labels = this.chart.getLabels();
        const values = this.chart.getValues();
        const angle = values.length ? Math.PI * 2 / values.length : 0;
        const radius = this.rect.width / 2;
        const maximum = this.chart.getScaleMax();
        let start = -Math.PI / 2;

        this.#oldSectors = this.#renderedSectors;
        this.#sectors = new Map();

        for (const [datasetIndex, dataset] of this.chart.getData().entries()) {
            for (const [index, value] of dataset.data.entries()) {
                if (!this.chart.isDataVisible(datasetIndex, index)) {
                    continue;
                }

                this.#sectors.set(`${datasetIndex}:${index}`, {
                    start,
                    angle,
                    radius: radius * getScalePosition(value, 0, maximum),
                    backgroundColor: getColor(dataset, 'backgroundColor', index),
                    borderColor: getColor(dataset, 'borderColor', index),
                    borderWidth: dataset.borderWidth,
                    fillOpacity: dataset.fillOpacity,
                    label: labels[index],
                    datasetLabel: dataset.label,
                    datasetIndex,
                    index,
                    value,
                });

                start += angle;
            }
        }
    }

    /**
     * Interpolates sector radii and angles and registers visible hit regions.
     * @param {number} [progress=1] The elapsed animation fraction.
     */
    render(progress = 1) {
        super.render();

        const centerX = this.rect.width / 2;
        const centerY = this.rect.height / 2;
        const keys = new Set([...this.#sectors.keys(), ...this.#oldSectors.keys()]);

        this.#renderedSectors = new Map();

        for (const key of keys) {
            const target = this.#sectors.get(key);
            const previous = this.#oldSectors.get(key);

            if (!target && progress === 1) {
                continue;
            }

            const next = target || { ...previous, radius: 0, angle: 0 };
            const old = previous || { ...next, radius: 0 };
            const item = { ...next };

            for (const property of ['start', 'angle', 'radius']) {
                item[property] = old[property] + (next[property] - old[property]) * progress;
            }

            this.#renderedSectors.set(key, item);

            if (!item.radius || !item.angle) {
                continue;
            }

            const path = new Path2D();

            path.moveTo(centerX, centerY);
            path.arc(centerX, centerY, item.radius, item.start, item.start + item.angle);
            path.closePath();
            this.context.save();
            this.context.globalAlpha = item.fillOpacity;
            this.context.fillStyle = item.backgroundColor;
            this.context.fill(path);
            this.context.restore();

            if (item.borderWidth) {
                this.context.strokeStyle = item.borderColor;
                this.context.lineWidth = item.borderWidth;
                this.context.stroke(path);
            }

            if (this.active?.datasetIndex === item.datasetIndex && this.active.index === item.index) {
                this.context.fillStyle = 'rgba(255,255,255,.3)';
                this.context.fill(path);
            }

            if (target) {
                const middle = item.start + item.angle / 2;

                this.addHitRegion(path, {
                    ...item,
                    anchorX: centerX + Math.cos(middle) * item.radius * .65,
                    anchorY: centerY + Math.sin(middle) * item.radius * .65,
                });
            }
        }
    }
}
