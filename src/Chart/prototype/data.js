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
