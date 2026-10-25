/**
 * @import Rect from '../rect.js';
 */

import { getScalePosition } from '../scale.js';
import Layer from './layer.js';

/**
 * Draws grid lines, axis borders, and ticks behind the data layer.
 */
export default class Grid extends Layer {
    #labelsX;
    #labelsY;
    #plotRect;

    /**
     * Reserves tick space before calculating the plot.
     * @param {Rect} chartRect The remaining chart rectangle.
     * @param {Function} next The next layout callback.
     */
    calculate(chartRect, next) {
        this.rect = chartRect.clone();
        this.#labelsX = this.chart.options.type === 'scatter' ? this.chart.getScale('x') : this.chart.getLabels();
        this.#labelsY = this.chart.getScale();

        const tickX = Math.min(chartRect.height, this.#tickLength('x'));
        const tickY = Math.min(chartRect.width, this.#tickLength('y'));

        chartRect.x += tickY;
        chartRect.width -= tickY;
        chartRect.height -= tickX;

        next(chartRect);

        this.#plotRect = chartRect.clone();
    }

    /**
     * Keeps borders and ticks inside the offscreen drawing surface.
     */
    calculateCanvas() {
        this.canvasRect = this.chart.outerRect.clone();
    }

    /**
     * Renders grids, ticks, and borders according to each axis's settings.
     */
    render() {
        super.render();

        this.context.save();
        this.context.translate(-this.canvasRect.x, -this.canvasRect.y);

        this.#renderGridX();
        this.#renderGridY();
        this.#renderTicksX();
        this.#renderTicksY();
        this.#renderAxisX();
        this.#renderAxisY();

        this.context.restore();
    }

    /**
     * Draws a line with an explicit color and positive width.
     * @param {number} x1 The starting x coordinate.
     * @param {number} y1 The starting y coordinate.
     * @param {number} x2 The ending x coordinate.
     * @param {number} y2 The ending y coordinate.
     * @param {string} color The line color.
     * @param {number} width The line width.
     */
    #line(x1, y1, x2, y2, color, width) {
        if (!width) {
            return;
        }

        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.strokeStyle = color;
        this.context.lineWidth = width;
        this.context.stroke();
    }

    /**
     * Renders the x axis border.
     */
    #renderAxisX() {
        const { display, grid } = this.settings.x;
        const rect = this.#plotRect;

        if (display && grid.drawBorder) {
            this.#line(rect.left, rect.bottom, rect.right, rect.bottom, grid.borderColor, grid.borderWidth);
        }
    }

    /**
     * Renders the y axis border.
     */
    #renderAxisY() {
        const { display, grid } = this.settings.y;
        const rect = this.#plotRect;

        if (display && grid.drawBorder) {
            this.#line(rect.left, rect.top, rect.left, rect.bottom, grid.borderColor, grid.borderWidth);
        }
    }

    /**
     * Renders vertical grid lines at x categories.
     */
    #renderGridX() {
        const { display, grid } = this.settings.x;
        const rect = this.#plotRect;

        if (!display || !grid.display) {
            return;
        }

        for (let index = 0; index < this.#labelsX.length; index++) {
            const x = this.#x(index);
            this.#line(x, rect.top, x, rect.bottom, grid.lineColor, grid.lineWidth);
        }
    }

    /**
     * Renders horizontal grid lines at y scale ticks.
     */
    #renderGridY() {
        const { display, grid } = this.settings.y;
        const rect = this.#plotRect;

        if (!display || !grid.display) {
            return;
        }

        for (let index = 0; index < this.#labelsY.length; index++) {
            const y = this.#y(index);
            this.#line(rect.left, y, rect.right, y, grid.lineColor, grid.lineWidth);
        }
    }

    /**
     * Renders ticks below the x axis.
     */
    #renderTicksX() {
        const length = this.#tickLength('x');
        const { grid, ticks } = this.settings.x;
        const rect = this.#plotRect;

        if (!length) {
            return;
        }

        for (let index = 0; index < this.#labelsX.length; index++) {
            const x = this.#x(index);
            this.#line(x, rect.bottom, x, rect.bottom + length, ticks.tickColor || grid.lineColor, grid.lineWidth);
        }
    }

    /**
     * Renders ticks to the left of the y axis.
     */
    #renderTicksY() {
        const length = this.#tickLength('y');
        const { grid, ticks } = this.settings.y;
        const rect = this.#plotRect;

        if (!length) {
            return;
        }

        for (let index = 0; index < this.#labelsY.length; index++) {
            const y = this.#y(index);
            this.#line(rect.left - length, y, rect.left, y, ticks.tickColor || grid.lineColor, grid.lineWidth);
        }
    }

    /**
     * Gets the visible tick length for an axis.
     * @param {string} axis The axis name.
     * @returns {number} The tick length.
     */
    #tickLength(axis) {
        const { display, grid, ticks } = this.settings[axis];

        return display && ticks.display && ticks.drawTicks ? grid.tickLength : 0;
    }

    /**
     * Gets a category's x coordinate.
     * @param {number} index The category index.
     * @returns {number} The chart-local coordinate.
     */
    #x(index) {
        const count = this.#labelsX.length;
        const rect = this.#plotRect;

        if (this.chart.options.type === 'scatter') {
            const position = getScalePosition(this.#labelsX[index], this.#labelsX[0], this.#labelsX.at(-1));

            return rect.left + position * rect.width;
        }

        if (this.chart.options.type === 'bar') {
            return rect.left + (index + .5) * rect.width / Math.max(1, count);
        }

        return count > 1 ? rect.left + index * rect.width / (count - 1) : rect.centerX;
    }

    /**
     * Gets a scale tick's y coordinate.
     * @param {number} index The scale index.
     * @returns {number} The chart-local coordinate.
     */
    #y(index) {
        const value = this.#labelsY[index];
        const minimum = this.#labelsY[0];
        const maximum = this.#labelsY.at(-1);
        const position = getScalePosition(value, minimum, maximum);

        return this.#plotRect.bottom - position * this.#plotRect.height;
    }
}
