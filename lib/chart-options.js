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
    grid.containLabel = true;
    option.grid = clean(grid);
    if (ca.style && ca.style.background && ca.style.background.color) {
      option.backgroundColor = applyOpacity(ca.style.background.color, ca.style.background.opacity);
    }
    if (ca.style && ca.style.background && ca.style.background.image) ctx.warn('chartArea.style.background.image has no ECharts equivalent (dropped)');
  }

  // dataLabel is per-series in ECharts — resolve it now, apply when series exist.
  var seriesLabel;
  if (co.dataLabel) {
    var dl = co.dataLabel;
    seriesLabel = clean(assign(
      {
        show: dl.show !== false,
        position: labelPosition(dl.positioning),
        formatter: dl.formatter
      },
      fontToTextStyle(dl.font, ctx, 'dataLabel.font'),
      styleToEcharts(dl.style, ctx, 'dataLabel.style')
    ));
  }

  // ── data + series (field-binding via axes.x/y.labels) ──
  // x.labels[0] = category dimension; each y.labels entry = one series (value dim).
  if (Array.isArray(co.data)) option.dataset = { source: co.data };

  var xLabels = co.axes && co.axes.x && co.axes.x.labels;
  var yLabels = co.axes && co.axes.y && co.axes.y.labels;
  var xField = Array.isArray(xLabels) ? xLabels[0] : undefined;

  // per-type mark defaults (theme.marks[chartType]) — line width, bar radius +
  // surface gap, symbol sizes, pie ring. Applied to every series of this type.
  var marks = co.marks && co.chartType ? co.marks[co.chartType] : null;

  if (co.chartType && Array.isArray(yLabels) && yLabels.length) {
    option.series = yLabels.map(function (yf) {
      var ser = clean({
        type: co.chartType,
        name: yf,
        encode: xField ? { x: xField, y: yf } : { y: yf },
        label: seriesLabel
      });
      if (marks) applyMarks(ser, co.chartType, marks, ctx);
      return ser;
    });
    // cartesian roles: x carries the category, y the value
    if (option.xAxis) { if (option.xAxis.type === undefined) option.xAxis.type = 'category'; }
    else if (xField) option.xAxis = { type: 'category' };
    if (option.yAxis) { if (option.yAxis.type === undefined) option.yAxis.type = 'value'; }
    else option.yAxis = { type: 'value' };
  }

  // ── theme-level extras (carried on ChartOptions by the theme) ──
  // palette → the series color cycle; fontFamily → global text default (ECharts
  // cascades option.textStyle.fontFamily to all text, so per-block family is
  // unnecessary). These are the two fields beyond CSS-chrome that a theme needs.
  if (Array.isArray(co.palette)) option.color = co.palette;
  if (co.fontFamily) option.textStyle = assign(option.textStyle || {}, { fontFamily: co.fontFamily });

  return { option: option, seriesLabel: seriesLabel, chartType: co.chartType, warnings: warnings };
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
    if (m.gap) {   // the 2px surface gap between fills → a same-color border ring
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
    a.axisTick = clean({ show: tk.show !== false, length: parseSize(tk.length, ctx) });
    a.axisLabel = clean(assign(
      { show: tk.show !== false, rotate: tk.angle, margin: parseSize(tk.margin, ctx), color: tk.color },
      fontToTextStyle(tk.font, ctx, path + '.ticks.font')
    ));
  }
  if (ax.title) {
    a.name = ax.title.text;
    a.nameTextStyle = fontToTextStyle(ax.title.font, ctx, path + '.title.font');
    if (ax.title.margin) a.nameGap = parseSize(ax.title.margin.top || ax.title.margin.bottom || ax.title.margin.left || ax.title.margin.right, ctx);
  }
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
