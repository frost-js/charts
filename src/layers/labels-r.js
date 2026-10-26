/** @import { ChartTickOptions } from '../chart.js'; */

import { updateFont } from '../helpers.js';
import { getScalePosition } from '../scale.js';
import Layer from './layer.js';

/**
 * Draws centered radial scale numbers above the data fills.
 * @augments {Layer<Pick<ChartTickOptions, 'display'|'font'|'color'|'callback'>>}
 */
export default class LabelsR extends Layer {
    /**
     * Includes the text extending beyond the outer radial guide.
     */
    calculateCanvas() {
        this.canvasRect = this.chart.outerRect;
    }

    /**
     * Renders numeric ticks along the upper vertical radius.
     */
    render() {
        super.render();

        if (!this.settings.display || !this.chart.options.scales.r.display) {
            return;
        }

        const ticks = this.chart.getScale();
        const maximum = this.chart.getScaleMax();
        const radius = this.rect.width / 2;
        const centerX = this.rect.centerX - this.canvasRect.x;
        const centerY = this.rect.centerY - this.canvasRect.y;

        updateFont(this.context, this.settings.font);
        this.context.fillStyle = this.settings.color;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        for (const [index, value] of ticks.entries()) {
            if (!value) {
                continue;
            }

            const distance = radius * getScalePosition(value, 0, maximum);
            const text = this.settings.callback ? this.settings.callback(value, index) : value;

            this.context.fillText(String(text), centerX, centerY - distance);
        }
    }
}
