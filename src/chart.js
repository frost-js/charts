/**
 * @import { ChartData, ChartDataset } from './data.js';
 */

import $ from '@fr0st/query';
import { BaseComponent } from '@fr0st/ui';
import BarChart from './bar-chart.js';
import { normalizeData } from './data.js';
import Grid from './grid.js';
import LabelsX from './labels-x.js';
import LabelsY from './labels-y.js';
import Layer from './layer.js';
import Legend from './legend.js';
import LineChart from './line-chart.js';
import { mergeOptions, normalizeOptions } from './options.js';
import PieChart from './pie-chart.js';
import Rect from './rect.js';
import { createScale } from './scale.js';
import Title from './title.js';
import Tooltip from './tooltip.js';

const window = $.getWindow();

/**
 * @typedef {object} ChartOptions
 * @property {'bar'|'line'|'pie'} [type='bar'] The chart type.
 * @property {ChartData} [data] The category labels and datasets.
 * @property {object} [font] The font inherited by chart layers.
 * @property {object} [title] The title text, position, and appearance.
 * @property {object} [legend] The legend position, bounds, and labels.
 * @property {object} [scales] The x and y grid and tick settings.
 * @property {object} [layout] The outer chart padding.
 * @property {object} [animation] The bar animation duration in milliseconds.
 * @property {object} [tooltip] The tooltip visibility, font, and colors.
 * @property {boolean} [responsive=true] Whether to observe container size changes.
 * @property {string} [ariaLabel='Chart'] The accessible chart description prefix.
 */

/**
 * Composes canvas layers to render bar, line, and pie charts.
 * @augments {BaseComponent<ChartOptions>}
 */
