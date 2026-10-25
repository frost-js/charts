import { getColor } from './data.js';
import Layer from './layer.js';

/**
 * Renders the original combined pie using all dataset values.
 */
export default class PieChart extends Layer {
    /**
     * Renders colored slices with a small outward offset and hover feedback.
     */
    render() {
        super.render();

        const values = this.chart.getValues();
        const largest = values.reduce((max, value) => Math.max(max, value), 0);

        if (!largest) {
            return;
        }

        // Normalize before summing so large finite values cannot overflow the total.
        const total = values.reduce((sum, value) => sum + value / largest, 0);
        const labels = this.chart.getLabels();
        const spacing = Math.min(5, this.rect.width / 4, this.rect.height / 4);
        const radius = Math.max(0, Math.min(this.rect.width, this.rect.height) / 2 - spacing);
        let start = 0;

        for (const [datasetIndex, dataset] of this.chart.getData().entries()) {
            for (const [index, value] of dataset.data.entries()) {
                const angle = value / largest / total * Math.PI * 2;
                const middle = start + angle / 2;
                const x = this.rect.width / 2 + Math.cos(middle) * spacing;
                const y = this.rect.height / 2 + Math.sin(middle) * spacing;
                const path = new Path2D();

                if (!angle) {
                    continue;
                }

                path.moveTo(x, y);
                path.arc(x, y, radius, start, start + angle);
                path.closePath();

                this.context.fillStyle = getColor(dataset, 'backgroundColor', index);
                this.context.fill(path);

                if (dataset.borderWidth) {
                    this.context.strokeStyle = getColor(dataset, 'borderColor', index);
                    this.context.lineWidth = dataset.borderWidth;
                    this.context.stroke(path);
                }

                if (this.active?.datasetIndex === datasetIndex && this.active.index === index) {
                    this.context.fillStyle = 'rgba(255,255,255,.3)';
                    this.context.fill(path);
                }

                this.addHitRegion(path, {
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
}
