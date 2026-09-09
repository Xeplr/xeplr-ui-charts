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
 * @property {string|Function} [formatter]  same contract as Tooltip.formatter
 *   and DataLabel.formatter — the axis prints the same values they do.
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
 * @property {boolean|Array} [boundaryGap]  ECharts' own, verbatim: a boolean
 *   or [start, end] on a category axis, a [min, max] EXTENSION on a value one.
 *   A value axis defaults to [0, '10%'] — headroom, so the tallest point does
 *   not sit on the top gridline and an area chart is not clipped flat against
 *   it.
 *
 *   ON A VALUE AXIS THIS DOES NOTHING UNLESS `scale` IS ON. ECharts builds a
 *   rounded range from zero while scale is off and absorbs the extension into
 *   that rounding — measured, [0,'10%'] and no boundaryGap produce an
 *   identical axis. The headroom above was written years before anything made
 *   it take effect.
 * @property {boolean} [scale]  Whether the axis fits the DATA (true) or
 *   includes zero (false, ECharts' own default).
 *
 *   Defaulted per chart type rather than left to ECharts, because the right
 *   answer differs and getting it wrong is not a cosmetic matter. Bars,
 *   stacked series and filled areas keep zero: a bar's length IS the quantity,
 *   stacked segments are cumulative sums from a baseline, and a fill reads as
 *   volume under the curve — truncate any of those and the chart states
 *   something false about the numbers. A plain line or a scatter encodes
 *   CHANGE, so zero flattens the variation it was drawn to show.
 *
 *   Set it explicitly to overrule that per-chart default either way.
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
 * @property {string} [distance]   gap between the label and its mark
 * @property {number} [rotate]     degrees, -90..90
 * @property {string} [offsetX]    nudge, CSS length
 * @property {string} [offsetY]
 * @property {string} [minMargin]  smallest gap to keep from the chart edge
 * @property {string} [maxWidth]   width at which the text wraps or is cut
 * @property {"none"|"truncate"|"break"|"breakAll"} [overflow]
 * @property {DataLabelLayout} [layout]
 * @property {LabelLine} [labelLine]
 */

/**
 * The CALLOUT — the leader line from a mark out to its label.
 *
 * ECharts' own name and its own two-segment shape: `length` runs away from the
 * mark, `length2` runs horizontally to the text. Named after ECharts rather
 * than renamed to "callout" for the same reason `boundaryGap` was left alone —
 * one vocabulary, so a property means the same thing wherever you meet it.
 *
 * Pie, donut and funnel draw it. Other types ignore it.
 *
 * @typedef {Object} LabelLine
 * @property {boolean} [show]
 * @property {string} [length]        first segment, away from the mark
 * @property {string} [length2]       second segment, across to the text
 * @property {boolean|number} [smooth]
 * @property {number} [minTurnAngle]
 * @property {AxisLine} [lineStyle]   colour, width, style
 */

/**
 * What to do when labels COLLIDE — the common reason a chart's labels are
 * unreadable, and a collection-level answer to it.
 *
 * @typedef {Object} DataLabelLayout
 * @property {boolean} [hideOverlap]  drop a label rather than overprint one
 * @property {"shiftX"|"shiftY"|"shuffleX"|"shuffleY"} [moveOverlap]  move it instead
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
 * @property {string} [chartType]  An ECharts series type — 'bar', 'line',
 *   'pie', 'scatter', or any other, including one the consumer has registered.
 *   ECharts is the vocabulary and anything it accepts flows through.
 *
 *   Three aliases exist for charts every UI offers that ECharts has no series
 *   type for, and each resolves to a real one before anything reaches ECharts:
 *     'area'  → line, filled       (series.areaStyle)
 *     'donut' → pie with a hole    (series.radius ring)
 *     'hbar'  → bar, axis roles swapped (category on y, value on x)
 *   Saying it in ECharts' own terms instead is the same chart.
 *
 *   Cartesian types bind encode {x, y}; the rest — pie, funnel, radar,
 *   treemap and friends — bind {itemName, value} and are given no axes.
 * @property {Object[]} [data]
 * @property {Rule[]} [rules]  Conditional formatting — "when this column is
 *   under zero, paint it red". Compiled to an ECharts `visualMap`, which is
 *   ECharts' own mechanism for it; nothing is styled outside the chart.
 */

/**
 * One conditional-formatting rule.
 *
 * @typedef {Object} Rule
 * @property {string} field   The column to TEST — any column in `data`, not
 *   only a plotted one. A bar can be sized by revenue and coloured by margin.
 *   Must be NUMERIC: ECharts cannot match a string dimension in a piecewise
 *   visualMap (both `categories` and a string `value` fail to match).
 * @property {string} [series]  Which measure it applies to, named by its field
 *   in `axes.y.labels`. Omitted means every series.
 * @property {'lt'|'lte'|'gt'|'gte'|'eq'|'between'} op
 * @property {number} value
 * @property {number} [value2]  The far end, for 'between'.
 * @property {string} color   What to paint the mark. Alpha is allowed —
 *   'rgba(194,55,46,.35)' is how you dim rather than recolour.
 *
 * ORDER MATTERS: the first rule that matches a row wins. (ECharts itself
 * applies the LAST matching piece; the list is reversed on the way out so it
 * reads the way every conditional-formatting UI does.)
 *
 * ONE COLUMN PER SERIES: ECharts allows a single colour scale per series, and
 * a second one overwrites the first entirely rather than combining with it.
 * Rules that would colour one series by a second column are dropped and
 * reported in `warnings`.
 *
 * COLOUR ONLY: visualMap has ten visual channels (color, colorHue,
 * colorSaturation, colorLightness, colorAlpha, decal, opacity, liftZ, symbol,
 * symbolSize) and not one of them is a font — so a rule cannot make a label
 * bold. It can make one red: the label takes the mark's colour through
 * ECharts' `label.color: 'inherit'`, which is applied automatically unless
 * `dataLabel.font.color` says otherwise.
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



