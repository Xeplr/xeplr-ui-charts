/**
 * ============================================================
 * Xeplr Charts - Common Configuration Types
 * ============================================================
 * All sizes accept CSS values:
 * "12px", "1rem", "1.5em", "50%", "auto", etc.
 * ============================================================
 */

/**
 * @typedef {Object} Font
 * @property {string} [family]
 * @property {string} [size]
 * @property {number|string} [weight]
 * @property {"normal"|"italic"|"oblique"} [style]
 * @property {"normal"|"small-caps"} [variant]
 * @property {string} [color]
 * @property {string} [lineHeight]
 * @property {string} [letterSpacing]
 * @property {"left"|"center"|"right"} [align]
 * @property {"none"|"uppercase"|"lowercase"|"capitalize"} [transform]
 * @property {"none"|"underline"|"line-through"|"overline"} [decoration]
 * @property {number} [opacity]
 */

/**
 * @typedef {Object} Margin
 * @property {string} [top]
 * @property {string} [right]
 * @property {string} [bottom]
 * @property {string} [left]
 */

/**
 * @typedef {Object} Padding
 * @property {string} [top]
 * @property {string} [right]
 * @property {string} [bottom]
 * @property {string} [left]
 */

/**
 * @typedef {Object} Border
 * @property {string} [width]
 * @property {string} [color]
 * @property {"solid"|"dashed"|"dotted"|"double"} [style]
 * @property {string} [radius]
 */

/**
 * @typedef {Object} Shadow
 * @property {string} [x]
 * @property {string} [y]
 * @property {string} [blur]
 * @property {string} [spread]
 * @property {string} [color]
 */

/**
 * @typedef {Object} Background
 * @property {string} [color]
 * @property {string} [image]
 * @property {number} [opacity]
 */

/**
 * @typedef {Object} Style
 * @property {Background} [background]
 * @property {Border} [border]
 * @property {Shadow} [shadow]
 * @property {number} [opacity]
 */

/**
 * @typedef {Object} Positioning
 * @property {"top"|"bottom"|"left"|"right"|"center"} [position]
 * @property {"start"|"center"|"end"} [align]
 * @property {Margin} [margin]
 * @property {Padding} [padding]
 */

/**
 * ============================================================
 * Axis
 * ============================================================
 */

/**
 * @typedef {Object} AxisTicks
 * @property {boolean} [show]
 * @property {Font} [font]
 * @property {number} [angle]
 * @property {string} [margin]
 * @property {string} [length]
 * @property {string} [color]
 */

/**
 * @typedef {Object} AxisTitle
 * @property {boolean} [show]
 * @property {string} [text]
 * @property {Margin} [margin]
 * @property {Font} [font]
 */

/**
 * @typedef {Object} AxisGrid
 * @property {boolean} [show]
 * @property {string} [color]
 * @property {string} [width]
 * @property {"solid"|"dashed"|"dotted"} [style]
 */

/**
 * @typedef {Object} AxisLine
 * @property {boolean} [show]
 * @property {string} [color]
 * @property {string} [width]
 * @property {"solid"|"dashed"|"dotted"} [style]
 */

/**
 * @typedef {Object} Axis
 * @property {boolean} [show]
 * @property {AxisLine} [line]
 * @property {AxisGrid} [grid]
 * @property {AxisTicks} [ticks]
 * @property {AxisTitle} [title]
 * @property {string[]} [labels]
 */

/**
 * @typedef {Object} Axes
 * @property {Axis} [x]
 * @property {Axis} [y]
 */

/**
 * ============================================================
 * Legend
 * ============================================================
 */

/**
 * @typedef {Object} Legend
 * @property {boolean} [show]
 * @property {Positioning} [positioning]
 * @property {Font} [font]
 * @property {string} [itemGap]
 * @property {string} [iconGap]
 * @property {Style} [style]
 */

/**
 * ============================================================
 * Data Labels
 * ============================================================
 */

/**
 * @typedef {Object} DataLabel
 * @property {boolean} [show]
 * @property {Positioning} [positioning]
 * @property {Font} [font]
 * @property {Style} [style]
 * @property {string|Function} [formatter]
 */

/**
 * ============================================================
 * Tooltip
 * ============================================================
 */

/**
 * @typedef {Object} Tooltip
 * @property {boolean} [show]
 * @property {Font} [font]
 * @property {Style} [style]
 * @property {string|Function} [formatter]
 */

/**
 * ============================================================
 * Title
 * ============================================================
 */

/**
 * @typedef {Object} Title
 * @property {boolean} [show]
 * @property {string} [text]
 * @property {Positioning} [positioning]
 * @property {Font} [font]
 * @property {Style} [style]
 */

/**
 * ============================================================
 * Chart Area
 * ============================================================
 */

/**
 * @typedef {Object} ChartArea
 * @property {Margin} [margin]
 * @property {Padding} [padding]
 * @property {Style} [style]
 */

/**
 * ============================================================
 * Main Chart Configuration
 * ============================================================
 */

/**
 * @typedef {Object} ChartOptions
 *
 * @property {Title} [title]
 * @property {Axes} [axes]
 * @property {Legend} [legend]
 * @property {Tooltip} [tooltip]
 * @property {DataLabel} [dataLabel]
 * @property {ChartArea} [chartArea]
 * @property {string} [chartType]
 * @property {Object[]} [data]
 */



/** @type {ChartOptions} */
const sampleChart = {};

sampleChart.data = [{
    month: 'Jan 2020',
    revenue: 18700,
},{
    month: 'Feb 2020',
    revenue: 9011,
},{
    month: 'Mar 2020',
    revenue: 20089,
},{
    month: 'Apr 2020',
    revenue: 19998,
},{
    month: 'May 2020',
    revenue: 20012,
},{
    month: 'Jun 2020',
    revenue: 18991,
},]

sampleChart.axes.x.labels = ['month'];
sampleChart.axes.y.labels = ['revenue'];

sampleChart.chartType = 'bar';

sampleChart.axes.x.title.show = true;
sampleChart.axes.x.title.text = 'Monthly Revenue Graph';



