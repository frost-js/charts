import { getColor } from '../data.js';
import Layer from '../layers/layer.js';
import { getScalePosition } from '../scale.js';

/**
 * Renders grouped or stacked bars in either orientation.
 */
export default class BarChart extends Layer {
    #baseline = 0;
    #horizontal = false;
    #oldRects = new Map();
    #rects = new Map();
    #renderedRects = new Map();

    /**
     * Calculates bar rectangles and retains visible geometry for transitions.
     */
    data() {
        const { orientation, stacked } = this.chart.options;
        const labels = this.chart.getLabels();
        const datasets = this.chart.getData();
        const visible = datasets.map((dataset, index) => index).filter((index) => this.chart.isDatasetVisible(index));

        this.#horizontal = orientation === 'horizontal';

        const categorySize = this.#horizontal ? this.rect.height : this.rect.width;
        const valueSize = this.#horizontal ? this.rect.width : this.rect.height;
        const groupSize = categorySize / Math.max(1, labels.length);
        const count = stacked ? 1 : visible.length;
        const spacing = Math.min(5, groupSize / (count + 1) / 2);
        const thickness = Math.max(0, (groupSize - spacing * (count + 1)) / Math.max(1, count));

        const min = this.chart.getScaleMin();
        const max = this.chart.getScaleMax();
        const position = (value) => {
            const fraction = getScalePosition(value, min, max);

            return valueSize * (this.#horizontal ? fraction : 1 - fraction);
        };

        this.#baseline = position(0);
        this.#oldRects = this.#renderedRects;
        this.#rects = new Map();

        for (const [index, label] of labels.entries()) {
            let positive = 0;
            let negative = 0;

            for (const [slot, datasetIndex] of visible.entries()) {
                if (!this.chart.isDataVisible(datasetIndex, index)) {
                    continue;
                }

                const dataset = datasets[datasetIndex];
                const value = dataset.data[index];
                let start = 0;

                if (stacked) {
                    start = value < 0 ? negative : positive;

                    if (value < 0) {
                        negative += value;
                    } else {
                        positive += value;
                    }
                }

                const first = position(start);
                const last = position(start + value);
                const offset = stacked ? 0 : slot * (thickness + spacing);
                const category = index * groupSize + spacing + offset;
                const length = Math.abs(last - first);
                const near = Math.min(first, last);

                this.#rects.set(`${datasetIndex}:${index}`, {
                    x: this.#horizontal ? near : category,
                    y: this.#horizontal ? category : near,
                    width: this.#horizontal ? length : thickness,
                    height: this.#horizontal ? thickness : length,
                    end: last,
                    backgroundColor: getColor(dataset, 'backgroundColor', index),
                    borderColor: getColor(dataset, 'borderColor', index),
                    borderWidth: dataset.borderWidth,
                    label,
                    datasetLabel: dataset.label,
                    datasetIndex,
                    index,
                    value,
                });
            }
        }
    }

    /**
     * Renders visible rectangles and attaches tooltips to their value ends.
     * @param {number} [progress=1] The elapsed animation fraction.
     */
    render(progress = 1) {
        super.render();

        const keys = new Set([...this.#rects.keys(), ...this.#oldRects.keys()]);

        this.#renderedRects = new Map();

        for (const key of keys) {
            const target = this.#rects.get(key);
            const previous = this.#oldRects.get(key);

            if (!target && progress === 1) {
                continue;
            }

            const next = target || this.#collapse(previous);
            const old = previous || this.#collapse(next);
            const item = { ...next };

            for (const property of ['x', 'y', 'width', 'height', 'end']) {
                item[property] = old[property] + (next[property] - old[property]) * progress;
            }

            this.#renderedRects.set(key, item);

            const path = new Path2D();

            path.rect(item.x, item.y, item.width, item.height);
            this.context.fillStyle = item.backgroundColor;
            this.context.fill(path);

            if (item.borderWidth) {
                this.context.strokeStyle = item.borderColor;
                this.context.lineWidth = item.borderWidth;
                this.context.stroke(path);
            }

            if (target && item.width && item.height) {
                let placement = item.value < 0 ? 'bottom' : 'top';

                if (this.#horizontal) {
                    placement = item.value < 0 ? 'left' : 'right';
                }

                this.addHitRegion(path, {
                    ...item,
                    placement,
                    anchorX: this.#horizontal ? item.end : item.x + item.width / 2,
                    anchorY: this.#horizontal ? item.y + item.height / 2 : item.end,
                });
            }
        }
    }

    /**
     * Collapses a bar to the current zero baseline while retaining its category.
     * @param {object} item The bar geometry.
     * @returns {object} The collapsed geometry.
     */
    #collapse(item) {
        const collapsed = { ...item, end: this.#baseline };

        if (this.#horizontal) {
            collapsed.x = this.#baseline;
            collapsed.width = 0;
        } else {
            collapsed.y = this.#baseline;
            collapsed.height = 0;
        }

        return collapsed;
    }
}
