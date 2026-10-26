# Frost Charts

[![CI](https://github.com/frost-js/charts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/charts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/charts/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/charts)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fcharts?style=flat-square)](https://www.npmjs.com/package/@fr0st/charts)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fcharts?style=flat-square)](https://www.npmjs.com/package/@fr0st/charts)
[![JS gzip size](https://img.badgesize.io/frost-js/charts/main/dist/frost-charts.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/charts/blob/main/dist/frost-charts.min.js)
[![license](https://img.shields.io/github/license/frost-js/charts?style=flat-square)](./LICENSE)

Standalone responsive canvas bar, line, area, pie, donut, scatter, polar area, and radar charts.

## Highlights

- Grouped, horizontal, and stacked bars with positive and negative values
- Line and area series, numeric scatter plots, pie and donut slices, and radial charts
- Wrapped titles, configurable axes, and formatted tick labels
- Interactive legends with dataset and slice visibility controls
- Tooltips anchored to data points or following the pointer
- Animated updates with configurable duration, easing, and reduced-motion support
- Responsive sizing and high-DPI rendering
- Accessible chart descriptions and keyboard legend controls
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- No runtime dependencies or required stylesheets
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/charts
```

Frost Charts' package entry point is ESM-only and requires a browser DOM with Canvas 2D support. Import the default `Chart` export in browser projects and bundlers:

```js
import Chart from '@fr0st/charts';
```

A named `Chart` export is also available. Frost Charts has no runtime dependencies and does not require a stylesheet.

### Browser (ESM)

Import the minified ESM bundle directly from a CDN:

```html
<script type="module">
    import Chart from 'https://cdn.jsdelivr.net/npm/@fr0st/charts@latest/dist/frost-charts.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundle from your own copy or a CDN:

```html
<script src="/path/to/dist/frost-charts.min.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/@fr0st/charts@latest/dist/frost-charts.min.js"></script>
<script>
    const { Chart } = globalThis;
</script>
```

The UMD bundle exposes `globalThis.Chart`.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

## Usage

Give the container a height; containers without an intrinsic height use 300 pixels.

```html
<div id="chart" style="height: 400px;"></div>
```

```js
import Chart from '@fr0st/charts';

const chart = Chart.init(document.querySelector('#chart'), {
    type: 'bar',
    title: {
        text: 'Quarterly sales',
    },
    data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
            {
                label: 'Sales',
                data: [12, 18, -4, 24],
                borderWidth: 1,
            },
        ],
    },
});
```

## Options

Options are resolved in this order:

1. Chart defaults
2. Options passed to `Chart.init()` or the constructor

Resolved `instance.options` contain copied arrays and plain objects, which are recursively frozen. Callbacks, dates, and class instances retain their original references and are not frozen. Use `setSettings()` to merge changed options into an existing chart.

`Chart.defaults` may be customized before creating instances. See [src/chart.js](./src/chart.js) for the complete defaults.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `animation.duration` | `number` | `300` | Animation duration for all chart types in milliseconds. Set `0` to disable; reduced-motion preferences disable it automatically. |
| `animation.easing` | `'linear' \| 'easeOutQuad' \| 'easeInOutQuad'` | `'easeOutQuad'` | Timing curve used during animation. |
| `ariaLabel` | `string` | `'Chart'` | Prefix for the accessible description containing labels and values. |
| `cutout` | `number` | `0.6` | Donut inner radius as a fraction of the outer radius, from `0` up to but excluding `1`. |
| `data` | `object` | `{ labels: [], datasets: [] }` | Category labels and datasets; see [Data](#data). |
| `font` | `object` | 12px Helvetica/Arial | Base font inherited by titles, legends, ticks, and tooltips. |
| `layout.padding` | `number` | `20` | Outer padding in CSS pixels. |
| `legend.align` | `'start' \| 'center' \| 'end' \| 'left' \| 'right'` | `'center'` | Alignment along the legend edge. |
| `legend.display` | `boolean` | `true` | Displays dataset keys, or slice keys for pie, donut, and polar area charts. |
| `legend.interactive` | `boolean` | `true` | Click keys to hide/show datasets, or individual circular slices. Native buttons provide keyboard access. |
| `legend.labels.textAlign` | `'start' \| 'center' \| 'end' \| 'left' \| 'right'` | `'start'` | Aligns entries within rows or columns; side legends share a left edge by default. |
| `legend.maxWidth`, `legend.maxHeight` | `number \| null` | `null` | Optional limits in CSS pixels. Items that cannot fit are omitted. |
| `legend.position` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | The edge containing the legend. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Bar direction. |
| `responsive` | `boolean` | `true` | Observes container resizing. |
| `scales.r` | `object` | Visible | Radial `grid`, numeric `ticks`, and category `labels` for radar and polar area charts. |
| `scales.x`, `scales.y` | `object` | Visible | Each axis has `display`, `grid`, and `ticks` settings. Used by Cartesian charts. Horizontal bars use numeric x ticks and category y labels. |
| `stacked` | `boolean` | `false` | Stack bar datasets; positive and negative values accumulate separately. |
| `title.align` | `'start' \| 'center' \| 'end' \| 'left' \| 'right'` | `'center'` | Alignment along the title edge. |
| `title.display` | `boolean` | `true` | Displays the chart title. |
| `title.position` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | The edge containing the title. |
| `title.text` | `string` | `'Title'` | Title text, wrapped to the available space. |
| `tooltip.arrowSize` | `number` | `5` | Tooltip pointer size; set `0` to omit it. |
| `tooltip.backgroundColor` | `string` | `'rgba(24, 28, 36, .92)'` | Slightly translucent background; text remains opaque. |
| `tooltip.borderRadius` | `number` | `6` | Tooltip corner radius in CSS pixels. |
| `tooltip.display` | `boolean` | `true` | Shows a canvas tooltip for the hovered mark. |
| `tooltip.padding` | `number` | `10` | Tooltip padding in CSS pixels. |
| `tooltip.position` | `'fixed' \| 'cursor'` | `'fixed'` | Anchor beside the hovered mark, or use `'cursor'` to follow the pointer. Placement flips near edges and stays stable while moving within a mark. |
| `type` | `'bar' \| 'line' \| 'area' \| 'pie' \| 'donut' \| 'scatter' \| 'polarArea' \| 'radar'` | `'bar'` | The chart type. |

Bars and Cartesian points animate from the zero baseline on first render. Pie and donut slices sweep into view; radar and polar area marks grow from the center. Data updates interpolate to the new geometry, and interrupted transitions continue from their visible positions. Set `animation.duration` to `0` to render immediately.

Each `font` object accepts `family`, `size`, `weight`, `style`, and `lineHeight`. Layer fonts inherit from the base font. Grid options include `display`, `drawBorder`, `borderColor`, `borderWidth`, `lineColor`, `lineWidth`, and `tickLength`. Tick options include `display`, `drawTicks`, `padding`, `font`, `color`, and `callback(value, index)`.

```js
chart.setSettings({
    scales: {
        y: {
            ticks: {
                callback: (value) => `$${value}`,
            },
        },
    },
});
```

### Data

Bar, line, area, pie, donut, polar area, and radar datasets must have one finite numeric value per label. Bar, line, and area charts accept negative values. Pie, donut, polar area, and radar charts reject negative values. Pie, donut, and polar area datasets contribute slices to one combined circle. Empty datasets and zero-valued circular charts render without errors.

Scatter datasets accept finite `{ x, y }` points. Labels are optional, datasets may have different lengths, and both axes use numeric scales. Points are drawn without connecting lines.

| Dataset option | Type | Default | Description |
| --- | --- | --- | --- |
| `backgroundColor` | `string \| string[]` | Default palette | One CSS fill color or a repeating array of colors. |
| `borderColor` | `string \| string[]` | Default palette or white | One CSS border color or a repeating array. Pie, donut, and polar area borders default to white. |
| `borderWidth` | `number` | `1` | Nonnegative border width in pixels. Set `0` to omit borders. |
| `data` | `number[] \| { x: number, y: number }[]` | Required | Values corresponding to `data.labels`, or numeric coordinates for scatter charts. |
| `fillOpacity` | `number` | `0.2`, or `0.75` for polar area | Fill opacity between 0 and 1. Area and radar fills use the first background color in the dataset. |
| `label` | `string` | `'Dataset N'` | Dataset name, with N starting at 1. |
| `pointRadius` | `number` | `2`, or `4` for scatter | Nonnegative radius of line, area, scatter, and radar points in pixels. |

The default palette starts with indigo, teal, amber, and pink and contains twelve colors. Cartesian and radar series receive one color per dataset; pie, donut, and polar area slices cycle through the palette. Explicit dataset colors override the defaults. Grid lines use a soft gray, axis borders a slightly darker gray, and ticks inherit their grid color unless `tickColor` is supplied.

Inputs and data getter results are copied. Changing the original data object does not change a chart; call `setData` to apply an update. `chart.options` is a snapshot reused until data or settings change. Invalid data and unsupported chart types are rejected before replacing the current state.

Numeric strings are accepted for values, coordinates, and numeric settings. Invalid numeric settings fall back to defaults; negative dimensions clamp to zero, and fill opacity clamps to the range 0–1. Invalid font sizes and donut cutouts use their defaults.

### Chart types

An area chart uses the same labeled data as a line chart:

```js
chart.setSettings({ type: 'area' });
```

A donut uses the same nonnegative data as a pie:

```js
chart.setSettings({ type: 'donut', cutout: .65 });
```

Scatter accepts numeric coordinates instead of category values:

```js
const chart = new Chart(node, {
    type: 'scatter',
    data: {
        datasets: [
            {
                label: 'Observations',
                data: [{ x: 1, y: 3 }, { x: 4, y: 8 }, { x: 10, y: 6 }],
            },
        ],
    },
});
```

Horizontal and stacked bars use the same data as grouped bars:

```js
chart.setSettings({ type: 'bar', orientation: 'horizontal', stacked: true });
```

Set `orientation: 'vertical'` for vertical stacks, or `stacked: false` for grouped bars. Stack totals determine the value scale. Nonfinite totals are rejected before applying an update.

Radar charts connect each dataset across equally spaced category spokes. Polar area charts give each visible value an equal angle and a radius proportional to its value:

```js
chart.setSettings({ type: 'radar' });
chart.setSettings({ type: 'polarArea' });
```

Both use nonnegative labeled data and `scales.r` for their guides. Its `grid` settings control radial line color and width; `ticks` control centered scale numbers and formatting; `labels` control category text and padding. Set `scales.r.display: false` to hide all radial guides and labels. Polar sectors default to `fillOpacity: .75` so the underlying scale remains visible.

### Legend interaction

Click a legend key, or tab to its native button and press Space or Enter. Hidden keys are faded and struck through, and the scale is recalculated from visible data. Bar, line, area, scatter, and radar keys toggle datasets; pie, donut, and polar area keys toggle individual slices. Set `legend.interactive: false` for a display-only legend.

Visibility is preserved by dataset/item index across updates. Removing an index clears its hidden state. Data and colors remain available through `getData()` while hidden. You can also control visibility directly:

```js
chart.setDatasetVisibility(0, false);
chart.setDatasetVisibility(0, true);
chart.setDataVisibility(0, 2, false); // Hide the third circular slice in the first dataset.
```

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Chart.init(node, options?)` | `Chart` | Return the existing instance for an element or create one. |
| `calculate()` | `void` | Recalculate layer bounds and data geometry. |
| `dispose()` | `void` | Remove generated markup, animation frames, listeners, observers, and registration. |
| `draw()` | `void` | Composite the rendered layers onto the visible canvas. |
| `getData()` | `object[]` | Return independent copies of the normalized datasets. |
| `getLabels()` | `string[]` | Return a copy of the category labels. |
| `getScale(axis = 'y')` | `number[]` | Return a copy of the calculated scale ticks. |
| `getScaleMax(axis = 'y')` | `number` | Return the upper scale boundary. |
| `getScaleMin(axis = 'y')` | `number` | Return the lower scale boundary. |
| `getValues(axis = 'y')` | `number[]` | Return values from visible datasets and items. |
| `isDatasetVisible(index)` | `boolean` | Check whether a dataset is enabled. |
| `isDataVisible(datasetIndex, index)` | `boolean` | Check whether a data item and its dataset are enabled. |
| `render()` | `void` | Render the layers at their final positions without animation. |
| `resize()` | `void` | Measure the container and redraw, including when `responsive` is disabled. |
| `run()` | `void` | Start the configured chart animation. |
| `setData(data?)` | `void` | Validate and replace data, recalculate the scale, and redraw. Omit data to reapply the current data. |
| `setDatasetVisibility(index, visible)` | `void` | Show or hide a dataset without removing its values. |
| `setDataVisibility(datasetIndex, index, visible)` | `void` | Show or hide an individual pie, donut, or polar area slice. |
| `setSettings(options?)` | `void` | Merge changed settings and redraw. Chart type and data may change together. |
| `update()` | `void` | Recalculate layout and data and start the configured animation. |

For scale getters, use `'x'` for the horizontal scale in scatter charts or horizontal bars. The default returns the value scale for other chart types. For `getValues()`, `'x'` selects the x coordinates of scatter data.

```js
chart.setData({
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{ label: 'Sales', data: [15, 21, 8, 30] }],
});
chart.setSettings({ legend: { position: 'bottom' } });
console.log(chart.getValues()); // [15, 21, 8, 30]
```

The `Chart` class exposes the renderers as `Chart.Bar`, `Chart.Line`, `Chart.Area`, `Chart.Scatter`, `Chart.Pie`, `Chart.Donut`, `Chart.PolarArea`, and `Chart.Radar`. Layer and geometry classes are available as `Chart.Grid`, `Chart.Layer`, `Chart.Legend`, `Chart.Rect`, `Chart.Title`, and `Chart.Tooltip`. Area and scatter share the line renderer; donut shares the pie renderer.

## Lifecycle

Calling `Chart.init()` again for the same element returns its existing instance. Calling the constructor twice for the same container throws. Use `setSettings()` to change options on an existing chart, or dispose it before creating another instance.

An instance exposes its container as `instance.node` and its frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` cancels animation frames, releases listeners and observers, removes the generated canvas and legend controls, and removes the registered instance. Original container children are preserved. Repeated disposal is safe. Call `dispose()` before removing the container from the DOM.

If initialization fails, the chart releases resources it created before rethrowing the error. The container can then be initialized again.

## Accessibility

The canvas exposes `role="img"`, an accessible label, and fallback text containing the chart title, dataset labels, and values. Set `ariaLabel` to a meaningful description of the chart. Hidden values are marked in the description, and an active tooltip adds `aria-description`.

Interactive legends provide native buttons with `aria-pressed` reflecting dataset or slice visibility. Tab to a legend button and press Space or Enter to toggle it; keyboard focus is drawn on the matching canvas legend item.

Animations respect `prefers-reduced-motion` and render immediately when reduced motion is requested.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost Charts is released under the [MIT License](./LICENSE).
