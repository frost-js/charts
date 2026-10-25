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
