/** @import { ChartScaleOptions } from '../chart.js'; */
/** @import { ChartPoint } from '../layers/layer.js'; */

import { getColor } from '../data.js';
import Layer from '../layers/layer.js';
import { getScalePosition } from '../scale.js';

/**
 * Renders line, area, and scatter series on the Cartesian axes.
 * @augments {Layer<ChartScaleOptions, ChartPoint>}
 */
export default class LineChart extends Layer {
    #baseY = 0;
    #oldPoints = [];
    #points = [];
    #renderedPoints = [];

    /**
     * Includes point radii and border widths beyond the plot boundaries.
     */
    calculateCanvas() {
        super.calculateCanvas();

        const datasets = this.chart.options.data.datasets;
        const padding = datasets.reduce((size, dataset) => {
            return Math.max(size, dataset.pointRadius + dataset.borderWidth / 2);
        }, 0);

        this.canvasRect.x -= padding;
        this.canvasRect.y -= padding;
        this.canvasRect.width += padding * 2;
        this.canvasRect.height += padding * 2;
    }

    /**
     * Calculates target points and retains the visible positions for transitions.
     */
    data() {
        const scatter = this.chart.options.type === 'scatter';
        const labels = this.chart.options.data.labels;
        const datasets = this.chart.options.data.datasets;

        const minX = this.chart.getScaleMin('x');
        const maxX = this.chart.getScaleMax('x');
        const min = this.chart.getScaleMin();
        const max = this.chart.getScaleMax();
        const step = labels.length > 1 ? this.rect.width / (labels.length - 1) : 0;

        this.#oldPoints = this.#renderedPoints;
        this.#points = [];
        this.#baseY = this.rect.height * (1 - getScalePosition(0, min, max));

        for (const [datasetIndex, dataset] of datasets.entries()) {
            const points = [];

            if (!this.chart.isDatasetVisible(datasetIndex)) {
                this.#points.push(points);
                continue;
            }

            for (const [index, value] of dataset.data.entries()) {
                let x = labels.length === 1 ? this.rect.width / 2 : index * step;

                if (scatter) {
                    x = this.rect.width * getScalePosition(value.x, minX, maxX);
                }

                const yValue = scatter ? value.y : value;

                points.push({
                    x,
                    y: this.rect.height * (1 - getScalePosition(yValue, min, max)),
                    backgroundColor: getColor(dataset, 'backgroundColor', index),
                    borderColor: getColor(dataset, 'borderColor', index),
                    borderWidth: dataset.borderWidth,
                    pointRadius: dataset.pointRadius,
                    fillOpacity: dataset.fillOpacity,
                    label: labels[index] ?? `Point ${index + 1}`,
                    datasetLabel: dataset.label,
                    datasetIndex,
                    index,
                    value,
                });
            }

            this.#points.push(points);
        }
    }

    /**
     * Interpolates series and registers hit regions at their visible positions.
     * @param {number} [progress=1] The elapsed animation fraction.
     */
    render(progress = 1) {
        super.render();

        const type = this.chart.options.type;
        const datasetCount = Math.max(this.#points.length, this.#oldPoints.length);

        this.#renderedPoints = [];

        for (let datasetIndex = 0; datasetIndex < datasetCount; datasetIndex++) {
            const targets = this.#points[datasetIndex] || [];
            const oldPoints = this.#oldPoints[datasetIndex] || [];
            const count = Math.max(targets.length, oldPoints.length);
            const rendered = [];

            for (let index = 0; index < count; index++) {
                const target = targets[index];
                const old = oldPoints[index];

                if (!target && progress === 1) {
                    continue;
                }

                const next = target || { ...old, y: this.#baseY, pointRadius: 0 };
                const start = old || { ...next, y: this.#baseY, pointRadius: 0 };

                rendered.push({
                    ...next,
                    x: start.x + (next.x - start.x) * progress,
                    y: start.y + (next.y - start.y) * progress,
                    pointRadius: start.pointRadius + (next.pointRadius - start.pointRadius) * progress,
                    interactive: Boolean(target),
                });
            }

            this.#renderedPoints.push(rendered);
        }

        // Paint all fills first so a later area cannot cover another series' points.
        if (type === 'area') {
            for (const points of this.#renderedPoints) {
                this.#fillArea(points);
            }
        }

        for (const points of this.#renderedPoints) {
            this.#renderSeries(points, type !== 'scatter');
        }
    }

    /**
     * Fills the area between a series and the current zero baseline.
     * @param {ChartPoint[]} points The interpolated points.
     */
    #fillArea(points) {
        if (points.length < 2) {
            return;
        }

        const offsetX = this.rect.x - this.canvasRect.x;
        const offsetY = this.rect.y - this.canvasRect.y;
        const path = new Path2D();

        path.moveTo(points[0].x + offsetX, this.#baseY + offsetY);

        for (const point of points) {
            path.lineTo(point.x + offsetX, point.y + offsetY);
        }

        path.lineTo(points.at(-1).x + offsetX, this.#baseY + offsetY);
        path.closePath();

        this.context.save();
        this.context.globalAlpha = points[0].fillOpacity;
        this.context.fillStyle = points[0].backgroundColor;
        this.context.fill(path);
        this.context.restore();
    }

    /**
     * Draws visible points and optional connecting segments.
     * @param {ChartPoint[]} points The interpolated points.
     * @param {boolean} connected Whether to connect successive points.
     */
    #renderSeries(points, connected) {
        const offsetX = this.rect.x - this.canvasRect.x;
        const offsetY = this.rect.y - this.canvasRect.y;
        let previous = null;

        for (const item of points) {
            const x = item.x + offsetX;
            const y = item.y + offsetY;
            const point = new Path2D();
            const hit = new Path2D();

            this.context.strokeStyle = item.borderColor;
            this.context.fillStyle = item.backgroundColor;

            if (connected && previous && item.borderWidth) {
                this.context.beginPath();
                this.context.moveTo(previous.x, previous.y);
                this.context.lineTo(x, y);
                this.context.lineWidth = item.borderWidth;
                this.context.stroke();
            }

            point.arc(x, y, item.pointRadius, 0, Math.PI * 2);
            this.context.fill(point);

            if (item.borderWidth) {
                this.context.lineWidth = item.borderWidth;
                this.context.stroke(point);
            }

            if (item.interactive) {
                hit.arc(x, y, Math.max(6, item.pointRadius), 0, Math.PI * 2);
                this.addHitRegion(hit, { ...item, anchorX: x, anchorY: y });
            }

            previous = { x, y };
        }
    }
}
