/**
 * @import { ChartData, ChartDataset } from './data.js';
 */

import BarChart from './charts/bar.js';
import LineChart from './charts/line.js';
import PieChart from './charts/pie.js';
import PolarAreaChart from './charts/polar-area.js';
import RadarChart from './charts/radar.js';
import { formatValue, normalizeData } from './data.js';
import { ease } from './easing.js';
import Grid from './layers/grid.js';
import LabelsR from './layers/labels-r.js';
import LabelsX from './layers/labels-x.js';
import LabelsY from './layers/labels-y.js';
import Layer from './layers/layer.js';
import Legend from './layers/legend.js';
import RadialGrid from './layers/radial-grid.js';
import Title from './layers/title.js';
import Tooltip from './layers/tooltip.js';
import { mergeOptions, normalizeOptions } from './options.js';
import Rect from './rect.js';
import { createScale } from './scale.js';

/**
 * @typedef {object} ChartOptions
 * @property {'bar'|'line'|'area'|'pie'|'donut'|'scatter'|'polarArea'|'radar'} [type='bar'] The chart type.
 * @property {ChartData} [data] The category labels and datasets.
 * @property {'vertical'|'horizontal'} [orientation='vertical'] The bar direction.
 * @property {boolean} [stacked=false] Whether bar datasets share a stack.
 * @property {object} [font] The font inherited by chart layers.
 * @property {object} [title] The title text, position, and appearance.
 * @property {object} [legend] The legend position, bounds, and labels.
 * @property {object} [scales] The x and y grid and tick settings.
 * @property {object} [layout] The outer chart padding.
 * @property {object} [animation] The animation duration and easing curve.
 * @property {number} [cutout=.6] The donut's inner radius as a fraction of its outer radius.
 * @property {object} [tooltip] The tooltip visibility, font, and colors.
 * @property {boolean} [responsive=true] Whether to observe container size changes.
 * @property {string} [ariaLabel='Chart'] The accessible chart description prefix.
 */

/**
 * Composes canvas layers to render Cartesian and circular charts.
 */
export default class Chart {
    static Area = LineChart;
    static Bar = BarChart;
    /**
     * @type {ChartOptions}
     */
    static defaults = {
        type: 'bar',
        orientation: 'vertical',
        stacked: false,
        data: {
            labels: [],
            datasets: [],
        },
        animation: {
            duration: 300,
            easing: 'easeOutQuad',
        },
        cutout: .6,
        responsive: true,
        ariaLabel: 'Chart',
        tooltip: {
            display: true,
            padding: 10,
            borderRadius: 6,
            arrowSize: 5,
            position: 'cursor',
            backgroundColor: 'rgba(24, 28, 36, .92)',
            color: '#fff',
            font: {},
        },
        font: {
            family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            size: 12,
            weight: 'normal',
            lineHeight: 1.2,
        },
        title: {
            display: true,
            text: 'Title',
            padding: 10,
            font: {
                size: 18,
                weight: 'bold',
            },
            color: '#334155',
            position: 'top',
            align: 'center',
        },
        legend: {
            display: true,
            interactive: true,
            position: 'top',
            align: 'center',
            maxHeight: null,
            maxWidth: null,
            labels: {
                boxWidth: 20,
                boxHeight: 12,
                font: {},
                padding: 10,
                color: '#334155',
                textAlign: 'start',
            },
        },
        scales: {
            r: {
                display: true,
                grid: {
                    display: true,
                    lineColor: '#e2e8f0',
                    lineWidth: 1,
                },
                ticks: {
                    display: true,
                    font: {},
                    color: '#334155',
                    callback: null,
                },
                labels: {
                    display: true,
                    font: {},
                    color: '#334155',
                    padding: 8,
                },
            },
            x: {
                display: true,
                grid: {
                    display: true,
                    drawBorder: true,
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    lineColor: '#e2e8f0',
                    lineWidth: 1,
                    tickLength: 8,
                },
                ticks: {
                    display: true,
                    font: {},
                    padding: 5,
                    color: '#334155',
                    callback: null,
                    drawTicks: true,
                },
            },
            y: {
                display: true,
                grid: {
                    display: true,
                    drawBorder: true,
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    lineColor: '#e2e8f0',
                    lineWidth: 1,
                    tickLength: 8,
                },
                ticks: {
                    display: true,
                    font: {},
                    padding: 5,
                    color: '#334155',
                    callback: null,
                    drawTicks: true,
                },
            },
        },
        layout: {
            padding: 20,
        },
    };
    static Donut = PieChart;
    static Grid = Grid;
    static Layer = Layer;
    static Legend = Legend;
    static Line = LineChart;
    static Pie = PieChart;
    static PolarArea = PolarAreaChart;
    static Radar = RadarChart;
    static Rect = Rect;
    static Scatter = LineChart;
    static Title = Title;
    static Tooltip = Tooltip;

