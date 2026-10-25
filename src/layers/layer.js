/**
 * @import Chart from '../chart.js';
 */
/**
 * @import Rect from '../rect.js';
 */

/**
 * Provides layout and offscreen rendering shared by the chart layers.
 */
export default class Layer {
    #active = null;
    #canvas;
    #canvasRect;
    #chart;
    #context;
    #hitRegions = [];
    #rect;
    #settings;

    /**
     * Creates a Layer.
     * @param {Chart} chart The owning chart.
     * @param {object} settings The layer settings.
     */
    constructor(chart, settings) {
        this.#chart = chart;
        this.#settings = settings;
        this.#canvas = chart.node.ownerDocument.createElement('canvas');
        this.#context = this.#canvas.getContext('2d');
    }

    /**
     * Gets the active mark used by subclasses.
     * @returns {object|null} The active mark.
     */
    get active() {
        return this.#active;
    }

    /**
     * Gets the offscreen canvas rectangle used by subclasses.
     * @returns {Rect} The offscreen canvas rectangle.
     */
    get canvasRect() {
        return this.#canvasRect;
    }

    /**
     * Sets the offscreen canvas rectangle during layout.
     * @param {Rect} value The new rectangle.
     */
    set canvasRect(value) {
        this.#canvasRect = value;
    }

    /**
     * Gets the owning chart used by subclasses.
     * @returns {Chart} The owning chart.
     */
    get chart() {
        return this.#chart;
    }

    /**
     * Gets the drawing context used by subclasses.
     * @returns {CanvasRenderingContext2D} The drawing context.
     */
    get context() {
        return this.#context;
    }

    /**
     * Gets the layout rectangle used by subclasses.
     * @returns {Rect} The layout rectangle.
     */
    get rect() {
        return this.#rect;
    }

    /**
     * Sets the layout rectangle during layout.
     * @param {Rect} value The new rectangle.
     */
    set rect(value) {
        this.#rect = value;
    }

    /**
     * Gets the layer settings used by subclasses.
     * @returns {object} The layer settings.
     */
    get settings() {
        return this.#settings;
    }

    /**
     * Adds a hit region in layer-local coordinates.
     * @param {Path2D} path The rendered path.
     * @param {object} data The associated data item.
     */
    addHitRegion(path, data) {
        this.#hitRegions.push({ path, data });
    }

    /**
     * Calculates the layer bounds and continues layout.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {Function} next The next layout callback.
     */
    calculate(chartRect, next) {
        this.#rect = chartRect.clone();

        next(chartRect);
    }

    /**
     * Calculates the offscreen canvas bounds.
     */
    calculateCanvas() {
        this.#canvasRect = this.#rect.clone();
    }

    /**
     * Prepares data geometry; decoration layers do not need additional work.
     */
    data() {}

    /**
     * Composites the layer onto the chart canvas.
     * @param {CanvasRenderingContext2D} context The chart context.
     */
    draw(context) {
        if (!this.#canvas.width || !this.#canvas.height) {
            return;
        }

        context.drawImage(
            this.#canvas,
            this.#canvasRect.x,
            this.#canvasRect.y,
            this.#canvasRect.width,
            this.#canvasRect.height,
        );
    }

    /**
     * Finds a data mark at chart-local CSS coordinates.
     * @param {number} x The pointer x coordinate.
     * @param {number} y The pointer y coordinate.
     * @returns {object|null} The matching data item.
     */
    hitTest(x, y) {
        const ratio = this.#chart.pixelRatio;
        const localX = (x - this.#canvasRect.x) * ratio;
        const localY = (y - this.#canvasRect.y) * ratio;
        const hit = this.#hitRegions.findLast(({ path }) => this.#context.isPointInPath(path, localX, localY));

        return hit ? { ...hit.data, x, y } : null;
    }

    /**
     * Clears the entire offscreen layer before rendering.
     */
    render() {
        this.#hitRegions = [];

        this.#context.clearRect(0, 0, this.#canvasRect.width, this.#canvasRect.height);
    }

    /**
     * Sets the mark highlighted by the layer.
     * @param {object|null} item The active data item.
     */
    setActive(item) {
        this.#active = item;
    }

    /**
     * Resizes the offscreen canvas using the chart's pixel ratio.
     */
    update() {
        const ratio = this.#chart.pixelRatio;

        this.#canvas.width = Math.max(0, Math.ceil(this.#canvasRect.width * ratio));
        this.#canvas.height = Math.max(0, Math.ceil(this.#canvasRect.height * ratio));
        this.#context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
}
