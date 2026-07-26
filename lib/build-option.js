// buildOption(spec) — the pure core. Turns the "organized ECharts mirror" spec
// into a real ECharts `option`. NO echarts/react imports → trivially testable.
//
// What it adds over hand-writing raw ECharts option:
//   1. `data: rows` → `dataset: { source: rows }`.
//   2. `field`-binding: `xAxis:{field:'month'}` + `series:[{type:'bar', field:'sales'}]`
//      → ECharts `encode` (dataset dimension mapping), which is fiddly by hand.
//   3. Sensible structural defaults (grid, tooltip trigger by chart kind, legend
//      when multi-series, animation) — applied only where the spec is silent.
//
// Everything else is passthrough: because the spec is ECharts-shaped, any
// property you set flows straight through. That's the built-in escape hatch.
//
// Theme/color are NOT applied here. This is the raw ECharts-mirror escape hatch:
// set colors/styling directly in the spec, or feed a themed option via the
// ChartOptions path (XeplrChart). `renderer`/`theme` meta keys are stripped.

var deepMerge = require('./deep-merge');

var META_KEYS = ['renderer', 'theme'];

function buildOption(spec) {
  var s = cloneWithout(spec || {}, META_KEYS);

  var hasCartesian = s.xAxis !== undefined || s.yAxis !== undefined;

  // 1. rows → dataset
  if (Array.isArray(s.data) && s.dataset === undefined) {
    s.dataset = { source: s.data };
  }
  delete s.data;

  // 2. axis field-binding + type defaults
  var xField = null, yField = null;
  if (s.xAxis !== undefined) { var rx = normalizeAxis(s.xAxis, 'category'); s.xAxis = rx.axis; xField = rx.field; }
  if (s.yAxis !== undefined) { var ry = normalizeAxis(s.yAxis, 'value');    s.yAxis = ry.axis; yField = ry.field; }

  // 3. series field-binding
  var seriesCount = 0;
  if (s.series !== undefined) {
    var arr = toArray(s.series).map(function (ser) {
      return normalizeSeries(ser, { xField: xField, yField: yField });
    });
    s.series = arr;
    seriesCount = arr.length;
  }

  // 4. structural defaults (spec wins over these)
  var defaults = structuralDefaults(hasCartesian, seriesCount);
  return deepMerge(defaults, s);
}

// ── helpers ────────────────────────────────────────────────────────────────

function cloneWithout(obj, keys) {
  var out = {};
  for (var k in obj) if (keys.indexOf(k) === -1) out[k] = obj[k];
  return out;
}

function toArray(v) { return Array.isArray(v) ? v.slice() : [v]; }

// Strip the convenience `field` off an axis, default its `type`. Returns the
// cleaned axis plus the field name (for series encode). Handles axis arrays.
function normalizeAxis(axis, defaultType) {
  if (Array.isArray(axis)) {
    var field = null;
    var arr = axis.map(function (a) {
      var r = normalizeAxis(a, defaultType);
      if (field === null) field = r.field;
      return r.axis;
    });
    return { axis: arr, field: field };
  }
  var a = {};
  for (var k in axis) if (k !== 'field') a[k] = axis[k];
  if (a.type === undefined) a.type = defaultType;
  return { axis: a, field: (axis && axis.field != null) ? axis.field : null };
}

// Resolve `field` (value dim) + `categoryField`/`nameField` into ECharts encode,
// unless the caller already supplied an explicit `encode`. Strips the sugar.
function normalizeSeries(ser, ctx) {
  var out = {};
  for (var k in ser) if (k !== 'field' && k !== 'categoryField' && k !== 'nameField') out[k] = ser[k];

  var field = ser.field;
  var catField = ser.categoryField != null ? ser.categoryField : ser.nameField;

  if (field != null && out.encode === undefined) {
    if (ctx.xField != null)      out.encode = { x: ctx.xField, y: field };   // vertical cartesian
    else if (ctx.yField != null) out.encode = { y: ctx.yField, x: field };   // horizontal cartesian
    else if (catField != null)   out.encode = { itemName: catField, value: field }; // pie/funnel
    else                         out.encode = { value: field };
  }
  return out;
}

function structuralDefaults(hasCartesian, seriesCount) {
  var d = { animation: true };
  if (hasCartesian) {
    d.grid = { left: '3%', right: '4%', bottom: '3%', top: 48, containLabel: true };
    d.tooltip = { trigger: 'axis' };
  } else {
    d.tooltip = { trigger: 'item' };
  }
  if (seriesCount > 1) d.legend = {};   // multi-series → show legend (auto from names)
  return d;
}

module.exports = buildOption;
