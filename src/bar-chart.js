import { getColor } from './data.js';
import Layer from './layer.js';
import { getScalePosition } from './scale.js';

/**
 * Renders grouped bars and interpolates between successive datasets.
 */
export default class BarChart extends Layer {
    #baseY = 0;
    #oldRects = [];
    #rects = [];

    /**
     * Calculates bar geometry against the current zero baseline.
     */
    data() {
        const labels = this.chart.getLabels();
        const datasets = this.chart.getData();

        const min = this.chart.getScaleMin();
        const max = this.chart.getScaleMax();

        const groupWidth = this.rect.width / Math.max(1, labels.length);
        const spacing = Math.min(5, groupWidth / (datasets.length + 1) / 2);

        this.#oldRects = this.#rects;
        this.#rects = [];
        this.#baseY = this.rect.height * (1 - getScalePosition(0, min, max));

        for (let index = 0; index < labels.length; index++) {
            for (const [datasetIndex, dataset] of datasets.entries()) {
                const value = dataset.data[index];
                const width = Math.max(0, (groupWidth - spacing * (datasets.length + 1)) / datasets.length);
                const groupX = index * groupWidth;
                const datasetX = datasetIndex * width + spacing * (datasetIndex + 1);
                const x = groupX + datasetX;
                const valueY = this.rect.height * (1 - getScalePosition(value, min, max));

                this.#rects.push({
                    x,
                    y: Math.min(valueY, this.#baseY),
                    width,
                    height: Math.abs(valueY - this.#baseY),
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
        }
    }

    /**
     * Renders a single animation frame without retaining old hit regions.
     * @param {number} [progress=1] The elapsed animation fraction.
     */
    render(progress = 1) {
        super.render();

        const count = Math.max(this.#rects.length, this.#oldRects.length);

        for (let index = 0; index < count; index++) {
            const target = this.#rects[index];
            const previous = this.#oldRects[index];
            const next = target || {
                ...previous,
                y: this.#baseY,
                height: 0,
            };
            const old = previous || {
                ...next,
                y: this.#baseY,
                height: 0,
            };

            const interpolate = (key) => old[key] + (next[key] - old[key]) * progress;
            const path = new Path2D();

            path.rect(
                interpolate('x'),
                interpolate('y'),
                interpolate('width'),
                interpolate('height'),
            );

            this.context.fillStyle = next.backgroundColor;
            this.context.fill(path);

            if (next.borderWidth) {
                this.context.strokeStyle = next.borderColor;
                this.context.lineWidth = next.borderWidth;
                this.context.stroke(path);
            }

            if (target) {
                this.addHitRegion(path, target);
            }
        }
    }
}
