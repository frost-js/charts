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
	* @property {number} [fillOpacity=.2] The area or radar fill opacity; polar area defaults to .75.
	*/
	/**
	* @typedef {object} ChartData
	* @property {Array<string|number>} [labels] Category labels; optional point labels for scatter charts.
	* @property {ChartDataset[]} datasets The chart datasets.
	*/
	var defaultColors = [
		"#6366f1",
		"#14b8a6",
		"#f59e0b",
		"#ec4899",
		"#8b5cf6",
		"#0ea5e9",
		"#f97316",
		"#84cc16",
		"#06b6d4",
		"#a855f7",
		"#e11d48",
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
			if ([
				"pie",
				"donut",
				"polarArea",
				"radar"
			].includes(type) && value < 0) throw new RangeError(`Dataset ${index} circular and radial values must be nonnegative.`);
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
		const fillOpacity = dataset.fillOpacity ?? (type === "polarArea" ? .75 : .2);
		if (!Number.isFinite(borderWidth) || borderWidth < 0) throw new RangeError(`Dataset ${index} borderWidth must be a finite, nonnegative number.`);
		if (!Number.isFinite(pointRadius) || pointRadius < 0) throw new RangeError(`Dataset ${index} pointRadius must be a finite, nonnegative number.`);
		if (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1) throw new RangeError(`Dataset ${index} fillOpacity must be between zero and one.`);
		const circular = [
			"pie",
			"donut",
			"polarArea"
		].includes(type);
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
	* @param {boolean} [stacked=false] Whether bar values will be summed.
	* @returns {ChartData} The independent, normalized chart data.
	*/
	function normalizeData(data, type, stacked = false) {
		if (!data || !Array.isArray(data.datasets)) throw new TypeError("Chart data requires a datasets array.");
		const inputLabels = type === "scatter" ? data.labels ?? [] : data.labels;
		if (!Array.isArray(inputLabels)) throw new TypeError("Chart labels must be an array.");
		const labels = Array.from(inputLabels, (label) => String(label));
		const datasets = Array.from(data.datasets, (dataset, index) => {
			return normalizeDataset(dataset, index, labels.length, type);
		});
		if (type === "bar" && stacked) for (let index = 0; index < labels.length; index++) {
			let positive = 0;
			let negative = 0;
			for (const dataset of datasets) {
				const value = dataset.data[index];
				if (value < 0) negative += value;
				else positive += value;
			}
			if (!Number.isFinite(positive) || !Number.isFinite(negative)) throw new RangeError("Stack totals must be finite numbers.");
		}
		return {
			labels,
			datasets
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
			if (!hit) return null;
			return {
				...hit.data,
				x,
				y,
				anchorX: hit.data.anchorX == null ? x : this.#canvasRect.x + hit.data.anchorX,
				anchorY: hit.data.anchorY == null ? y : this.#canvasRect.y + hit.data.anchorY
			};
		}
		/**
		* Clears the entire offscreen layer before rendering.
		*/
		render() {
			this.#hitRegions = [];
			const ratio = this.#chart.pixelRatio;
			this.#context.clearRect(0, 0, this.#canvas.width / ratio, this.#canvas.height / ratio);
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
	* Renders grouped or stacked bars in either orientation.
	*/
	var BarChart = class extends Layer {
		#baseline = 0;
		#horizontal = false;
		#oldRects = /* @__PURE__ */ new Map();
		#rects = /* @__PURE__ */ new Map();
		#renderedRects = /* @__PURE__ */ new Map();
		/**
		* Calculates bar rectangles and retains visible geometry for transitions.
		*/
		data() {
			const { orientation, stacked } = this.chart.options;
			const labels = this.chart.getLabels();
			const datasets = this.chart.getData();
			const visible = datasets.map((dataset, index) => index).filter((index) => this.chart.isDatasetVisible(index));
			this.#horizontal = orientation === "horizontal";
			const categorySize = this.#horizontal ? this.rect.height : this.rect.width;
			const valueSize = this.#horizontal ? this.rect.width : this.rect.height;
			const groupSize = categorySize / Math.max(1, labels.length);
			const count = stacked ? 1 : visible.length;
			const spacing = Math.min(5, groupSize / (count + 1) / 2);
			const thickness = Math.max(0, (groupSize - spacing * (count + 1)) / Math.max(1, count));
			const min = this.chart.getScaleMin();
			const max = this.chart.getScaleMax();
			const position = (value) => {
				const fraction = getScalePosition(value, min, max);
				return valueSize * (this.#horizontal ? fraction : 1 - fraction);
			};
			this.#baseline = position(0);
			this.#oldRects = this.#renderedRects;
			this.#rects = /* @__PURE__ */ new Map();
			for (const [index, label] of labels.entries()) {
				let positive = 0;
				let negative = 0;
				for (const [slot, datasetIndex] of visible.entries()) {
					if (!this.chart.isDataVisible(datasetIndex, index)) continue;
					const dataset = datasets[datasetIndex];
					const value = dataset.data[index];
					let start = 0;
					if (stacked) {
						start = value < 0 ? negative : positive;
						if (value < 0) negative += value;
						else positive += value;
					}
					const first = position(start);
					const last = position(start + value);
					const offset = stacked ? 0 : slot * (thickness + spacing);
					const category = index * groupSize + spacing + offset;
					const length = Math.abs(last - first);
					const near = Math.min(first, last);
					this.#rects.set(`${datasetIndex}:${index}`, {
						x: this.#horizontal ? near : category,
						y: this.#horizontal ? category : near,
						width: this.#horizontal ? length : thickness,
						height: this.#horizontal ? thickness : length,
						end: last,
						backgroundColor: getColor(dataset, "backgroundColor", index),
						borderColor: getColor(dataset, "borderColor", index),
						borderWidth: dataset.borderWidth,
						label,
						datasetLabel: dataset.label,
						datasetIndex,
						index,
						value
					});
				}
			}
		}
		/**
		* Renders visible rectangles and attaches tooltips to their value ends.
		* @param {number} [progress=1] The elapsed animation fraction.
		*/
		render(progress = 1) {
			super.render();
			const keys = /* @__PURE__ */ new Set([...this.#rects.keys(), ...this.#oldRects.keys()]);
			this.#renderedRects = /* @__PURE__ */ new Map();
			for (const key of keys) {
				const target = this.#rects.get(key);
				const previous = this.#oldRects.get(key);
				if (!target && progress === 1) continue;
				const next = target || this.#collapse(previous);
				const old = previous || this.#collapse(next);
				const item = { ...next };
				for (const property of [
					"x",
					"y",
					"width",
					"height",
					"end"
				]) item[property] = old[property] + (next[property] - old[property]) * progress;
				this.#renderedRects.set(key, item);
				const path = new Path2D();
				path.rect(item.x, item.y, item.width, item.height);
				this.context.fillStyle = item.backgroundColor;
				this.context.fill(path);
				if (item.borderWidth) {
					this.context.strokeStyle = item.borderColor;
					this.context.lineWidth = item.borderWidth;
					this.context.stroke(path);
				}
				if (target && item.width && item.height) {
					let placement = item.value < 0 ? "bottom" : "top";
					if (this.#horizontal) placement = item.value < 0 ? "left" : "right";
					this.addHitRegion(path, {
						...item,
						placement,
						anchorX: this.#horizontal ? item.end : item.x + item.width / 2,
						anchorY: this.#horizontal ? item.y + item.height / 2 : item.end
					});
				}
			}
		}
		/**
		* Collapses a bar to the current zero baseline while retaining its category.
		* @param {object} item The bar geometry.
		* @returns {object} The collapsed geometry.
		*/
		#collapse(item) {
			const collapsed = {
				...item,
				end: this.#baseline
			};
			if (this.#horizontal) {
				collapsed.x = this.#baseline;
				collapsed.width = 0;
			} else {
				collapsed.y = this.#baseline;
				collapsed.height = 0;
			}
			return collapsed;
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
				if (!this.chart.isDatasetVisible(datasetIndex)) {
					this.#points.push(points);
					continue;
				}
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
					this.addHitRegion(hit, {
						...item,
						anchorX: x,
						anchorY: y
					});
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
					angle: total && this.chart.isDataVisible(datasetIndex, index) ? value / largest / total * Math.PI * 2 : 0,
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
					if (target && target.angle) {
						const anchorRadius = (innerRadius + radius) / 2;
						this.addHitRegion(path, {
							...target,
							anchorX: x + Math.cos(middle) * anchorRadius,
							anchorY: y + Math.sin(middle) * anchorRadius
						});
					}
					start += angle;
				}
				this.#renderedSlices.push(rendered);
			}
		}
	};

// src/charts/polar-area.js
/**
	* Renders equal-angle sectors whose radius represents each value.
	*/
	var PolarAreaChart = class extends Layer {
		#oldSectors = /* @__PURE__ */ new Map();
		#renderedSectors = /* @__PURE__ */ new Map();
		#sectors = /* @__PURE__ */ new Map();
		/**
		* Calculates target radii and angles for the visible data items.
		*/
		data() {
			const labels = this.chart.getLabels();
			const values = this.chart.getValues();
			const angle = values.length ? Math.PI * 2 / values.length : 0;
			const radius = this.rect.width / 2;
			const maximum = this.chart.getScaleMax();
			let start = -Math.PI / 2;
			this.#oldSectors = this.#renderedSectors;
			this.#sectors = /* @__PURE__ */ new Map();
			for (const [datasetIndex, dataset] of this.chart.getData().entries()) for (const [index, value] of dataset.data.entries()) {
				if (!this.chart.isDataVisible(datasetIndex, index)) continue;
				this.#sectors.set(`${datasetIndex}:${index}`, {
					start,
					angle,
					radius: radius * getScalePosition(value, 0, maximum),
					backgroundColor: getColor(dataset, "backgroundColor", index),
					borderColor: getColor(dataset, "borderColor", index),
					borderWidth: dataset.borderWidth,
					fillOpacity: dataset.fillOpacity,
					label: labels[index],
					datasetLabel: dataset.label,
					datasetIndex,
					index,
					value
				});
				start += angle;
			}
		}
		/**
		* Interpolates sector radii and angles and registers visible hit regions.
		* @param {number} [progress=1] The elapsed animation fraction.
		*/
		render(progress = 1) {
			super.render();
			const centerX = this.rect.width / 2;
			const centerY = this.rect.height / 2;
			const keys = /* @__PURE__ */ new Set([...this.#sectors.keys(), ...this.#oldSectors.keys()]);
			this.#renderedSectors = /* @__PURE__ */ new Map();
			for (const key of keys) {
				const target = this.#sectors.get(key);
				const previous = this.#oldSectors.get(key);
				if (!target && progress === 1) continue;
				const next = target || {
					...previous,
					radius: 0,
					angle: 0
				};
				const old = previous || {
					...next,
					radius: 0
				};
				const item = { ...next };
				for (const property of [
					"start",
					"angle",
					"radius"
				]) item[property] = old[property] + (next[property] - old[property]) * progress;
				this.#renderedSectors.set(key, item);
				if (!item.radius || !item.angle) continue;
				const path = new Path2D();
				path.moveTo(centerX, centerY);
				path.arc(centerX, centerY, item.radius, item.start, item.start + item.angle);
				path.closePath();
				this.context.save();
				this.context.globalAlpha = item.fillOpacity;
				this.context.fillStyle = item.backgroundColor;
				this.context.fill(path);
				this.context.restore();
				if (item.borderWidth) {
					this.context.strokeStyle = item.borderColor;
					this.context.lineWidth = item.borderWidth;
					this.context.stroke(path);
				}
				if (this.active?.datasetIndex === item.datasetIndex && this.active.index === item.index) {
					this.context.fillStyle = "rgba(255,255,255,.3)";
					this.context.fill(path);
				}
				if (target) {
					const middle = item.start + item.angle / 2;
					this.addHitRegion(path, {
						...item,
						anchorX: centerX + Math.cos(middle) * item.radius * .65,
						anchorY: centerY + Math.sin(middle) * item.radius * .65
					});
				}
			}
		}
	};

// src/charts/radar.js
/**
	* Connects each dataset around shared radial category axes.
	*/
	var RadarChart = class extends Layer {
		#oldPoints = [];
		#points = [];
		#renderedPoints = [];
		/**
		* Includes point radii and borders beyond the outer radial guide.
		*/
		calculateCanvas() {
			this.canvasRect = this.chart.outerRect;
		}
		/**
		* Calculates radial targets while retaining the last visible positions.
		*/
		data() {
			const labels = this.chart.getLabels();
			const radius = this.rect.width / 2;
			const maximum = this.chart.getScaleMax();
			const centerX = this.rect.centerX - this.canvasRect.x;
			const centerY = this.rect.centerY - this.canvasRect.y;
			this.#oldPoints = this.#renderedPoints;
			this.#points = this.chart.getData().map((dataset, datasetIndex) => {
				if (!this.chart.isDatasetVisible(datasetIndex)) return [];
				return dataset.data.map((value, index) => {
					const angle = index * Math.PI * 2 / labels.length - Math.PI / 2;
					const distance = radius * getScalePosition(value, 0, maximum);
					return {
						x: centerX + Math.cos(angle) * distance,
						y: centerY + Math.sin(angle) * distance,
						backgroundColor: getColor(dataset, "backgroundColor", index),
						borderColor: getColor(dataset, "borderColor", index),
						borderWidth: dataset.borderWidth,
						pointRadius: dataset.pointRadius,
						fillOpacity: dataset.fillOpacity,
						label: labels[index],
						datasetLabel: dataset.label,
						datasetIndex,
						index,
						value
					};
				});
			});
		}
		/**
		* Interpolates each polygon from its visible positions or the radial center.
		* @param {number} [progress=1] The elapsed animation fraction.
		*/
		render(progress = 1) {
			super.render();
			const centerX = this.rect.centerX - this.canvasRect.x;
			const centerY = this.rect.centerY - this.canvasRect.y;
			const count = Math.max(this.#points.length, this.#oldPoints.length);
			this.#renderedPoints = [];
			for (let datasetIndex = 0; datasetIndex < count; datasetIndex++) {
				const targets = this.#points[datasetIndex] || [];
				const previous = this.#oldPoints[datasetIndex] || [];
				const points = [];
				for (let index = 0; index < Math.max(targets.length, previous.length); index++) {
					const target = targets[index];
					const old = previous[index];
					if (!target && progress === 1) continue;
					const next = target || {
						...old,
						x: centerX,
						y: centerY,
						pointRadius: 0
					};
					const start = old || {
						...next,
						x: centerX,
						y: centerY,
						pointRadius: 0
					};
					points.push({
						...next,
						x: start.x + (next.x - start.x) * progress,
						y: start.y + (next.y - start.y) * progress,
						pointRadius: start.pointRadius + (next.pointRadius - start.pointRadius) * progress,
						interactive: Boolean(target)
					});
				}
				this.#renderedPoints.push(points);
			}
			for (const points of this.#renderedPoints) {
				if (points.length < 3) continue;
				const path = this.#polygon(points);
				this.context.save();
				this.context.globalAlpha = points[0].fillOpacity;
				this.context.fillStyle = points[0].backgroundColor;
				this.context.fill(path);
				this.context.restore();
			}
			for (const points of this.#renderedPoints) this.#renderSeries(points);
		}
		/**
		* Connects the visible points into a closed polygon.
		* @param {object[]} points The interpolated points.
		* @returns {Path2D} The polygon path.
		*/
		#polygon(points) {
			const path = new Path2D();
			for (const [index, point] of points.entries()) if (index) path.lineTo(point.x, point.y);
			else path.moveTo(point.x, point.y);
			path.closePath();
			return path;
		}
		/**
		* Draws the polygon outline and interactive points.
		* @param {object[]} points The interpolated points.
		*/
		#renderSeries(points) {
			if (!points.length) return;
			if (points[0].borderWidth) {
				this.context.strokeStyle = points[0].borderColor;
				this.context.lineWidth = points[0].borderWidth;
				this.context.stroke(this.#polygon(points));
			}
			for (const point of points) {
				const path = new Path2D();
				const hit = new Path2D();
				path.arc(point.x, point.y, point.pointRadius, 0, Math.PI * 2);
				this.context.fillStyle = point.backgroundColor;
				this.context.fill(path);
				if (point.interactive) {
					hit.arc(point.x, point.y, Math.max(6, point.pointRadius), 0, Math.PI * 2);
					this.addHitRegion(hit, {
						...point,
						anchorX: point.x,
						anchorY: point.y
					});
				}
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
		#horizontal;
		#labelsX;
		#labelsY;
		#numericX;
		#plotRect;
		/**
		* Reserves tick space before calculating the plot.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.rect = chartRect.clone();
			const { type, orientation } = this.chart.options;
			this.#horizontal = type === "bar" && orientation === "horizontal";
			this.#numericX = type === "scatter" || this.#horizontal;
			this.#labelsX = this.#numericX ? this.chart.getScale("x") : this.chart.getLabels();
			this.#labelsY = this.#horizontal ? this.chart.getLabels() : this.chart.getScale();
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
			if (this.#numericX) {
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
			if (this.#horizontal) return this.#plotRect.top + (index + .5) * this.#plotRect.height / Math.max(1, this.#labelsY.length);
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

// src/layers/labels-r.js
/**
	* Draws centered radial scale numbers above the data fills.
	*/
	var LabelsR = class extends Layer {
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
			if (!this.settings.display || !this.chart.options.scales.r.display) return;
			const ticks = this.chart.getScale();
			const maximum = this.chart.getScaleMax();
			const radius = this.rect.width / 2;
			const centerX = this.rect.centerX - this.canvasRect.x;
			const centerY = this.rect.centerY - this.canvasRect.y;
			updateFont(this.context, this.settings.font);
			this.context.fillStyle = this.settings.color;
			this.context.textAlign = "center";
			this.context.textBaseline = "middle";
			for (const [index, value] of ticks.entries()) {
				if (!value) continue;
				const distance = radius * getScalePosition(value, 0, maximum);
				const text = this.settings.callback ? this.settings.callback(value, index) : value;
				this.context.fillText(String(text), centerX, centerY - distance);
			}
		}
	};

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
		#numeric;
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
			const { type, orientation } = this.chart.options;
			this.#numeric = type === "scatter" || type === "bar" && orientation === "horizontal";
			this.#values = this.#numeric ? this.chart.getScale("x") : this.chart.getLabels();
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
			if (type === "bar" && !this.#numeric) {
				this.#gridWidth = chartRect.width / Math.max(1, this.#labels.length);
				this.#offset = this.#gridWidth / 2;
			} else {
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
				if (this.#numeric) position = getScalePosition(this.#values[i], this.#values[0], this.#values.at(-1)) * this.rect.width;
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
		#categorical;
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
			const { type, orientation } = this.chart.options;
			this.#categorical = type === "bar" && orientation === "horizontal";
			this.#values = this.#categorical ? this.chart.getLabels() : this.chart.getScale();
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
			this.#gridHeight = this.rect.height / Math.max(1, this.#labels.length - 1);
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
				const position = this.#categorical ? 1 - (i + .5) / this.#values.length : getScalePosition(this.#values[i], this.#values[0], this.#values.at(-1));
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
		* Gets the visible legend entries in reading order.
		* @returns {object[]} The dataset or slice keys.
		*/
		get items() {
			if (!this.settings.display) return [];
			return ((["top", "bottom"].includes(this.settings.position) ? this.#rows : this.#cols) || []).flatMap((group) => group.labels.map((label) => label.dataset));
		}
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
			let datasets = this.chart.getData().map((dataset, datasetIndex) => ({
				...dataset,
				datasetIndex,
				visible: this.chart.isDatasetVisible(datasetIndex)
			}));
			if ([
				"pie",
				"donut",
				"polarArea"
			].includes(this.chart.options.type)) {
				const labels = this.chart.getLabels();
				datasets = datasets.flatMap((dataset) => {
					return labels.map((label, index) => ({
						...dataset,
						label,
						index,
						visible: this.chart.isDataVisible(dataset.datasetIndex, index),
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
			super.render();
			if (!this.settings.display) return;
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
			let y = 0;
			for (const row of this.#rows) {
				let x = 0;
				switch (this.settings.labels.textAlign) {
					case "center":
						x = (this.rect.width - row.width) / 2;
						break;
					case "right":
					case "end": x = this.rect.width - row.width;
				}
				for (const label of row.labels) {
					const textWidth = Math.max(0, ...label.metrics.map((metric) => metric.width));
					const width = this.settings.labels.boxWidth + this.#spacing + textWidth;
					this.#renderLabel(label, x, y, width, row.height);
					x += width + this.settings.labels.padding;
				}
				y += row.height + this.settings.labels.padding;
			}
		}
		/**
		* Draws a legend swatch, label, hidden state, and interactive hit area.
		* @param {object} label The wrapped legend entry.
		* @param {number} x The left edge.
		* @param {number} y The top edge.
		* @param {number} width The item width.
		* @param {number} height The item height.
		*/
		#renderLabel(label, x, y, width, height) {
			const { dataset, lines, metrics } = label;
			const { boxWidth, boxHeight, color } = this.settings.labels;
			const textX = x + boxWidth + this.#spacing;
			const textY = y + (height - lines.length * this.#lineHeight) / 2;
			const box = new Path2D();
			box.rect(x, y + (height - boxHeight) / 2, boxWidth, boxHeight);
			this.context.save();
			this.context.globalAlpha = dataset.visible ? 1 : .4;
			this.context.fillStyle = dataset.backgroundColor[0];
			this.context.fill(box);
			if (dataset.borderWidth) {
				this.context.lineWidth = dataset.borderWidth;
				this.context.strokeStyle = dataset.borderColor[0];
				this.context.stroke(box);
			}
			this.context.fillStyle = color;
			for (const [index, line] of lines.entries()) {
				const baseline = textY + index * this.#lineHeight + metrics[index].fontBoundingBoxAscent;
				this.context.fillText(line, textX, baseline);
				if (!dataset.visible) {
					const middle = baseline - this.settings.labels.font.size / 3;
					this.context.beginPath();
					this.context.moveTo(textX, middle);
					this.context.lineTo(textX + metrics[index].width, middle);
					this.context.strokeStyle = color;
					this.context.lineWidth = 1;
					this.context.stroke();
				}
			}
			this.context.restore();
			const hit = new Path2D();
			hit.rect(x, y, width, height);
			this.addHitRegion(hit, dataset);
			if (this.active?.datasetIndex === dataset.datasetIndex && this.active.index === dataset.index) {
				this.context.strokeStyle = color;
				this.context.lineWidth = 1;
				this.context.stroke(hit);
			}
		}
		/**
		* Renders the vertical legend columns with a shared label edge.
		*/
		#renderVertical() {
			let x = 0;
			for (const col of this.#cols) {
				let y = 0;
				for (const label of col.labels) {
					const height = Math.max(label.lines.length * this.#lineHeight, this.settings.labels.boxHeight);
					let labelX = x;
					switch (this.settings.labels.textAlign) {
						case "center":
							labelX += (col.width - label.width) / 2;
							break;
						case "right":
						case "end": labelX += col.width - label.width;
					}
					this.#renderLabel(label, labelX, y, label.width, height);
					y += height + this.settings.labels.padding;
				}
				x += col.width + this.settings.labels.padding;
			}
		}
	};

// src/layers/radial-grid.js
/**
	* @import Rect from '../rect.js';
	*/
	/**
	* Reserves a circular plot and draws radial guides and category labels.
	*/
	var RadialGrid = class extends Layer {
		#labels = [];
		#plotRect;
		/**
		* Centers a square plot while reserving room for the surrounding labels.
		* @param {Rect} chartRect The remaining chart rectangle.
		* @param {Function} next The next layout callback.
		*/
		calculate(chartRect, next) {
			this.rect = chartRect.clone();
			const labels = this.chart.getLabels();
			this.#labels = labels;
			if (this.chart.options.type === "polarArea") this.#labels = this.chart.getData().flatMap((dataset, datasetIndex) => {
				return labels.filter((label, index) => this.chart.isDataVisible(datasetIndex, index));
			});
			let paddingX = 0;
			let paddingY = 0;
			if (this.settings.display && this.settings.ticks.display) {
				const font = this.settings.ticks.font;
				paddingY = Math.min(chartRect.height / 4, font.size * font.lineHeight / 2);
			}
			if (this.settings.display && this.settings.labels.display) {
				const { font, padding } = this.settings.labels;
				updateFont(this.context, font);
				const widths = this.#labels.map((label) => measureText(this.context, label).width);
				paddingX = Math.min(chartRect.width / 4, Math.max(0, ...widths) + padding);
				paddingY = Math.min(chartRect.height / 4, font.size * font.lineHeight + padding);
			}
			const size = Math.max(0, Math.min(chartRect.width - paddingX * 2, chartRect.height - paddingY * 2));
			chartRect.x += (chartRect.width - size) / 2;
			chartRect.y += (chartRect.height - size) / 2;
			chartRect.width = size;
			chartRect.height = size;
			this.#plotRect = chartRect.clone();
			next(chartRect);
		}
		/**
		* Includes category labels outside the circular plot.
		*/
		calculateCanvas() {
			this.canvasRect = this.chart.outerRect;
		}
		/**
		* Draws polygon guides for radar or circular guides for polar area charts.
		*/
		render() {
			super.render();
			if (!this.settings.display) return;
			const radar = this.chart.options.type === "radar";
			const ticks = this.chart.getScale();
			const maximum = this.chart.getScaleMax();
			const radius = this.#plotRect.width / 2;
			const centerX = this.#plotRect.centerX - this.canvasRect.x;
			const centerY = this.#plotRect.centerY - this.canvasRect.y;
			this.context.save();
			this.context.translate(centerX, centerY);
			this.context.strokeStyle = this.settings.grid.lineColor;
			this.context.lineWidth = this.settings.grid.lineWidth || 1;
			for (const value of ticks) {
				if (!value) continue;
				const distance = radius * getScalePosition(value, 0, maximum);
				if (this.settings.grid.display && this.settings.grid.lineWidth) this.#renderRing(distance, radar);
			}
			if (radar && this.settings.grid.display && this.settings.grid.lineWidth) for (let index = 0; index < this.#labels.length; index++) {
				const angle = index * Math.PI * 2 / this.#labels.length - Math.PI / 2;
				this.context.beginPath();
				this.context.moveTo(0, 0);
				this.context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
				this.context.stroke();
			}
			this.context.restore();
			if (this.settings.labels.display) this.#renderLabels(centerX, centerY, radius, radar);
		}
		/**
		* Draws category labels around the radial plot with outward alignment.
		* @param {number} centerX The local center x coordinate.
		* @param {number} centerY The local center y coordinate.
		* @param {number} radius The plot radius.
		* @param {boolean} radar Whether labels align with spokes instead of sectors.
		*/
		#renderLabels(centerX, centerY, radius, radar) {
			const { font, padding, color } = this.settings.labels;
			updateFont(this.context, font);
			this.context.fillStyle = color;
			for (const [index, label] of this.#labels.entries()) {
				const angle = (index + (radar ? 0 : .5)) * Math.PI * 2 / this.#labels.length - Math.PI / 2;
				const cosine = Math.cos(angle);
				const sine = Math.sin(angle);
				const x = centerX + cosine * (radius + padding);
				const y = centerY + sine * (radius + padding);
				this.context.textAlign = cosine > 0 ? "left" : "right";
				this.context.textBaseline = sine > 0 ? "top" : "bottom";
				let available = cosine > 0 ? this.canvasRect.width - x : x;
				if (Math.abs(cosine) < .01) {
					this.context.textAlign = "center";
					available = this.canvasRect.width;
				}
				if (Math.abs(sine) < .01) this.context.textBaseline = "middle";
				this.context.fillText(label, x, y, Math.max(1, available));
			}
		}
		/**
		* Draws a single radial scale ring.
		* @param {number} radius The ring radius.
		* @param {boolean} polygon Whether to connect the radar spokes.
		*/
		#renderRing(radius, polygon) {
			this.context.beginPath();
			if (polygon && this.#labels.length >= 3) {
				for (let index = 0; index < this.#labels.length; index++) {
					const angle = index * Math.PI * 2 / this.#labels.length - Math.PI / 2;
					const x = Math.cos(angle) * radius;
					const y = Math.sin(angle) * radius;
					if (index) this.context.lineTo(x, y);
					else this.context.moveTo(x, y);
				}
				this.context.closePath();
			} else this.context.arc(0, 0, radius, 0, Math.PI * 2);
			this.context.stroke();
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
	* Renders a rounded tooltip beside the pointer or anchored to a data mark.
	*/
	var Tooltip = class extends Layer {
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
			if (!this.settings.display || !this.active || !this.canvasRect.width || !this.canvasRect.height) return;
			updateFont(this.context, this.settings.font);
			const { padding, font } = this.settings;
			const maxWidth = Math.max(0, this.canvasRect.width - padding * 2);
			const text = `${this.active.label}\n${this.active.datasetLabel}: ${formatValue(this.active.value)}`;
			const lines = wrapLines(this.context, text, maxWidth);
			const lineHeight = font.size * font.lineHeight;
			const textWidth = Math.max(0, ...lines.map((line) => measureText(this.context, line).width));
			const width = Math.min(this.canvasRect.width, textWidth + padding * 2);
			const height = Math.min(this.canvasRect.height, lines.length * lineHeight + padding * 2);
			const fixed = this.settings.position === "fixed";
			const anchorX = (fixed ? this.active.anchorX : this.active.x) - this.canvasRect.x;
			const anchorY = (fixed ? this.active.anchorY : this.active.y) - this.canvasRect.y;
			const preferred = fixed ? this.active.placement || "top" : "top";
			const { x, y, side } = this.#place(width, height, anchorX, anchorY, preferred);
			const radius = Math.min(this.settings.borderRadius, width / 2, height / 2);
			const path = new Path2D();
			path.roundRect(x, y, width, height, radius);
			this.#addArrow(path, {
				x,
				y,
				width,
				height,
				radius,
				side,
				anchorX,
				anchorY
			});
			this.context.fillStyle = this.settings.backgroundColor;
			this.context.fill(path);
			this.context.save();
			this.context.beginPath();
			this.context.roundRect(x, y, width, height, radius);
			this.context.clip();
			this.context.fillStyle = this.settings.color;
			this.context.textBaseline = "middle";
			for (const [index, line] of lines.entries()) {
				const lineY = y + padding + (index + .5) * lineHeight;
				this.context.fillText(line, x + padding, lineY);
			}
			this.context.restore();
		}
		/**
		* Adds a small pointer to the same fill path, avoiding overlapping opacity.
		* @param {Path2D} path The tooltip outline.
		* @param {object} bounds The body bounds and anchor position.
		*/
		#addArrow(path, bounds) {
			const { x, y, width, height, radius, side, anchorX, anchorY } = bounds;
			const vertical = side === "top" || side === "bottom";
			const length = vertical ? width : height;
			const size = Math.min(this.settings.arrowSize, Math.max(0, length / 2 - radius));
			if (!size) return;
			const start = vertical ? x : y;
			const anchor = vertical ? anchorX : anchorY;
			const center = Math.max(start + radius + size, Math.min(anchor, start + length - radius - size));
			if (vertical) {
				const edge = side === "top" ? y + height : y;
				const tip = edge + (side === "top" ? size : -size);
				path.moveTo(center - size, edge);
				path.lineTo(center, tip);
				path.lineTo(center + size, edge);
			} else {
				const edge = side === "left" ? x + width : x;
				const tip = edge + (side === "left" ? size : -size);
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
		* @param {string} preferred The preferred side of the anchor.
		* @returns {object} The body position and chosen side.
		*/
		#place(width, height, anchorX, anchorY, preferred) {
			const gap = this.settings.arrowSize + 6;
			const opposite = {
				top: "bottom",
				bottom: "top",
				left: "right",
				right: "left"
			};
			const candidates = {
				top: {
					x: anchorX - width / 2,
					y: anchorY - height - gap
				},
				bottom: {
					x: anchorX - width / 2,
					y: anchorY + gap
				},
				right: {
					x: anchorX + gap,
					y: anchorY - height / 2
				},
				left: {
					x: anchorX - width - gap,
					y: anchorY - height / 2
				}
			};
			const sides = [
				preferred,
				opposite[preferred],
				"top",
				"bottom",
				"right",
				"left"
			];
			const maxX = this.canvasRect.width - width;
			const maxY = this.canvasRect.height - height;
			for (const side of sides) {
				const candidate = candidates[side];
				if (side === "top" || side === "bottom" ? candidate.y >= 0 && candidate.y <= maxY : candidate.x >= 0 && candidate.x <= maxX) return {
					x: Math.max(0, Math.min(candidate.x, maxX)),
					y: Math.max(0, Math.min(candidate.y, maxY)),
					side
				};
			}
			const candidate = candidates[preferred];
			return {
				x: Math.max(0, Math.min(candidate.x, maxX)),
				y: Math.max(0, Math.min(candidate.y, maxY)),
				side: preferred
			};
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
			"scatter",
			"polarArea",
			"radar"
		].includes(options.type)) throw new TypeError("Chart type must be bar, line, area, pie, donut, scatter, polarArea, or radar.");
		if (!options.font || !options.title || !options.legend?.labels || !options.tooltip) throw new TypeError("Chart options require font, title, legend, and tooltip settings.");
		if (!["vertical", "horizontal"].includes(options.orientation)) throw new TypeError("Bar orientation must be vertical or horizontal.");
		if (typeof options.stacked !== "boolean" || typeof options.legend.interactive !== "boolean") throw new TypeError("Stacked and legend.interactive must be booleans.");
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
		const radial = options.scales.r;
		if (!radial?.grid || !radial.ticks || !radial.labels) throw new TypeError("scales.r requires grid, ticks, and labels settings.");
		validateDimension(radial.grid.lineWidth, "scales.r.grid.lineWidth");
		validateDimension(radial.labels.padding, "scales.r.labels.padding");
		if (radial.ticks.callback != null && typeof radial.ticks.callback !== "function") throw new TypeError("scales.r.ticks.callback must be a function.");
		for (const name of ["ticks", "labels"]) {
			radial[name].font = mergeOptions(options.font, radial[name].font);
			validateFont(radial[name].font, `scales.r.${name}.font`);
		}
		validateDimension(options.tooltip.padding, "tooltip.padding");
		validateDimension(options.tooltip.borderRadius, "tooltip.borderRadius");
		validateDimension(options.tooltip.arrowSize, "tooltip.arrowSize");
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
	* @property {'bar'|'line'|'area'|'pie'|'donut'|'scatter'|'polarArea'|'radar'} [type='bar'] The chart type.
	* @property {ChartData} [data] The category labels and datasets.
	* @property {'vertical'|'horizontal'} [orientation='vertical'] The bar direction.
	* @property {boolean} [stacked=false] Whether bar datasets share a stack.
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
			orientation: "vertical",
			stacked: false,
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
				padding: 10,
				borderRadius: 6,
				arrowSize: 5,
				position: "cursor",
				backgroundColor: "rgba(24, 28, 36, .92)",
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
				color: "#334155",
				position: "top",
				align: "center"
			},
			legend: {
				display: true,
				interactive: true,
				position: "top",
				align: "center",
				maxHeight: null,
				maxWidth: null,
				labels: {
					boxWidth: 20,
					boxHeight: 12,
					font: {},
					padding: 10,
					color: "#334155",
					textAlign: "start"
				}
			},
			scales: {
				r: {
					display: true,
					grid: {
						display: true,
						lineColor: "#e2e8f0",
						lineWidth: 1
					},
					ticks: {
						display: true,
						font: {},
						color: "#334155",
						callback: null
					},
					labels: {
						display: true,
						font: {},
						color: "#334155",
						padding: 8
					}
				},
				x: {
					display: true,
					grid: {
						display: true,
						drawBorder: true,
						borderColor: "#cbd5e1",
						borderWidth: 1,
						lineColor: "#e2e8f0",
						lineWidth: 1,
						tickLength: 8
					},
					ticks: {
						display: true,
						font: {},
						padding: 5,
						color: "#334155",
						callback: null,
						drawTicks: true
					}
				},
				y: {
					display: true,
					grid: {
						display: true,
						drawBorder: true,
						borderColor: "#cbd5e1",
						borderWidth: 1,
						lineColor: "#e2e8f0",
						lineWidth: 1,
						tickLength: 8
					},
					ticks: {
						display: true,
						font: {},
						padding: 5,
						color: "#334155",
						callback: null,
						drawTicks: true
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
		static PolarArea = PolarAreaChart;
		static Radar = RadarChart;
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
		#hiddenDatasets = /* @__PURE__ */ new Set();
		#hiddenItems = /* @__PURE__ */ new Set();
		#inputOptions = null;
		#layers = {};
		#legendControls = null;
		#node = null;
		#observer = null;
		#outerRect = null;
		#pixelRatio = 1;
		#pointer = null;
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
				this.#data = normalizeData(this.#settings.data, this.#settings.type, this.#settings.stacked);
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
			const horizontal = this.#settings.type === "bar" && this.#settings.orientation === "horizontal";
			const scaleSize = horizontal ? this.#width : this.#height;
			const tickSize = this.#settings.font.size * (horizontal ? 5 : 2.5);
			const maxSteps = ["radar", "polarArea"].includes(this.#settings.type) ? 5 : Math.floor(scaleSize / tickSize);
			this.#outerRect = new Rect(padding, padding, Math.max(0, this.#width - padding * 2), Math.max(0, this.#height - padding * 2));
			const values = this.#settings.type === "bar" && this.#settings.stacked ? this.#getStackTotals() : this.getValues();
			this.#scale = createScale(values, maxSteps);
			this.#scaleX = horizontal ? this.#scale : [0, 1];
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
			this.#legendControls?.remove();
			Chart.#instances.delete(this.#node);
			this.#canvas = null;
			this.#context = null;
			this.#data = null;
			this.#eventsController = null;
			this.#inputOptions = null;
			this.#legendControls = null;
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
			this.#context.clearRect(0, 0, this.#canvas.width / this.#pixelRatio, this.#canvas.height / this.#pixelRatio);
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
		* Gets the numeric values from visible datasets and data items.
		* @param {string} [axis='y'] The coordinate to read for scatter data.
		* @returns {number[]} The dataset values.
		*/
		getValues(axis = "y") {
			if (!this.#data) return [];
			const values = this.#data.datasets.flatMap((dataset, datasetIndex) => {
				return dataset.data.filter((value, index) => this.isDataVisible(datasetIndex, index));
			});
			return this.#settings.type === "scatter" ? values.map((point) => point[axis]) : values;
		}
		/**
		* Checks whether a dataset is enabled.
		* @param {number} index The dataset index.
		* @returns {boolean} Whether the dataset is visible.
		*/
		isDatasetVisible(index) {
			return Boolean(this.#data?.datasets[index]) && !this.#hiddenDatasets.has(index);
		}
		/**
		* Checks whether a data item and its dataset are enabled.
		* @param {number} datasetIndex The dataset index.
		* @param {number} index The item index.
		* @returns {boolean} Whether the item is visible.
		*/
		isDataVisible(datasetIndex, index) {
			const circular = [
				"pie",
				"donut",
				"polarArea"
			].includes(this.#settings?.type);
			return this.#data?.datasets[datasetIndex]?.data[index] != null && this.isDatasetVisible(datasetIndex) && (!circular || !this.#hiddenItems.has(`${datasetIndex}:${index}`));
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
			this.#syncLegendControls();
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
				if (this.#pointer) this.#setActive(this.#layers.chart.hitTest(this.#pointer.x, this.#pointer.y));
				else this.draw();
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
			const normalized = normalizeData(data, this.#settings.type, this.#settings.stacked);
			this.#data = normalized;
			this.#pruneVisibility();
			this.update();
		}
		/**
		* Shows or hides a dataset without removing its values or changing its color.
		* @param {number} index The dataset index.
		* @param {boolean} visible Whether to show the dataset.
		*/
		setDatasetVisibility(index, visible) {
			if (!this.#data?.datasets[index]) return;
			if (visible) this.#hiddenDatasets.delete(index);
			else this.#hiddenDatasets.add(index);
			this.update();
		}
		/**
		* Shows or hides an individual slice in a circular chart.
		* @param {number} datasetIndex The dataset index.
		* @param {number} index The item index.
		* @param {boolean} visible Whether to show the item.
		*/
		setDataVisibility(datasetIndex, index, visible) {
			if (![
				"pie",
				"donut",
				"polarArea"
			].includes(this.#settings?.type) || this.#data?.datasets[datasetIndex]?.data[index] == null) return;
			const key = `${datasetIndex}:${index}`;
			if (visible) this.#hiddenItems.delete(key);
			else this.#hiddenItems.add(key);
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
			const data = normalizeData(settings.data ?? this.#data, options.type, options.stacked);
			this.#stop();
			this.#inputOptions = inputOptions;
			this.#settings = options;
			this.#data = data;
			this.#pruneVisibility();
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
			if (["radar", "polarArea"].includes(this.#settings.type)) this.#layers.grid = new RadialGrid(this, this.#settings.scales.r);
			else if (!["pie", "donut"].includes(this.#settings.type)) {
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
				case "radar":
					this.#layers.chart = new RadarChart(this, this.#settings.scales.r);
					break;
				case "polarArea":
					this.#layers.chart = new PolarAreaChart(this, this.#settings.scales.r);
					break;
				case "pie":
				case "donut": this.#layers.chart = new PieChart(this, this.#settings.scales);
			}
			if (["radar", "polarArea"].includes(this.#settings.type)) this.#layers.ticksR = new LabelsR(this, this.#settings.scales.r.ticks);
			this.#layers.tooltip = new Tooltip(this, this.#settings.tooltip);
		}
		/**
		* Clears pointer state before a data, layout, or settings update.
		*/
		#clearActive() {
			this.#pointer = null;
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
				const point = this.#pointerPosition(event);
				if (!point) return;
				this.#pointer = point;
				const legend = this.#settings.legend.interactive && this.#layers.legend.hitTest(point.x, point.y);
				const item = legend ? null : this.#layers.chart.hitTest(point.x, point.y);
				this.#canvas.style.cursor = legend ? "pointer" : "";
				this.#setActive(item);
			}, { signal });
			this.#canvas.addEventListener("click", (event) => {
				const point = this.#pointerPosition(event);
				if (point && this.#settings.legend.interactive) {
					const item = this.#layers.legend.hitTest(point.x, point.y);
					if (item) this.#toggleLegendItem(item);
				}
			}, { signal });
			this.#canvas.addEventListener("pointerleave", () => {
				this.#pointer = null;
				this.#canvas.style.cursor = "";
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
		* Calculates positive and negative stack extents independently.
		* @returns {number[]} The visible stack totals.
		*/
		#getStackTotals() {
			return this.#data.labels.flatMap((label, index) => {
				let positive = 0;
				let negative = 0;
				for (const [datasetIndex, dataset] of this.#data.datasets.entries()) {
					if (!this.isDataVisible(datasetIndex, index)) continue;
					const value = dataset.data[index];
					if (value < 0) negative += value;
					else positive += value;
				}
				return [negative, positive];
			});
		}
		/**
		* Converts a pointer event to chart-local CSS coordinates.
		* @param {PointerEvent|MouseEvent} event The pointer event.
		* @returns {object|null} The coordinates, or null for a hidden canvas.
		*/
		#pointerPosition(event) {
			const rect = this.#canvas.getBoundingClientRect();
			if (!rect.width || !rect.height) return null;
			return {
				x: (event.clientX - rect.left) * this.#width / rect.width,
				y: (event.clientY - rect.top) * this.#height / rect.height
			};
		}
		/**
		* Drops visibility state for datasets and items removed by a data update.
		*/
		#pruneVisibility() {
			for (const index of this.#hiddenDatasets) if (!this.#data.datasets[index]) this.#hiddenDatasets.delete(index);
			for (const key of this.#hiddenItems) {
				const [datasetIndex, index] = key.split(":").map(Number);
				if (this.#data.datasets[datasetIndex]?.data[index] == null) this.#hiddenItems.delete(key);
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
			if ([
				"pie",
				"donut",
				"polarArea"
			].includes(this.#settings.type)) this.#layers.chart.render(this.#progress);
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
		* Keeps native keyboard and screen-reader controls in step with the canvas legend.
		*/
		#syncLegendControls() {
			const items = this.#settings.legend.display && this.#settings.legend.interactive ? this.#layers.legend.items : [];
			if (!this.#legendControls) {
				this.#legendControls = this.node.ownerDocument.createElement("div");
				this.#legendControls.setAttribute("role", "group");
				this.#legendControls.setAttribute("aria-label", "Chart legend");
				this.#legendControls.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);";
				this.node.append(this.#legendControls);
			}
			for (const [index, item] of items.entries()) {
				let button = this.#legendControls.children[index];
				if (!button) {
					button = this.node.ownerDocument.createElement("button");
					button.type = "button";
					const { signal } = this.#eventsController;
					button.addEventListener("click", () => {
						this.#toggleLegendItem(this.#layers.legend.items[index]);
					}, { signal });
					button.addEventListener("focus", () => {
						this.#layers.legend.setActive(this.#layers.legend.items[index]);
						this.#layers.legend.render();
						this.draw();
					}, { signal });
					button.addEventListener("blur", () => {
						this.#layers.legend.setActive(null);
						this.#layers.legend.render();
						this.draw();
					}, { signal });
					this.#legendControls.append(button);
				}
				button.textContent = item.label;
				button.setAttribute("aria-pressed", String(item.visible));
			}
			while (this.#legendControls.children.length > items.length) this.#legendControls.lastElementChild.remove();
			this.#legendControls.hidden = !items.length;
		}
		/**
		* Toggles the dataset or slice represented by a legend key.
		* @param {object} item The legend item.
		*/
		#toggleLegendItem(item) {
			if (item.index == null) this.setDatasetVisibility(item.datasetIndex, !this.isDatasetVisible(item.datasetIndex));
			else this.setDataVisibility(item.datasetIndex, item.index, !this.isDataVisible(item.datasetIndex, item.index));
		}
		/**
		* Provides the chart's labels and values as accessible fallback text.
		*/
		#updateDescription() {
			const datasets = this.#data.datasets.map((dataset, datasetIndex) => {
				const values = dataset.data.map((value, index) => {
					const label = this.#data.labels[index] ?? `Point ${index + 1}`;
					const hidden = this.isDataVisible(datasetIndex, index) ? "" : " (hidden)";
					return `${label} ${formatValue(value)}${hidden}`;
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