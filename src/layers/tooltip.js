/** @import { ChartTooltipOptions } from '../chart.js'; */
/** @import { ChartMark, LayerPlacement } from './layer.js'; */

import { formatValue } from '../data.js';
import { measureText, updateFont, wrapLines } from '../helpers.js';
import Layer from './layer.js';

/**
 * @typedef {object} TooltipBounds
 * @property {number} x The body's left edge.
 * @property {number} y The body's top edge.
 * @property {number} width The body width.
 * @property {number} height The body height.
 * @property {number} radius The corner radius.
 * @property {LayerPlacement} side The chosen side of the anchor.
 * @property {number} anchorX The local anchor x coordinate.
 * @property {number} anchorY The local anchor y coordinate.
 */

/**
 * Renders a rounded tooltip beside the pointer or anchored to a data mark.
 * @augments {Layer<ChartTooltipOptions, ChartMark>}
 */
export default class Tooltip extends Layer {
    /**
     * Uses the full outer rectangle so tooltips are not clipped to the plot.
     */
    calculateCanvas() {
        this.canvasRect = this.chart.outerRect;
    }

    /**
     * Measures the label and chooses a placement that fits within the canvas.
     */
    render() {
        super.render();

        if (!this.settings.display || !this.active || !this.canvasRect.width || !this.canvasRect.height) {
            return;
        }

        updateFont(this.context, this.settings.font);

        const { padding, font } = this.settings;
        const maxWidth = Math.max(0, this.canvasRect.width - padding * 2);
        const text = `${this.active.label}\n${this.active.datasetLabel}: ${formatValue(this.active.value)}`;
        const lines = wrapLines(this.context, text, maxWidth);
        const lineHeight = font.size * font.lineHeight;
        const textWidth = lines.reduce((maximum, line) => {
            return Math.max(maximum, measureText(this.context, line).width);
        }, 0);

        const width = Math.min(this.canvasRect.width, textWidth + padding * 2);
        const height = Math.min(this.canvasRect.height, lines.length * lineHeight + padding * 2);

        const fixed = this.settings.position === 'fixed';
        const anchorX = (fixed ? this.active.anchorX : this.active.x) - this.canvasRect.x;
        const anchorY = (fixed ? this.active.anchorY : this.active.y) - this.canvasRect.y;
        const preferred = fixed ? this.active.placement || 'top' : 'top';
        const { x, y, side } = this.#place(width, height, anchorX, anchorY, preferred);
        const radius = Math.min(this.settings.borderRadius, width / 2, height / 2);
        const path = new Path2D();

        path.roundRect(x, y, width, height, radius);
        this.#addArrow(path, { x, y, width, height, radius, side, anchorX, anchorY });

        this.context.fillStyle = this.settings.backgroundColor;
        this.context.fill(path);

        this.context.save();
        this.context.beginPath();
        this.context.roundRect(x, y, width, height, radius);
        this.context.clip();
        this.context.fillStyle = this.settings.color;
        this.context.textBaseline = 'middle';

        for (const [index, line] of lines.entries()) {
            const lineY = y + padding + (index + .5) * lineHeight;

            this.context.fillText(line, x + padding, lineY);
        }

        this.context.restore();
    }

    /**
     * Adds a small pointer to the same fill path, avoiding overlapping opacity.
     * @param {Path2D} path The tooltip outline.
     * @param {TooltipBounds} bounds The body bounds and anchor position.
     */
    #addArrow(path, bounds) {
        const { x, y, width, height, radius, side, anchorX, anchorY } = bounds;
        const vertical = side === 'top' || side === 'bottom';
        const length = vertical ? width : height;
        const size = Math.min(this.settings.arrowSize, Math.max(0, length / 2 - radius));

        if (!size) {
            return;
        }

        const start = vertical ? x : y;
        const anchor = vertical ? anchorX : anchorY;
        const minimum = start + radius + size;
        const maximum = start + length - radius - size;
        const center = Math.max(minimum, Math.min(anchor, maximum));

        if (vertical) {
            const edge = side === 'top' ? y + height : y;
            const tip = edge + (side === 'top' ? size : -size);

            path.moveTo(center - size, edge);
            path.lineTo(center, tip);
            path.lineTo(center + size, edge);
        } else {
            const edge = side === 'left' ? x + width : x;
            const tip = edge + (side === 'left' ? size : -size);

            path.moveTo(edge, center - size);
            path.lineTo(tip, center);
            path.lineTo(edge, center + size);
        }

        path.closePath();
    }

    /**
     * Prefers the mark's outward side, flips at edges, and clamps oversized labels.
     * @param {number} width The tooltip width.
     * @param {number} height The tooltip height.
     * @param {number} anchorX The anchor's local x coordinate.
     * @param {number} anchorY The anchor's local y coordinate.
     * @param {LayerPlacement} preferred The preferred side of the anchor.
     * @returns {{x: number, y: number, side: LayerPlacement}} The body position and chosen side.
     */
    #place(width, height, anchorX, anchorY, preferred) {
        const gap = this.settings.arrowSize + 6;
        const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
        const candidates = {
            top: { x: anchorX - width / 2, y: anchorY - height - gap },
            bottom: { x: anchorX - width / 2, y: anchorY + gap },
            right: { x: anchorX + gap, y: anchorY - height / 2 },
            left: { x: anchorX - width - gap, y: anchorY - height / 2 },
        };
        const sides = [preferred, opposite[preferred], 'top', 'bottom', 'right', 'left'];
        const maxX = this.canvasRect.width - width;
        const maxY = this.canvasRect.height - height;

        // Clamping along the edge keeps the tooltip near its mark even at corners.
        for (const side of sides) {
            const candidate = candidates[side];
            const vertical = side === 'top' || side === 'bottom';
            const fits = vertical ?
                candidate.y >= 0 && candidate.y <= maxY :
                candidate.x >= 0 && candidate.x <= maxX;

            if (fits) {
                return {
                    x: Math.max(0, Math.min(candidate.x, maxX)),
                    y: Math.max(0, Math.min(candidate.y, maxY)),
                    side,
                };
            }
        }

        const candidate = candidates[preferred];

        return {
            x: Math.max(0, Math.min(candidate.x, maxX)),
            y: Math.max(0, Math.min(candidate.y, maxY)),
            side: preferred,
        };
    }
}
