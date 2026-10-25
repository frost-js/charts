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
                    // queue render
                    console.log(newRect.dataset);
                }
            });
        }
    }

}
