(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports =  factory() :
  typeof define === 'function' && define.amd ? define([], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, (global.Chart = factory()));
})(this, function() {
// src/data.js
/**
	* @typedef {object} ChartDataset
	* @property {string} [label] The dataset label.
	* @property {Array<number|{x: number, y: number}>} data Values, or numeric x/y points for scatter charts.
	* @property {string|string[]} [backgroundColor] The fill color or repeating colors.
	* @property {string|string[]} [borderColor] The border color or repeating colors.
	* @property {number} [borderWidth=1] The border width in CSS pixels.
	* @property {number} [pointRadius=2] The point radius in CSS pixels; scatter defaults to 4.
	* @property {number} [fillOpacity=.2] The area fill opacity.
	*/
	/**
	* @typedef {object} ChartData
	* @property {Array<string|number>} [labels] Category labels; optional point labels for scatter charts.
	* @property {ChartDataset[]} datasets The chart datasets.
	*/
	var defaultColors = [
		"#2563eb",
		"#dc2626",
		"#059669",
		"#9333ea",
		"#d97706",
		"#0891b2",
		"#db2777",
		"#65a30d",
		"#ea580c",
		"#4f46e5",
		"#0d9488",
		"#64748b"
	];
	/**
	* Copies a color or color array into a validated, nonempty array.
	* @param {string|string[]} colors The supplied colors.
	* @param {string} name The property name used in validation errors.
	* @returns {string[]} The copied colors.
	*/
	function normalizeColors(colors, name) {
		const values = Array.isArray(colors) ? Array.from(colors) : [colors];
		if (!values.length) throw new TypeError(`${name} must contain at least one color.`);
		for (const value of values) if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must contain nonempty color strings.`);
		return values;
	}
	/**
	* Copies finite numbers or scatter coordinates into an independent data array.
	* @param {Array} data The supplied values or points.
	* @param {string} type The chart type.
	* @param {number} index The dataset index used in errors.
	* @returns {Array} The validated values or points.
	*/
	function normalizeValues(data, type, index) {
		return Array.from(data, (value) => {
			if (type === "scatter") {
				if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new TypeError(`Dataset ${index} points must have finite x and y coordinates.`);
				return {
					x: value.x,
					y: value.y
				};
			}
			if (!Number.isFinite(value)) throw new TypeError(`Dataset ${index} values must be finite numbers.`);
			if (["pie", "donut"].includes(type) && value < 0) throw new RangeError(`Dataset ${index} pie and donut values must be nonnegative.`);
			return value;
		});
	}
	/**
	* Validates and copies one dataset without modifying the caller's data.
	* @param {ChartDataset} dataset The supplied dataset.
	* @param {number} index The dataset index.
	* @param {number} labelCount The required number of values.
	* @param {string} type The chart type.
	* @returns {ChartDataset} The normalized dataset.
	*/
	function normalizeDataset(dataset, index, labelCount, type) {
		if (!dataset || !Array.isArray(dataset.data)) throw new TypeError(`Dataset ${index} requires a data array.`);
		if (type !== "scatter" && dataset.data.length !== labelCount) throw new RangeError(`Dataset ${index} must have one value per label.`);
		const values = normalizeValues(dataset.data, type, index);
		const borderWidth = dataset.borderWidth ?? 1;
		const pointRadius = dataset.pointRadius ?? (type === "scatter" ? 4 : 2);
		const fillOpacity = dataset.fillOpacity ?? .2;
		if (!Number.isFinite(borderWidth) || borderWidth < 0) throw new RangeError(`Dataset ${index} borderWidth must be a finite, nonnegative number.`);
		if (!Number.isFinite(pointRadius) || pointRadius < 0) throw new RangeError(`Dataset ${index} pointRadius must be a finite, nonnegative number.`);
		if (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1) throw new RangeError(`Dataset ${index} fillOpacity must be between zero and one.`);
		const circular = ["pie", "donut"].includes(type);
		const defaultColor = defaultColors[index % defaultColors.length];
		const backgroundColor = dataset.backgroundColor ?? (circular ? defaultColors : defaultColor);
		const borderColor = dataset.borderColor ?? (circular ? "#ffffff" : defaultColor);
		return {
			label: String(dataset.label ?? `Dataset ${index + 1}`),
			data: values,
			backgroundColor: normalizeColors(backgroundColor, `Dataset ${index} backgroundColor`),
			borderColor: normalizeColors(borderColor, `Dataset ${index} borderColor`),
			borderWidth,
			pointRadius,
			fillOpacity
		};
	}
	/**
	* Validates chart data and copies its labels, values, and colors.
	* @param {ChartData} data The supplied chart data.
	* @param {string} type The chart type.
	* @returns {ChartData} The independent, normalized chart data.
	*/
	function normalizeData(data, type) {
		if (!data || !Array.isArray(data.datasets)) throw new TypeError("Chart data requires a datasets array.");
		const inputLabels = type === "scatter" ? data.labels ?? [] : data.labels;
		if (!Array.isArray(inputLabels)) throw new TypeError("Chart labels must be an array.");
		const labels = Array.from(inputLabels, (label) => String(label));
		return {
			labels,
			datasets: Array.from(data.datasets, (dataset, index) => {
				return normalizeDataset(dataset, index, labels.length, type);
			})
		};
	}
	/**
	* Gets a dataset color, repeating its palette when necessary.
	* @param {ChartDataset} dataset The normalized dataset.
	* @param {string} property The color property.
	* @param {number} index The value index.
	* @returns {string} The color for this value.
	*/
	function getColor(dataset, property, index) {
		const colors = dataset[property];
		return colors[index % colors.length];
	}
	/**
	* Formats a numeric value or scatter coordinates for tooltips and descriptions.
	* @param {number|{x: number, y: number}} value The data value.
	* @returns {string} The readable value.
	*/
	function formatValue(value) {
		return typeof value === "object" ? `(${value.x}, ${value.y})` : String(value);
	}

// src/layers/layer.js
/**
	* @import Chart from '../chart.js';
	*/
	/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Provides layout and offscreen rendering shared by the chart layers.
	*/
	var Layer = class {
		#active = null;
		#canvas;
		#canvasRect;
		#chart;
		#context;
		#hitRegions = [];
		#rect;
		#settings;
		/**
		* Creates a Layer.
		* @param {Chart} chart The owning chart.
		* @param {object} settings The layer settings.
		*/
		constructor(chart, settings) {
			this.#chart = chart;
			this.#settings = settings;
			this.#canvas = chart.node.ownerDocument.createElement("canvas");
			this.#context = this.#canvas.getContext("2d");
		}
		/**
		* Gets the active mark used by subclasses.
		* @returns {object|null} The active mark.
		*/
		get active() {
			return this.#active;
		}
		/**
		* Gets the offscreen canvas rectangle used by subclasses.
		* @returns {Rect} The offscreen canvas rectangle.
		*/
		get canvasRect() {
			return this.#canvasRect;
		}
		/**
		* Sets the offscreen canvas rectangle during layout.
		* @param {Rect} value The new rectangle.
		*/
		set canvasRect(value) {
			this.#canvasRect = value;
		}
		/**
		* Gets the owning chart used by subclasses.
		* @returns {Chart} The owning chart.
		*/
		get chart() {
			return this.#chart;
		}
		/**
		* Gets the drawing context used by subclasses.
		* @returns {CanvasRenderingContext2D} The drawing context.
		*/
		get context() {
			return this.#context;
		}
		/**
		* Gets the layout rectangle used by subclasses.
		* @returns {Rect} The layout rectangle.
		*/
		get rect() {
			return this.#rect;
		}
		/**
		* Sets the layout rectangle during layout.
		* @param {Rect} value The new rectangle.
		*/
		set rect(value) {
			this.#rect = value;
		}
		/**
		* Gets the layer settings used by subclasses.
		* @returns {object} The layer settings.
		*/
		get settings() {
			return this.#settings;
		}
		/**
		* Adds a hit region in layer-local coordinates.
		* @param {Path2D} path The rendered path.
		* @param {object} data The associated data item.
		*/
		addHitRegion(path, data) {
			this.#hitRegions.push({
				path,
				data
			});
		}
		/**
		* Calculates the layer bounds and continues layout.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.#rect = chartRect.clone();
			next(chartRect);
		}
		/**
		* Calculates the offscreen canvas bounds.
		*/
		calculateCanvas() {
			this.#canvasRect = this.#rect.clone();
		}
		/**
		* Prepares data geometry; decoration layers do not need additional work.
		*/
		data() {}
		/**
		* Composites the layer onto the chart canvas.
		* @param {CanvasRenderingContext2D} context The chart context.
		*/
		draw(context) {
			if (!this.#canvas.width || !this.#canvas.height) return;
			context.drawImage(this.#canvas, this.#canvasRect.x, this.#canvasRect.y, this.#canvasRect.width, this.#canvasRect.height);
		}
		/**
		* Finds a data mark at chart-local CSS coordinates.
		* @param {number} x The pointer x coordinate.
		* @param {number} y The pointer y coordinate.
		* @returns {object|null} The matching data item.
		*/
		hitTest(x, y) {
			const ratio = this.#chart.pixelRatio;
			const localX = (x - this.#canvasRect.x) * ratio;
			const localY = (y - this.#canvasRect.y) * ratio;
			const hit = this.#hitRegions.findLast(({ path }) => this.#context.isPointInPath(path, localX, localY));
			return hit ? {
				...hit.data,
				x,
				y
			} : null;
		}
		/**
		* Clears the entire offscreen layer before rendering.
		*/
		render() {
			this.#hitRegions = [];
			this.#context.clearRect(0, 0, this.#canvasRect.width, this.#canvasRect.height);
		}
		/**
		* Sets the mark highlighted by the layer.
		* @param {object|null} item The active data item.
		*/
		setActive(item) {
			this.#active = item;
		}
		/**
		* Resizes the offscreen canvas using the chart's pixel ratio.
		*/
		update() {
			const ratio = this.#chart.pixelRatio;
			this.#canvas.width = Math.max(0, Math.ceil(this.#canvasRect.width * ratio));
			this.#canvas.height = Math.max(0, Math.ceil(this.#canvasRect.height * ratio));
			this.#context.setTransform(ratio, 0, 0, ratio, 0, 0);
		}
	};

// src/scale.js
/**
	* Creates evenly spaced ticks that cover the data and include zero.
	* @param {number[]} values The finite data values.
	* @param {number} [maxSteps=6] The preferred maximum number of intervals.
	* @returns {number[]} The ascending scale ticks.
	*/
	function createScale(values, maxSteps = 6) {
		let minimum = 0;
		let maximum = 0;
		for (const value of values) {
			minimum = Math.min(minimum, value);
			maximum = Math.max(maximum, value);
		}
		if (minimum === maximum) return [0, 1];
		const stepCount = Math.max(2, Math.min(20, Math.floor(maxSteps)));
		const approximateStep = (maximum - minimum) / stepCount;
		if (!Number.isFinite(approximateStep) || approximateStep === 0) {
			if (minimum < 0 && maximum > 0) return [
				minimum,
				0,
				maximum
			];
			return [minimum, maximum];
		}
		const magnitude = 10 ** Math.floor(Math.log10(approximateStep));
		let step = magnitude * 10;
		for (const multiplier of [
			1,
			2,
			2.5,
			5,
			10
		]) {
			const candidate = magnitude * multiplier;
			if (candidate >= approximateStep) {
				step = candidate;
				break;
			}
		}
		if (!Number.isFinite(step) || step === 0) return [minimum, maximum];
		const firstStep = Math.floor(minimum / step);
		const lastStep = Math.ceil(maximum / step);
		const firstTick = firstStep * step;
		const lastTick = lastStep * step;
		if (!Number.isFinite(firstTick) || !Number.isFinite(lastTick)) return [minimum, maximum];
		const ticks = [];
		for (let index = firstStep; index <= lastStep; index++) {
			const value = index * step;
			const rounded = Number(value.toPrecision(14));
			ticks.push(rounded === 0 ? 0 : rounded);
		}
		ticks[0] = Math.min(ticks[0], minimum);
		ticks[ticks.length - 1] = Math.max(ticks[ticks.length - 1], maximum);
		return ticks;
	}
	/**
	* Converts a value to a fraction of a scale without overflowing its range.
	* @param {number} value The value to position.
	* @param {number} minimum The lower scale boundary.
	* @param {number} maximum The upper scale boundary.
	* @returns {number} The relative position from zero to one.
	*/
	function getScalePosition(value, minimum, maximum) {
		const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum)) || 1;
		const scaledMinimum = minimum / magnitude;
		const scaledMaximum = maximum / magnitude;
		return (value / magnitude - scaledMinimum) / (scaledMaximum - scaledMinimum);
	}

// src/charts/bar.js
/**
	* Renders grouped bars and interpolates between successive datasets.
	*/
	var BarChart = class extends Layer {
		#baseY = 0;
		#oldRects = [];
		#rects = [];
		/**
		* Calculates bar geometry against the current zero baseline.
		*/
		data() {
			const labels = this.chart.getLabels();
			const datasets = this.chart.getData();
			const min = this.chart.getScaleMin();
			const max = this.chart.getScaleMax();
			const groupWidth = this.rect.width / Math.max(1, labels.length);
			const spacing = Math.min(5, groupWidth / (datasets.length + 1) / 2);
			this.#oldRects = this.#rects;
			this.#rects = [];
			this.#baseY = this.rect.height * (1 - getScalePosition(0, min, max));
			for (let index = 0; index < labels.length; index++) for (const [datasetIndex, dataset] of datasets.entries()) {
				const value = dataset.data[index];
				const width = Math.max(0, (groupWidth - spacing * (datasets.length + 1)) / datasets.length);
				const x = index * groupWidth + (datasetIndex * width + spacing * (datasetIndex + 1));
				const valueY = this.rect.height * (1 - getScalePosition(value, min, max));
				this.#rects.push({
					x,
					y: Math.min(valueY, this.#baseY),
					width,
					height: Math.abs(valueY - this.#baseY),
					backgroundColor: getColor(dataset, "backgroundColor", index),
					borderColor: getColor(dataset, "borderColor", index),
					borderWidth: dataset.borderWidth,
					label: labels[index],
					datasetLabel: dataset.label,
					datasetIndex,
					index,
					value
				});
			}
		}
		/**
		* Renders a single animation frame without retaining old hit regions.
		* @param {number} [progress=1] The elapsed animation fraction.
		*/
		render(progress = 1) {
			super.render();
			const count = Math.max(this.#rects.length, this.#oldRects.length);
			for (let index = 0; index < count; index++) {
				const target = this.#rects[index];
				const previous = this.#oldRects[index];
				const next = target || {
					...previous,
					y: this.#baseY,
					height: 0
				};
				const old = previous || {
					...next,
					y: this.#baseY,
					height: 0
				};
				const interpolate = (key) => old[key] + (next[key] - old[key]) * progress;
				const path = new Path2D();
				path.rect(interpolate("x"), interpolate("y"), interpolate("width"), interpolate("height"));
				this.context.fillStyle = next.backgroundColor;
				this.context.fill(path);
				if (next.borderWidth) {
					this.context.strokeStyle = next.borderColor;
					this.context.lineWidth = next.borderWidth;
					this.context.stroke(path);
				}
				if (target) this.addHitRegion(path, target);
			}
		}
	};

// src/charts/line.js
/**
	* Renders line, area, and scatter series on the Cartesian axes.
	*/
	var LineChart = class extends Layer {
		#baseY = 0;
		#oldPoints = [];
		#points = [];
		#renderedPoints = [];
		/**
		* Includes point radii and border widths beyond the plot boundaries.
		*/
		calculateCanvas() {
			super.calculateCanvas();
			const padding = this.chart.getData().reduce((size, dataset) => {
				return Math.max(size, dataset.pointRadius + dataset.borderWidth / 2);
			}, 0);
			this.canvasRect.x -= padding;
			this.canvasRect.y -= padding;
			this.canvasRect.width += padding * 2;
			this.canvasRect.height += padding * 2;
		}
		/**
		* Calculates target points and retains the visible positions for transitions.
		*/
		data() {
			const scatter = this.chart.options.type === "scatter";
			const labels = this.chart.getLabels();
			const datasets = this.chart.getData();
			const minX = this.chart.getScaleMin("x");
			const maxX = this.chart.getScaleMax("x");
			const min = this.chart.getScaleMin();
			const max = this.chart.getScaleMax();
			const step = labels.length > 1 ? this.rect.width / (labels.length - 1) : 0;
			this.#oldPoints = this.#renderedPoints;
			this.#points = [];
			this.#baseY = this.rect.height * (1 - getScalePosition(0, min, max));
			for (const [datasetIndex, dataset] of datasets.entries()) {
				const points = [];
				for (const [index, value] of dataset.data.entries()) {
					let x = labels.length === 1 ? this.rect.width / 2 : index * step;
					if (scatter) x = this.rect.width * getScalePosition(value.x, minX, maxX);
					const yValue = scatter ? value.y : value;
					points.push({
						x,
						y: this.rect.height * (1 - getScalePosition(yValue, min, max)),
						backgroundColor: getColor(dataset, "backgroundColor", index),
						borderColor: getColor(dataset, "borderColor", index),
						borderWidth: dataset.borderWidth,
						pointRadius: dataset.pointRadius,
						fillOpacity: dataset.fillOpacity,
						label: labels[index] ?? `Point ${index + 1}`,
						datasetLabel: dataset.label,
						datasetIndex,
						index,
						value
					});
				}
				this.#points.push(points);
			}
		}
		/**
		* Interpolates series and registers hit regions at their visible positions.
		* @param {number} [progress=1] The elapsed animation fraction.
		*/
		render(progress = 1) {
			super.render();
			const type = this.chart.options.type;
			const datasetCount = Math.max(this.#points.length, this.#oldPoints.length);
			this.#renderedPoints = [];
			for (let datasetIndex = 0; datasetIndex < datasetCount; datasetIndex++) {
				const targets = this.#points[datasetIndex] || [];
				const oldPoints = this.#oldPoints[datasetIndex] || [];
				const count = Math.max(targets.length, oldPoints.length);
				const rendered = [];
				for (let index = 0; index < count; index++) {
					const target = targets[index];
					const old = oldPoints[index];
					if (!target && progress === 1) continue;
					const next = target || {
						...old,
						y: this.#baseY,
						pointRadius: 0
					};
					const start = old || {
						...next,
						y: this.#baseY,
						pointRadius: 0
					};
					rendered.push({
						...next,
						x: start.x + (next.x - start.x) * progress,
						y: start.y + (next.y - start.y) * progress,
						pointRadius: start.pointRadius + (next.pointRadius - start.pointRadius) * progress,
						interactive: Boolean(target)
					});
				}
				this.#renderedPoints.push(rendered);
			}
			if (type === "area") for (const points of this.#renderedPoints) this.#fillArea(points);
			for (const points of this.#renderedPoints) this.#renderSeries(points, type !== "scatter");
		}
		/**
		* Fills the area between a series and the current zero baseline.
		* @param {object[]} points The interpolated points.
		*/
		#fillArea(points) {
			if (points.length < 2) return;
			const offsetX = this.rect.x - this.canvasRect.x;
			const offsetY = this.rect.y - this.canvasRect.y;
			const path = new Path2D();
			path.moveTo(points[0].x + offsetX, this.#baseY + offsetY);
			for (const point of points) path.lineTo(point.x + offsetX, point.y + offsetY);
			path.lineTo(points.at(-1).x + offsetX, this.#baseY + offsetY);
			path.closePath();
			this.context.save();
			this.context.globalAlpha = points[0].fillOpacity;
			this.context.fillStyle = points[0].backgroundColor;
			this.context.fill(path);
			this.context.restore();
		}
		/**
		* Draws visible points and optional connecting segments.
		* @param {object[]} points The interpolated points.
		* @param {boolean} connected Whether to connect successive points.
		*/
		#renderSeries(points, connected) {
			const offsetX = this.rect.x - this.canvasRect.x;
			const offsetY = this.rect.y - this.canvasRect.y;
			let previous = null;
			for (const item of points) {
				const x = item.x + offsetX;
				const y = item.y + offsetY;
				const point = new Path2D();
				const hit = new Path2D();
				this.context.strokeStyle = item.borderColor;
				this.context.fillStyle = item.backgroundColor;
				if (connected && previous && item.borderWidth) {
					this.context.beginPath();
					this.context.moveTo(previous.x, previous.y);
					this.context.lineTo(x, y);
					this.context.lineWidth = item.borderWidth;
					this.context.stroke();
				}
				point.arc(x, y, item.pointRadius, 0, Math.PI * 2);
				this.context.fill(point);
				if (item.borderWidth) {
					this.context.lineWidth = item.borderWidth;
					this.context.stroke(point);
				}
				if (item.interactive) {
					hit.arc(x, y, Math.max(6, item.pointRadius), 0, Math.PI * 2);
					this.addHitRegion(hit, item);
				}
				previous = {
					x,
					y
				};
			}
		}
	};

// src/charts/pie.js
/**
	* Renders a combined pie or donut using all dataset values.
	*/
	var PieChart = class extends Layer {
		#oldSlices = [];
		#renderedSlices = [];
		#slices = [];
		/**
		* Calculates slice angles and retains the visible angles for transitions.
		*/
		data() {
			const values = this.chart.getValues();
			const largest = values.reduce((max, value) => Math.max(max, value), 0);
			const labels = this.chart.getLabels();
			const total = largest ? values.reduce((sum, value) => sum + value / largest, 0) : 0;
			this.#oldSlices = this.#renderedSlices;
			this.#slices = [];
			for (const [datasetIndex, dataset] of this.chart.getData().entries()) {
				const slices = [];
				for (const [index, value] of dataset.data.entries()) slices.push({
					angle: total ? value / largest / total * Math.PI * 2 : 0,
					backgroundColor: getColor(dataset, "backgroundColor", index),
					borderColor: getColor(dataset, "borderColor", index),
					borderWidth: dataset.borderWidth,
					label: labels[index],
					datasetLabel: dataset.label,
					datasetIndex,
					index,
					value
				});
				this.#slices.push(slices);
			}
		}
		/**
		* Interpolates slice angles with an outward offset and hover feedback.
		* @param {number} [progress=1] The elapsed animation fraction.
		*/
		render(progress = 1) {
			super.render();
			const spacing = Math.min(5, this.rect.width / 4, this.rect.height / 4);
			const radius = Math.max(0, Math.min(this.rect.width, this.rect.height) / 2 - spacing);
			const innerRadius = radius * (this.chart.options.type === "donut" ? this.chart.options.cutout : 0);
			const datasetCount = Math.max(this.#slices.length, this.#oldSlices.length);
			let start = 0;
			this.#renderedSlices = [];
			for (let datasetIndex = 0; datasetIndex < datasetCount; datasetIndex++) {
				const targets = this.#slices[datasetIndex] || [];
				const oldSlices = this.#oldSlices[datasetIndex] || [];
				const count = Math.max(targets.length, oldSlices.length);
				const rendered = [];
				for (let index = 0; index < count; index++) {
					const target = targets[index];
					const old = oldSlices[index];
					const next = target || {
						...old,
						angle: 0
					};
					const oldAngle = old?.angle || 0;
					const angle = oldAngle + (next.angle - oldAngle) * progress;
					if (!target && progress === 1) continue;
					rendered.push({
						...next,
						angle
					});
					if (!angle) continue;
					const middle = start + angle / 2;
					const x = this.rect.width / 2 + Math.cos(middle) * spacing;
					const y = this.rect.height / 2 + Math.sin(middle) * spacing;
					const path = new Path2D();
					path.arc(x, y, radius, start, start + angle);
					if (innerRadius) path.arc(x, y, innerRadius, start + angle, start, true);
					else path.lineTo(x, y);
					path.closePath();
					this.context.fillStyle = next.backgroundColor;
					this.context.fill(path);
					if (next.borderWidth) {
						this.context.strokeStyle = next.borderColor;
						this.context.lineWidth = next.borderWidth;
						this.context.stroke(path);
					}
					if (this.active?.datasetIndex === datasetIndex && this.active.index === index) {
						this.context.fillStyle = "rgba(255,255,255,.3)";
						this.context.fill(path);
					}
					if (target && target.angle) this.addHitRegion(path, target);
					start += angle;
				}
				this.#renderedSlices.push(rendered);
			}
		}
	};

// src/easing.js
/**
	* Applies the configured timing curve to a fraction between zero and one.
	* @param {number} progress The elapsed animation fraction.
	* @param {string} easing The timing curve name.
	* @returns {number} The eased animation fraction.
	*/
	function ease(progress, easing) {
		switch (easing) {
			case "easeOutQuad": return 1 - (1 - progress) ** 2;
			case "easeInOutQuad": return progress < .5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2;
			default: return progress;
		}
	}

// src/layers/grid.js
/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Draws grid lines, axis borders, and ticks behind the data layer.
	*/
	var Grid = class extends Layer {
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
			this.#labelsX = this.chart.options.type === "scatter" ? this.chart.getScale("x") : this.chart.getLabels();
			this.#labelsY = this.chart.getScale();
			const tickX = Math.min(chartRect.height, this.#tickLength("x"));
			const tickY = Math.min(chartRect.width, this.#tickLength("y"));
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
			if (!width) return;
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
			if (display && grid.drawBorder) this.#line(rect.left, rect.bottom, rect.right, rect.bottom, grid.borderColor, grid.borderWidth);
		}
		/**
		* Renders the y axis border.
		*/
		#renderAxisY() {
			const { display, grid } = this.settings.y;
			const rect = this.#plotRect;
			if (display && grid.drawBorder) this.#line(rect.left, rect.top, rect.left, rect.bottom, grid.borderColor, grid.borderWidth);
		}
		/**
		* Renders vertical grid lines at x categories.
		*/
		#renderGridX() {
			const { display, grid } = this.settings.x;
			const rect = this.#plotRect;
			if (!display || !grid.display) return;
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
			if (!display || !grid.display) return;
			for (let index = 0; index < this.#labelsY.length; index++) {
				const y = this.#y(index);
				this.#line(rect.left, y, rect.right, y, grid.lineColor, grid.lineWidth);
			}
		}
		/**
		* Renders ticks below the x axis.
		*/
		#renderTicksX() {
			const length = this.#tickLength("x");
			const { grid, ticks } = this.settings.x;
			const rect = this.#plotRect;
			if (!length) return;
			for (let index = 0; index < this.#labelsX.length; index++) {
				const x = this.#x(index);
				this.#line(x, rect.bottom, x, rect.bottom + length, ticks.tickColor || grid.lineColor, grid.lineWidth);
			}
		}
		/**
		* Renders ticks to the left of the y axis.
		*/
		#renderTicksY() {
			const length = this.#tickLength("y");
			const { grid, ticks } = this.settings.y;
			const rect = this.#plotRect;
			if (!length) return;
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
			if (this.chart.options.type === "scatter") {
				const position = getScalePosition(this.#labelsX[index], this.#labelsX[0], this.#labelsX.at(-1));
				return rect.left + position * rect.width;
			}
			if (this.chart.options.type === "bar") return rect.left + (index + .5) * rect.width / Math.max(1, count);
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
	};

// src/helpers.js
/**
	* Measures text using a font-metric fallback for older canvas implementations.
	* @param {CanvasRenderingContext2D} context The measuring context.
	* @param {string|number} text The text to measure.
	* @returns {object} The text width, ascent, and descent.
	*/
	function measureText(context, text) {
		const metrics = context.measureText(String(text));
		const match = context.font.match(/([\d.]+)px/);
		const fontSize = match ? Number(match[1]) : 12;
		return {
			width: metrics.width,
			fontBoundingBoxAscent: metrics.fontBoundingBoxAscent ?? fontSize * .8,
			fontBoundingBoxDescent: metrics.fontBoundingBoxDescent ?? fontSize * .2
		};
	}
	/**
	* Sets a canvas font from the resolved chart font options.
	* @param {CanvasRenderingContext2D} context The drawing context.
	* @param {object} font The resolved font options.
	*/
	function updateFont(context, font) {
		context.font = `${font.style || "normal"} ${font.weight} ${font.size}px ${font.family}`;
	}
	/**
	* Wraps text at word boundaries and splits words wider than the available space.
	* @param {CanvasRenderingContext2D} context The measuring context.
	* @param {string} text The text to wrap.
	* @param {number} maxWidth The maximum line width.
	* @returns {string[]} The wrapped lines.
	*/
	function wrapLines(context, text, maxWidth) {
		if (maxWidth <= 0) return [];
		const lines = [];
		for (const paragraph of String(text).split("\n")) {
			let line = "";
			for (const word of paragraph.split(/\s+/)) {
				const nextLine = line ? `${line} ${word}` : word;
				if (measureText(context, nextLine).width <= maxWidth) {
					line = nextLine;
					continue;
				}
				if (line) {
					lines.push(line);
					line = "";
				}
				for (const character of word) {
					if (line && measureText(context, line + character).width > maxWidth) {
						lines.push(line);
						line = "";
					}
					line += character;
				}
			}
			lines.push(line);
		}
		return lines;
	}

// src/layers/labels-x.js
/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Lays out category labels or numeric scatter ticks below the plot.
	*/
	var LabelsX = class extends Layer {
		#gridWidth;
		#labels;
		#metrics;
		#offset;
		#values;
		/**
		* Calculates the layer bounds before continuing layout.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.rect = chartRect.clone();
			if (!this.settings.display || !this.chart.options.scales.x.display) {
				this.rect.width = 0;
				this.rect.height = 0;
				this.#gridWidth = 0;
				next(chartRect);
				return;
			}
			updateFont(this.context, this.settings.font);
			this.#values = this.chart.options.type === "scatter" ? this.chart.getScale("x") : this.chart.getLabels();
			this.#labels = this.#values.map((value, index) => {
				const formatted = this.settings.callback ? this.settings.callback(value, index) : value;
				return String(formatted);
			});
			this.#metrics = this.#labels.map((label) => measureText(this.context, label));
			const heights = this.#metrics.map((metric) => {
				return metric.fontBoundingBoxAscent + metric.fontBoundingBoxDescent;
			});
			const maxHeight = Math.max(0, ...heights);
			this.rect.height = Math.min(chartRect.height / 2, maxHeight + this.settings.padding);
			this.rect.y = chartRect.bottom - this.rect.height;
			chartRect.height -= this.rect.height;
			next(chartRect);
			switch (this.chart.options.type) {
				case "bar":
					this.#gridWidth = chartRect.width / Math.max(1, this.#labels.length);
					this.#offset = this.#gridWidth / 2;
					break;
				case "line":
				case "area":
				case "scatter":
					this.#gridWidth = this.#labels.length > 1 ? chartRect.width / (this.#labels.length - 1) : 0;
					this.#offset = this.#labels.length === 1 ? chartRect.width / 2 : 0;
			}
			this.rect.x = chartRect.left;
			this.rect.width = chartRect.width;
		}
		/**
		* Calculates the offscreen canvas bounds.
		*/
		calculateCanvas() {
			super.calculateCanvas();
			this.canvasRect.x -= this.#gridWidth / 2;
			this.canvasRect.width += this.#gridWidth;
		}
		/**
		* Renders the layer to its offscreen canvas.
		*/
		render() {
			super.render();
			if (!this.settings.display || !this.chart.options.scales.x.display) return;
			updateFont(this.context, this.settings.font);
			this.context.textAlign = "left";
			this.context.fillStyle = this.settings.color;
			for (const [i, value] of this.#labels.entries()) {
				const { fontBoundingBoxAscent: ascent, width } = this.#metrics[i];
				let position = i * this.#gridWidth + this.#offset;
				if (this.chart.options.type === "scatter") position = getScalePosition(this.#values[i], this.#values[0], this.#values.at(-1)) * this.rect.width;
				const labelX = position + this.#gridWidth / 2 - width / 2;
				const labelY = ascent + this.settings.padding;
				this.context.fillText(value, labelX, labelY);
			}
		}
	};

// src/layers/labels-y.js
/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Lays out and renders numeric labels beside the plot.
	*/
	var LabelsY = class extends Layer {
		#gridHeight;
		#labels;
		#metrics;
		#values;
		/**
		* Calculates the layer bounds before continuing layout.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.rect = chartRect.clone();
			if (!this.settings.display || !this.chart.options.scales.y.display) {
				this.rect.width = 0;
				this.rect.height = 0;
				this.#gridHeight = 0;
				next(chartRect);
				return;
			}
			updateFont(this.context, this.settings.font);
			this.#values = this.chart.getScale();
			this.#labels = this.#values.map((value, index) => {
				const formatted = this.settings.callback ? this.settings.callback(value, index) : value;
				return String(formatted);
			});
			this.#metrics = this.#labels.map((label) => measureText(this.context, label));
			const maxWidth = Math.max(0, ...this.#metrics.map((metric) => metric.width));
			this.rect.width = Math.min(chartRect.width / 2, maxWidth + this.settings.padding);
			chartRect.width -= this.rect.width;
			chartRect.x = this.rect.right;
			next(chartRect);
			this.rect.y = chartRect.top;
			this.rect.height = chartRect.height;
			this.#gridHeight = this.rect.height / (this.#labels.length - 1);
		}
		/**
		* Calculates the offscreen canvas bounds.
		*/
		calculateCanvas() {
			super.calculateCanvas();
			this.canvasRect.y -= this.#gridHeight / 2;
			this.canvasRect.height += this.#gridHeight;
		}
		/**
		* Renders the layer to its offscreen canvas.
		*/
		render() {
			super.render();
			if (!this.settings.display || !this.chart.options.scales.y.display) return;
			updateFont(this.context, this.settings.font);
			this.context.textAlign = "right";
			this.context.fillStyle = this.settings.color;
			for (const [i, value] of this.#labels.entries()) {
				const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = this.#metrics[i];
				const labelX = this.rect.width - this.settings.padding;
				const position = getScalePosition(this.#values[i], this.#values[0], this.#values.at(-1));
				const offset = this.rect.y - this.canvasRect.y;
				const labelY = (1 - position) * this.rect.height + offset + (ascent - descent) / 2;
				this.context.fillText(value, labelX, labelY);
			}
		}
	};

// src/layers/legend.js
/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Lays out dataset keys in horizontal rows or vertical columns.
	*/
	var Legend = class extends Layer {
		#cols;
		#lineHeight;
		#rows;
		#spacing;
		/**
		* Calculates the layer bounds before continuing layout.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.rect = chartRect.clone();
			if (!this.settings.display) {
				next(chartRect);
				return;
			}
			updateFont(this.context, this.settings.labels.font);
			this.#spacing = measureText(this.context, " ").width;
			this.#lineHeight = this.settings.labels.font.lineHeight * this.settings.labels.font.size;
			this.#rows = [];
			this.#cols = [];
			const vertical = ["left", "right"].includes(this.settings.position);
			const availableWidth = vertical ? this.rect.width / 2 : this.rect.width;
			const availableHeight = vertical ? this.rect.height : this.rect.height / 2;
			const maxWidth = Math.min(this.settings.maxWidth ?? availableWidth, availableWidth);
			const maxHeight = Math.min(this.settings.maxHeight ?? availableHeight, availableHeight);
			let datasets = this.chart.getData();
			if (["pie", "donut"].includes(this.chart.options.type)) {
				const labels = this.chart.getLabels();
				datasets = datasets.flatMap((dataset) => {
					return labels.map((label, index) => ({
						...dataset,
						label,
						backgroundColor: [dataset.backgroundColor[index % dataset.backgroundColor.length]],
						borderColor: [dataset.borderColor[index % dataset.borderColor.length]]
					}));
				});
			}
			const labelWidth = maxWidth - this.settings.labels.boxWidth - this.#spacing;
			const labels = datasets.map((dataset) => {
				return wrapLines(this.context, dataset.label, labelWidth);
			});
			switch (this.settings.position) {
				case "top":
				case "bottom":
					this.#calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight);
					break;
				case "right":
				case "left": this.#calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight);
			}
			next(chartRect);
		}
		/**
		* Renders the layer to its offscreen canvas.
		*/
		render() {
			if (!this.settings.display) return;
			super.render();
			updateFont(this.context, this.settings.labels.font);
			this.context.textAlign = "left";
			switch (this.settings.position) {
				case "top":
				case "bottom":
					this.#renderHorizontal();
					break;
				case "right":
				case "left": this.#renderVertical();
			}
		}
		/**
		* Arranges legend items into horizontal rows.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {object[]} datasets The datasets.
		* @param {string[][]} labels The wrapped labels.
		* @param {number} maxWidth The maximum width.
		* @param {number} maxHeight The maximum height.
		*/
		#calculateHorizontal(chartRect, datasets, labels, maxWidth, maxHeight) {
			let height = 0;
			let row = {
				width: 0,
				height: 0,
				labels: []
			};
			const rows = [];
			const addRow = (row) => {
				if (!row.labels.length) return true;
				if (row.width > maxWidth) return false;
				if (height + row.height + (rows.length ? this.settings.labels.padding : 0) > maxHeight) return false;
				rows.push(row);
				height += row.height + (rows.length > 1 ? this.settings.labels.padding : 0);
				return true;
			};
			for (const [i, lines] of labels.entries()) {
				const metrics = lines.map((line) => measureText(this.context, line));
				const labelHeight = lines.length * this.#lineHeight;
				const labelWidth = Math.max(0, ...metrics.map((metric) => metric.width));
				const legendHeight = Math.max(this.settings.labels.boxHeight, labelHeight);
				const legendWidth = this.settings.labels.boxWidth + labelWidth + this.#spacing;
				const label = {
					dataset: datasets[i],
					lines,
					metrics
				};
				if (row.width + legendWidth + (row.width ? this.settings.labels.padding : 0) > maxWidth) {
					if (addRow(row) === false) {
						row = null;
						break;
					}
					row = {
						width: legendWidth,
						height: legendHeight,
						labels: [label]
					};
					continue;
				}
				if (row.width) row.width += this.settings.labels.padding;
				row.width += legendWidth;
				row.height = Math.max(row.height, legendHeight);
				row.labels.push(label);
			}
			if (row && row.width && row.height) addRow(row);
			const rectWidth = Math.max(0, ...rows.map((row) => row.width));
			const rectHeight = rows.reduce((acc, v) => acc + v.height, 0) + this.settings.labels.padding * Math.max(0, rows.length - 1);
			const padding = rows.length ? Math.min(this.settings.labels.padding, chartRect.height - rectHeight) : 0;
			this.#rows = rows;
			switch (this.settings.align) {
				case "center":
					this.rect.x += (this.rect.width - rectWidth) / 2;
					break;
				case "right":
				case "end": this.rect.x = this.rect.right - rectWidth;
			}
			this.rect.width = rectWidth;
			this.rect.height = rectHeight;
			switch (this.settings.position) {
				case "top":
					chartRect.y += this.rect.height + padding;
					break;
				case "bottom": this.rect.y = chartRect.bottom - this.rect.height;
			}
			chartRect.height -= this.rect.height + padding;
		}
		/**
		* Arranges legend items into vertical columns.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {object[]} datasets The datasets.
		* @param {string[][]} labels The wrapped labels.
		* @param {number} maxWidth The maximum width.
		* @param {number} maxHeight The maximum height.
		*/
		#calculateVertical(chartRect, datasets, labels, maxWidth, maxHeight) {
			let width = 0;
			let col = {
				width: 0,
				height: 0,
				labels: []
			};
			const cols = [];
			const addCol = (col) => {
				if (!col.labels.length) return true;
				if (col.height > maxHeight) return false;
				if (width + col.width + (cols.length ? this.settings.labels.padding : 0) > maxWidth) return false;
				cols.push(col);
				width += col.width + (cols.length > 1 ? this.settings.labels.padding : 0);
				return true;
			};
			for (const [i, lines] of labels.entries()) {
				const metrics = lines.map((line) => measureText(this.context, line));
				const labelHeight = lines.length * this.#lineHeight;
				const labelWidth = Math.max(0, ...metrics.map((metric) => metric.width));
				const legendHeight = Math.max(this.settings.labels.boxHeight, labelHeight);
				const legendWidth = this.settings.labels.boxWidth + labelWidth + this.#spacing;
				const label = {
					dataset: datasets[i],
					lines,
					metrics,
					width: legendWidth
				};
				if (col.height + legendHeight + (col.height ? this.settings.labels.padding : 0) > maxHeight) {
					if (addCol(col) === false) {
						col = null;
						break;
					}
					col = {
						width: legendWidth,
						height: legendHeight,
						labels: [label]
					};
					continue;
				}
				if (col.height) col.height += this.settings.labels.padding;
				col.width = Math.max(col.width, legendWidth);
				col.height += legendHeight;
				col.labels.push(label);
			}
			if (col && col.width && col.height) addCol(col);
			const rectWidth = cols.reduce((acc, v) => acc + v.width, 0) + this.settings.labels.padding * Math.max(0, cols.length - 1);
			const rectHeight = Math.max(0, ...cols.map((col) => col.height));
			const padding = cols.length ? Math.min(this.settings.labels.padding, chartRect.width - rectWidth) : 0;
			this.#cols = cols;
			switch (this.settings.align) {
				case "center":
					this.rect.y += (this.rect.height - rectHeight) / 2;
					break;
				case "right":
				case "end": this.rect.y = this.rect.bottom - rectHeight;
			}
			this.rect.width = rectWidth;
			this.rect.height = rectHeight;
			switch (this.settings.position) {
				case "right":
					this.rect.x = chartRect.right - this.rect.width;
					break;
				case "left": chartRect.x += this.rect.width + padding;
			}
			chartRect.width -= this.rect.width + padding;
		}
		/**
		* Renders the horizontal legend rows.
		*/
		#renderHorizontal() {
			let x;
			let y = 0;
			for (const row of this.#rows) {
				x = 0;
				switch (this.settings.labels.textAlign) {
					case "center":
						x += (this.rect.width - row.width) / 2;
						break;
					case "right":
					case "end": x = this.rect.width - row.width;
				}
				for (const label of row.labels) {
					let labelY = y;
					const labelHeight = label.lines.length * this.#lineHeight;
					if (labelHeight < this.settings.labels.boxHeight) labelY += (this.settings.labels.boxHeight - labelHeight) / 2;
					const boxX = x;
					const boxY = labelY + (labelHeight - this.settings.labels.boxHeight) / 2;
					const boxPath = new Path2D();
					boxPath.rect(boxX, boxY, this.settings.labels.boxWidth, this.settings.labels.boxHeight);
					this.context.fillStyle = label.dataset.backgroundColor[0];
					this.context.strokeStyle = label.dataset.borderColor[0];
					this.context.fill(boxPath);
					if (label.dataset.borderWidth) {
						this.context.lineWidth = label.dataset.borderWidth;
						this.context.stroke(boxPath);
					}
					x += this.settings.labels.boxWidth + this.#spacing;
					const labelX = x;
					this.context.fillStyle = this.settings.labels.color;
					for (const [i, line] of label.lines.entries()) {
						const metric = label.metrics[i];
						this.context.fillText(line, labelX, labelY + metric.fontBoundingBoxAscent);
						labelY += this.#lineHeight;
					}
					x += Math.max(0, ...label.metrics.map((metric) => metric.width)) + this.settings.labels.padding;
				}
				y += row.height + this.settings.labels.padding;
			}
		}
		/**
		* Renders the vertical legend columns.
		*/
		#renderVertical() {
			let x = 0;
			let y;
			for (const col of this.#cols) {
				y = 0;
				for (const label of col.labels) {
					const labelHeight = label.lines.length * this.#lineHeight;
					let boxX = x;
					const boxY = y + (labelHeight - this.settings.labels.boxHeight) / 2;
					switch (this.settings.labels.textAlign) {
						case "center":
							boxX += (col.width - label.width) / 2;
							break;
						case "right":
						case "end": boxX += col.width - label.width;
					}
					const boxPath = new Path2D();
					boxPath.rect(boxX, boxY, this.settings.labels.boxWidth, this.settings.labels.boxHeight);
					this.context.fillStyle = label.dataset.backgroundColor[0];
					this.context.strokeStyle = label.dataset.borderColor[0];
					this.context.fill(boxPath);
					if (label.dataset.borderWidth) {
						this.context.lineWidth = label.dataset.borderWidth;
						this.context.stroke(boxPath);
					}
					this.context.fillStyle = this.settings.labels.color;
					const labelX = boxX + this.settings.labels.boxWidth + this.#spacing;
					let labelY = y;
					for (const [i, line] of label.lines.entries()) {
						const { fontBoundingBoxAscent: ascent } = label.metrics[i];
						this.context.fillText(line, labelX, labelY + ascent);
						labelY += this.#lineHeight;
					}
					y += Math.max(labelHeight, this.settings.labels.boxHeight) + this.settings.labels.padding;
				}
				x += col.width + this.settings.labels.padding;
			}
		}
	};

// src/layers/title.js
/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Lays out and renders the chart title along any edge.
	*/
	var Title = class extends Layer {
		#lineHeight;
		#lines;
		#metrics;
		/**
		* Calculates the layer bounds before continuing layout.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.rect = chartRect.clone();
			if (!this.settings.display) {
				next(chartRect);
				return;
			}
			updateFont(this.context, this.settings.font);
			const maxWidth = ["right", "left"].includes(this.settings.position) ? this.rect.height : this.rect.width;
			this.#lines = wrapLines(this.context, this.settings.text, maxWidth);
			this.#metrics = this.#lines.map((line) => measureText(this.context, line));
			this.#lineHeight = this.settings.font.lineHeight * this.settings.font.size;
			const available = ["right", "left"].includes(this.settings.position) ? chartRect.width : chartRect.height;
			const height = Math.min(this.#lines.length * this.#lineHeight, available / 2);
			const padding = Math.min(this.settings.padding, Math.max(0, available - height));
			switch (this.settings.position) {
				case "top":
					this.rect.height = height;
					chartRect.height -= height + padding;
					chartRect.y += height + padding;
					break;
				case "right":
					this.rect.width = height;
					this.rect.x = chartRect.right - height;
					chartRect.width -= height + padding;
					break;
				case "bottom":
					this.rect.height = height;
					this.rect.y = chartRect.bottom - height;
					chartRect.height -= height + padding;
					break;
				case "left":
					this.rect.width = height;
					chartRect.width -= height + padding;
					chartRect.x += height + padding;
			}
			next(chartRect);
		}
		/**
		* Renders the layer to its offscreen canvas.
		*/
		render() {
			if (!this.settings.display) return;
			super.render();
			updateFont(this.context, this.settings.font);
			this.context.textAlign = this.settings.align === "start" ? "left" : this.settings.align;
			this.context.fillStyle = this.settings.color;
			let x = 0;
			let y = 0;
			switch (this.settings.position) {
				case "top":
				case "bottom":
					switch (this.settings.align) {
						case "center":
							x = this.rect.width / 2;
							break;
						case "end":
						case "right": x = this.rect.width;
					}
					break;
				case "right": x = this.rect.width;
			}
			switch (this.settings.position) {
				case "right":
				case "left": switch (this.settings.align) {
					case "center":
						y = this.rect.height / 2;
						break;
					case "start":
					case "left": y = this.rect.height;
				}
			}
			for (const [i, line] of this.#lines.entries()) {
				const { fontBoundingBoxAscent: ascent } = this.#metrics[i];
				let lineX = x;
				let lineY = y;
				switch (this.settings.position) {
					case "top":
					case "bottom":
						lineY += ascent;
						break;
					case "right":
						lineX -= ascent;
						break;
					case "left": lineX += ascent;
				}
				this.context.save();
				this.context.translate(lineX, lineY);
				switch (this.settings.position) {
					case "right":
						this.context.rotate(Math.PI / 2);
						break;
					case "left": this.context.rotate(-Math.PI / 2);
				}
				this.context.fillText(line, 0, 0);
				this.context.restore();
				switch (this.settings.position) {
					case "top":
					case "bottom":
						y += this.#lineHeight;
						break;
					case "right":
						x -= this.#lineHeight;
						break;
					case "left": x += this.#lineHeight;
				}
			}
		}
	};

// src/layers/tooltip.js
/**
	* Renders the hovered item's label and value above the other chart layers.
	*/
	var Tooltip = class extends Layer {
		/**
		* Uses the full outer rectangle so tooltips are not clipped to the plot.
		*/
		calculateCanvas() {
			this.canvasRect = this.chart.outerRect;
		}
		/**
		* Draws the active item near the pointer or in the upper-right corner.
		*/
		render() {
			super.render();
			if (!this.settings.display || !this.active) return;
			updateFont(this.context, this.settings.font);
			const { padding, font } = this.settings;
			const maxWidth = Math.max(0, this.canvasRect.width - padding * 2);
			const text = `${this.active.label}\n${this.active.datasetLabel}: ${formatValue(this.active.value)}`;
			const lines = wrapLines(this.context, text, maxWidth);
			const lineHeight = font.size * font.lineHeight;
			const textWidth = Math.max(0, ...lines.map((line) => measureText(this.context, line).width));
			const width = Math.min(this.canvasRect.width, textWidth + padding * 2);
			const height = Math.min(this.canvasRect.height, lines.length * lineHeight + padding * 2);
			const pointerX = this.active.x - this.canvasRect.x;
			const pointerY = this.active.y - this.canvasRect.y;
			let x = Math.max(0, Math.min(pointerX + 10, this.canvasRect.width - width));
			let y = Math.max(0, Math.min(pointerY + 10, this.canvasRect.height - height));
			if (this.settings.position === "fixed") {
				x = this.canvasRect.width - width;
				y = 0;
			}
			this.context.fillStyle = this.settings.backgroundColor;
			this.context.fillRect(x, y, width, height);
			this.context.fillStyle = this.settings.color;
			this.context.textBaseline = "middle";
			for (const [index, line] of lines.entries()) {
				const lineY = y + padding + (index + .5) * lineHeight;
				this.context.fillText(line, x + padding, lineY);
			}
		}
	};

// src/options.js
/**
	* Merges option objects, cloning arrays instead of merging their entries.
	* @param {...object} sources The option sources in precedence order.
	* @returns {object} The merged options.
	*/
	function mergeOptions(...sources) {
		const options = {};
		for (const source of sources) {
			if (source == null) continue;
			for (const [key, value] of Object.entries(source)) {
				if ([
					"__proto__",
					"constructor",
					"prototype"
				].includes(key)) continue;
				if (Array.isArray(value)) options[key] = value.map((item) => {
					return item && typeof item === "object" ? mergeOptions(item) : item;
				});
				else if (value && typeof value === "object") options[key] = mergeOptions(options[key], value);
				else options[key] = value;
			}
		}
		return options;
	}
	/**
	* Validates a nonnegative numeric option.
	* @param {number} value The supplied value.
	* @param {string} name The option path used in the error message.
	*/
	function validateDimension(value, name) {
		if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite, nonnegative number.`);
	}
	/**
	* Validates the resolved font used by a chart layer.
	* @param {object} font The font settings.
	* @param {string} name The option path used in the error message.
	*/
	function validateFont(font, name) {
		if (!Number.isFinite(font.size) || font.size <= 0) throw new RangeError(`${name}.size must be a positive, finite number.`);
		if (!Number.isFinite(font.lineHeight) || font.lineHeight <= 0) throw new RangeError(`${name}.lineHeight must be a positive, finite number.`);
		if (typeof font.family !== "string" || !font.family.trim()) throw new TypeError(`${name}.family must be a nonempty string.`);
	}
	/**
	* Validates the layout settings shared by titles and legends.
	* @param {object} settings The layer settings.
	* @param {string} name The option path used in the error message.
	*/
	function validatePosition(settings, name) {
		const positions = [
			"top",
			"right",
			"bottom",
			"left"
		];
		const alignments = [
			"start",
			"center",
			"end",
			"left",
			"right"
		];
		if (!positions.includes(settings.position)) throw new TypeError(`${name}.position must be top, right, bottom, or left.`);
		if (!alignments.includes(settings.align)) throw new TypeError(`${name}.align must be start, center, end, left, or right.`);
	}
	/**
	* Validates an axis and resolves its tick font.
	* @param {object} axis The axis settings.
	* @param {object} font The base chart font.
	* @param {string} name The option path used in validation errors.
	*/
	function validateAxis(axis, font, name) {
		if (!axis?.grid || !axis.ticks) throw new TypeError(`${name} requires grid and ticks settings.`);
		validateDimension(axis.grid.tickLength, `${name}.grid.tickLength`);
		validateDimension(axis.grid.lineWidth, `${name}.grid.lineWidth`);
		validateDimension(axis.grid.borderWidth, `${name}.grid.borderWidth`);
		validateDimension(axis.ticks.padding, `${name}.ticks.padding`);
		const callback = axis.ticks.callback;
		if (callback != null && typeof callback !== "function") throw new TypeError(`${name}.ticks.callback must be a function.`);
		axis.ticks.font = mergeOptions(font, axis.ticks.font);
		validateFont(axis.ticks.font, `${name}.ticks.font`);
	}
	/**
	* Validates merged options and resolves the fonts inherited by each layer.
	* @param {object} options The merged chart options.
	* @returns {object} The validated options with resolved fonts.
	*/
	function normalizeOptions(options) {
		if (![
			"bar",
			"line",
			"area",
			"pie",
			"donut",
			"scatter"
		].includes(options.type)) throw new TypeError("Chart type must be bar, line, area, pie, donut, or scatter.");
		if (!options.font || !options.title || !options.legend?.labels || !options.tooltip) throw new TypeError("Chart options require font, title, legend, and tooltip settings.");
		validateFont(options.font, "font");
		validateDimension(options.layout?.padding, "layout.padding");
		validateDimension(options.animation?.duration, "animation.duration");
		if (![
			"linear",
			"easeOutQuad",
			"easeInOutQuad"
		].includes(options.animation.easing)) throw new TypeError("Animation easing must be linear, easeOutQuad, or easeInOutQuad.");
		if (!Number.isFinite(options.cutout) || options.cutout < 0 || options.cutout >= 1) throw new RangeError("Donut cutout must be at least zero and less than one.");
		if (!["cursor", "fixed"].includes(options.tooltip.position)) throw new TypeError("Tooltip position must be cursor or fixed.");
		validatePosition(options.title, "title");
		validateDimension(options.title.padding, "title.padding");
		options.title.font = mergeOptions(options.font, options.title.font);
		validateFont(options.title.font, "title.font");
		validatePosition(options.legend, "legend");
		validateDimension(options.legend.labels.padding, "legend.labels.padding");
		validateDimension(options.legend.labels.boxWidth, "legend.labels.boxWidth");
		validateDimension(options.legend.labels.boxHeight, "legend.labels.boxHeight");
		options.legend.labels.font = mergeOptions(options.font, options.legend.labels.font);
		validateFont(options.legend.labels.font, "legend.labels.font");
		if (options.legend.maxWidth != null) validateDimension(options.legend.maxWidth, "legend.maxWidth");
		if (options.legend.maxHeight != null) validateDimension(options.legend.maxHeight, "legend.maxHeight");
		validateAxis(options.scales?.x, options.font, "scales.x");
		validateAxis(options.scales?.y, options.font, "scales.y");
		validateDimension(options.tooltip.padding, "tooltip.padding");
		options.tooltip.font = mergeOptions(options.font, options.tooltip.font);
		validateFont(options.tooltip.font, "tooltip.font");
		return options;
	}

// src/rect.js
/**
	* Stores a rectangle used during chart layout.
	*/
	var Rect = class Rect {
		/**
		* Creates a Rect.
		* @param {number} x The X position.
		* @param {number} y The Y position.
		* @param {number} width The width.
		* @param {number} height The height.
		*/
		constructor(x = 0, y = 0, width = 0, height = 0) {
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
		}
		/**
		* Gets the bottom position.
		* @returns {number} The bottom position.
		*/
		get bottom() {
			return this.y + this.height;
		}
		/**
		* Gets the center X position.
		* @returns {number} The center X position.
		*/
		get centerX() {
			return this.x + this.width / 2;
		}
		/**
		* Gets the center Y position.
		* @returns {number} The center Y position.
		*/
		get centerY() {
			return this.y + this.height / 2;
		}
		/**
		* Gets the left position.
		* @returns {number} The left position.
		*/
		get left() {
			return this.x;
		}
		/**
		* Gets the right position.
		* @returns {number} The right position.
		*/
		get right() {
			return this.x + this.width;
		}
		/**
		* Gets the top position.
		* @returns {number} The top position.
		*/
		get top() {
			return this.y;
		}
		/**
		* Creates an independent copy of the rectangle.
		* @returns {Rect} A new Rect.
		*/
		clone() {
			return new Rect(this.x, this.y, this.width, this.height);
		}
	};

// src/chart.js
/**
	* @import { ChartData, ChartDataset } from './data.js';
	*/
	/**
	* @typedef {object} ChartOptions
	* @property {'bar'|'line'|'area'|'pie'|'donut'|'scatter'} [type='bar'] The chart type.
	* @property {ChartData} [data] The category labels and datasets.
	* @property {object} [font] The font inherited by chart layers.
	* @property {object} [title] The title text, position, and appearance.
	* @property {object} [legend] The legend position, bounds, and labels.
	* @property {object} [scales] The x and y grid and tick settings.
	* @property {object} [layout] The outer chart padding.
	* @property {object} [animation] The animation duration and easing curve.
	* @property {number} [cutout=.6] The donut's inner radius as a fraction of its outer radius.
	* @property {object} [tooltip] The tooltip visibility, font, and colors.
	* @property {boolean} [responsive=true] Whether to observe container size changes.
	* @property {string} [ariaLabel='Chart'] The accessible chart description prefix.
	*/
	/**
	* Composes canvas layers to render Cartesian and circular charts.
	*/
	var Chart = class Chart {
		static Area = LineChart;
		static Bar = BarChart;
		/**
		* @type {ChartOptions}
		*/
		static defaults = {
			type: "bar",
			data: {
				labels: [],
				datasets: []
			},
			animation: {
				duration: 300,
				easing: "easeOutQuad"
			},
			cutout: .6,
			responsive: true,
			ariaLabel: "Chart",
			tooltip: {
				display: true,
				padding: 8,
				position: "cursor",
				backgroundColor: "#000",
				color: "#fff",
				font: {}
			},
			font: {
				family: "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
				size: 12,
				weight: "normal",
				lineHeight: 1.2
			},
			title: {
				display: true,
				text: "Title",
				padding: 10,
				font: {
					size: 18,
					weight: "bold"
				},
				color: "#000",
				position: "top",
				align: "center"
			},
			legend: {
				display: true,
				position: "top",
				align: "center",
				maxHeight: null,
				maxWidth: null,
				labels: {
					boxWidth: 20,
					boxHeight: 12,
					font: {},
					padding: 10,
					color: "#000",
					textAlign: "center"
				}
			},
			scales: {
				x: {
					display: true,
					grid: {
						display: true,
						drawBorder: true,
						borderColor: "#000",
						borderWidth: 1,
						lineColor: "#aaa",
						lineWidth: 1,
						tickLength: 8
					},
					ticks: {
						display: true,
						font: {},
						padding: 5,
						color: "#000",
						callback: null,
						drawTicks: true
					}
				},
				y: {
					display: true,
					grid: {
						display: true,
						drawBorder: true,
						borderColor: "#000",
						borderWidth: 1,
						lineColor: "#aaa",
						lineWidth: 1,
						tickLength: 8
					},
					ticks: {
						display: true,
						font: {},
						padding: 5,
						color: "#000",
						callback: null,
						drawTicks: true,
						tickColor: "#aaa"
					}
				}
			},
			layout: { padding: 20 }
		};
		static Donut = PieChart;
		static Grid = Grid;
		static Layer = Layer;
		static Legend = Legend;
		static Line = LineChart;
		static Pie = PieChart;
		static Rect = Rect;
		static Scatter = LineChart;
		static Title = Title;
		static Tooltip = Tooltip;
		static #instances = /* @__PURE__ */ new WeakMap();
		#canvas = null;
		#context = null;
		#data = null;
		#eventsController = null;
		#frame = null;
		#height = 0;
		#inputOptions = null;
		#layers = {};
		#node = null;
		#observer = null;
		#outerRect = null;
		#pixelRatio = 1;
		#progress = 1;
		#scale = [0, 1];
		#scaleX = [0, 1];
		#settings = null;
		#width = 0;
		#window = null;
		/**
		* Gets the existing chart for a container or creates one.
		* @param {HTMLElement} node The chart container.
		* @param {ChartOptions} [options] The options for a new chart.
		* @returns {Chart} The existing or newly created chart.
		*/
		static init(node, options) {
			return Chart.#instances.get(node) || new this(node, options);
		}
		/**
		* Creates a Chart in an HTML container.
		* @param {HTMLElement} node The chart container.
		* @param {ChartOptions} [options] The chart options.
		* @throws {TypeError} When the node, options, or data are invalid.
		*/
		constructor(node, options) {
			const view = node?.ownerDocument?.defaultView;
			if (!view || !(node instanceof view.HTMLElement) || node.matches("canvas, input, img")) throw new TypeError("Chart must be created on an HTML container element.");
			if (Chart.#instances.has(node)) throw new Error("This container already has a chart. Use Chart.init() to reuse it.");
			this.#node = node;
			this.#window = view;
			try {
				this.#inputOptions = mergeOptions(this.constructor.defaults, options);
				this.#settings = normalizeOptions(mergeOptions(this.#inputOptions));
				this.#data = normalizeData(this.#settings.data, this.#settings.type);
				this.#canvas = node.ownerDocument.createElement("canvas");
				this.#canvas.setAttribute("role", "img");
				this.#canvas.style.display = "block";
				this.#canvas.style.maxWidth = "100%";
				this.#context = this.#canvas.getContext("2d");
				if (!this.#context) throw new Error("Chart requires a canvas 2D context.");
				this.node.append(this.#canvas);
				this.#build();
				this.#events();
				this.resize();
				this.#updateDescription();
				this.run();
				Chart.#instances.set(node, this);
			} catch (error) {
				this.dispose();
				throw error;
			}
		}
		/**
		* Gets the chart container.
		* @returns {HTMLElement|null} The container, or null after disposal.
		*/
		get node() {
			return this.#node;
		}
		/**
		* Gets a copy of the effective options and current data.
		* @returns {ChartOptions|null} The options, or null after disposal.
		*/
		get options() {
			if (!this.node) return null;
			return Object.freeze(mergeOptions(this.#settings, { data: this.#data }));
		}
		/**
		* Gets the bounds shared by the chart's layout layers.
		* @returns {Rect} A copy of the outer rectangle.
		*/
		get outerRect() {
			return this.#outerRect.clone();
		}
		/**
		* Gets the backing resolution used by the chart and its layers.
		* @returns {number} The device pixel ratio.
		*/
		get pixelRatio() {
			return this.#pixelRatio;
		}
		/**
		* Calculates layer bounds and data geometry using the current dimensions.
		*/
		calculate() {
			if (!this.node) return;
			const padding = Math.min(this.#settings.layout.padding, this.#width / 2, this.#height / 2);
			const maxSteps = Math.floor(this.#height / (this.#settings.font.size * 2.5));
			this.#outerRect = new Rect(padding, padding, Math.max(0, this.#width - padding * 2), Math.max(0, this.#height - padding * 2));
			this.#scale = createScale(this.getValues(), maxSteps);
			if (this.#settings.type === "scatter") {
				const maxStepsX = Math.floor(this.#width / (this.#settings.font.size * 5));
				this.#scaleX = createScale(this.getValues("x"), maxStepsX);
			}
			const layers = Object.values(this.#layers);
			const chartRect = this.#outerRect.clone();
			const next = (rect) => {
				const layer = layers.shift();
				if (layer) layer.calculate(rect, next);
			};
			next(chartRect);
			for (const layer of Object.values(this.#layers)) {
				layer.calculateCanvas();
				layer.update();
			}
			this.#layers.chart.data();
		}
		/**
		* Releases animation frames, observers, generated markup, and registration.
		*/
		dispose() {
			if (!this.node) return;
			this.#stop();
			this.#eventsController?.abort();
			this.#observer?.disconnect();
			this.#canvas?.remove();
			Chart.#instances.delete(this.#node);
			this.#canvas = null;
			this.#context = null;
			this.#data = null;
			this.#eventsController = null;
			this.#inputOptions = null;
			this.#layers = {};
			this.#node = null;
			this.#observer = null;
			this.#settings = null;
			this.#window = null;
		}
		/**
		* Composites the rendered layers onto the visible canvas.
		*/
		draw() {
			if (!this.node) return;
			this.#context.clearRect(0, 0, this.#width, this.#height);
			for (const layer of Object.values(this.#layers)) layer.draw(this.#context);
		}
		/**
		* Gets independent copies of the normalized datasets.
		* @returns {ChartDataset[]} The datasets.
		*/
		getData() {
			return this.#data ? mergeOptions(this.#data).datasets : [];
		}
		/**
		* Gets a copy of the category labels.
		* @returns {string[]} The labels.
		*/
		getLabels() {
			return this.#data ? [...this.#data.labels] : [];
		}
		/**
		* Gets a copy of the calculated numeric scale.
		* @param {string} [axis='y'] The numeric axis; x is used by scatter charts.
		* @returns {number[]} The scale ticks.
		*/
		getScale(axis = "y") {
			return [...axis === "x" ? this.#scaleX : this.#scale];
		}
		/**
		* Gets the upper scale boundary.
		* @param {string} [axis='y'] The numeric axis.
		* @returns {number} The maximum tick value.
		*/
		getScaleMax(axis = "y") {
			return (axis === "x" ? this.#scaleX : this.#scale).at(-1);
		}
		/**
		* Gets the lower scale boundary.
		* @param {string} [axis='y'] The numeric axis.
		* @returns {number} The minimum tick value.
		*/
		getScaleMin(axis = "y") {
			return (axis === "x" ? this.#scaleX : this.#scale)[0];
		}
		/**
		* Gets the numeric values from all datasets.
		* @param {string} [axis='y'] The coordinate to read for scatter data.
		* @returns {number[]} The dataset values.
		*/
		getValues(axis = "y") {
			if (!this.#data) return [];
			const values = this.#data.datasets.flatMap((dataset) => dataset.data);
			return this.#settings.type === "scatter" ? values.map((point) => point[axis]) : values;
		}
		/**
		* Renders the layers at their final positions without starting an animation.
		*/
		render() {
			if (!this.node) return;
			this.#stop();
			this.#clearActive();
			this.#progress = 1;
			for (const layer of Object.values(this.#layers)) layer.render();
			this.draw();
		}
		/**
		* Measures the container and updates the visible and offscreen canvases.
		*/
		resize() {
			if (!this.node) return;
			this.#canvas.style.display = "none";
			const style = this.#window.getComputedStyle(this.node);
			const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
			const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
			const width = Math.max(0, this.node.clientWidth - horizontalPadding);
			const height = Math.max(0, this.node.clientHeight - verticalPadding) || 300;
			const pixelRatio = Math.max(1, this.#window.devicePixelRatio || 1);
			this.#canvas.style.display = "block";
			if (width === this.#width && height === this.#height && pixelRatio === this.#pixelRatio) return;
			this.#width = width;
			this.#height = height;
			this.#pixelRatio = pixelRatio;
			this.#canvas.width = Math.round(width * pixelRatio);
			this.#canvas.height = Math.round(height * pixelRatio);
			this.#canvas.style.width = `${width}px`;
			this.#canvas.style.height = `${height}px`;
			this.#context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			this.calculate();
			this.render();
		}
		/**
		* Animates the chart layer using elapsed time and a single pending frame.
		*/
		run() {
			if (!this.node) return;
			this.#stop();
			const duration = this.#window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : this.#settings.animation.duration;
			if (!duration || !this.getValues().length) {
				this.render();
				return;
			}
			const start = this.#window.performance.now();
			const tick = (now) => {
				this.#frame = null;
				if (!this.node) return;
				const elapsed = now - start;
				const progress = Math.min(1, Math.max(0, elapsed / duration));
				this.#progress = ease(progress, this.#settings.animation.easing);
				this.#layers.chart.render(this.#progress);
				this.draw();
				if (progress < 1) this.#frame = this.#window.requestAnimationFrame(tick);
			};
			this.#progress = 0;
			this.#layers.chart.render(0);
			this.draw();
			this.#frame = this.#window.requestAnimationFrame(tick);
		}
		/**
		* Replaces chart data after validating the entire update.
		* @param {ChartData} [data] The new data; defaults to the current data.
		*/
		setData(data = this.#data) {
			if (!this.node) return;
			const normalized = normalizeData(data, this.#settings.type);
			this.#data = normalized;
			this.update();
		}
		/**
		* Merges changed settings and rebuilds the affected layers.
		* @param {ChartOptions} [settings={}] The changed settings.
		*/
		setSettings(settings = {}) {
			if (!this.node) return;
			const inputOptions = mergeOptions(this.#inputOptions, settings);
			const options = normalizeOptions(mergeOptions(inputOptions));
			const data = normalizeData(settings.data ?? this.#data, options.type);
			this.#stop();
			this.#inputOptions = inputOptions;
			this.#settings = options;
			this.#data = data;
			this.#build();
			if (this.#settings.responsive) this.resize();
			this.update();
		}
		/**
		* Recalculates data, refreshes the layers, and starts the configured animation.
		*/
		update() {
			if (!this.node) return;
			this.calculate();
			this.render();
			this.#updateDescription();
			this.run();
		}
		/**
		* Creates the original title, legend, axes, chart, and tooltip layers.
		*/
		#build() {
			this.#layers = {
				title: new Title(this, this.#settings.title),
				legend: new Legend(this, this.#settings.legend)
			};
			if (!["pie", "donut"].includes(this.#settings.type)) {
				this.#layers.ticksX = new LabelsX(this, this.#settings.scales.x.ticks);
				this.#layers.ticksY = new LabelsY(this, this.#settings.scales.y.ticks);
				this.#layers.grid = new Grid(this, this.#settings.scales);
			}
			switch (this.#settings.type) {
				case "bar":
					this.#layers.chart = new BarChart(this, this.#settings.scales);
					break;
				case "line":
				case "area":
				case "scatter":
					this.#layers.chart = new LineChart(this, this.#settings.scales);
					break;
				case "pie":
				case "donut": this.#layers.chart = new PieChart(this, this.#settings.scales);
			}
			this.#layers.tooltip = new Tooltip(this, this.#settings.tooltip);
		}
		/**
		* Clears pointer state before a data, layout, or settings update.
		*/
		#clearActive() {
			this.#layers.chart.setActive(null);
			this.#layers.tooltip.setActive(null);
			this.#canvas.removeAttribute("aria-description");
		}
		/**
		* Registers pointer events and responsive sizing until disposal.
		*/
		#events() {
			this.#eventsController = new this.#window.AbortController();
			const { signal } = this.#eventsController;
			this.#canvas.addEventListener("pointermove", (event) => {
				const rect = this.#canvas.getBoundingClientRect();
				if (!rect.width || !rect.height) return;
				const x = (event.clientX - rect.left) * this.#width / rect.width;
				const y = (event.clientY - rect.top) * this.#height / rect.height;
				const item = this.#layers.chart.hitTest(x, y);
				this.#setActive(item);
			}, { signal });
			this.#canvas.addEventListener("pointerleave", () => {
				this.#setActive(null);
			}, { signal });
			this.#window.addEventListener("resize", () => {
				if (this.#settings.responsive) this.resize();
			}, { signal });
			if (this.#window.ResizeObserver) {
				this.#observer = new this.#window.ResizeObserver(() => {
					if (this.#settings.responsive) this.resize();
				});
				this.#observer.observe(this.node);
			}
		}
		/**
		* Updates the tooltip and pie highlight for the current pointer position.
		* @param {object|null} item The hovered data item.
		*/
		#setActive(item) {
			this.#layers.chart.setActive(item);
			this.#layers.tooltip.setActive(item);
			this.#layers.tooltip.render();
			if (["pie", "donut"].includes(this.#settings.type)) this.#layers.chart.render(this.#progress);
			if (item && this.#settings.tooltip.display) this.#canvas.setAttribute("aria-description", `${item.label}. ${item.datasetLabel}: ${formatValue(item.value)}`);
			else this.#canvas.removeAttribute("aria-description");
			this.draw();
		}
		/**
		* Cancels the pending animation frame.
		*/
		#stop() {
			if (this.#frame != null) {
				this.#window.cancelAnimationFrame(this.#frame);
				this.#frame = null;
			}
		}
		/**
		* Provides the chart's labels and values as accessible fallback text.
		*/
		#updateDescription() {
			const datasets = this.#data.datasets.map((dataset) => {
				const values = dataset.data.map((value, index) => {
					return `${this.#data.labels[index] ?? `Point ${index + 1}`} ${formatValue(value)}`;
				});
				return `${dataset.label}: ${values.join(", ")}`;
			});
			const title = this.#settings.title.text || this.#settings.type;
			const description = `${this.#settings.ariaLabel}. ${title}. ${datasets.join("; ")}`;
			this.#canvas.setAttribute("aria-label", description);
			this.#canvas.textContent = description;
		}
	};

// src/index.js
	var src_default = Chart;

return src_default;
});
//# sourceMappingURL=frost-charts.js.map