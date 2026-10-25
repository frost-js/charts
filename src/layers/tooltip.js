import { measureText, updateFont, wrapLines } from '../helpers.js';
import Layer from './layer.js';

/**
 * Renders the hovered item's label and value above the other chart layers.
 */
export default class Tooltip extends Layer {
    /**
     * Uses the full outer rectangle so tooltips are not clipped to the plot.
     */
    calculateCanvas() {
        this.canvasRect = this.chart.outerRect;
    }

    /**
     * Clears the previous tooltip and draws the active item near the pointer.
     */
    render() {
        super.render();

        if (!this.settings.display || !this.active) {
            return;
        }

        updateFont(this.context, this.settings.font);

        const { padding, font } = this.settings;
        const maxWidth = Math.max(0, this.canvasRect.width - padding * 2);
        const text = `${this.active.label}\n${this.active.datasetLabel}: ${this.active.value}`;
        const lines = wrapLines(this.context, text, maxWidth);
        const lineHeight = font.size * font.lineHeight;
        const textWidth = Math.max(0, ...lines.map((line) => measureText(this.context, line).width));
        const width = Math.min(this.canvasRect.width, textWidth + padding * 2);
        const height = Math.min(this.canvasRect.height, lines.length * lineHeight + padding * 2);

        const pointerX = this.active.x - this.canvasRect.x;
        const pointerY = this.active.y - this.canvasRect.y;
        const x = Math.max(0, Math.min(pointerX + 10, this.canvasRect.width - width));
        const y = Math.max(0, Math.min(pointerY + 10, this.canvasRect.height - height));

        this.context.fillStyle = this.settings.backgroundColor;
        this.context.fillRect(x, y, width, height);

        this.context.fillStyle = this.settings.color;
        this.context.textBaseline = 'middle';

        for (const [index, line] of lines.entries()) {
            const lineY = y + padding + (index + .5) * lineHeight;

            this.context.fillText(line, x + padding, lineY);
        }
    }
}
