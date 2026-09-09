// chartOptionsToOption — translate the semantic, CSS-like `ChartOptions` (see
// type.js) into an ECharts `option`. STYLING/CHROME ONLY for now: title, axes
// appearance, legend, tooltip, chart area, plus the data-label + chart-type
// carried out for the (future) series/data layer.
//
//   const { option, seriesLabel, chartType, warnings } = chartOptionsToOption(chartOptions);
//
// It maps everything with an ECharts equivalent, parses CSS units → ECharts
// values, and collects `warnings` for properties ECharts can't express (rather
// than failing). Pure — no echarts/react imports.

var applyRules = require('./rules');

function chartOptionsToOption(co, opts) {
  co = co || {};
  opts = opts || {};
  var root = opts.rootFontSize || 16;
  var warnings = [];
  var ctx = { root: root, warn: function (m) { warnings.push(m); } };

  var option = {};

  if (co.title) {
    var t = co.title;
    if (t.show !== false) {
      option.title = clean(assign(
        { text: t.text, show: true, textStyle: fontToTextStyle(t.font, ctx, 'title.font') },
        positionKeys(resolvePosition(t.positioning, ctx)),
        styleToEcharts(t.style, ctx, 'title.style'),
        t.font && t.font.align ? { textAlign: t.font.align } : {}
      ));
    } else {
      option.title = { show: false };
    }
  }

  if (co.axes) {
    if (co.axes.x) option.xAxis = axisToEcharts(co.axes.x, ctx, 'axes.x');
    if (co.axes.y) option.yAxis = axisToEcharts(co.axes.y, ctx, 'axes.y');
  }

  if (co.legend) {
    var lg = co.legend;
    if (lg.show !== false) {
      var lgPos = resolvePosition(lg.positioning, ctx);
      option.legend = clean(assign(
        {
          show: true,
          orient: lgPos._vertical ? 'vertical' : 'horizontal',
          textStyle: fontToTextStyle(lg.font, ctx, 'legend.font'),
          itemGap: parseSize(lg.itemGap, ctx)
        },
        positionKeys(lgPos),
        styleToEcharts(lg.style, ctx, 'legend.style')
      ));
      if (lg.iconGap != null) ctx.warn('legend.iconGap has no ECharts equivalent (dropped)');
    } else {
      option.legend = { show: false };
    }
  }

  if (co.tooltip) {
    var tt = co.tooltip;
    option.tooltip = clean(assign(
      { show: tt.show !== false, textStyle: fontToTextStyle(tt.font, ctx, 'tooltip.font'), formatter: tt.formatter },
      styleToEcharts(tt.style, ctx, 'tooltip.style')
    ));
  }

  if (co.chartArea) {
    var ca = co.chartArea;
    var grid = {};
    var edges = edgesFrom(ca.margin, ca.padding, ctx);
    assign(grid, edges);
    // CONTAIN WHAT LABELS?
    //
    // containLabel exists to stop axis labels being clipped: ECharts shrinks
    // the plot inward until the text fits. With both axes hidden there is no
    // text, so it reserves room for nothing — and a chart asked for zero
    // margin on every edge still had visible space around it.
    //
    // That is exactly the minimalist case: no axes, no legend, no title, and
    // an explicit margin of 0, which then did not look like 0. Derived rather
    // than exposed as a setting, because "reserve space for the labels you are
    // drawing" is not a preference — it is a description of whether any are
    // being drawn.
    var xShown = !(co.axes && co.axes.x && co.axes.x.show === false);
    var yShown = !(co.axes && co.axes.y && co.axes.y.show === false);
    grid.containLabel = xShown || yShown;
    option.grid = clean(grid);
    if (ca.style && ca.style.background && ca.style.background.color) {
      option.backgroundColor = applyOpacity(ca.style.background.color, ca.style.background.opacity);
    }
    if (ca.style && ca.style.background && ca.style.background.image) ctx.warn('chartArea.style.background.image has no ECharts equivalent (dropped)');
  }

  // dataLabel is per-series in ECharts — resolve it now, apply when series exist.
  var seriesLabel;
  var seriesLabelLayout;
  var seriesLabelLine;
  if (co.dataLabel) {
    var dl = co.dataLabel;
    seriesLabel = clean(assign(
      {
        show: dl.show !== false,
        position: labelPosition(dl.positioning),
        formatter: dl.formatter,
        // The gap between a label and the mark it belongs to.
        distance: parseSize(dl.distance, ctx),
        rotate: dl.rotate,
        // A nudge for ALL of them. Per-label nudging is labelLayout's job.
        offset: (dl.offsetX != null || dl.offsetY != null)
          ? [parseSize(dl.offsetX, ctx) || 0, parseSize(dl.offsetY, ctx) || 0]
          : undefined,
        minMargin: parseSize(dl.minMargin, ctx),
        width: parseSize(dl.maxWidth, ctx),
        overflow: dl.overflow
      },
      fontToTextStyle(dl.font, ctx, 'dataLabel.font'),
      styleToEcharts(dl.style, ctx, 'dataLabel.style')
    ));

    // THE CALLOUT — the leader line out to the label. Native to pie, donut and
    // funnel; other types ignore it, so it is emitted whenever asked for
    // rather than gated on a type the caller may know better than we do.
    if (dl.labelLine) {
      var ll = dl.labelLine;
      seriesLabelLine = clean({
        show: ll.show !== false,
        length: parseSize(ll.length, ctx),
        length2: parseSize(ll.length2, ctx),
        smooth: ll.smooth,
        minTurnAngle: ll.minTurnAngle,
        lineStyle: clean({
          color: ll.lineStyle && ll.lineStyle.color,
          width: parseSize(ll.lineStyle && ll.lineStyle.width, ctx),
          type: lineType(ll.lineStyle && ll.lineStyle.style)
        })
      });
    }

    // COLLISION. The usual reason a chart's labels are unreadable is that
    // they overprint each other, and ECharts can resolve it for the whole
    // series — worth reaching for before anybody starts nudging labels one at
    // a time.
    var layout = dl.layout || {};
    if (layout.hideOverlap != null || layout.moveOverlap) {
      seriesLabelLayout = clean({
        hideOverlap: layout.hideOverlap,
        moveOverlap: layout.moveOverlap
      });
    }
  }

  // ── data + series (field-binding via axes.x/y.labels) ──
  // x.labels[0] = category dimension; each y.labels entry = one series (value dim).
  if (Array.isArray(co.data)) option.dataset = { source: co.data };

  var xLabels = co.axes && co.axes.x && co.axes.x.labels;
  var yLabels = co.axes && co.axes.y && co.axes.y.labels;
  var xField = Array.isArray(xLabels) ? labelField(xLabels[0]) : undefined;

  // What ECharts is actually being asked for. `chartType` is an ECharts series
  // type — the aliases below resolve to one, so nothing ECharts cannot read
  // ever reaches it.
  var shape = resolveChartType(co.chartType);

  // per-type mark defaults (theme.marks[chartType]) — line width, bar radius +
  // surface gap, symbol sizes, pie ring. Applied to every series of this type.
  // Looked up under the NAME that was asked for first, so a theme can style
  // `donut` apart from `pie`, then under the type it resolves to.
  var marks = co.marks && co.chartType
    ? (co.marks[co.chartType] || co.marks[shape.type])
    : null;

  var rows = Array.isArray(co.data) ? co.data : [];

  if (shape.type && Array.isArray(yLabels) && yLabels.length) {
    if (shape.binding === 'radar') {
      // A radar has its own coordinate system. The CATEGORIES become the axes
      // (indicators) and each measure becomes one shape laid over them — which
      // is the transpose of every other chart here, and why it cannot go
      // through encode.
      var indicators = categoriesOf(rows, xField).map(function (c) { return { name: String(c) }; });
      // One shared max, so two measures on the same radar can be compared.
      // Per-axis maxima would rescale every spoke independently and make the
      // shape meaningless.
      var peak = 0;
      yLabels.forEach(function (l) {
        rows.forEach(function (r) {
          var v = Number(r[labelField(l)]);
          if (isFinite(v) && v > peak) peak = v;
        });
      });
      if (peak > 0) indicators.forEach(function (ind) { ind.max = peak; });
      option.radar = clean({ indicator: indicators });
      option.series = [clean({
        type: 'radar',
        data: yLabels.map(function (label) {
          return {
            name: labelName(label),
            value: rows.map(function (r) { return r[labelField(label)]; })
          };
        }),
        label: seriesLabel,
        labelLayout: seriesLabelLayout,
        labelLine: seriesLabelLine
      })];
      delete option.xAxis;
      delete option.yAxis;

    } else if (shape.binding === 'treemap') {
      // Treemap has no dataset support at all — it reads series.data, and each
      // node is {name, value}. One measure: a rectangle has one area.
      var tf = labelField(yLabels[0]);
      option.series = [clean({
        type: 'treemap',
        data: rows.map(function (r) {
          return { name: String(r[xField]), value: Number(r[tf]) };
        }).filter(function (d) { return isFinite(d.value); }),
        label: seriesLabel,
        labelLayout: seriesLabelLayout,
        labelLine: seriesLabelLine,
        breadcrumb: { show: false }
      })];
      delete option.xAxis;
      delete option.yAxis;

    } else if (shape.binding === 'heatmap') {
      // TWO categorical axes and a value. The second dimension comes from
      // x.labels[1] — x.labels has always been the dimension list, and every
      // other chart simply uses the first of them, so a heatmap needs no new
      // field to say what it needs.
      var xf2 = Array.isArray(xLabels) && xLabels.length > 1 ? labelField(xLabels[1]) : null;
      var vf = labelField(yLabels[0]);
      if (!xf2) {
        // Said rather than drawn empty. A heatmap is a grid; with one
        // dimension there is no grid, and rendering a single stripe would look
        // like a chart that worked.
        ctx.warn('a heatmap needs two dimensions — give axes.x.labels a second column');
        option.series = [];
      } else {
        var xCats = categoriesOf(rows, xField);
        var yCats = categoriesOf(rows, xf2);
        var xAt = {}; xCats.forEach(function (c, i) { xAt[String(c)] = i; });
        var yAt = {}; yCats.forEach(function (c, i) { yAt[String(c)] = i; });
        var cells = [];
        var lo = Infinity;
        var hi = -Infinity;
        rows.forEach(function (r) {
          var v = Number(r[vf]);
          if (!isFinite(v)) return;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
          cells.push([xAt[String(r[xField])], yAt[String(r[xf2])], v]);
        });
        option.xAxis = assign(option.xAxis || {}, { type: 'category', data: xCats, splitArea: { show: true } });
        option.yAxis = assign(option.yAxis || {}, { type: 'category', data: yCats, splitArea: { show: true } });
        // A value axis's headroom is meaningless here — both axes are
        // categorical — and would push the grid off by a phantom cell.
        delete option.xAxis.boundaryGap;
        delete option.yAxis.boundaryGap;
        // Without a visualMap every cell renders the same shade, which is a
        // heatmap that carries no information.
        option.visualMap = {
          min: isFinite(lo) ? lo : 0,
          max: isFinite(hi) ? hi : 1,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          inRange: Array.isArray(co.palette) && co.palette.length > 1
            ? { color: [co.palette[co.palette.length - 1], co.palette[0]] }
            : undefined
        };
        option.series = [clean({ type: 'heatmap', data: cells, label: seriesLabel, labelLayout: seriesLabelLayout })];
      }

    } else {
      option.series = yLabels.map(function (label) {
        var yf = labelField(label);
        var ser = clean({
          type: shape.type,
          name: labelName(label),
          // Cartesian series bind to axes; the rest name a slice and its size.
          // A pie given {x, y} silently renders nothing — it is looking for
          // itemName and value and finds neither.
          encode: shape.cartesian
            ? (shape.horizontal
              ? (xField ? { y: xField, x: yf } : { x: yf })
              : (xField ? { x: xField, y: yf } : { y: yf }))
            : (xField ? { itemName: xField, value: yf } : { value: yf }),
          label: seriesLabel,
          labelLayout: seriesLabelLayout,
          labelLine: seriesLabelLine
        });
        // The alias's own shaping — areaStyle for an area, a ring for a donut.
        // Applied before marks so a theme can still override it.
        if (shape.series) assign(ser, shape.series);
        if (marks) applyMarks(ser, shape.type, marks, ctx);
        return ser;
      });

      if (shape.cartesian) {
        // Axis ROLES, not axis names: one carries the category, the other the
        // value. A horizontal bar is the same chart with those swapped, which is
        // how ECharts itself expresses it — there is no 'hbar' series type.
        var categoryAxis = shape.horizontal ? 'yAxis' : 'xAxis';
        var valueAxis = shape.horizontal ? 'xAxis' : 'yAxis';
        if (option[categoryAxis]) {
          if (option[categoryAxis].type === undefined) option[categoryAxis].type = 'category';
        } else if (xField) option[categoryAxis] = { type: 'category' };
        if (!option[valueAxis]) option[valueAxis] = {};
        if (option[valueAxis].type === undefined) option[valueAxis].type = 'value';
        // Headroom above the tallest value.
        //
        // ECharts ends a value axis exactly at the data's own maximum, so the
        // highest point sits ON the top gridline and an area chart is clipped
        // flat against it — it reads as a chart that ran out of room rather than
        // one that peaked. VALUE_HEADROOM lifts the top of the scale clear of it.
        //
        // Applied to whichever axis carries the VALUE, which is x on a
        // horizontal bar — hence here, where the role is known, rather than in a
        // theme that can only name x and y.
        if (option[valueAxis].boundaryGap === undefined) {
          option[valueAxis].boundaryGap = VALUE_HEADROOM;
        }

        // ── AND THE RANGE THE HEADROOM APPLIES TO ────────────────────────
        //
        // VALUE_HEADROOM above did NOTHING until this line existed. ECharts
        // ignores boundaryGap on a value axis while `scale` is off: it builds
        // a rounded range from zero instead, and a percentage extension is
        // absorbed into that rounding. Measured — [0,'10%'] and no
        // boundaryGap at all produced the identical axis.
        //
        // Which also means the zero baseline was never a decision. It is
        // ECharts' default for `scale`, nobody set it, and a comment
        // explaining the `0` in boundaryGap as "a baseline belongs at zero"
        // described something that value does not do.
        //
        // WHICH CHARTS KEEP ZERO, and why it is not a matter of taste:
        //
        //   bar        length IS the quantity. Truncate the axis and a 5%
        //              difference draws as double — the chart states
        //              something false about the numbers.
        //   stacked    the segments are cumulative sums from a baseline.
        //              Move the baseline and they stop adding up to the
        //              total they are drawn to show.
        //   filled     an area's fill reads as volume under the curve, so it
        //              measures from zero the same way a bar does.
        //
        // Everything else — a plain line, a scatter — encodes CHANGE, and
        // zero flattens exactly the variation it was plotted to reveal. A
        // series moving between 62,000 and 66,000 becomes a straight line
        // pinned to the top of an empty chart, and shrinking the card makes
        // it flatter still.
        var stacked = Boolean(shape.series && shape.series.stack);
        var filled = Boolean(shape.series && shape.series.areaStyle);
        var zeroBased = shape.type === 'bar' || stacked || filled;
        // Only a real value axis: a heatmap is cartesian with TWO category
        // axes, and `scale` on a category axis means nothing.
        if (option[valueAxis].type === 'value' && option[valueAxis].scale === undefined) {
          option[valueAxis].scale = !zeroBased;
        }
      } else {
        // A pie has no axes. Left in place they draw a bare cross behind the
        // slices — and any axis STYLING the theme carries would be rendered for
        // a chart that has none.
        delete option.xAxis;
        delete option.yAxis;
      }
    }
  }

  // ── conditional formatting ──
  //
  // Applied AFTER the series exist, because a rule is scoped to one of them
  // and needs its index, its palette colour and the field it plots. See
  // rules.js for which ECharts mechanism each target uses and why they differ.
  applyRules(co, option, ctx);

  // ── theme-level extras (carried on ChartOptions by the theme) ──
  // palette → the series color cycle; fontFamily → global text default (ECharts
  // cascades option.textStyle.fontFamily to all text, so per-block family is
  // unnecessary). These are the two fields beyond CSS-chrome that a theme needs.
  if (Array.isArray(co.palette)) option.color = co.palette;
  if (co.fontFamily) option.textStyle = assign(option.textStyle || {}, { fontFamily: co.fontFamily });

  return { option: option, seriesLabel: seriesLabel, chartType: co.chartType, warnings: warnings };
}

