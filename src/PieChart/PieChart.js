class PieChart extends Layer {

    render() {
        super.render();

        const values = this._chart.getValues();
        const total = values.reduce((acc, val) => acc + val, 0);

        const x = this._rect.width / 2;
        const y = this._rect.height / 2;
        const r = Math.min(this._rect.width, this._rect.height) / 2;

        const spacing = 5;

        const translate = (start, angle) => {
            this._context.translate(x, y);
            this._context.rotate(start);

            if (spacing) {
                this._context.rotate(angle / 2);
                this._context.translate(spacing, 0);
                this._context.rotate(-angle / 2);
            }
        };

        let start = 0;
        for (const value of values) {
            const angleStart = start;
            const angle = value / total * Math.PI * 2;

            start += angle;

            const piePath = new Path2D();
            piePath.moveTo(0, 0);
            piePath.arc(0, 0, r, 0, angle);
            piePath.closePath();

            this._context.save();

            translate(angleStart, angle);

            this._context.fillStyle = '#00f';
            this._context.strokeStyle = '#fff';
            this._context.lineWidth = 0;

            const inPathNow = this._chart._mouseX && this._chart._mouseY && this._context.isPointInPath(piePath, this._chart._mouseX, this._chart._mouseY);

            if (inPathNow) {
                this._context.fillStyle = '#0f0';
            }

            this._context.fill(piePath);
            this._context.stroke(piePath);

            this._context.restore();

            this._chart._hoverEvents.push((x, y) => {
                this._context.save();
                translate(angleStart, angle);
                const inPath = this._context.isPointInPath(piePath, x, y);
                this._context.restore();

                if (inPath && !inPathNow) {
                    this._chart.draw();
                }

                return !inPath;
            });
        }
    }

}