    static #instances = new WeakMap();

    #canvas = null;
    #context = null;
    #data = null;
    #eventsController = null;
    #frame = null;
    #height = 0;
    #hiddenDatasets = new Set();
    #hiddenItems = new Set();
    #inputOptions = null;
    #layers = {};
    #legendControls = null;
    #node = null;
    #observer = null;
    #outerRect = null;
    #pixelRatio = 1;
    #pointer = null;
    #progress = 1;
    #scale = [0, 1];
    #scaleX = [0, 1];
    #settings = null;
    #width = 0;
    #window = null;

    /**
     * Gets the existing chart for a container or creates one.
     * @param {HTMLElement} node The chart container.
     * @param {ChartOptions} [options] The options for a new chart.
     * @returns {Chart} The existing or newly created chart.
     */
    static init(node, options) {
        return Chart.#instances.get(node) || new this(node, options);
    }

    /**
     * Creates a Chart in an HTML container.
     * @param {HTMLElement} node The chart container.
     * @param {ChartOptions} [options] The chart options.
     * @throws {TypeError} When the node, options, or data are invalid.
     */
    constructor(node, options) {
        const view = node?.ownerDocument?.defaultView;

        if (!view || !(node instanceof view.HTMLElement) || node.matches('canvas, input, img')) {
            throw new TypeError('Chart must be created on an HTML container element.');
        }

        if (Chart.#instances.has(node)) {
            throw new Error('This container already has a chart. Use Chart.init() to reuse it.');
        }

        this.#node = node;
        this.#window = view;

        try {
            this.#inputOptions = mergeOptions(this.constructor.defaults, options);
            this.#settings = normalizeOptions(mergeOptions(this.#inputOptions));
            this.#data = normalizeData(this.#settings.data, this.#settings.type, this.#settings.stacked);

            this.#canvas = node.ownerDocument.createElement('canvas');
            this.#canvas.setAttribute('role', 'img');
            this.#canvas.style.display = 'block';
            this.#canvas.style.maxWidth = '100%';

            this.#context = this.#canvas.getContext('2d');

            if (!this.#context) {
                throw new Error('Chart requires a canvas 2D context.');
            }

            this.node.append(this.#canvas);

            this.#build();
            this.#events();
            this.resize();
            this.#updateDescription();
            this.run();

            Chart.#instances.set(node, this);
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    /**
     * Gets the chart container.
     * @returns {HTMLElement|null} The container, or null after disposal.
     */
    get node() {
        return this.#node;
    }

    /**
     * Gets a copy of the effective options and current data.
     * @returns {ChartOptions|null} The options, or null after disposal.
     */
    get options() {
        if (!this.node) {
            return null;
        }

        return Object.freeze(mergeOptions(this.#settings, { data: this.#data }));
    }

    /**
     * Gets the bounds shared by the chart's layout layers.
     * @returns {Rect} A copy of the outer rectangle.
     */
    get outerRect() {
        return this.#outerRect.clone();
    }

    /**
     * Gets the backing resolution used by the chart and its layers.
     * @returns {number} The device pixel ratio.
     */
    get pixelRatio() {
        return this.#pixelRatio;
    }

    /**
     * Calculates layer bounds and data geometry using the current dimensions.
     */
    calculate() {
        if (!this.node) {
            return;
        }

        const padding = Math.min(this.#settings.layout.padding, this.#width / 2, this.#height / 2);
        const horizontal = this.#settings.type === 'bar' && this.#settings.orientation === 'horizontal';
        const scaleSize = horizontal ? this.#width : this.#height;
        const tickSize = this.#settings.font.size * (horizontal ? 5 : 2.5);
        const radial = ['radar', 'polarArea'].includes(this.#settings.type);
        const maxSteps = radial ? 5 : Math.floor(scaleSize / tickSize);

        this.#outerRect = new Rect(
            padding,
            padding,
            Math.max(0, this.#width - padding * 2),
            Math.max(0, this.#height - padding * 2),
        );
        const values = this.#settings.type === 'bar' && this.#settings.stacked ? this.#getStackTotals() : this.getValues();

        this.#scale = createScale(values, maxSteps);
        this.#scaleX = horizontal ? this.#scale : [0, 1];

        if (this.#settings.type === 'scatter') {
            const maxStepsX = Math.floor(this.#width / (this.#settings.font.size * 5));

            this.#scaleX = createScale(this.getValues('x'), maxStepsX);
        }

        const layers = Object.values(this.#layers);
        const chartRect = this.#outerRect.clone();
        const next = (rect) => {
            const layer = layers.shift();

            if (layer) {
                layer.calculate(rect, next);
            }
        };

        next(chartRect);

        for (const layer of Object.values(this.#layers)) {
            layer.calculateCanvas();
            layer.update();
        }

        this.#layers.chart.data();
    }

    /**
     * Releases animation frames, observers, generated markup, and registration.
     */
    dispose() {
        if (!this.node) {
            return;
        }

        this.#stop();
        this.#eventsController?.abort();
        this.#observer?.disconnect();
        this.#canvas?.remove();
        this.#legendControls?.remove();

        Chart.#instances.delete(this.#node);

        this.#canvas = null;
        this.#context = null;
        this.#data = null;
        this.#eventsController = null;
        this.#inputOptions = null;
        this.#legendControls = null;
        this.#layers = {};
        this.#node = null;
        this.#observer = null;
        this.#settings = null;
        this.#window = null;
    }

    /**
     * Composites the rendered layers onto the visible canvas.
     */
    draw() {
        if (!this.node) {
            return;
        }

        this.#context.clearRect(0, 0, this.#canvas.width / this.#pixelRatio, this.#canvas.height / this.#pixelRatio);

        for (const layer of Object.values(this.#layers)) {
            layer.draw(this.#context);
        }
    }

    /**
     * Gets independent copies of the normalized datasets.
     * @returns {ChartDataset[]} The datasets.
     */
    getData() {
        return this.#data ? mergeOptions(this.#data).datasets : [];
    }

    /**
     * Gets a copy of the category labels.
     * @returns {string[]} The labels.
     */
    getLabels() {
        return this.#data ? [...this.#data.labels] : [];
    }

    /**
     * Gets a copy of the calculated numeric scale.
     * @param {string} [axis='y'] The numeric axis; x is used by scatter charts.
     * @returns {number[]} The scale ticks.
     */
    getScale(axis = 'y') {
        return [...(axis === 'x' ? this.#scaleX : this.#scale)];
    }

    /**
     * Gets the upper scale boundary.
     * @param {string} [axis='y'] The numeric axis.
     * @returns {number} The maximum tick value.
     */
    getScaleMax(axis = 'y') {
        return (axis === 'x' ? this.#scaleX : this.#scale).at(-1);
    }

    /**
     * Gets the lower scale boundary.
     * @param {string} [axis='y'] The numeric axis.
     * @returns {number} The minimum tick value.
     */
    getScaleMin(axis = 'y') {
        return (axis === 'x' ? this.#scaleX : this.#scale)[0];
    }

    /**
     * Gets the numeric values from visible datasets and data items.
     * @param {string} [axis='y'] The coordinate to read for scatter data.
     * @returns {number[]} The dataset values.
     */
    getValues(axis = 'y') {
        if (!this.#data) {
            return [];
        }

        const values = this.#data.datasets.flatMap((dataset, datasetIndex) => {
            return dataset.data.filter((value, index) => this.isDataVisible(datasetIndex, index));
        });

        return this.#settings.type === 'scatter' ? values.map((point) => point[axis]) : values;
    }

    /**
     * Checks whether a dataset is enabled.
     * @param {number} index The dataset index.
     * @returns {boolean} Whether the dataset is visible.
     */
    isDatasetVisible(index) {
        return Boolean(this.#data?.datasets[index]) && !this.#hiddenDatasets.has(index);
    }

    /**
     * Checks whether a data item and its dataset are enabled.
     * @param {number} datasetIndex The dataset index.
     * @param {number} index The item index.
     * @returns {boolean} Whether the item is visible.
     */
    isDataVisible(datasetIndex, index) {
        const circular = ['pie', 'donut', 'polarArea'].includes(this.#settings?.type);
        const exists = this.#data?.datasets[datasetIndex]?.data[index] != null;

        return exists && this.isDatasetVisible(datasetIndex) && (!circular || !this.#hiddenItems.has(`${datasetIndex}:${index}`));
    }

    /**
     * Renders the layers at their final positions without starting an animation.
     */
    render() {
        if (!this.node) {
            return;
        }

        this.#stop();
        this.#clearActive();
        this.#progress = 1;

        for (const layer of Object.values(this.#layers)) {
            layer.render();
        }

        this.#syncLegendControls();
        this.draw();
    }

    /**
     * Measures the container and updates the visible and offscreen canvases.
     */
    resize() {
        if (!this.node) {
            return;
        }

        // Exclude the generated canvas from intrinsic container measurements.
        // Otherwise an auto-height container grows on each observer callback.
        this.#canvas.style.display = 'none';

        const style = this.#window.getComputedStyle(this.node);
        const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const width = Math.max(0, this.node.clientWidth - horizontalPadding);
        const availableHeight = Math.max(0, this.node.clientHeight - verticalPadding);
        const height = availableHeight || 300;
        const pixelRatio = Math.max(1, this.#window.devicePixelRatio || 1);

        this.#canvas.style.display = 'block';

        if (width === this.#width && height === this.#height && pixelRatio === this.#pixelRatio) {
            return;
        }

        this.#width = width;
        this.#height = height;
        this.#pixelRatio = pixelRatio;

        this.#canvas.width = Math.round(width * pixelRatio);
        this.#canvas.height = Math.round(height * pixelRatio);
        this.#canvas.style.width = `${width}px`;
        this.#canvas.style.height = `${height}px`;
        this.#context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        this.calculate();
        this.render();
    }

    /**
     * Animates the chart layer using elapsed time and a single pending frame.
     */
    run() {
        if (!this.node) {
            return;
        }

        this.#stop();

        const reducedMotion = this.#window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = reducedMotion ? 0 : this.#settings.animation.duration;

        if (!duration || !this.getValues().length) {
            this.render();
            return;
        }

        const start = this.#window.performance.now();
        const tick = (now) => {
            this.#frame = null;

            if (!this.node) {
                return;
            }

            const elapsed = now - start;
            const progress = Math.min(1, Math.max(0, elapsed / duration));

            this.#progress = ease(progress, this.#settings.animation.easing);
            this.#layers.chart.render(this.#progress);

            if (this.#pointer) {
                this.#setActive(this.#layers.chart.hitTest(this.#pointer.x, this.#pointer.y));
            } else {
                this.draw();
            }

            if (progress < 1) {
                this.#frame = this.#window.requestAnimationFrame(tick);
            }
        };

        this.#progress = 0;
        this.#layers.chart.render(0);
        this.draw();

        this.#frame = this.#window.requestAnimationFrame(tick);
    }

    /**
     * Replaces chart data after validating the entire update.
     * @param {ChartData} [data] The new data; defaults to the current data.
     */
    setData(data = this.#data) {
        if (!this.node) {
            return;
        }

        const normalized = normalizeData(data, this.#settings.type, this.#settings.stacked);

        this.#data = normalized;
        this.#pruneVisibility();
        this.update();
    }

    /**
     * Shows or hides a dataset without removing its values or changing its color.
     * @param {number} index The dataset index.
     * @param {boolean} visible Whether to show the dataset.
     */
    setDatasetVisibility(index, visible) {
        if (!this.#data?.datasets[index]) {
            return;
        }

        if (visible) {
            this.#hiddenDatasets.delete(index);
        } else {
            this.#hiddenDatasets.add(index);
        }

        this.update();
    }

    /**
     * Shows or hides an individual slice in a circular chart.
     * @param {number} datasetIndex The dataset index.
     * @param {number} index The item index.
     * @param {boolean} visible Whether to show the item.
     */
    setDataVisibility(datasetIndex, index, visible) {
        if (!['pie', 'donut', 'polarArea'].includes(this.#settings?.type) || this.#data?.datasets[datasetIndex]?.data[index] == null) {
            return;
        }

        const key = `${datasetIndex}:${index}`;

        if (visible) {
            this.#hiddenItems.delete(key);
        } else {
            this.#hiddenItems.add(key);
        }

        this.update();
    }

    /**
     * Merges changed settings and rebuilds the affected layers.
     * @param {ChartOptions} [settings={}] The changed settings.
     */
    setSettings(settings = {}) {
        if (!this.node) {
            return;
        }

        const inputOptions = mergeOptions(this.#inputOptions, settings);
        const options = normalizeOptions(mergeOptions(inputOptions));
        const data = normalizeData(settings.data ?? this.#data, options.type, options.stacked);

        this.#stop();

        this.#inputOptions = inputOptions;
        this.#settings = options;
        this.#data = data;
        this.#pruneVisibility();

        this.#build();

        if (this.#settings.responsive) {
            this.resize();
        }

        this.update();
    }

    /**
     * Recalculates data, refreshes the layers, and starts the configured animation.
     */
    update() {
        if (!this.node) {
            return;
        }

        this.calculate();
        this.render();
        this.#updateDescription();
        this.run();
    }

    /**
     * Creates the original title, legend, axes, chart, and tooltip layers.
     */
    #build() {
        this.#layers = {
            title: new Title(this, this.#settings.title),
            legend: new Legend(this, this.#settings.legend),
        };

        if (['radar', 'polarArea'].includes(this.#settings.type)) {
            this.#layers.grid = new RadialGrid(this, this.#settings.scales.r);
        } else if (!['pie', 'donut'].includes(this.#settings.type)) {
            this.#layers.ticksX = new LabelsX(this, this.#settings.scales.x.ticks);
            this.#layers.ticksY = new LabelsY(this, this.#settings.scales.y.ticks);
            this.#layers.grid = new Grid(this, this.#settings.scales);
        }

        switch (this.#settings.type) {
            case 'bar':
                this.#layers.chart = new BarChart(this, this.#settings.scales);
                break;
            case 'line':
            case 'area':
            case 'scatter':
                this.#layers.chart = new LineChart(this, this.#settings.scales);
                break;
            case 'radar':
                this.#layers.chart = new RadarChart(this, this.#settings.scales.r);
                break;
            case 'polarArea':
                this.#layers.chart = new PolarAreaChart(this, this.#settings.scales.r);
                break;
            case 'pie':
            case 'donut':
                this.#layers.chart = new PieChart(this, this.#settings.scales);
                break;
        }

        if (['radar', 'polarArea'].includes(this.#settings.type)) {
            this.#layers.ticksR = new LabelsR(this, this.#settings.scales.r.ticks);
        }

        this.#layers.tooltip = new Tooltip(this, this.#settings.tooltip);
    }

    /**
     * Clears pointer state before a data, layout, or settings update.
     */
    #clearActive() {
        this.#pointer = null;
        this.#layers.chart.setActive(null);
        this.#layers.tooltip.setActive(null);

        this.#canvas.removeAttribute('aria-description');
    }

    /**
     * Registers pointer events and responsive sizing until disposal.
     */
    #events() {
        this.#eventsController = new this.#window.AbortController();

        const { signal } = this.#eventsController;

        this.#canvas.addEventListener('pointermove', (event) => {
            const point = this.#pointerPosition(event);

            if (!point) {
                return;
            }

            this.#pointer = point;

            const legend = this.#settings.legend.interactive && this.#layers.legend.hitTest(point.x, point.y);
            const item = legend ? null : this.#layers.chart.hitTest(point.x, point.y);

            this.#canvas.style.cursor = legend ? 'pointer' : '';
            this.#setActive(item);
        }, { signal });

        this.#canvas.addEventListener('click', (event) => {
            const point = this.#pointerPosition(event);

            if (point && this.#settings.legend.interactive) {
                const item = this.#layers.legend.hitTest(point.x, point.y);

                if (item) {
                    this.#toggleLegendItem(item);
                }
            }
        }, { signal });

        this.#canvas.addEventListener('pointerleave', () => {
            this.#pointer = null;
            this.#canvas.style.cursor = '';
            this.#setActive(null);
        }, { signal });

        this.#window.addEventListener('resize', () => {
            if (this.#settings.responsive) {
                this.resize();
            }
        }, { signal });

        if (this.#window.ResizeObserver) {
            this.#observer = new this.#window.ResizeObserver(() => {
                if (this.#settings.responsive) {
                    this.resize();
                }
            });

            this.#observer.observe(this.node);
        }
    }

    /**
     * Calculates positive and negative stack extents independently.
     * @returns {number[]} The visible stack totals.
     */
    #getStackTotals() {
        return this.#data.labels.flatMap((label, index) => {
            let positive = 0;
            let negative = 0;

            for (const [datasetIndex, dataset] of this.#data.datasets.entries()) {
                if (!this.isDataVisible(datasetIndex, index)) {
                    continue;
                }

                const value = dataset.data[index];

                if (value < 0) {
                    negative += value;
                } else {
                    positive += value;
                }
            }

            return [negative, positive];
        });
    }

    /**
     * Converts a pointer event to chart-local CSS coordinates.
     * @param {PointerEvent|MouseEvent} event The pointer event.
     * @returns {object|null} The coordinates, or null for a hidden canvas.
     */
    #pointerPosition(event) {
        const rect = this.#canvas.getBoundingClientRect();

        if (!rect.width || !rect.height) {
            return null;
        }

        return {
            x: (event.clientX - rect.left) * this.#width / rect.width,
            y: (event.clientY - rect.top) * this.#height / rect.height,
        };
    }

    /**
     * Drops visibility state for datasets and items removed by a data update.
     */
    #pruneVisibility() {
        for (const index of this.#hiddenDatasets) {
            if (!this.#data.datasets[index]) {
                this.#hiddenDatasets.delete(index);
            }
        }

        for (const key of this.#hiddenItems) {
            const [datasetIndex, index] = key.split(':').map(Number);

            if (this.#data.datasets[datasetIndex]?.data[index] == null) {
                this.#hiddenItems.delete(key);
            }
        }
    }

    /**
     * Updates the tooltip and pie highlight for the current pointer position.
     * @param {object|null} item The hovered data item.
     */
    #setActive(item) {
        this.#layers.chart.setActive(item);
        this.#layers.tooltip.setActive(item);
        this.#layers.tooltip.render();

        if (['pie', 'donut', 'polarArea'].includes(this.#settings.type)) {
            this.#layers.chart.render(this.#progress);
        }

        if (item && this.#settings.tooltip.display) {
            this.#canvas.setAttribute('aria-description', `${item.label}. ${item.datasetLabel}: ${formatValue(item.value)}`);
        } else {
            this.#canvas.removeAttribute('aria-description');
        }

        this.draw();
    }

    /**
     * Cancels the pending animation frame.
     */
    #stop() {
        if (this.#frame != null) {
            this.#window.cancelAnimationFrame(this.#frame);
            this.#frame = null;
        }
    }

    /**
     * Keeps native keyboard and screen-reader controls in step with the canvas legend.
     */
    #syncLegendControls() {
        const items = this.#settings.legend.display && this.#settings.legend.interactive ? this.#layers.legend.items : [];

        if (!this.#legendControls) {
            this.#legendControls = this.node.ownerDocument.createElement('div');
            this.#legendControls.setAttribute('role', 'group');
            this.#legendControls.setAttribute('aria-label', 'Chart legend');
            this.#legendControls.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);';
            this.node.append(this.#legendControls);
        }

        // Reuse buttons so toggling a series does not discard keyboard focus.
        for (const [index, item] of items.entries()) {
            let button = this.#legendControls.children[index];

            if (!button) {
                button = this.node.ownerDocument.createElement('button');
                button.type = 'button';

                const { signal } = this.#eventsController;
                button.addEventListener('click', () => {
                    this.#toggleLegendItem(this.#layers.legend.items[index]);
                }, { signal });
                button.addEventListener('focus', () => {
                    this.#layers.legend.setActive(this.#layers.legend.items[index]);
                    this.#layers.legend.render();
                    this.draw();
                }, { signal });
                button.addEventListener('blur', () => {
                    this.#layers.legend.setActive(null);
                    this.#layers.legend.render();
                    this.draw();
                }, { signal });
                this.#legendControls.append(button);
            }

            button.textContent = item.label;
            button.setAttribute('aria-pressed', String(item.visible));
        }

        while (this.#legendControls.children.length > items.length) {
            this.#legendControls.lastElementChild.remove();
        }

        this.#legendControls.hidden = !items.length;
    }

    /**
     * Toggles the dataset or slice represented by a legend key.
     * @param {object} item The legend item.
     */
    #toggleLegendItem(item) {
        if (item.index == null) {
            this.setDatasetVisibility(item.datasetIndex, !this.isDatasetVisible(item.datasetIndex));
        } else {
            this.setDataVisibility(item.datasetIndex, item.index, !this.isDataVisible(item.datasetIndex, item.index));
        }
    }

    /**
     * Provides the chart's labels and values as accessible fallback text.
     */
    #updateDescription() {
        const datasets = this.#data.datasets.map((dataset, datasetIndex) => {
            const values = dataset.data.map((value, index) => {
                const label = this.#data.labels[index] ?? `Point ${index + 1}`;

                const hidden = this.isDataVisible(datasetIndex, index) ? '' : ' (hidden)';

                return `${label} ${formatValue(value)}${hidden}`;
            });

            return `${dataset.label}: ${values.join(', ')}`;
        });

        const title = this.#settings.title.text || this.#settings.type;
        const description = `${this.#settings.ariaLabel}. ${title}. ${datasets.join('; ')}`;

        this.#canvas.setAttribute('aria-label', description);
        this.#canvas.textContent = description;
    }
}