// ── chart type ───────────────────────────────────────────────────────────
//
// ECharts is the vocabulary. `chartType` IS an ECharts series type and anything
// ECharts accepts flows straight through — including types registered by the
// consumer, which is why an unrecognised one is passed on rather than refused.
//
// The exceptions are the three names every charting UI offers that ECharts has
// no series type for. They are not new types: each resolves HERE to a real one
// plus the property that makes it that chart, so what reaches ECharts is always
// something ECharts can read. An 'area' series would simply not render, and it
// would not say why.
//
//   area        → line, filled
//   donut       → pie with a hole
//   hbar        → bar with the axis roles swapped
//   stackedBar  → bar, stacked
//
// A caller who prefers to say it in ECharts' own terms still can: chartType
// 'line' with a series areaStyle is the same chart, and passes through
// untouched.
var ALIAS = {
  area: { type: 'line', series: { areaStyle: {} } },
  donut: { type: 'pie', series: { radius: ['45%', '70%'] } },
  hbar: { type: 'bar', horizontal: true },
  stackedBar: { type: 'bar', series: { stack: 'total' } },
  // Stacking is orthogonal to orientation and to fill, so it combines with
  // both. Named rather than left to the caller to assemble, because
  // "horizontal AND stacked" is one chart somebody picks off a list, not two
  // properties they are expected to know compose.
  stackedHbar: { type: 'bar', horizontal: true, series: { stack: 'total' } },
  stackedArea: { type: 'line', series: { areaStyle: {}, stack: 'total' } }
};

