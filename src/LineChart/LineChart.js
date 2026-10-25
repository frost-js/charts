class LineChart extends Layer {

    render() {
        super.render();

        const labels = this._chart.getLabels();
        const datasets = this._chart.getData();
        const scaleMin = this._chart.getScaleMin();
        const scaleMax = this._chart.getScaleMax();

        const xWidth = this._rect.width / (labels.length - 1);

        for (const [_, dataset] of datasets.entries()) {
            this._context.beginPath();

            const points = [];
            for (const [i, value] of dataset.data.entries()) {
                const height = (value - scaleMin) / (scaleMax - scaleMin) * this._rect.height;
                const x = i * xWidth;
                const y = this._rect.height - height;

                points.push({ x, y });

                if (i === 0) {
                    this._context.moveTo(x, y);
                } else {
                    this._context.lineTo(x, y);
                }
            }

            this._context.strokeStyle = dataset.borderColor;

            this._context.stroke();

            for (const point of points) {
                const pointPath = new Path2D();
                pointPath.ellipse(point.x, point.y, 2, 2, 0, 0, Math.PI * 2);

                this._context.stroke(pointPath);

                this._chart._hoverEvents.push((x, y) => {
                    if (this._context.isPointInPath(pointPath, x, y)) {
                        console.log(dataset);
                    }
                });
            }
        }
    }

}
