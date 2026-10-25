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