export default class Chart extends BaseComponent {
    static Bar = BarChart;
    /**
     * @type {ChartOptions}
     */
    static defaults = {
        type: 'bar',
        data: {
            labels: [],
            datasets: [],
        },
        animation: {
            duration: 500,
        },
        responsive: true,
        ariaLabel: 'Chart',
        tooltip: {
            display: true,
            padding: 8,
            backgroundColor: '#000',
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
            color: '#000',
            position: 'top',
            align: 'center',
        },
        legend: {
            display: true,
            position: 'top',
            align: 'center',
            maxHeight: null,
            maxWidth: null,
            labels: {
                boxWidth: 20,
                boxHeight: 12,
                font: {},
                padding: 10,
                color: '#000',
                textAlign: 'center',
            },
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: true,
                    drawBorder: true,
                    borderColor: '#000',
                    borderWidth: 1,
                    lineColor: '#aaa',
                    lineWidth: 1,
                    tickLength: 8,
                },
                ticks: {
                    display: true,
                    font: {},
                    padding: 5,
                    color: '#000',
                    callback: null,
                    drawTicks: true,
                },
            },
            y: {
                display: true,
                grid: {
                    display: true,
                    drawBorder: true,
                    borderColor: '#000',
                    borderWidth: 1,
                    lineColor: '#aaa',
                    lineWidth: 1,
                    tickLength: 8,
                },
                ticks: {
                    display: true,
                    font: {},
                    padding: 5,
                    color: '#000',
                    callback: null,
                    drawTicks: true,
                    tickColor: '#aaa',
                },
            },
        },
        layout: {
            padding: 20,
        },
    };
    static Grid = Grid;
    static Layer = Layer;
    static Legend = Legend;
    static Line = LineChart;
    static Pie = PieChart;
    static Rect = Rect;
    static Title = Title;
    static Tooltip = Tooltip;

    #canvas = null;
    #context = null;
    #data = null;
    #frame = null;
    #height = 0;
    #inputOptions = null;
    #layers = {};
    #observer = null;
    #outerRect = null;
    #pixelRatio = 1;
    #scale = [0, 1];
    #settings = null;
    #width = 0;

    /**
     * Creates a Chart in an HTML container.
     * @param {HTMLElement} node The chart container.
     * @param {ChartOptions} [options] The chart options.
     * @throws {TypeError} When the node, options, or data are invalid.
     */
    constructor(node, options) {
        if (!$._isElement(node) || $.is(node, 'canvas, input, img, svg')) {
            throw new TypeError('Chart must be created on an HTML container element.');
        }

        super(node, options);

        try {
            this.#inputOptions = mergeOptions(super.options);
            this.#settings = normalizeOptions(mergeOptions(this.#inputOptions));
            this.#data = normalizeData(this.#settings.data, this.#settings.type);

            this.#canvas = $.create('canvas', {
                attributes: { role: 'img' },
                style: {
                    display: 'block',
                    maxWidth: '100%',
                },
            });
            this.#context = this.#canvas.getContext('2d');

            if (!this.#context) {
                throw new Error('Chart requires a canvas 2D context.');
            }

            $.append(this.node, this.#canvas);

            this.#build();
            this.#events();
            this.resize();
            this.#updateDescription();
            this.run();
        } catch (error) {
            this.dispose();
            throw error;
        }
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
        const maxSteps = Math.floor(this.#height / (this.#settings.font.size * 2.5));

        this.#outerRect = new Rect(
            padding,
            padding,
            Math.max(0, this.#width - padding * 2),
            Math.max(0, this.#height - padding * 2),
        );
        this.#scale = createScale(this.getValues(), maxSteps);

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
        this.#observer?.disconnect();
        this.#canvas?.remove();

        this.#canvas = null;
        this.#context = null;
        this.#data = null;
        this.#inputOptions = null;
        this.#layers = {};
        this.#observer = null;
        this.#settings = null;

        super.dispose();
    }

    /**
     * Composites the rendered layers onto the visible canvas.
     */
    draw() {
        if (!this.node) {
            return;
        }

        this.#context.clearRect(0, 0, this.#width, this.#height);

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
     * Gets a copy of the calculated y scale.
     * @returns {number[]} The scale ticks.
     */
    getScale() {
        return [...this.#scale];
    }

    /**
     * Gets the upper scale boundary.
     * @returns {number} The maximum tick value.
     */
    getScaleMax() {
        return this.#scale.at(-1);
    }

    /**
     * Gets the lower scale boundary.
     * @returns {number} The minimum tick value.
     */
    getScaleMin() {
        return this.#scale[0];
    }

    /**
     * Gets the values from all datasets.
     * @returns {number[]} The dataset values.
     */
    getValues() {
        return this.#data ? this.#data.datasets.flatMap((dataset) => dataset.data) : [];
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

        for (const layer of Object.values(this.#layers)) {
            layer.render();
        }

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

        const style = window.getComputedStyle(this.node);
        const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const width = Math.max(0, this.node.clientWidth - horizontalPadding);
        const availableHeight = Math.max(0, this.node.clientHeight - verticalPadding);
        const height = availableHeight || 300;
        const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

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
     * Animates the bar layer using elapsed time and a single pending frame.
     */
    run() {
        if (!this.node) {
            return;
        }

        this.#stop();

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = reducedMotion ? 0 : this.#settings.animation.duration;

        if (this.#settings.type !== 'bar' || !duration || !this.getValues().length) {
            this.render();
            return;
        }

        const start = window.performance.now();
        const tick = (now) => {
            this.#frame = null;

            if (!this.node) {
                return;
            }

            const elapsed = now - start;
            const progress = Math.min(1, Math.max(0, elapsed / duration));

            this.#layers.chart.render(progress);
            this.draw();

            if (progress < 1) {
                this.#frame = window.requestAnimationFrame(tick);
            }
        };

        this.#layers.chart.render(0);
        this.draw();

        this.#frame = window.requestAnimationFrame(tick);
    }

    /**
     * Replaces chart data after validating the entire update.
     * @param {ChartData} [data] The new data; defaults to the current data.
     */
    setData(data = this.#data) {
        if (!this.node) {
            return;
        }

        const normalized = normalizeData(data, this.#settings.type);

        this.#data = normalized;
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
        const data = normalizeData(settings.data ?? this.#data, options.type);

        this.#stop();

        this.#inputOptions = inputOptions;
        this.#settings = options;
        this.#data = data;

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

        if (this.#settings.type !== 'pie') {
            this.#layers.ticksX = new LabelsX(this, this.#settings.scales.x.ticks);
            this.#layers.ticksY = new LabelsY(this, this.#settings.scales.y.ticks);
            this.#layers.grid = new Grid(this, this.#settings.scales);
        }

        switch (this.#settings.type) {
            case 'bar':
                this.#layers.chart = new BarChart(this, this.#settings.scales);
                break;
            case 'line':
                this.#layers.chart = new LineChart(this, this.#settings.scales);
                break;
            case 'pie':
                this.#layers.chart = new PieChart(this, this.#settings.scales);
                break;
        }

        this.#layers.tooltip = new Tooltip(this, this.#settings.tooltip);
    }

    /**
     * Clears pointer state before a data, layout, or settings update.
     */
    #clearActive() {
        this.#layers.chart.setActive(null);
        this.#layers.tooltip.setActive(null);

        $.removeAttribute(this.#canvas, 'aria-description');
    }

    /**
     * Registers pointer events and responsive sizing with the component lifecycle.
     */
    #events() {
        this.listen(this.#canvas, 'pointermove.ui.chart', (event) => {
            const rect = this.#canvas.getBoundingClientRect();

            if (!rect.width || !rect.height) {
                return;
            }

            const x = (event.clientX - rect.left) * this.#width / rect.width;
            const y = (event.clientY - rect.top) * this.#height / rect.height;
            const item = this.#layers.chart.hitTest(x, y);

            this.#setActive(item);
        });

        this.listen(this.#canvas, 'pointerleave.ui.chart', () => {
            this.#setActive(null);
        });

        this.listen(window, 'resize.ui.chart', () => {
            if (this.#settings.responsive) {
                this.resize();
            }
        });

        if (window.ResizeObserver) {
            this.#observer = new window.ResizeObserver(() => {
                if (this.#settings.responsive) {
                    this.resize();
                }
            });

            this.#observer.observe(this.node);
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

        if (this.#settings.type === 'pie') {
            this.#layers.chart.render();
        }

        if (item && this.#settings.tooltip.display) {
            $.setAttribute(this.#canvas, 'aria-description', `${item.label}. ${item.datasetLabel}: ${item.value}`);
        } else {
            $.removeAttribute(this.#canvas, 'aria-description');
        }

        this.draw();
    }

    /**
     * Cancels the pending animation frame.
     */
    #stop() {
        if (this.#frame != null) {
            window.cancelAnimationFrame(this.#frame);
            this.#frame = null;
        }
    }

    /**
     * Provides the chart's labels and values as accessible fallback text.
     */
    #updateDescription() {
        const datasets = this.#data.datasets.map((dataset) => {
            const values = dataset.data.map((value, index) => {
                return `${this.#data.labels[index]} ${value}`;
            });

            return `${dataset.label}: ${values.join(', ')}`;
        });

        const title = this.#settings.title.text || this.#settings.type;
        const description = `${this.#settings.ariaLabel}. ${title}. ${datasets.join('; ')}`;

        $.setAttribute(this.#canvas, 'aria-label', description);
        $.setText(this.#canvas, description);
    }
}