// ECharts types that are NOT plotted against a pair of axes. Everything else
// is assumed cartesian, which is the right default for the types a consumer is
// most likely to register (bar/line/scatter variants).
// How far past the tallest value a value axis runs — boundaryGap's
// [below, above] pair.
//
// The point is the '10%' ABOVE: without it a value axis ends exactly at the
// data's maximum, so the highest point sits on the top gridline and an area
// chart is clipped flat against it, reading as a chart that ran out of room
// rather than one that peaked.
//
// The `0` below is not a baseline decision and never was. It says only "add no
// padding underneath", which suits both cases: a zero-based chart is already
// at zero, and a scaled one should start at its own minimum rather than
// somewhere arbitrarily below it. What actually holds a bar chart at zero is
// `scale`, set where the chart's shape is known — see the block that applies
// this constant. An earlier comment here credited the `0` with that job, which
// is how a value that does nothing on its own went years without being
// questioned.
var VALUE_HEADROOM = [0, '10%'];

var NON_CARTESIAN = {
  pie: 1, funnel: 1, gauge: 1, radar: 1, treemap: 1, sunburst: 1,
  sankey: 1, graph: 1, tree: 1, themeRiver: 1
};

// HOW a type reads its data. Most bind through the dataset with an encode, but
// three do not — and handing those an encode draws nothing at all, silently.
//
//   cartesian  encode {x, y} against a pair of axes            bar, line, …
//   nameValue  encode {itemName, value}                        pie, funnel
//   radar      its own coordinate system: indicators + arrays
//   treemap    a flat {name, value} list; no dataset support
//   heatmap    cartesian, but TWO category axes and a value    [x, y, v]
var BINDING = { radar: 'radar', treemap: 'treemap', heatmap: 'heatmap' };

