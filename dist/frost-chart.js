/**
 * FrostChart v1.0
 * https://github.com/elusivecodes/FrostChart
 */
(function(global, factory) {
    'use strict';

    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory;
    } else {
        Object.assign(global, factory(global));
    }

})(this, function(window) {
    'use strict';

    if (!window) {
        throw new Error('FrostChart requires a Window.');
    }

    if (!('UI' in window)) {
        throw new Error('FrostUI-Chart requires FrostUI.');
    }

    const document = window.document;
    const Core = window.Core;
    const dom = window.dom;
    const UI = window.UI;

    /**
     * @class Layer
     */
    class Layer {

        /**
         * New Layer constructor.
         * @param {Chart} chart The Chart.
         * @param {object} settings The layer settings.
         */
        constructor(chart, settings) {
            this._chart = chart;
            this._settings = settings;

            this._canvas = dom.create('canvas');
            this._context = this._canvas.getContext('2d');
        }

        /**
         * Calclulate the layer.
         * @param {Rect} chartRect The Chart Rect.
         * @param {function} next The next layer calculate callback.
         */
        calculate(chartRect, next) {
            this._rect = chartRect.clone();

            next(chartRect);
        }

        /**
         * Calculate the canvas.
         */
        calculateCanvas() {
            this._canvasRect = this._rect.clone();
        }

        /**
         * Draw the layer.
         * @param {CanvasRenderingContext2D} context The Chart context.
         */
        draw(context) {
            if (!this._canvasRect.height || !this._canvasRect.width) {
                return;
            }

            context.drawImage(this._canvas, this._canvasRect.x, this._canvasRect.y);
        }

        /**
         * Render the layer.
         */
        render() {
            this._context.clearRect(0, 0, this._rect.width, this._rect.height);
        }

        /**
         * Update the layer.
         */
        update() {
            dom.setAttribute(this._canvas, {
                width: this._canvasRect.width,
                height: this._canvasRect.height
            });
        }

    }


    /**
     * Chart
     */
    class Chart extends UI.BaseComponent {

        constructor(node, settings) {
            super(node, settings);

            this._canvas = dom.create('canvas');
            this._context = this._canvas.getContext('2d');

            dom.append(this._node, this._canvas);

            this.setSettings();

            this._animations = [];

            this._events();
            this._build();

            this.setData(this._settings.data);
        }

        calculate() {
            const padding = this._settings.layout.padding;

            this._outerRect = new Rect(
                padding,
                padding,
                this._width - (padding * 2),
                this._height - (padding * 2)
            );

            this._chartRect = this._outerRect.clone();

            const layers = Object.keys(this._layers);

            const next = chartRect => {
                const nextLayer = layers.shift();

                if (!nextLayer) {
                    return;
                }

                this._layers[nextLayer].calculate(chartRect, next);
            };

            next(this._chartRect);

            for (const layer of Object.values(this._layers)) {
                layer.calculateCanvas();
            }

            this._layers.chart.data();
        }

        draw() {
            console.log('draw');

            this._context.clearRect(0, 0, this._width, this._height);

            for (const layer of Object.values(this._layers)) {
                layer.draw(this._context);
            }
        }

        setData() {
            this._data = this._settings.data;

            for (const dataset of this._data.datasets) {
                if (dataset.data.length !== this._data.labels.length) {
                    // error
                }

                dataset.borderColor = Core.wrap(dataset.borderColor);
                dataset.backgroundColor = Core.wrap(dataset.backgroundColor);
            }

            this.calculate();
            this.update();
            this.render();

            this.run();
        }

        setSettings(settings) {
            Core.extend(this._settings, settings);

            this._settings.title.font = Core.extend(
                {},
                this._settings.font,
                this._settings.title.font
            );

            this._settings.legend.labels.font = Core.extend(
                {},
                this._settings.font,
                this._settings.legend.labels.font
            );

            this._settings.scales.x.ticks.font = Core.extend(
                {},
                this._settings.font,
                this._settings.scales.x.ticks.font
            );

            this._settings.scales.y.ticks.font = Core.extend(
                {},
                this._settings.font,
                this._settings.scales.y.ticks.font
            );

            // resize
            this._width = dom.width(this._node);
            this._height = dom.height(this._node);

            dom.setAttribute(this._canvas, {
                width: this._width,
                height: this._height
            });
        }

        render() {
            console.log('render');

            this._hoverEvents = [];

            for (const layer of Object.values(this._layers)) {
                layer.render();
            }
        }

        run() {
            this._tick();
        }

        update() {
            for (const layer of Object.values(this._layers)) {
                layer.update();
            }
        }

        _build() {
            this._layers = {};

            this._layers.title = new Title(this, this._settings.title);
            this._layers.legend = new Legend(this, this._settings.legend);

            switch (this._settings.type) {
                case 'bar':
                    this._layers.ticksX = new LabelsX(this, this._settings.scales.x.ticks);
                    this._layers.ticksY = new LabelsY(this, this._settings.scales.y.ticks);
                    this._layers.grid = new Grid(this, this._settings.scales);
                    this._layers.chart = new BarChart(this, this._settings.scales);
                    break;
                case 'line':
                    this._layers.ticksX = new LabelsX(this, this._settings.scales.x.ticks);
                    this._layers.ticksY = new LabelsY(this, this._settings.scales.y.ticks);
                    this._layers.grid = new Grid(this, this._settings.scales);
                    this._layers.chart = new LineChart(this, this._settings.scales);
                    break;
                case 'pie':
                    this._layers.chart = new PieChart(this, this._settings.scales);
                    break;
            }

            // this._layers.tooltip = new Tooltip(this, this._settings.tooltip);
        }

        _events() {
            this._canvas.addEventListener('mousemove', e => {
                this._mouseX = e.clientX;
                this._mouseY = e.clientY;

                for (const callback of this._hoverEvents) {
                    callback(this._mouseX, this._mouseY);
                }
            });

            this._canvas.addEventListener('mouseleave', _ => {
                this._mouseX = null;
                this._mouseY = null;
            });

            this._canvas.addEventListener('mousedown', e => {
                if (e.button) {
                    return;
                }

                this._mousePressed = true;
            });

            this._canvas.addEventListener('mouseup', e => {
                this._mousePressed = false;
            });
        }

        _tick() {
            if (this._updating) {
                return;
            }

            this._updating = true;

            window.requestAnimationFrame(_ => {
                this._animations = this._animations.filter(
                    animation => animation() !== false
                );

                this.draw();

                this._updating = false;

                if (!this._animations.length) {
                    return;
                }

                this._tick();
            });
        }

    }


    class BarChart extends Layer {

        data() {
            const labels = this._chart.getLabels();
            const datasets = this._chart.getData();
            const scaleMin = this._chart.getScaleMin();
            const scaleMax = this._chart.getScaleMax();
            const scaleDiff = Math.abs(scaleMax - scaleMin);

            const xWidth = this._rect.width / labels.length;
            const spacing = 5;

            this._oldRects = this._rects || [];
            this._rects = [];

            this._baseY = this._rect.height - (-scaleMin / scaleDiff * this._rect.height);

            for (let i = 0; i < labels.length; i++) {
                for (const [j, dataset] of datasets.entries()) {
                    const value = dataset.data[i];

                    let width = (xWidth - (spacing * (datasets.length + 1))) / datasets.length;
                    let x = (i * xWidth) + (j * width) + (spacing * (j + 1));

                    let height;
                    let y;

                    if (value < 0) {
                        y = scaleMax / scaleDiff * this._rect.height;
                        height = Math.abs(value) / scaleDiff * this._rect.height;
                    } else {
                        height = (value - scaleMin) / scaleDiff * this._rect.height;
                        y = this._rect.height - height;

                        if (scaleMin < 0) {
                            height -= Math.abs(scaleMin) / scaleDiff * this._rect.height;
                        }
                    }

                    height = Math.max(0, height);
                    y = Math.min(this._rect.height, y);

                    const bgColor = dataset.backgroundColor[i % dataset.backgroundColor.length];
                    const borderColor = dataset.borderColor[i % dataset.borderColor.length];
                    const borderWidth = dataset.borderWidth;

                    this._rects.push({
                        x,
                        y,
                        width,
                        height,
                        bgColor,
                        borderColor,
                        borderWidth,
                        dataset
                    })
                }
            }
        }

        render() {
            this._progress = 0;

            const start = Date.now();
            const duration = 5000;

            this._chart._animations.push(_ => {
                const now = Date.now();

                this._progress += (now - start) / duration;
                this._progress = Math.min(this._progress, 1);

                super.render();

                this._render();

                return this._progress < 1;
            });
        }

        _render() {
            const count = Math.max(this._rects.length, this._oldRects.length);

            for (let i = 0; i < count; i++) {
                let newRect = this._rects[i];
                let oldRect = this._oldRects[i];

                if (!newRect) {
                    newRect = { ...oldRect };
                    newRect.y = this._baseY;
                    newRect.height = 0;
                    newRect.dataset = null;
                }

                if (!oldRect) {
                    oldRect = { ...newRect };
                    oldRect.y = this._baseY;
                    oldRect.height = 0;
                    oldRect.dataset = null;
                }

                const x = Core.lerp(oldRect.x, newRect.x, this._progress);
                const y = Core.lerp(oldRect.y, newRect.y, this._progress);
                const width = Core.lerp(oldRect.width, newRect.width, this._progress);
                const height = Core.lerp(oldRect.height, newRect.height, this._progress);

                const barPath = new Path2D();
                barPath.rect(x, y, width, height);

                this._context.fillStyle = newRect.bgColor;
                this._context.strokeStyle = newRect.borderColor;
                this._context.lineWidth = newRect.borderWidth;

                this._context.fill(barPath);
                this._context.stroke(barPath);

                this._chart._hoverEvents.push((x, y) => {
                    if (this._context.isPointInPath(barPath, x, y)) {
                        console.log(newRect.dataset);
                    }
                });
            }
        }

    }


    Object.assign(Chart.prototype, {

        getData() {
            return this._data.datasets;
        },

        /**
         * Get the labels.
         * @returns {Array} The data labels.
         */
        getLabels() {
            return this._data.labels;
        },

        /**
         * Get the scale.
         * @returns {Array} The scale.
         */
        getScale() {
            if (!this._scale) {
                const values = this.getValues();
                const min = Math.min(...values);
                const max = Math.max(...values);

                // calculate optimal scale
                this._layers.ticksY._updateFont(this._settings.scales.y.ticks.font);
                const metric = this._layers.ticksY._context.measureText('0');
                const labelHeight = metric.fontBoundingBoxAscent + metric.fontBoundingBoxDescent;

                let maxSteps = this._chartRect.height;
                maxSteps /= labelHeight;
                maxSteps /= 2.5;
                maxSteps = Math.floor(maxSteps);

                this._scale = this._createScale(min, max, maxSteps);
            }

            return this._scale;
        },

        /**
         * Get the scale maximum value.
         * @returns {number} The scale maximum value.
         */
        getScaleMax() {
            return this.getScale().slice(-1).pop();
        },

        /**
         * Get the scale minimum value.
         * @returns {number} The scale minimum value.
         */
        getScaleMin() {
            return this.getScale().slice(0, 1).shift();
        },

        /**
         * Get the values from datasets.
         * @returns {Array} The values.
         */
        getValues() {
            return this._data.datasets.reduce(
                (acc, dataset) => acc.concat(dataset.data),
                []
            );
        },

        /**
         * Create a scale from min/max values.
         * @param {number} min The minimum value.
         * @param {number} max The maximum value.
         * @returns {Array} The scale.
         */
        _createScale(min, max, maxSteps) {
            min = Math.min(min, 0);
            max = Math.max(max, 0);

            const diff = max - min;
            const step = diff / maxSteps;
            const mag10 = Math.ceil(Math.log(step) / Math.log(10));
            const baseStepSize = Math.pow(10, mag10);

            for (const divisor of [5, 4, 2, 1]) {
                const stepSize = baseStepSize / divisor;
                const ns = Math.round(diff / stepSize);

                if (ns < 1 || ns > maxSteps) {
                    continue;
                }

                const stepMin = Math.floor(min / stepSize) * stepSize;
                const stepMax = Math.ceil(max / stepSize) * stepSize;

                return Core.range(stepMin, stepMax, stepSize);
            }

            return [];
        }

    });


    Chart.defaults = {
        type: 'bar',
        // width: 800,
        // height: 500,
        font: {
            family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            size: 12,
            weight: 'normal',
            lineHeight: 1.2
        },
        title: {
            display: true,
            text: 'Title',
            padding: 10,
            font: {
                size: 18,
                weight: 'bold'
            },
            color: '#000',
            position: 'top',
            align: 'center'
        },
        legend: {
            display: true,
            // padding: 10,
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
                textAlign: 'center'
            }
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
                    tickLength: 8
                },
                ticks: {
                    display: true,
                    font: {},
                    padding: 5,
                    color: '#000',
                    drawTicks: true
                }
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
                    tickLength: 8
                },
                ticks: {
                    display: true,
                    font: {},
                    padding: 5,
                    color: '#000',
                    drawTicks: true,
                    tickColor: '#aaa'
                }
            }
        },
        layout: {
            padding: 20
        }
    };

    UI.initComponent('chart', Chart);

    UI.Chart = Chart;


    /**
     * @class Grid
     */
    class Grid extends Layer {

        /**
         * Calclulate the layer.
         * @param {Rect} chartRect The Chart Rect.
         * @param {function} next The next layer calculate callback.
         */
        calculate(chartRect, next) {
            this._rect = chartRect.clone();

            this._labelsY = this._chart.getScale();
            this._labelsX = this._chart.getLabels();

            chartRect.x += this._settings.y.grid.tickLength;
            chartRect.width -= this._settings.y.grid.tickLength;
            chartRect.height -= this._settings.x.grid.tickLength;

            next(chartRect);
        }

        /**
         * Calculate the canvas.
         */
        calculateCanvas() {
            super.calculateCanvas();

            this._canvasRect.x -= this._settings.y.grid.borderWidth;
            this._canvasRect.y -= this._settings.x.grid.lineWidth;
            this._canvasRect.width += this._settings.y.grid.borderWidth + (this._settings.y.grid.lineWidth * 2);
            this._canvasRect.height += this._settings.x.grid.lineWidth + this._settings.y.grid.borderWidth;
        }

        // draw(context) {
        //     context.strokeStyle = '#000';
        //     context.rect(this._rect.x + this._innerRect.x, this._rect.y + this._innerRect.y, this._innerRect.width, this._innerRect.height);
        //     context.stroke();
        // }

        /**
         * Render the layer.
         */
        render() {
            super.render();

            this._renderGridX();
            this._renderGridY();
            this._renderTicksX();
            this._renderTicksY();
            this._renderAxisX();
            this._renderAxisY();
        }

    }


    /**
     * Grid Render
     */
    Object.assign(Grid.prototype, {

        /**
         * Render the X axis.
         */
        _renderAxisX() {
            const x1 = this._settings.y.grid.tickLength;
            const x2 = this._rect.width + this._settings.y.grid.borderWidth + this._settings.y.grid.lineWidth;
            const y = this._rect.height - this._settings.x.grid.tickLength + this._settings.x.grid.lineWidth;

            this._context.lineWidth = this._settings.x.grid.borderWidth;
            this._context.strokeStyle = this._settings.x.grid.borderColor;

            this._context.beginPath();
            this._context.moveTo(x1, y);
            this._context.lineTo(x2, y);
            this._context.stroke();
        },

        /**
         * Render the Y axis.
         */
        _renderAxisY() {
            const x = this._settings.y.grid.tickLength + this._settings.y.grid.borderWidth;
            const y1 = 0;
            const y2 = this._rect.height - this._settings.x.grid.tickLength;

            this._context.lineWidth = this._settings.y.grid.borderWidth;
            this._context.strokeStyle = this._settings.y.grid.borderColor;

            this._context.beginPath();
            this._context.moveTo(x, y1);
            this._context.lineTo(x, y2);
            this._context.stroke();
        },

        /**
         * Render the X grid.
         */
        _renderGridX() {
            const x1 = this._settings.y.grid.tickLength;
            const x2 = this._rect.width + this._settings.y.grid.borderWidth + this._settings.y.grid.lineWidth;

            this._context.lineWidth = this._settings.x.grid.lineWidth;
            this._context.strokeStyle = this._settings.x.grid.lineColor;

            const yCount = this._labelsY.length - 1;
            const yHeight = (this._rect.height - this._settings.x.grid.tickLength) / yCount;
            for (let i = 0; i < this._labelsY.length; i++) {
                const y = (i * yHeight) + this._settings.x.grid.lineWidth;

                this._context.beginPath();
                this._context.moveTo(x1, y);
                this._context.lineTo(x2, y);
                this._context.stroke();
            }
        },

        /**
         * Render the Y grid.
         */
        _renderGridY() {
            const y1 = 0;
            const y2 = this._rect.height - this._settings.x.grid.tickLength;

            this._context.lineWidth = this._settings.y.grid.lineWidth;
            this._context.strokeStyle = this._settings.y.grid.lineColor;

            let xCount = this._labelsX.length;
            switch (this._chart._settings.type) {
                case 'line':
                    xCount -= 1;
                    break;
            }

            const xWidth = (this._rect.width - this._settings.y.grid.tickLength) / xCount;
            for (let i = 0; i <= xCount; i++) {
                const x = (i * xWidth) + this._settings.y.grid.tickLength + this._settings.y.grid.borderWidth;

                this._context.beginPath();
                this._context.moveTo(x, y1);
                this._context.lineTo(x, y2);
                this._context.stroke();
            }
        },

        /**
         * Render the X ticks.
         */
        _renderTicksX() {
            const y1 = this._rect.height - this._settings.y.grid.tickLength + this._settings.x.grid.lineWidth;
            const y2 = this._rect.height + this._settings.x.grid.lineWidth;

            this._context.lineWidth = this._settings.y.grid.lineWidth;
            this._context.strokeStyle = this._settings.y.grid.lineColor;

            const xCount = this._labelsX.length;
            const xWidth = (this._rect.width - this._settings.y.grid.tickLength) / xCount;
            for (let i = 0; i <= xCount; i++) {
                const x = (i * xWidth) + this._settings.y.grid.tickLength + this._settings.y.grid.borderWidth + (xWidth / 2);

                this._context.beginPath();
                this._context.moveTo(x, y1);
                this._context.lineTo(x, y2);
                this._context.stroke();
            }
        },

        /**
         * Render the Y ticks.
         */
        _renderTicksY() {
            const x1 = 0;
            const x2 = this._settings.y.grid.tickLength;

            this._context.lineWidth = this._settings.x.grid.lineWidth;
            this._context.strokeStyle = this._settings.x.grid.lineColor;

            const yCount = this._labelsY.length - 1;
            const yHeight = (this._rect.height - this._settings.x.grid.tickLength) / yCount;
            for (let i = 0; i < this._labelsY.length; i++) {
                const y = (i * yHeight) + this._settings.x.grid.lineWidth;

                this._context.beginPath();
                this._context.moveTo(x1, y);
                this._context.lineTo(x2, y);
                this._context.stroke();
            }
        }

    });


    /**
     * @class LabelsX
     */
    class LabelsX extends Layer {

        /**
         * Calclulate the layer.
         * @param {Rect} chartRect The Chart Rect.
         * @param {function} next The next layer calculate callback.
         */
        calculate(chartRect, next) {
            this._rect = chartRect.clone();

            this._updateFont(this._settings.font);

            this._labels = this._chart.getLabels(); // TODO: format labels Y

            this._metrics = this._labels.map(label => this._context.measureText(label));
            const maxHeight = Math.max(...this._metrics.map(metric => metric.fontBoundingBoxAscent + metric.fontBoundingBoxDescent));

            this._rect.y = chartRect.bottom - maxHeight - this._settings.padding;
            this._rect.height = maxHeight + this._settings.padding;

            chartRect.height -= this._rect.height;

            next(chartRect);

            switch (this._chart._settings.type) {
                case 'bar':
                    this._gridWidth = chartRect.width / this._labels.length;
                    this._offset = this._gridWidth / 2;
                    break;
                case 'line':
                    this._gridWidth = chartRect.width / (this._labels.length - 1);
                    this._offset = 0;
                    break;
            }

            this._rect.x = chartRect.left;
            this._rect.width = chartRect.width;
        }

        /**
         * Calculate the canvas.
         */
        calculateCanvas() {
            super.calculateCanvas();

            this._canvasRect.x -= this._gridWidth / 2;
            this._canvasRect.width += this._gridWidth;
        }

        // draw(context) {
        //     context.strokeStyle = '#000';
        //     context.rect(this._rect.x, this._rect.y, this._rect.width, this._rect.height);
        //     context.stroke();
        // }

        /**
         * Render the layer.
         */
        render() {
            super.render();

            this._updateFont(this._settings.font);

            this._context.textAlign = 'left';
            this._context.fillStyle = this._settings.color;

            for (const [i, value] of this._labels.entries()) {
                const { fontBoundingBoxAscent: ascent, width } = this._metrics[i];

                const labelX = (i * this._gridWidth) + (this._gridWidth / 2) - (width / 2) + this._offset;
                const labelY = ascent + this._settings.padding;

                this._context.fillText(value, labelX, labelY);
            }
        }

    }


    /**
     * @class LabelsY
     */
    class LabelsY extends Layer {

        /**
         * Calclulate the layer.
         * @param {Rect} chartRect The Chart Rect.
         * @param {function} next The next layer calculate callback.
         */
        calculate(chartRect, next) {
            this._rect = chartRect.clone();

            this._updateFont(this._settings.font);

            // TODO: generate scale

            this._labels = this._chart.getScale(); // TODO: format labels x
            this._metrics = this._labels.map(label => this._context.measureText(label));

            const maxWidth = Math.max(...this._metrics.map(metric => metric.width));

            this._rect.width = maxWidth + this._settings.padding;

            chartRect.width -= this._rect.width;
            chartRect.x = this._rect.right;

            next(chartRect);

            this._rect.y = chartRect.top;
            this._rect.height = chartRect.height;

            this._gridHeight = this._rect.height / (this._labels.length - 1);
            this._offset = 0;
        }

        /**
         * Calculate the canvas.
         */
        calculateCanvas() {
            super.calculateCanvas();

            this._canvasRect.y -= this._gridHeight / 2;
            this._canvasRect.height += this._gridHeight;
        }

        // draw(context) {
        //     context.strokeStyle = '#000';
        //     context.rect(this._rect.x, this._rect.y, this._rect.width, this._rect.height);
        //     context.stroke();
        // }

        /**
         * Render the layer.
         */
        render() {
            super.render();

            this._updateFont(this._settings.font);

            this._context.textAlign = 'right';
            this._context.fillStyle = this._settings.color;

            for (const [i, value] of this._labels.entries()) {
                const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = this._metrics[i];

                const labelX = this._rect.width - this._settings.padding;
                const labelY = ((this._labels.length - i) * this._gridHeight) - (this._gridHeight / 2) + (ascent / 2) - (descent / 2) + this._offset;

                this._context.fillText(value, labelX, labelY);
            }
        }

    }


    /**
     * Layer Helpers
     */
    Object.assign(Layer.prototype, {

        /**
         * Update the context font.
         * @param {object} font The font options.
         */
        _updateFont(font) {
            const node = dom.create('span', {
                style: {
                    fontSize: font.size,
                    fontFamily: font.family,
                    fontWeight: font.weight,
                    fontStyle: font.style
                }
            });

            dom.append(document.body, node);

            this._context.font = dom.css(node, 'font');

            dom.remove(node);
        },

        /**
         * Wrap text to lines up to a maximum width.
         * @param {string} text The text to wrap.
         * @param {number} maxWidth The maximum width.
         * @returns {Array} The text lines.
         */
        _wrapLines(text, maxWidth) {
            const width = this._context.measureText(text).width;

            if (width <= maxWidth) {
                return [text];
            }

            const words = text.split(' ');
            const lines = [];
            let currentLine = words.shift();

            for (const word of words) {
                const nextLine = `${currentLine} ${word}`;
                const width = this._context.measureText(nextLine).width;

                if (width <= maxWidth) {
                    currentLine = nextLine;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }

            lines.push(currentLine);

            return lines;
        }

    });


    /**
     * @class Legend
     */
    class Legend extends Layer {

        /**
         * Calclulate the layer.
         * @param {Rect} chartRect The Chart Rect.
         * @param {function} next The next layer calculate callback.
         */
        calculate(chartRect, next) {
            this._rect = chartRect.clone();

            if (!this._settings.display) {
                return next(chartRect);
            }

            this._updateFont(this._settings.labels.font);

            this._spacing = this._context.measureText(' ').width;
            this._lineHeight = this._settings.labels.font.lineHeight * this._settings.labels.font.size;

            this._rows = [];
            this._cols = [];

            const maxWidth = this._settings.maxWidth ?
                Math.min(this._settings.maxWidth, this._rect.width) :
                this._rect.width;

            const maxHeight = this._settings.maxHeight ?
                Math.min(this._settings.maxHeight, this._rect.height) :
                this._rect.height;

            const datasets = this._chart.getData();
            const labels = datasets.map(dataset => this._wrapLines(dataset.label, maxWidth));

            switch (this._settings.position) {
                case 'top':
                case 'bottom':
                    this._calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight);
                    break;
                case 'right':
                case 'left':
                    this._calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight);
                    break;
            }

            next(chartRect);
        }

        /**
         * Render the layer.
         */
        render() {
            if (!this._settings.display) {
                return;
            }

            super.render();

            this._updateFont(this._settings.labels.font);

            this._context.textAlign = 'left';

            switch (this._settings.position) {
                case 'top':
                case 'bottom':
                    this._renderHorizontal();
                    break;
                case 'right':
                case 'left':
                    this._renderVertical();
                    break;
            }
        }

    }


    /**
     * Legend Calculate
     */
    Object.assign(Legend.prototype, {

        /**
         * Calculate a horizontal legend.
         * @param {Rect} chartRect The Chart Rect.
         * @param {Array} datasets The datasets.
         * @param {Array} labels The wrapped labels.
         * @param {number} maxWidth The maximum width.
         * @param {number} maxHeight The maximum height.
         */
        _calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight) {
            let height = 0;

            let row = {
                width: 0,
                height: 0,
                labels: []
            };

            const rows = [];

            const addRow = row => {
                if (height + row.height > maxHeight) {
                    return false;
                }

                rows.push(row);
                height += row.height;
            };

            for (const [i, lines] of labels.entries()) {
                const metrics = lines.map(line => this._context.measureText(line));

                const labelHeight = lines.length * this._lineHeight;
                const labelWidth = Math.max(...metrics.map(metric => metric.width));

                const legendHeight = Math.max(this._settings.labels.boxHeight, labelHeight);
                const legendWidth = this._settings.labels.boxWidth + labelWidth + this._spacing;

                const label = {
                    dataset: datasets[i],
                    lines,
                    metrics
                };

                if (row.width + legendWidth > maxWidth) {
                    if (addRow(row) === false) {
                        row = null;
                        break;
                    }

                    row = {
                        width: legendWidth,
                        height: legendHeight,
                        labels: [label]
                    };

                    continue;
                }

                if (row.width) {
                    row.width += this._settings.labels.padding;
                }

                row.width += legendWidth;
                row.height = Math.max(row.height, legendHeight);
                row.labels.push(label);
            }

            if (row && row.width && row.height) {
                addRow(row);
            }

            const rectWidth = Math.max(...rows.map(row => row.width));
            const rectHeight = rows.reduce((acc, v) => acc + v.height, 0) + (this._settings.labels.padding * (rows.length - 1));

            this._rows = rows;

            switch (this._settings.align) {
                case 'center':
                    this._rect.x += (this._rect.width - rectWidth) / 2;
                    break;
                case 'end':
                    this._rect.x = this._rect.right - rectWidth;
                    break;
            }

            this._rect.width = rectWidth;
            this._rect.height = rectHeight;

            switch (this._settings.position) {
                case 'top':
                    chartRect.y += this._rect.height + this._settings.labels.padding;
                    break;
                case 'bottom':
                    this._rect.y = chartRect.bottom - this._rect.height;
                    break;
            }

            chartRect.height -= this._rect.height + this._settings.labels.padding;
        },

        /**
         * Calculate a vertical legend.
         * @param {Rect} chartRect The Chart Rect.
         * @param {Array} datasets The datasets.
         * @param {Array} labels The wrapped labels.
         * @param {number} maxWidth The maximum width.
         * @param {number} maxHeight The maximum height.
         */
        _calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight) {
            let width = 0;

            let col = {
                width: 0,
                height: 0,
                labels: []
            };

            const cols = [];

            const addCol = col => {
                if (width + col.width > maxWidth) {
                    return false;
                }

                cols.push(col);
                width += col.width;
            };

            for (const [i, lines] of labels.entries()) {
                const metrics = lines.map(line => this._context.measureText(line));

                const labelHeight = lines.length * this._lineHeight;
                const labelWidth = Math.max(...metrics.map(metric => metric.width));

                const legendHeight = Math.max(this._settings.labels.boxHeight, labelHeight);
                const legendWidth = this._settings.labels.boxWidth + labelWidth + this._spacing;

                const label = {
                    dataset: datasets[i],
                    lines,
                    metrics,
                    width: legendWidth
                };

                if (col.height + legendHeight > maxHeight) {
                    if (addCol(col) === false) {
                        col = null;
                        break;
                    }

                    col = {
                        width: legendWidth,
                        height: legendHeight,
                        labels: [label]
                    };

                    continue;
                }

                if (col.height) {
                    col.height += this._settings.labels.padding;
                }

                col.width = Math.max(col.width, legendWidth);
                col.height += legendHeight;
                col.labels.push(label);
            }

            if (col && col.width && col.height) {
                addCol(col);
            }

            const rectWidth = cols.reduce((acc, v) => acc + v.width, 0) + (this._settings.labels.padding * (cols.length - 1));
            const rectHeight = Math.max(...cols.map(col => col.height));

            this._cols = cols;

            switch (this._settings.align) {
                case 'center':
                    this._rect.y += (this._rect.height - rectHeight) / 2;
                    break;
                case 'end':
                    this._rect.y = this._rect.bottom - rectHeight;
                    break;
            }

            this._rect.width = rectWidth;
            this._rect.height = rectHeight;

            switch (this._settings.position) {
                case 'right':
                    this._rect.x = chartRect.right - this._rect.width;
                    break;
                case 'left':
                    chartRect.x += this._rect.width + this._settings.labels.padding;
                    break;
            }

            chartRect.width -= this._rect.width + this._settings.labels.padding;
        }

    });


    /**
     * Legend Render
     */
    Object.assign(Legend.prototype, {

        /**
         * Render the layer for a horizontal legend.
         */
        _renderHorizontal() {
            let x;
            let y = 0;

            for (const row of this._rows) {
                x = 0;

                switch (this._settings.labels.textAlign) {
                    case 'center':
                        x += (this._rect.width - row.width) / 2;
                        break;
                    case 'end':
                        x = this._rect.right - row.width;
                        break;
                }

                for (const label of row.labels) {
                    let labelY = y;

                    const labelHeight = label.lines.length * (this._lineHeight);

                    if (labelHeight < this._settings.labels.boxHeight) {
                        labelY += (this._settings.labels.boxHeight - labelHeight) / 2;
                    } else {
                        labelY += (labelHeight / this._settings.labels.boxHeight) / 2;
                    }

                    const boxX = x;
                    const boxY = labelY + ((labelHeight - this._settings.labels.boxHeight) / 2);

                    const boxPath = new Path2D();
                    boxPath.rect(boxX, boxY, this._settings.labels.boxWidth, this._settings.labels.boxHeight);

                    this._context.fillStyle = label.dataset.backgroundColor[0];
                    this._context.strokeStyle = label.dataset.borderColor[0];
                    this._context.fill(boxPath);
                    this._context.stroke(boxPath);

                    x += this._settings.labels.boxWidth + this._spacing;

                    let labelX = x;

                    this._context.fillStyle = this._settings.labels.color;

                    for (const [i, line] of label.lines.entries()) {
                        const metric = label.metrics[i];

                        this._context.fillText(
                            line,
                            labelX,
                            labelY + metric.fontBoundingBoxAscent
                        );

                        labelY += this._lineHeight
                    }

                    x += Math.max(...label.metrics.map(metric => metric.width)) + this._settings.labels.padding;
                }

                y += row.height + this._settings.labels.padding;
            }
        },

        /**
         * Render the layer for a vertical legend.
         */
        _renderVertical() {
            let x = 0;
            let y;

            for (const col of this._cols) {
                y = 0;

                for (const label of col.labels) {
                    const labelHeight = label.lines.length * (this._lineHeight);

                    let boxX = x;
                    const boxY = y + ((labelHeight - this._settings.labels.boxHeight) / 2);

                    switch (this._settings.labels.textAlign) {
                        case 'center':
                            boxX += (col.width - label.width) / 2;
                            break;
                        case 'end':
                            boxX += col.width - label.width;
                            break;
                    }

                    const boxPath = new Path2D();
                    boxPath.rect(boxX, boxY, this._settings.labels.boxWidth, this._settings.labels.boxHeight);

                    this._context.fillStyle = label.dataset.backgroundColor[0];
                    this._context.strokeStyle = label.dataset.borderColor[0];
                    this._context.fill(boxPath);
                    this._context.stroke(boxPath);

                    this._context.fillStyle = this._settings.labels.color;

                    const labelX = boxX + this._settings.labels.boxWidth + this._spacing;
                    let labelY = y;

                    for (const [i, line] of label.lines.entries()) {
                        const { fontBoundingBoxAscent: ascent } = label.metrics[i];

                        this._context.fillText(
                            line,
                            labelX,
                            labelY + ascent
                        );

                        labelY += this._lineHeight
                    }

                    y += labelHeight + this._settings.labels.padding;
                }

                x += col.width + this._settings.labels.padding;
            }
        }

    });


    class LineChart extends Layer {

        render() {
            super.render();

            const labels = this._chart.getLabels();
            const datasets = this._chart.getData();
            const scaleMin = this._chart.getScaleMin();
            const scaleMax = this._chart.getScaleMax();

            const xWidth = this._rect.width / (labels.length - 1);

            for (const [_, dataset] of datasets.entries()) {
                this._context.beginPath();

                const points = [];
                for (const [i, value] of dataset.data.entries()) {
                    const height = (value - scaleMin) / (scaleMax - scaleMin) * this._rect.height;
                    const x = i * xWidth;
                    const y = this._rect.height - height;

                    points.push({ x, y });

                    if (i === 0) {
                        this._context.moveTo(x, y);
                    } else {
                        this._context.lineTo(x, y);
                    }
                }

                this._context.strokeStyle = dataset.borderColor;

                this._context.stroke();

                for (const point of points) {
                    const pointPath = new Path2D();
                    pointPath.ellipse(point.x, point.y, 2, 2, 0, 0, Math.PI * 2);

                    this._context.stroke(pointPath);

                    this._chart._hoverEvents.push((x, y) => {
                        if (this._context.isPointInPath(pointPath, x, y)) {
                            console.log(dataset);
                        }
                    });
                }
            }
        }

    }


    class PieChart extends Layer {

        render() {
            super.render();

            const values = this._chart.getValues();
            const total = values.reduce((acc, val) => acc + val, 0);

            const x = this._rect.width / 2;
            const y = this._rect.height / 2;
            const r = Math.min(this._rect.width, this._rect.height) / 2;

            const spacing = 5;

            const translate = (start, angle) => {
                this._context.translate(x, y);
                this._context.rotate(start);

                if (spacing) {
                    this._context.rotate(angle / 2);
                    this._context.translate(spacing, 0);
                    this._context.rotate(-angle / 2);
                }
            };

            let start = 0;
            for (const value of values) {
                const angleStart = start;
                const angle = value / total * Math.PI * 2;

                start += angle;

                const piePath = new Path2D();
                piePath.moveTo(0, 0);
                piePath.arc(0, 0, r, 0, angle);
                piePath.closePath();

                this._context.save();

                translate(angleStart, angle);

                this._context.fillStyle = '#00f';
                this._context.strokeStyle = '#fff';
                this._context.lineWidth = 0;

                const inPathNow = this._chart._mouseX && this._chart._mouseY && this._context.isPointInPath(piePath, this._chart._mouseX, this._chart._mouseY);

                if (inPathNow) {
                    this._context.fillStyle = '#0f0';
                }

                this._context.fill(piePath);
                this._context.stroke(piePath);

                this._context.restore();

                this._chart._hoverEvents.push((x, y) => {
                    this._context.save();
                    translate(angleStart, angle);
                    const inPath = this._context.isPointInPath(piePath, x, y);
                    this._context.restore();

                    if (inPath && !inPathNow) {
                        this._chart.draw();
                    }

                    return !inPath;
                });
            }
        }

    }


    /**
     * @class Rect
     */
    class Rect {

        /**
         * New Rect constructor.
         * @param {number} x The X position.
         * @param {number} y The Y position.
         * @param {number} width The width.
         * @param {number} height The height.
         */
        constructor(x = 0, y = 0, width = 0, height = 0) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        /**
         * Clone the Rect.
         * @returns {Rect} A new Rect.
         */
        clone() {
            return new Rect(this.x, this.y, this.width, this.height);
        }

        /**
         * Get the bottom position.
         * @returns {number} The bottom position.
         */
        get bottom() {
            return this.y + this.height;
        }

        /**
         * Get the center X position.
         * @returns {number} The center X position.
         */
        get centerX() {
            return this.x + (this.width / 2);
        }

        /**
         * Get the center Y position.
         * @returns {number} The center Y position.
         */
        get centerY() {
            return this.y + (this.height / 2);
        }

        /**
         * Get the left position.
         * @returns {number} The left position.
         */
        get left() {
            return this.x;
        }

        /**
         * Get the right position.
         * @returns {number} The right position.
         */
        get right() {
            return this.x + this.width;
        }

        /**
         * Get the top position.
         * @returns {number} The top position.
         */
        get top() {
            return this.y;
        }

    }


    /**
     * @class Title
     */
    class Title extends Layer {

        /**
         * Calclulate the layer.
         * @param {Rect} chartRect The Chart Rect.
         * @param {function} next The next layer calculate callback.
         */
        calculate(chartRect, next) {
            this._rect = chartRect.clone();

            if (!this._settings.display) {
                return next(chartRect);
            }

            this._updateFont(this._settings.font);

            const maxWidth = ['right', 'left'].includes(this._settings.position) ?
                this._rect.height :
                this._rect.width;

            this._lines = this._wrapLines(this._settings.text, maxWidth);
            this._metrics = this._lines.map(line => this._context.measureText(line));

            this._lineHeight = this._settings.font.lineHeight * this._settings.font.size;

            const height = this._lines.length * this._lineHeight;

            switch (this._settings.position) {
                case 'top':
                    this._rect.height = height;
                    chartRect.height -= height + this._settings.padding;
                    chartRect.y += height + this._settings.padding;
                    break;
                case 'right':
                    this._rect.width = height;
                    this._rect.x = chartRect.right - height;
                    chartRect.width -= height + this._settings.padding;
                    break;
                case 'bottom':
                    this._rect.height = height;
                    this._rect.y = chartRect.bottom - height;
                    chartRect.height -= height + this._settings.padding;
                    break;
                case 'left':
                    this._rect.width = height;
                    chartRect.width -= height + this._settings.padding;
                    chartRect.x += height + this._settings.padding;
                    break;
            }

            next(chartRect);
        }

        /**
         * Render the layer.
         */
        render() {
            if (!this._settings.display) {
                return;
            }

            super.render();

            this._updateFont(this._settings.font);

            this._context.textAlign = this._settings.align;
            this._context.fillStyle = this._settings.color;

            let x = 0;
            let y = 0;

            switch (this._settings.position) {
                case 'top':
                case 'bottom':
                    switch (this._settings.align) {
                        case 'center':
                            x = this._rect.width / 2;
                            break;
                        case 'right':
                            x = this._rect.width;
                            break;
                    }
                    break;
                case 'right':
                    x = this._rect.width;
                    break;
            }

            switch (this._settings.position) {
                case 'right':
                case 'left':
                    switch (this._settings.align) {
                        case 'center':
                            y = this._rect.height / 2;
                            break;
                        case 'left':
                            y = this._rect.height;
                            break;
                    }
                    break;
            }

            for (const [i, line] of this._lines.entries()) {
                const { fontBoundingBoxAscent: ascent } = this._metrics[i];

                let lineX = x;
                let lineY = y;

                switch (this._settings.position) {
                    case 'top':
                    case 'bottom':
                        lineY += ascent;
                        break;
                    case 'right':
                        lineX -= ascent;
                        break;
                    case 'left':
                        lineX += ascent;
                        break;
                }

                this._context.save();
                this._context.translate(lineX, lineY);

                switch (this._settings.position) {
                    case 'right':
                        this._context.rotate(Math.PI / 2);
                        break;
                    case 'left':
                        this._context.rotate(-Math.PI / 2);
                        break;
                }

                this._context.fillText(line, 0, 0);
                this._context.restore();

                switch (this._settings.position) {
                    case 'top':
                    case 'bottom':
                        y += this._lineHeight;
                        break;
                    case 'right':
                        x -= this._lineHeight;
                        break;
                    case 'left':
                        x += this._lineHeight;
                        break;
                }
            }
        }

    }


    class Tooltip extends Layer {

        draw() {
            super.draw();

            // check if we have mouse overlap
            // calculate size of tooltip
            // calculate position of tooltip

            return;

            this._context.fillStyle = '#000';

            this._context.beginPath();
            this._context.rect(50, 50, 100, 100);

            this._context.fill();
        }

    }


    Chart.Bar = BarChart;
    Chart.Grid = Grid;
    Chart.Layer = Layer;
    Chart.Legend = Legend;
    Chart.Line = LineChart;
    Chart.Pie = PieChart;
    Chart.Rect = Rect;
    Chart.Title = Title;
    Chart.Tooltip = Tooltip;

    return {
        Chart
    };
});