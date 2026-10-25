import { getColor } from '../data.js';
import Layer from '../layers/layer.js';
import { getScalePosition } from '../scale.js';

/**
 * Renders connected data points on the Cartesian axes.
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

        const datasets = this.chart.getData();
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
        const labels = this.chart.getLabels();
        const datasets = this.chart.getData();

        const min = this.chart.getScaleMin();
        const max = this.chart.getScaleMax();
        const step = labels.length > 1 ? this.rect.width / (labels.length - 1) : 0;

        this.#oldPoints = this.#renderedPoints;
        this.#points = [];
        this.#baseY = this.rect.height * (1 - getScalePosition(0, min, max));

        for (const [datasetIndex, dataset] of datasets.entries()) {
            const points = [];

            for (const [index, value] of dataset.data.entries()) {
                points.push({
                    x: labels.length === 1 ? this.rect.width / 2 : index * step,
                    y: this.rect.height * (1 - getScalePosition(value, min, max)),
                    backgroundColor: getColor(dataset, 'backgroundColor', index),
                    borderColor: getColor(dataset, 'borderColor', index),
                    borderWidth: dataset.borderWidth,
                    pointRadius: dataset.pointRadius,
                    label: labels[index],
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

        const offsetX = this.rect.x - this.canvasRect.x;
        const offsetY = this.rect.y - this.canvasRect.y;
        const datasetCount = Math.max(this.#points.length, this.#oldPoints.length);

        this.#renderedPoints = [];

        for (let datasetIndex = 0; datasetIndex < datasetCount; datasetIndex++) {
            const targets = this.#points[datasetIndex] || [];
            const oldPoints = this.#oldPoints[datasetIndex] || [];
            const count = Math.max(targets.length, oldPoints.length);
            const rendered = [];
            let previous = null;

            for (let index = 0; index < count; index++) {
                const target = targets[index];
                const old = oldPoints[index];
                const next = target || { ...old, y: this.#baseY, pointRadius: 0 };
                const start = old || { ...next, y: this.#baseY, pointRadius: 0 };

                const x = start.x + (next.x - start.x) * progress;
                const y = start.y + (next.y - start.y) * progress;
                const radius = start.pointRadius + (next.pointRadius - start.pointRadius) * progress;

                if (!target && progress === 1) {
                    continue;
                }

                rendered.push({ ...next, x, y, pointRadius: radius });

                const point = new Path2D();
                const hit = new Path2D();

                this.context.strokeStyle = next.borderColor;
                this.context.fillStyle = next.backgroundColor;

                if (previous && next.borderWidth) {
                    this.context.beginPath();
                    this.context.moveTo(previous.x + offsetX, previous.y + offsetY);
                    this.context.lineTo(x + offsetX, y + offsetY);
                    this.context.lineWidth = next.borderWidth;
                    this.context.stroke();
                }

                point.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
                this.context.fill(point);

                if (next.borderWidth) {
                    this.context.lineWidth = next.borderWidth;
                    this.context.stroke(point);
                }

                if (target) {
                    hit.arc(x + offsetX, y + offsetY, Math.max(6, radius), 0, Math.PI * 2);
                    this.addHitRegion(hit, target);
                }

                previous = { x, y };
            }

            this.#renderedPoints.push(rendered);
        }
    }
}