// An axis label is the FIELD to bind, and optionally the name to show for it:
// either 'revenue' or { field: 'revenue', name: 'Revenue (£)' }.
//
// They are separable because the field is a key in the data and the name is
// for a person to read, and those are rarely the same string. Without this a
// legend can only ever show the raw column key — which in a BI tool is
// something like `a1b2c3__orders_total`. ECharts already separates them; this
// is series.name alongside encode, said once.
function labelField(label) {
  return label && typeof label === 'object' ? label.field : label;
}
function labelName(label) {
  if (label && typeof label === 'object') return label.name != null ? label.name : label.field;
  return label;
}

function resolveChartType(name) {
  if (!name) return { type: undefined, cartesian: true, horizontal: false, series: null, binding: 'cartesian' };
  var alias = ALIAS[name];
  var type = alias ? alias.type : name;
  return {
    type: type,
    cartesian: !NON_CARTESIAN[type],
    horizontal: Boolean(alias && alias.horizontal),
    series: (alias && alias.series) || null,
    binding: BINDING[type] || (NON_CARTESIAN[type] ? 'nameValue' : 'cartesian')
  };
}

// Distinct values of a field, in the order the rows present them. Order comes
// from the data rather than sorting, so a caller that has already ordered its
// rows — by month, by rank — keeps that order on the axis.
function categoriesOf(rows, field) {
  var seen = {};
  var out = [];
  for (var i = 0; i < (rows || []).length; i++) {
    var v = rows[i][field];
    var k = String(v);
    if (!seen[k]) { seen[k] = 1; out.push(v); }
  }
  return out;
}

