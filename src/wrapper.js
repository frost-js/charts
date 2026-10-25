/**
 * FrostChart v1.0
 * https://github.com/elusivecodes/FrostChart
 */
(function(global, factory) {
    'use strict';

    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory;
    } else {
        Object.assign(global, factory(global));
    }

})(this, function(window) {
    'use strict';

    if (!window) {
        throw new Error('FrostChart requires a Window.');
    }

    if (!('UI' in window)) {
        throw new Error('FrostUI-Chart requires FrostUI.');
    }

    const document = window.document;
    const Core = window.Core;
    const dom = window.dom;
    const UI = window.UI;

    // {{code}}

    Chart.Bar = BarChart;
    Chart.Grid = Grid;
    Chart.Layer = Layer;
    Chart.Legend = Legend;
    Chart.Line = LineChart;
    Chart.Pie = PieChart;
    Chart.Rect = Rect;
    Chart.Title = Title;
    Chart.Tooltip = Tooltip;

    return {
        Chart
    };
});