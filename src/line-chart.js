import { getColor } from './data.js';
import Layer from './layer.js';
import { getScalePosition } from './scale.js';

/**
 * Renders connected data points on the Cartesian axes.
 */
export default class LineChart extends Layer {
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
     * Renders each series and registers its point hit regions.
     */
    render() {
        super.render();

        const labels = this.chart.getLabels();
        const datasets = this.chart.getData();
        const min = this.chart.getScaleMin();
        const max = this.chart.getScaleMax();
        const step = labels.length > 1 ? this.rect.width / (labels.length - 1) : 0;
        const offsetX = this.rect.x - this.canvasRect.x;
        const offsetY = this.rect.y - this.canvasRect.y;

        for (const [datasetIndex, dataset] of datasets.entries()) {
            let previous = null;

            for (const [index, value] of dataset.data.entries()) {
                const categoryX = labels.length === 1 ? this.rect.width / 2 : index * step;
                const x = categoryX + offsetX;
                const y = this.rect.height * (1 - getScalePosition(value, min, max)) + offsetY;
                const point = new Path2D();
                const hit = new Path2D();

                this.context.strokeStyle = getColor(dataset, 'borderColor', index);
                this.context.fillStyle = getColor(dataset, 'backgroundColor', index);

                if (previous && dataset.borderWidth) {
                    this.context.beginPath();
                    this.context.moveTo(previous.x, previous.y);
                    this.context.lineTo(x, y);
                    this.context.lineWidth = dataset.borderWidth;
                    this.context.stroke();
                }

                point.arc(x, y, dataset.pointRadius, 0, Math.PI * 2);
                this.context.fill(point);

                if (dataset.borderWidth) {
                    this.context.lineWidth = dataset.borderWidth;
                    this.context.stroke(point);
                }

                hit.arc(x, y, Math.max(6, dataset.pointRadius), 0, Math.PI * 2);
                this.addHitRegion(hit, {
                    label: labels[index],
                    datasetLabel: dataset.label,
                    datasetIndex,
                    index,
                    value,
                });

                previous = { x, y };
            }
        }
    }
}