// theme.marks[chartType] → ECharts series style. Each chart type reads the marks
// it understands; unknown keys are simply not consulted (no warnings — marks are
// a theme convenience, not user-authored CSS).
function applyMarks(ser, type, m, ctx) {
  if (!m) return;
  if (type === 'line') {
    var ls = clean({ width: parseSize(m.width, ctx) });
    if (ls) ser.lineStyle = assign(ser.lineStyle || {}, ls);
    if (m.symbol != null) ser.symbol = m.symbol;
    if (m.symbolSize != null) ser.symbolSize = m.symbolSize;
    if (m.smooth != null) ser.smooth = m.smooth;
  } else if (type === 'bar') {
    var bit = {};
    if (m.border && m.border.radius != null) bit.borderRadius = parseSize(m.border.radius, ctx);
    // The surface gap between fills, as a border the colour of the page.
    //
    // STACKED SERIES ONLY, and that is the whole of it. A border is the only
    // thing that can separate two segments of one stacked bar — they share an
    // edge, so no amount of spacing reaches between them.
    //
    // Between separate bars it is the wrong tool and an actively destructive
    // one. A border eats the fill from BOTH sides at a fixed pixel width while
    // the bar itself narrows with the category count: at 150 categories a bar
    // is 8.5px and a 2px ring takes 47% of it; at 300 it is 4.2px and the ring
    // takes all of it, painting the bar the colour of the background. The
    // chart renders, reports no error, and shows nothing.
    //
    // Bars that merely sit next to each other are already separated by
    // ECharts' own barGap and barCategoryGap, which are percentages and so
    // hold at any width.
    if (m.gap && ser.stack) {
      if (m.gap.color != null) bit.borderColor = m.gap.color;
      if (m.gap.width != null) bit.borderWidth = parseSize(m.gap.width, ctx);
    }
    if (Object.keys(bit).length) ser.itemStyle = assign(ser.itemStyle || {}, bit);
  } else if (type === 'scatter') {
    if (m.symbolSize != null) ser.symbolSize = m.symbolSize;
  } else if (type === 'pie') {
    var pit = {};
    if (m.border) {
      if (m.border.color != null) pit.borderColor = m.border.color;
      if (m.border.width != null) pit.borderWidth = parseSize(m.border.width, ctx);
    }
    if (Object.keys(pit).length) ser.itemStyle = assign(ser.itemStyle || {}, pit);
    if (m.label && m.label.font && m.label.font.color != null) {
      ser.label = assign(ser.label || {}, { color: m.label.font.color });
    }
  }
}

