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
