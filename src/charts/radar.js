/** @import { ChartRadialAxisOptions } from '../chart.js'; */
/** @import { ChartPoint } from '../layers/layer.js'; */

import { getColor } from '../data.js';
import Layer from '../layers/layer.js';
import { getScalePosition } from '../scale.js';

/**
 * Connects each dataset around shared radial category axes.
 * @augments {Layer<ChartRadialAxisOptions, ChartPoint>}
 */
export default class RadarChart extends Layer {
    #oldPoints = [];
    #points = [];
    #renderedPoints = [];

    /**
     * Includes point radii and borders beyond the outer radial guide.
     */
    calculateCanvas() {
        this.canvasRect = this.chart.outerRect;
    }

    /**
     * Calculates radial targets while retaining the last visible positions.
     */
    data() {
        const labels = this.chart.options.data.labels;
        const radius = this.rect.width / 2;
        const maximum = this.chart.getScaleMax();
        const centerX = this.rect.centerX - this.canvasRect.x;
        const centerY = this.rect.centerY - this.canvasRect.y;

        this.#oldPoints = this.#renderedPoints;
        this.#points = this.chart.options.data.datasets.map((dataset, datasetIndex) => {
            if (!this.chart.isDatasetVisible(datasetIndex)) {
                return [];
            }

            return dataset.data.map((value, index) => {
                const angle = index * Math.PI * 2 / labels.length - Math.PI / 2;
                const distance = radius * getScalePosition(value, 0, maximum);

                return {
                    x: centerX + Math.cos(angle) * distance,
                    y: centerY + Math.sin(angle) * distance,
                    backgroundColor: getColor(dataset, 'backgroundColor', index),
                    borderColor: getColor(dataset, 'borderColor', index),
                    borderWidth: dataset.borderWidth,
                    pointRadius: dataset.pointRadius,
                    fillOpacity: dataset.fillOpacity,
                    label: labels[index],
                    datasetLabel: dataset.label,
                    datasetIndex,
                    index,
                    value,
                };
            });
        });
    }

    /**
     * Interpolates each polygon from its visible positions or the radial center.
     * @param {number} [progress=1] The elapsed animation fraction.
     */
    render(progress = 1) {
        super.render();

        const centerX = this.rect.centerX - this.canvasRect.x;
        const centerY = this.rect.centerY - this.canvasRect.y;
        const count = Math.max(this.#points.length, this.#oldPoints.length);

        this.#renderedPoints = [];

        for (let datasetIndex = 0; datasetIndex < count; datasetIndex++) {
            const targets = this.#points[datasetIndex] || [];
            const previous = this.#oldPoints[datasetIndex] || [];
            const points = [];

            for (let index = 0; index < Math.max(targets.length, previous.length); index++) {
                const target = targets[index];
                const old = previous[index];

                if (!target && progress === 1) {
                    continue;
                }

                const next = target || { ...old, x: centerX, y: centerY, pointRadius: 0 };
                const start = old || { ...next, x: centerX, y: centerY, pointRadius: 0 };

                points.push({
                    ...next,
                    x: start.x + (next.x - start.x) * progress,
                    y: start.y + (next.y - start.y) * progress,
                    pointRadius: start.pointRadius + (next.pointRadius - start.pointRadius) * progress,
                    interactive: Boolean(target),
                });
            }

            this.#renderedPoints.push(points);
        }

        // Fills sit below every series' outlines and hit targets.
        for (const points of this.#renderedPoints) {
            if (points.length < 3) {
                continue;
            }

            const path = this.#polygon(points);

            this.context.save();
            this.context.globalAlpha = points[0].fillOpacity;
            this.context.fillStyle = points[0].backgroundColor;
            this.context.fill(path);
            this.context.restore();
        }

        for (const points of this.#renderedPoints) {
            this.#renderSeries(points);
        }
    }

    /**
     * Connects the visible points into a closed polygon.
     * @param {ChartPoint[]} points The interpolated points.
     * @returns {Path2D} The polygon path.
     */
    #polygon(points) {
        const path = new Path2D();

        for (const [index, point] of points.entries()) {
            if (index) {
                path.lineTo(point.x, point.y);
            } else {
                path.moveTo(point.x, point.y);
            }
        }

        path.closePath();

        return path;
    }

    /**
     * Draws the polygon outline and interactive points.
     * @param {ChartPoint[]} points The interpolated points.
     */
    #renderSeries(points) {
        if (!points.length) {
            return;
        }

        if (points[0].borderWidth) {
            this.context.strokeStyle = points[0].borderColor;
            this.context.lineWidth = points[0].borderWidth;
            this.context.stroke(this.#polygon(points));
        }

        for (const point of points) {
            const path = new Path2D();
            const hit = new Path2D();

            path.arc(point.x, point.y, point.pointRadius, 0, Math.PI * 2);
            this.context.fillStyle = point.backgroundColor;
            this.context.fill(path);

            if (point.interactive) {
                hit.arc(point.x, point.y, Math.max(6, point.pointRadius), 0, Math.PI * 2);
                this.addHitRegion(hit, { ...point, anchorX: point.x, anchorY: point.y });
            }
        }
    }
}