// ── sub-mappers ──────────────────────────────────────────────────────────

function axisToEcharts(ax, ctx, path) {
  if (!ax) return undefined;
  var a = { show: ax.show !== false };

  if (ax.line) {
    a.axisLine = clean({
      show: ax.line.show !== false,
      lineStyle: clean({ color: ax.line.color, width: parseSize(ax.line.width, ctx), type: lineType(ax.line.style) })
    });
  }
  if (ax.grid) {
    a.splitLine = clean({
      show: !!ax.grid.show,
      lineStyle: clean({ color: ax.grid.color, width: parseSize(ax.grid.width, ctx), type: lineType(ax.grid.style) })
    });
  }
  if (ax.ticks) {
    var tk = ax.ticks;
    // `color` is the tick MARK, alongside `length` and `margin` which also
    // describe the mark. The label's colour is `ticks.font.color`.
    //
    // Both used to land on axisLabel.color, where the font one always won by
    // being assigned second — so `ticks.color` could not take effect at all,
    // and no tick mark could be coloured. Two controls, one of them dead.
    a.axisTick = clean({
      show: tk.show !== false,
      length: parseSize(tk.length, ctx),
      lineStyle: clean({ color: tk.color })
    });
    a.axisLabel = clean(assign(
      {
        show: tk.show !== false, rotate: tk.angle, margin: parseSize(tk.margin, ctx),
        // The axis says the same numbers the tooltip and the data labels do,
        // so it takes the same kind of formatter they already take. Without
        // one, a currency column's axis was the only place in the chart that
        // could not be told what the numbers mean — and it is the part that
        // is always on screen.
        formatter: tk.formatter
      },
      fontToTextStyle(tk.font, ctx, path + '.ticks.font')
    ));
  }
  if (ax.title) {
    a.name = ax.title.text;
    a.nameTextStyle = fontToTextStyle(ax.title.font, ctx, path + '.title.font');
    if (ax.title.margin) a.nameGap = parseSize(ax.title.margin.top || ax.title.margin.bottom || ax.title.margin.left || ax.title.margin.right, ctx);
  }
  // Straight through, in ECharts' own vocabulary and meaning: a boolean or a
  // [start, end] pair on a category axis, a [min, max] extension on a value
  // one. Passing it verbatim is deliberate — inventing a second name for a
  // property ECharts already has is how two vocabularies start.
  if (ax.boundaryGap !== undefined) a.boundaryGap = ax.boundaryGap;
  // Whether the axis fits the data or includes zero. Passed straight through
  // and, because it is set here from the caller's options, it wins over the
  // per-shape default applied later — which is the whole point: the default is
  // right for the chart type, and this is for the reader who knows better
  // about their own numbers.
  if (ax.scale !== undefined) a.scale = ax.scale;
  return clean(a);
}

function fontToTextStyle(font, ctx, path) {
  if (!font) return undefined;
  var ts = {
    fontFamily: font.family,
    fontSize: parseSize(font.size, ctx),
    fontWeight: font.weight,
    fontStyle: font.style,               // normal|italic|oblique (ECharts supports these)
    color: applyOpacity(font.color, font.opacity),
    lineHeight: parseSize(font.lineHeight, ctx),
    align: font.align
  };
  ['letterSpacing', 'transform', 'decoration', 'variant'].forEach(function (k) {
    if (font[k] != null) ctx.warn(path + '.' + k + ' has no ECharts equivalent (dropped)');
  });
  return clean(ts);
}

function styleToEcharts(style, ctx, path) {
  if (!style) return undefined;
  var out = {};
  if (style.background) {
    if (style.background.color) out.backgroundColor = applyOpacity(style.background.color, style.background.opacity);
    if (style.background.image) ctx.warn(path + '.background.image has no ECharts equivalent (dropped)');
  }
  if (style.border) {
    var b = style.border;
    if (b.color != null) out.borderColor = b.color;
    if (b.width != null) out.borderWidth = parseSize(b.width, ctx);
    if (b.radius != null) out.borderRadius = parseSize(b.radius, ctx);
    if (b.style != null) {
      if (b.style === 'double') ctx.warn(path + '.border.style "double" has no ECharts equivalent (using solid)');
      out.borderType = b.style === 'double' ? 'solid' : b.style;
    }
  }
  if (style.shadow) {
    var sh = style.shadow;
    if (sh.blur != null) out.shadowBlur = parseSize(sh.blur, ctx);
    if (sh.color != null) out.shadowColor = sh.color;
    if (sh.x != null) out.shadowOffsetX = parseSize(sh.x, ctx);
    if (sh.y != null) out.shadowOffsetY = parseSize(sh.y, ctx);
    if (sh.spread != null) ctx.warn(path + '.shadow.spread has no ECharts equivalent (dropped)');
  }
  if (style.opacity != null) ctx.warn(path + '.opacity on a container has no ECharts equivalent — use a color alpha (dropped)');
  return clean(out);
}

// position keyword + margin edges → {left,top,right,bottom} (+ _vertical hint)
function resolvePosition(p, ctx) {
  if (!p) return {};
  var out = {};
  switch (p.position) {
    case 'top':    out.top = 0; out.left = 'center'; break;
    case 'bottom': out.bottom = 0; out.left = 'center'; break;
    case 'left':   out.left = 0; out.top = 'middle'; out._vertical = true; break;
    case 'right':  out.right = 0; out.top = 'middle'; out._vertical = true; break;
    case 'center': out.left = 'center'; out.top = 'middle'; break;
  }
  if (p.margin) {
    if (p.margin.top != null)    out.top = parseSize(p.margin.top, ctx);
    if (p.margin.right != null)  out.right = parseSize(p.margin.right, ctx);
    if (p.margin.bottom != null) out.bottom = parseSize(p.margin.bottom, ctx);
    if (p.margin.left != null)   out.left = parseSize(p.margin.left, ctx);
  }
  if (p.align) {
    if (out._vertical) out.top = p.align === 'start' ? 'top' : p.align === 'end' ? 'bottom' : 'middle';
    else out.left = p.align === 'start' ? 'left' : p.align === 'end' ? 'right' : 'center';
  }
  return out;
}

function positionKeys(pos) {
  var out = {};
  ['left', 'top', 'right', 'bottom'].forEach(function (k) { if (pos[k] !== undefined) out[k] = pos[k]; });
  return out;
}

function edgesFrom(margin, padding, ctx) {
  var out = {};
  ['top', 'right', 'bottom', 'left'].forEach(function (e) {
    var m = margin && margin[e] != null ? parseSize(margin[e], ctx) : undefined;
    var p = padding && padding[e] != null ? parseSize(padding[e], ctx) : undefined;
    var v = sumSizes(m, p);
    if (v !== undefined) out[e] = v;
  });
  return out;
}

function labelPosition(positioning) {
  if (!positioning || !positioning.position) return undefined;
  return positioning.position === 'center' ? 'inside' : positioning.position;
}

// ── primitives ───────────────────────────────────────────────────────────

function parseSize(v, ctx) {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  var s = String(v).trim();
  if (s === '' || s === 'auto') return undefined;
  if (s.charAt(s.length - 1) === '%') return s;          // keep percentage string
  var m = s.match(/^(-?[\d.]+)(px|rem|em|pt)?$/);
  if (!m) return undefined;
  var num = parseFloat(m[1]);
  var unit = m[2] || 'px';
  var base = (ctx && ctx.root) || 16;
  if (unit === 'rem' || unit === 'em') return num * base;
  if (unit === 'pt') return num * (96 / 72);
  return num;                                            // px / unitless
}

function sumSizes(a, b) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  return a;   // can't add a % and a px cleanly — margin wins
}

function applyOpacity(color, opacity) {
  if (color == null) return undefined;
  if (opacity == null) return color;
  var m6 = /^#([0-9a-f]{6})$/i.exec(color);
  var m3 = /^#([0-9a-f]{3})$/i.exec(color);
  var r, g, b;
  if (m6) { var n = parseInt(m6[1], 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
  else if (m3) { var c = m3[1]; r = parseInt(c[0] + c[0], 16); g = parseInt(c[1] + c[1], 16); b = parseInt(c[2] + c[2], 16); }
  else return color;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
}

function lineType(style) {
  if (style == null) return undefined;
  return (style === 'solid' || style === 'dashed' || style === 'dotted') ? style : undefined;
}

function assign(target) {
  for (var i = 1; i < arguments.length; i++) {
    var src = arguments[i];
    if (src) for (var k in src) if (src[k] !== undefined) target[k] = src[k];
  }
  return target;
}

function clean(obj) {
  if (!obj) return undefined;
  var out = {}, has = false;
  for (var k in obj) { if (obj[k] !== undefined) { out[k] = obj[k]; has = true; } }
  return has ? out : undefined;
}

module.exports = chartOptionsToOption;
