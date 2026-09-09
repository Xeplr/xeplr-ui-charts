// Pure tests for chartOptionsToOption — the semantic ChartOptions → ECharts
// styling translator. No echarts. Run: node --test test/chart-options.test.js

var test = require('node:test');
var assert = require('node:assert');
var toOption = require('../lib/chart-options');

test('title: text + font → textStyle, positioning → left/top, style → box', function () {
  var r = toOption({
    title: {
      text: 'Revenue',
      font: { family: 'Inter', size: '18px', weight: 600, color: '#0b0b0b', style: 'italic', align: 'center' },
      positioning: { position: 'top' },
      style: { border: { width: '1px', color: '#ccc', style: 'dashed', radius: '4px' }, shadow: { x: '0', y: '2px', blur: '6px', color: '#0002' } }
    }
  });
  assert.strictEqual(r.option.title.text, 'Revenue');
  assert.deepStrictEqual(r.option.title.textStyle, { fontFamily: 'Inter', fontSize: 18, fontWeight: 600, fontStyle: 'italic', color: '#0b0b0b', align: 'center' });
  assert.strictEqual(r.option.title.top, 0);
  assert.strictEqual(r.option.title.left, 'center');
  assert.strictEqual(r.option.title.textAlign, 'center');
  assert.strictEqual(r.option.title.borderWidth, 1);
  assert.strictEqual(r.option.title.borderType, 'dashed');
  assert.strictEqual(r.option.title.borderRadius, 4);
  assert.strictEqual(r.option.title.shadowBlur, 6);
  assert.strictEqual(r.option.title.shadowOffsetY, 2);
});

test('axes: line → axisLine, grid → splitLine, ticks → axisTick + axisLabel, title → name', function () {
  var r = toOption({
    axes: {
      x: {
        line: { show: true, color: '#383835', width: '1px', style: 'solid' },
        grid: { show: true, color: '#2c2c2a', style: 'dashed' },
        ticks: { show: true, angle: 45, margin: '8px', font: { size: '12px', color: '#898781' } },
        title: { text: 'Month', font: { size: '13px' }, margin: { top: '10px' } }
      }
    }
  });
  var x = r.option.xAxis;
  assert.strictEqual(x.axisLine.lineStyle.color, '#383835');
  assert.strictEqual(x.axisLine.lineStyle.width, 1);
  assert.strictEqual(x.splitLine.show, true);
  assert.strictEqual(x.splitLine.lineStyle.type, 'dashed');
  assert.strictEqual(x.axisLabel.rotate, 45);
  assert.strictEqual(x.axisLabel.margin, 8);
  assert.strictEqual(x.axisLabel.fontSize, 12);
  assert.strictEqual(x.name, 'Month');
  assert.strictEqual(x.nameTextStyle.fontSize, 13);
  assert.strictEqual(x.nameGap, 10);
  assert.strictEqual(r.option.yAxis, undefined);   // only x defined
});

test('legend: left position → vertical orient, itemGap parsed, iconGap warns', function () {
  var r = toOption({ legend: { positioning: { position: 'left' }, itemGap: '16px', iconGap: '4px', font: { color: '#c3c2b7' } } });
  assert.strictEqual(r.option.legend.orient, 'vertical');
  assert.strictEqual(r.option.legend.left, 0);
  assert.strictEqual(r.option.legend.itemGap, 16);
  assert.strictEqual(r.option.legend.textStyle.color, '#c3c2b7');
  assert.ok(r.warnings.some(function (w) { return /iconGap/.test(w); }));
});

test('tooltip: formatter + style passthrough', function () {
  var fmt = function () {};
  var r = toOption({ tooltip: { formatter: fmt, style: { background: { color: '#1a1a19' }, border: { color: '#2c2c2a', width: '1px' } } } });
  assert.strictEqual(r.option.tooltip.formatter, fmt);
  assert.strictEqual(r.option.tooltip.backgroundColor, '#1a1a19');
  assert.strictEqual(r.option.tooltip.borderColor, '#2c2c2a');
});

test('chartArea: margin+padding → grid edges (summed), background → backgroundColor', function () {
  var r = toOption({ chartArea: { margin: { left: '20px', top: '10px' }, padding: { left: '5px' }, style: { background: { color: '#fff' } } } });
  assert.strictEqual(r.option.grid.left, 25);   // 20 + 5
  assert.strictEqual(r.option.grid.top, 10);
  assert.strictEqual(r.option.grid.containLabel, true);
  assert.strictEqual(r.option.backgroundColor, '#fff');
});

test('dataLabel → seriesLabel (position center → inside); chartType carried out', function () {
  var r = toOption({ chartType: 'bar', dataLabel: { positioning: { position: 'center' }, font: { size: '11px' }, formatter: '{c}' } });
  assert.strictEqual(r.chartType, 'bar');
  assert.strictEqual(r.seriesLabel.position, 'inside');
  assert.strictEqual(r.seriesLabel.fontSize, 11);
  assert.strictEqual(r.seriesLabel.formatter, '{c}');
});

test('CSS unit parsing: px, rem, %, pt, auto', function () {
  var r = toOption({
    title: { text: 'x', font: { size: '1.5rem' }, positioning: { margin: { left: '50%', top: 'auto', right: '12pt' } } }
  });
  assert.strictEqual(r.option.title.textStyle.fontSize, 24);   // 1.5rem * 16
  assert.strictEqual(r.option.title.left, '50%');              // percentage kept
  assert.strictEqual(r.option.title.top, undefined);           // auto → default
  assert.strictEqual(r.option.title.right, 16);                // 12pt → 16px
});

test('opacity folds into rgba color', function () {
  var r = toOption({ title: { text: 'x', font: { color: '#3987e5', opacity: 0.5 } } });
  assert.strictEqual(r.option.title.textStyle.color, 'rgba(57,135,229,0.5)');
});

test('no-equivalent props are dropped with warnings (never silently)', function () {
  var r = toOption({
    title: {
      text: 'x',
      font: { letterSpacing: '1px', transform: 'uppercase', decoration: 'underline', variant: 'small-caps' },
      style: { border: { style: 'double' }, shadow: { spread: '2px' }, background: { image: 'bg.png' }, opacity: 0.5 }
    }
  });
  var joined = r.warnings.join(' | ');
  ['letterSpacing', 'transform', 'decoration', 'variant', 'double', 'spread', 'background.image', 'opacity'].forEach(function (k) {
    assert.ok(new RegExp(k).test(joined), 'expected a warning about ' + k);
  });
  assert.strictEqual(r.option.title.borderType, 'solid');   // double → solid fallback
});

test('show:false collapses a component to { show:false }', function () {
  var r = toOption({ title: { show: false }, legend: { show: false } });
  assert.deepStrictEqual(r.option.title, { show: false });
  assert.deepStrictEqual(r.option.legend, { show: false });
});

test('data + axes labels + chartType → dataset, series, axis types', function () {
  var r = toOption({
    data: [{ month: 'Jan', revenue: 10 }, { month: 'Feb', revenue: 20 }],
    axes: { x: { labels: ['month'] }, y: { labels: ['revenue'] } },
    chartType: 'bar'
  });
  assert.strictEqual(r.option.dataset.source.length, 2);
  assert.strictEqual(r.option.series.length, 1);
  assert.strictEqual(r.option.series[0].type, 'bar');
  assert.strictEqual(r.option.series[0].name, 'revenue');
  assert.deepStrictEqual(r.option.series[0].encode, { x: 'month', y: 'revenue' });
  assert.strictEqual(r.option.xAxis.type, 'category');
  assert.strictEqual(r.option.yAxis.type, 'value');
});

test('multiple y labels → one series each', function () {
  var r = toOption({
    data: [{ m: 'Jan', a: 1, b: 2 }],
    axes: { x: { labels: ['m'] }, y: { labels: ['a', 'b'] } },
    chartType: 'line'
  });
  assert.strictEqual(r.option.series.length, 2);
  assert.deepStrictEqual(r.option.series.map(function (s) { return s.name; }), ['a', 'b']);
  assert.strictEqual(r.option.series[1].encode.y, 'b');
});

test('empty ChartOptions → empty option, no warnings', function () {
  var r = toOption({});
  assert.deepStrictEqual(r.option, {});
  assert.deepStrictEqual(r.warnings, []);
});

// ── theme extras: palette, marks, fontFamily ──

test('palette → option.color; fontFamily → option.textStyle', function () {
  var r = toOption({ palette: ['#111', '#222', '#333'], fontFamily: 'Inter, sans-serif' });
  assert.deepStrictEqual(r.option.color, ['#111', '#222', '#333']);
  assert.deepStrictEqual(r.option.textStyle, { fontFamily: 'Inter, sans-serif' });
  assert.deepStrictEqual(r.warnings, []);
});

test('marks.bar → series borderRadius, and the surface-gap ring when stacked', function () {
  var marks = { bar: { border: { radius: '4px' }, gap: { color: '#fff', width: '2px' } } };
  var co = { data: [{ m: 'Jan', v: 1 }], axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, marks: marks };

  var stacked = toOption(Object.assign({}, co, { chartType: 'stackedBar' }));
  assert.deepStrictEqual(stacked.option.series[0].itemStyle, { borderRadius: 4, borderColor: '#fff', borderWidth: 2 });

  // A plain bar takes the radius but NOT the ring — see the stacked-only test
  // below for why a fixed-pixel border destroys a narrow bar.
  var plain = toOption(Object.assign({}, co, { chartType: 'bar' }));
  assert.deepStrictEqual(plain.option.series[0].itemStyle, { borderRadius: 4 });
});

test('marks.line → lineStyle width + symbol; marks[type] not matching chartType is ignored', function () {
  var r = toOption({
    data: [{ m: 'Jan', v: 1 }],
    axes: { x: { labels: ['m'] }, y: { labels: ['v'] } },
    chartType: 'line',
    marks: { line: { width: '2px', symbol: 'circle', symbolSize: 8, smooth: false }, bar: { border: { radius: '9px' } } }
  });
  assert.deepStrictEqual(r.option.series[0].lineStyle, { width: 2 });
  assert.strictEqual(r.option.series[0].symbol, 'circle');
  assert.strictEqual(r.option.series[0].symbolSize, 8);
  assert.strictEqual(r.option.series[0].smooth, false);
  assert.strictEqual(r.option.series[0].itemStyle, undefined);   // bar marks not applied to a line
});

test('marks with no chartType/series → nothing applied, no warnings', function () {
  var r = toOption({ marks: { bar: { border: { radius: '4px' } } } });
  assert.strictEqual(r.option.series, undefined);
  assert.deepStrictEqual(r.warnings, []);
});

// ── chart type: ECharts is the vocabulary ────────────────────────────────
//
// `chartType` is an ECharts series type, and the point of these is that
// nothing ECharts cannot read ever reaches it. An 'area' series does not
// render and does not say why, which is the failure this prevents.

var ROWS = [{ m: 'Jan', v: 1 }, { m: 'Feb', v: 2 }];
function typed(chartType, extra) {
  var co = { data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: chartType };
  return toOption(Object.assign(co, extra || {}));
}

test('a real ECharts type passes straight through', function () {
  ['bar', 'line', 'scatter'].forEach(function (t) {
    assert.strictEqual(typed(t).option.series[0].type, t);
  });
});

test('an unknown type is passed on, not refused — consumers register their own', function () {
  var r = typed('customSeriesType');
  assert.strictEqual(r.option.series[0].type, 'customSeriesType');
  assert.deepStrictEqual(r.warnings, []);
});

test('area → a filled line, because ECharts has no area series', function () {
  var s = typed('area').option.series[0];
  assert.strictEqual(s.type, 'line');
  assert.deepStrictEqual(s.areaStyle, {});
});

test('donut → a pie with a hole', function () {
  var s = typed('donut').option.series[0];
  assert.strictEqual(s.type, 'pie');
  assert.deepStrictEqual(s.radius, ['45%', '70%']);
});

test('hbar → a bar with the axis ROLES swapped', function () {
  var r = typed('hbar');
  assert.strictEqual(r.option.series[0].type, 'bar');
  // The category moves to y and the value to x — how ECharts itself says it.
  assert.deepStrictEqual(r.option.series[0].encode, { y: 'm', x: 'v' });
  assert.strictEqual(r.option.yAxis.type, 'category');
  assert.strictEqual(r.option.xAxis.type, 'value');
});

test('a pie binds itemName/value, not x/y', function () {
  // With {x, y} a pie renders NOTHING: it looks for itemName and value and
  // finds neither. No error, no warning — an empty circle over good data.
  var s = typed('pie').option.series[0];
  assert.deepStrictEqual(s.encode, { itemName: 'm', value: 'v' });
});

test('a pie is given no axes at all', function () {
  var r = typed('pie');
  assert.strictEqual(r.option.xAxis, undefined);
  assert.strictEqual(r.option.yAxis, undefined);
});

test('...even when the theme carries axis styling', function () {
  // The theme styles axes for every chart; a pie must not draw a bare cross
  // behind the slices because of it.
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'], line: { color: '#f00' } }, y: { labels: ['v'], grid: { show: true } } },
    chartType: 'donut'
  });
  assert.strictEqual(r.option.xAxis, undefined);
  assert.strictEqual(r.option.yAxis, undefined);
});

test('name/value types bind itemName + value and get no axes', function () {
  // funnel and sunburst read a slice name and a size, exactly as a pie does.
  // radar and treemap do NOT — they have their own shapes, tested below.
  ['funnel', 'sunburst'].forEach(function (t) {
    var r = typed(t);
    assert.strictEqual(r.option.series[0].type, t);
    assert.strictEqual(r.option.xAxis, undefined, t + ' should have no xAxis');
    assert.deepStrictEqual(r.option.series[0].encode, { itemName: 'm', value: 'v' });
  });
});

// ── the types that do not bind through encode at all ─────────────────────
//
// Each of these renders NOTHING when handed an encode — no error, no warning,
// an empty box. That is the whole reason they need their own branch.

var GRID = [
  { region: 'North', month: 'Jan', sales: 10 },
  { region: 'North', month: 'Feb', sales: 20 },
  { region: 'South', month: 'Jan', sales: 5 },
  { region: 'South', month: 'Feb', sales: 8 }
];

test('radar builds its own coordinate system, not a series encode', function () {
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'] }, y: { labels: [{ field: 'v', name: 'Value' }] } },
    chartType: 'radar'
  });
  // The CATEGORIES become the axes and each measure becomes one shape over
  // them — the transpose of every other chart here.
  assert.deepStrictEqual(r.option.radar.indicator.map(function (i) { return i.name; }), ['Jan', 'Feb']);
  assert.strictEqual(r.option.series[0].type, 'radar');
  assert.strictEqual(r.option.series[0].data[0].name, 'Value');
  assert.deepStrictEqual(r.option.series[0].data[0].value, [1, 2]);
  assert.strictEqual(r.option.series[0].encode, undefined);
  assert.strictEqual(r.option.xAxis, undefined);
});

test('radar gives every spoke ONE shared max', function () {
  // Per-axis maxima rescale each spoke independently, which makes the shape
  // meaningless — two measures could not be compared on it.
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'] }, y: { labels: ['v'] } },
    chartType: 'radar'
  });
  var maxes = r.option.radar.indicator.map(function (i) { return i.max; });
  assert.strictEqual(new Set(maxes).size, 1);
  assert.strictEqual(maxes[0], 2);
});

test('treemap reads series.data, because it has no dataset support', function () {
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'] }, y: { labels: ['v'] } },
    chartType: 'treemap'
  });
  assert.strictEqual(r.option.series[0].type, 'treemap');
  assert.deepStrictEqual(r.option.series[0].data, [{ name: 'Jan', value: 1 }, { name: 'Feb', value: 2 }]);
  assert.strictEqual(r.option.series[0].encode, undefined);
});

test('a heatmap needs TWO dimensions and says so when it has one', function () {
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'] }, y: { labels: ['v'] } },
    chartType: 'heatmap'
  });
  // Drawn as a single stripe it would look like a chart that worked.
  assert.deepStrictEqual(r.option.series, []);
  assert.strictEqual(r.warnings.length, 1);
  assert.match(r.warnings[0], /two dimensions/);
});

test('heatmap: two category axes, [x, y, value] cells and a visualMap', function () {
  var r = toOption({
    data: GRID,
    // The second dimension is x.labels[1] — x.labels has always been the
    // dimension list; other charts just use the first of them.
    axes: { x: { labels: ['month', 'region'] }, y: { labels: ['sales'] } },
    chartType: 'heatmap'
  });
  assert.deepStrictEqual(r.option.xAxis.data, ['Jan', 'Feb']);
  assert.deepStrictEqual(r.option.yAxis.data, ['North', 'South']);
  assert.strictEqual(r.option.series[0].type, 'heatmap');
  // [xIndex, yIndex, value]
  assert.deepStrictEqual(r.option.series[0].data, [[0, 0, 10], [1, 0, 20], [0, 1, 5], [1, 1, 8]]);
  // Without it every cell is the same shade — a heatmap carrying no
  // information at all.
  assert.strictEqual(r.option.visualMap.min, 5);
  assert.strictEqual(r.option.visualMap.max, 20);
});

test('heatmap drops the value-axis headroom, which means nothing to it', function () {
  var r = toOption({
    data: GRID,
    axes: { x: { labels: ['month', 'region'] }, y: { labels: ['sales'] } },
    chartType: 'heatmap'
  });
  // Both axes are categorical; a [0,'10%'] extension would offset the grid by
  // a phantom cell.
  assert.strictEqual(r.option.xAxis.boundaryGap, undefined);
  assert.strictEqual(r.option.yAxis.boundaryGap, undefined);
});

test('marks resolve under the alias first, then the type it becomes', function () {
  // A theme can style donuts apart from pies; if it does not, pie marks apply.
  var viaPie = typed('donut', { marks: { pie: { border: { color: '#fff', width: '2px' } } } });
  assert.deepStrictEqual(viaPie.option.series[0].itemStyle, { borderColor: '#fff', borderWidth: 2 });
  var viaAlias = typed('donut', {
    marks: { donut: { border: { color: '#000', width: '1px' } }, pie: { border: { color: '#fff', width: '9px' } } }
  });
  assert.deepStrictEqual(viaAlias.option.series[0].itemStyle, { borderColor: '#000', borderWidth: 1 });
});

test('a theme mark still wins over the alias shaping', function () {
  // The alias supplies what MAKES it that chart; the theme dresses it.
  var s = typed('area', { marks: { line: { width: '3px' } } }).option.series[0];
  assert.deepStrictEqual(s.areaStyle, {});
  assert.deepStrictEqual(s.lineStyle, { width: 3 });
});

test('saying it in ECharts terms directly is the same chart', function () {
  // The escape hatch: nobody has to use the alias.
  var alias = typed('area').option.series[0];
  var direct = typed('line').option.series[0];
  assert.strictEqual(alias.type, direct.type);
  assert.deepStrictEqual(alias.encode, direct.encode);
});

test('stackedBar → a stacked bar, because ECharts has no stackedBar type', function () {
  var s = typed('stackedBar').option.series[0];
  assert.strictEqual(s.type, 'bar');
  assert.strictEqual(s.stack, 'total');
});

test('a label may name the series apart from the field it binds', function () {
  // Without this a legend can only show the raw data key, which in a BI tool
  // is something like `a1b2c3__orders_total`.
  var r = toOption({
    data: [{ m: 'Jan', a: 1, b: 2 }],
    axes: { x: { labels: ['m'] }, y: { labels: [{ field: 'a', name: 'Revenue' }, 'b'] } },
    chartType: 'bar'
  });
  assert.strictEqual(r.option.series[0].name, 'Revenue');
  assert.deepStrictEqual(r.option.series[0].encode, { x: 'm', y: 'a' });
  // A plain string still means "field, shown as itself".
  assert.strictEqual(r.option.series[1].name, 'b');
  assert.deepStrictEqual(r.option.series[1].encode, { x: 'm', y: 'b' });
});

test('a named label falls back to the field when no name is given', function () {
  var r = toOption({
    data: [{ m: 'Jan', a: 1 }],
    axes: { x: { labels: ['m'] }, y: { labels: [{ field: 'a' }] } },
    chartType: 'bar'
  });
  assert.strictEqual(r.option.series[0].name, 'a');
});

test('the x label may be named too, and still binds by field', function () {
  var r = toOption({
    data: [{ m: 'Jan', a: 1 }],
    axes: { x: { labels: [{ field: 'm', name: 'Month' }] }, y: { labels: ['a'] } },
    chartType: 'pie'
  });
  assert.deepStrictEqual(r.option.series[0].encode, { itemName: 'm', value: 'a' });
});

test('ticks.color is the tick MARK; ticks.font.color is the label', function () {
  // They used to both land on axisLabel.color, where the font one won by being
  // assigned second — so ticks.color could never take effect and no tick mark
  // could be coloured. A panel offering both had one dead control.
  var r = toOption({
    axes: { x: { ticks: { color: '#ff0000', length: '5px', font: { color: '#0000ff' } } } }
  });
  assert.strictEqual(r.option.xAxis.axisTick.lineStyle.color, '#ff0000');
  assert.strictEqual(r.option.xAxis.axisTick.length, 5);
  assert.strictEqual(r.option.xAxis.axisLabel.color, '#0000ff');
});

test('...and each works without the other', function () {
  var onlyMark = toOption({ axes: { x: { ticks: { color: '#ff0000' } } } });
  assert.strictEqual(onlyMark.option.xAxis.axisTick.lineStyle.color, '#ff0000');
  assert.strictEqual(onlyMark.option.xAxis.axisLabel.color, undefined);

  var onlyText = toOption({ axes: { x: { ticks: { font: { color: '#0000ff' } } } } });
  assert.strictEqual(onlyText.option.xAxis.axisLabel.color, '#0000ff');
  assert.strictEqual(onlyText.option.xAxis.axisTick.lineStyle, undefined);
});

test('a value axis is given headroom above the tallest value', function () {
  // ECharts ends the axis exactly at the data maximum, so the highest point
  // sits ON the top gridline and an area chart is clipped flat against it.
  var r = typed('area');
  assert.deepStrictEqual(r.option.yAxis.boundaryGap, [0, '10%']);
  // Nothing below the data: a bar's baseline belongs at zero, and lifting it
  // exaggerates every difference on the chart.
  assert.strictEqual(r.option.yAxis.boundaryGap[0], 0);
});

test('...on whichever axis carries the value, so hbar follows', function () {
  var r = typed('hbar');
  assert.deepStrictEqual(r.option.xAxis.boundaryGap, [0, '10%']);
  assert.strictEqual(r.option.yAxis.boundaryGap, undefined);
});

test('...and never on the category axis', function () {
  assert.strictEqual(typed('bar').option.xAxis.boundaryGap, undefined);
});

test('an explicit boundaryGap wins, in ECharts\' own vocabulary', function () {
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'] }, y: { labels: ['v'], boundaryGap: [0, '50%'] } },
    chartType: 'bar'
  });
  assert.deepStrictEqual(r.option.yAxis.boundaryGap, [0, '50%']);
});

test('a category axis may set boundaryGap too, and it passes through', function () {
  var r = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'], boundaryGap: false }, y: { labels: ['v'] } },
    chartType: 'line'
  });
  // false is how a line chart starts flush against the axis.
  assert.strictEqual(r.option.xAxis.boundaryGap, false);
});

test('the surface-gap border is applied to STACKED bars only', function () {
  // A border is the only thing that can separate two segments of one stacked
  // bar — they share an edge, so no spacing reaches between them.
  var marks = { bar: { border: { radius: '4px' }, gap: { color: '#fcfcfb', width: '2px' } } };
  var stacked = typed('stackedBar', { marks: marks }).option.series[0];
  assert.strictEqual(stacked.itemStyle.borderColor, '#fcfcfb');
  assert.strictEqual(stacked.itemStyle.borderWidth, 2);
});

test('...and never to a plain bar, where it eats the fill', function () {
  // A fixed-pixel ring on both sides of a bar that narrows with the category
  // count: at 150 categories a bar is 8.5px and 2px takes 47% of it; at 300 it
  // is 4.2px and the ring takes ALL of it, painting the bar the colour of the
  // page. It renders, reports nothing, and shows nothing.
  var marks = { bar: { border: { radius: '4px' }, gap: { color: '#fcfcfb', width: '2px' } } };
  ['bar', 'hbar'].forEach(function (t) {
    var s = typed(t, { marks: marks }).option.series[0];
    assert.strictEqual(s.itemStyle.borderWidth, undefined, t + ' must not carry a gap border');
    assert.strictEqual(s.itemStyle.borderColor, undefined, t + ' must not carry a gap colour');
    // The rest of the theme's bar styling still applies.
    assert.strictEqual(s.itemStyle.borderRadius, 4);
  });
});

test('stacking combines with orientation and with fill', function () {
  var hs = typed('stackedHbar').option;
  assert.strictEqual(hs.series[0].type, 'bar');
  assert.strictEqual(hs.series[0].stack, 'total');
  assert.strictEqual(hs.yAxis.type, 'category');   // still horizontal
  assert.strictEqual(hs.xAxis.type, 'value');

  var as = typed('stackedArea').option.series[0];
  assert.strictEqual(as.type, 'line');
  assert.deepStrictEqual(as.areaStyle, {});         // still filled
  assert.strictEqual(as.stack, 'total');
});

test('data labels: the whole ECharts label surface, not a slice of it', function () {
  var r = toOption({
    data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'bar',
    dataLabel: {
      show: true, distance: '6px', rotate: 45, offsetX: '2px', offsetY: '-10px',
      minMargin: '4px', maxWidth: '80px', overflow: 'truncate'
    }
  });
  var label = r.option.series[0].label;
  assert.strictEqual(label.distance, 6);
  assert.strictEqual(label.rotate, 45);
  assert.deepStrictEqual(label.offset, [2, -10]);
  assert.strictEqual(label.minMargin, 4);
  assert.strictEqual(label.width, 80);
  assert.strictEqual(label.overflow, 'truncate');
  assert.deepStrictEqual(r.warnings, []);
});

test('colliding labels have a COLLECTION-level answer', function () {
  // The usual reason a chart's labels are unreadable is that they overprint
  // each other. ECharts can resolve that for the whole series — worth reaching
  // for before anybody nudges labels one at a time.
  var hide = toOption({
    data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'bar',
    dataLabel: { layout: { hideOverlap: true } }
  });
  assert.deepStrictEqual(hide.option.series[0].labelLayout, { hideOverlap: true });

  var move = toOption({
    data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'bar',
    dataLabel: { layout: { moveOverlap: 'shiftY' } }
  });
  assert.deepStrictEqual(move.option.series[0].labelLayout, { moveOverlap: 'shiftY' });
});

test('...and it reaches EVERY binding, not just the cartesian one', function () {
  // Each binding builds its series in its own branch, so a property added to
  // one is silently absent from the other three — which is exactly what
  // happened the first time this was wired.
  ['bar', 'pie', 'treemap'].forEach(function (t) {
    var r = toOption({
      data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: t,
      dataLabel: { layout: { hideOverlap: true } }
    });
    assert.deepStrictEqual(r.option.series[0].labelLayout, { hideOverlap: true }, t + ' missed labelLayout');
  });
});

test('no labelLayout unless something asked for one', function () {
  var r = toOption({ data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'bar', dataLabel: { show: true } });
  assert.strictEqual(r.option.series[0].labelLayout, undefined);
});

test('the callout — a leader line from the mark out to its label', function () {
  var r = toOption({
    data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'funnel',
    dataLabel: {
      positioning: { position: 'right' },
      labelLine: { show: true, length: '20px', length2: '14px', smooth: true,
        lineStyle: { color: '#888', width: '1px', style: 'dashed' } }
    }
  });
  var ll = r.option.series[0].labelLine;
  assert.strictEqual(ll.show, true);
  assert.strictEqual(ll.length, 20);
  assert.strictEqual(ll.length2, 14);
  assert.strictEqual(ll.smooth, true);
  assert.deepStrictEqual(ll.lineStyle, { color: '#888', width: 1, type: 'dashed' });
});

test('...and it reaches every binding too', function () {
  ['funnel', 'pie', 'bar'].forEach(function (t) {
    var r = toOption({
      data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: t,
      dataLabel: { labelLine: { show: true } }
    });
    assert.strictEqual(r.option.series[0].labelLine.show, true, t + ' missed labelLine');
  });
});

test('no labelLine unless asked for', function () {
  var r = toOption({ data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'funnel', dataLabel: { show: true } });
  assert.strictEqual(r.option.series[0].labelLine, undefined);
});

// ── conditional formatting ──
//
// Every expectation here was established by rendering it first — SSR, SVG,
// colours and font-weights read off the output — because the differences
// between the three mechanisms are invisible in the option object. A label
// style callback, for instance, produces a chart in which the function's
// SOURCE TEXT is the fill attribute; nothing throws and the option looks
// perfectly reasonable.

var RULE_ROWS = [
  { dept: 'IPD', revenue: 100, margin: 12 },
  { dept: 'OPD', revenue: 120, margin: -4 },
  { dept: 'ICU', revenue: 90, margin: 7 }
];
function assignInto(a, b) { for (var k in b) a[k] = b[k]; return a; }
function withRules(rules, over) {
  return toOption(assignInto({
    data: RULE_ROWS,
    palette: ['#5470c6', '#91cc75'],
    axes: { x: { labels: ['dept'] }, y: { labels: ['revenue'] } },
    chartType: 'bar',
    rules: rules
  }, over || {}));
}
/** What ECharts would hand a series callback for row `i`. */
function datum(i, extra) {
  return assignInto({ data: RULE_ROWS[i], name: RULE_ROWS[i].dept, dataIndex: i }, extra || {});
}

test('a mark rule becomes an itemStyle callback, not a visualMap', function () {
  // visualMap was the obvious mechanism and is the wrong one — it cannot test
  // a string, it paints unmatched marks black, and a second one silently
  // replaces the first.
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } }]);
  assert.strictEqual(r.option.visualMap, undefined);
  assert.strictEqual(typeof r.option.series[0].itemStyle.color, 'function');
});

test('...which returns the rule colour for a match and the palette otherwise', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } }]);
  var f = r.option.series[0].itemStyle.color;
  assert.strictEqual(f(datum(0)), '#5470c6');   // margin 12
  assert.strictEqual(f(datum(1)), '#c2372e');   // margin -4
  assert.strictEqual(f(datum(2)), '#5470c6');   // margin 7
});

test('a mark rule can test a STRING column', function () {
  var r = withRules([{ field: 'dept', op: 'eq', value: 'IPD', target: 'mark', then: { color: '#c2372e' } }]);
  var f = r.option.series[0].itemStyle.color;
  assert.strictEqual(f(datum(0)), '#c2372e');
  assert.strictEqual(f(datum(1)), '#5470c6');
});

test('...and two rules can test two DIFFERENT columns', function () {
  // The single hardest limitation of visualMap, gone: one scale per series
  // meant one column per series.
  var r = withRules([
    { field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } },
    { field: 'revenue', op: 'lt', value: 95, target: 'mark', then: { color: '#1a9850' } }
  ]);
  var f = r.option.series[0].itemStyle.color;
  assert.strictEqual(f(datum(0)), '#5470c6');
  assert.strictEqual(f(datum(1)), '#c2372e');
  assert.strictEqual(f(datum(2)), '#1a9850');
});

test('the FIRST matching rule wins, in list order', function () {
  var r = withRules([
    { field: 'margin', op: 'lt', value: 10, target: 'mark', then: { color: '#c2372e' } },
    { field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#1a9850' } }
  ]);
  var f = r.option.series[0].itemStyle.color;
  assert.strictEqual(f(datum(1)), '#c2372e');   // matches both; the first wins
});

test('an unmatched mark keeps the theme mark style, not the palette', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } }], {
    marks: { bar: { border: { radius: '4px' } } }
  });
  assert.strictEqual(r.option.series[0].itemStyle.borderRadius, 4);
});

test('every mark property travels as its own callback', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'mark',
    then: { color: '#c2372e', opacity: 0.4, borderColor: '#000', borderWidth: 2 } }]);
  var s = r.option.series[0].itemStyle;
  assert.strictEqual(s.opacity(datum(1)), 0.4);
  assert.strictEqual(s.opacity(datum(0)), undefined);
  assert.strictEqual(s.borderColor(datum(1)), '#000');
  assert.strictEqual(s.borderWidth(datum(1)), 2);
});

// ── data labels ──

test('a data-label rule becomes a formatter and a rich style', function () {
  // A style CALLBACK cannot be used here: ECharts writes the function's source
  // into the SVG fill attribute rather than calling it.
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'dataLabel',
    then: { color: '#c2372e', fontWeight: 'bold' } }], { dataLabel: { show: true } });
  var label = r.option.series[0].label;
  assert.strictEqual(typeof label.formatter, 'function');
  assert.deepStrictEqual(label.rich.r0_0, { color: '#c2372e', fontWeight: 'bold' });
});

test('...which wraps a matching label and leaves the rest alone', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'dataLabel',
    then: { color: '#c2372e' } }], { dataLabel: { show: true } });
  var f = r.option.series[0].label.formatter;
  assert.strictEqual(f(datum(0)), '100');
  assert.strictEqual(f(datum(1)), '{r0_0|120}');
});

test('a data-label rule can format the number as well as style it', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'dataLabel',
    then: { color: '#c2372e', format: { style: 'currency', currency: 'USD', decimals: 2 } } }],
    { dataLabel: { show: true } });
  var f = r.option.series[0].label.formatter;
  assert.strictEqual(f(datum(1)), '{r0_0|$120.00}');
  assert.strictEqual(f(datum(0)), '100');
});

test('...or hide it entirely', function () {
  var r = withRules([{ field: 'revenue', op: 'lt', value: 100, target: 'dataLabel', then: { hide: true } }],
    { dataLabel: { show: true } });
  var f = r.option.series[0].label.formatter;
  assert.strictEqual(f(datum(2)), '');    // revenue 90
  assert.strictEqual(f(datum(0)), '100');
});

test('a value ECharts rich text cannot carry is printed rather than mangled', function () {
  // Rich markup is {name|text} and has no escape, so a value holding a brace
  // would be truncated at it. The text wins; the styling is what gives way.
  var r = toOption({
    data: [{ dept: 'a}b', revenue: 1 }],
    axes: { x: { labels: ['dept'] }, y: { labels: ['dept'] } },
    chartType: 'bar', dataLabel: { show: true },
    rules: [{ field: 'revenue', op: 'gt', value: 0, target: 'dataLabel', then: { color: '#c2372e' } }]
  });
  assert.strictEqual(r.option.series[0].label.formatter({ data: { dept: 'a}b', revenue: 1 } }), 'a}b');
});

test('a pie labels by name, and a rule keeps it that way', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'dataLabel', then: { color: '#c2372e' } }],
    { chartType: 'pie', dataLabel: { show: true } });
  var f = r.option.series[0].label.formatter;
  assert.strictEqual(f(datum(1)), '{r0_0|OPD}');
  assert.strictEqual(f(datum(0)), 'IPD');
});

test('a formatter already set wins, and says so', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'dataLabel', then: { color: '#c2372e' } }],
    { dataLabel: { show: true, formatter: '{c}' } });
  assert.strictEqual(r.option.series[0].label.formatter, '{c}');
  assert.ok(r.warnings.some(function (w) { return /formatter is already set/.test(w); }), r.warnings.join('|'));
});

// ── axis labels ──

test('an axis rule styles the axis labels through the same pair', function () {
  var r = withRules([{ field: 'dept', op: 'eq', value: 'IPD', target: 'axisX',
    then: { color: '#c2372e', fontWeight: 'bold' } }]);
  var al = r.option.xAxis.axisLabel;
  assert.deepStrictEqual(al.rich.axisX_0, { color: '#c2372e', fontWeight: 'bold' });
  assert.strictEqual(al.formatter('IPD'), '{axisX_0|IPD}');
  assert.strictEqual(al.formatter('OPD'), 'OPD');
});

test('...on the value axis too, where it can format the tick', function () {
  var r = withRules([{ field: 'revenue', op: 'gte', value: 100, target: 'axisY',
    then: { color: '#c2372e', format: { style: 'currency', currency: 'USD', decimals: 0 } } }]);
  var al = r.option.yAxis.axisLabel;
  assert.strictEqual(al.formatter(120), '{axisY_0|$120}');
  assert.strictEqual(al.formatter(80), '80');
});

test('an axis rule on a chart with no axes is refused, not ignored', function () {
  var r = withRules([{ field: 'dept', op: 'eq', value: 'IPD', target: 'axisX', then: { color: '#c2372e' } }],
    { chartType: 'pie' });
  assert.ok(r.warnings.some(function (w) { return /no such axis/.test(w); }), r.warnings.join('|'));
});

// ── scoping, comparisons, refusals ──

test('a rule can be scoped to one measure', function () {
  var r = withRules([{ field: 'margin', series: 'margin', op: 'lt', value: 0, target: 'mark',
    then: { color: '#c2372e' } }], { axes: { x: { labels: ['dept'] }, y: { labels: ['revenue', 'margin'] } } });
  assert.strictEqual(r.option.series[0].itemStyle, undefined);
  assert.strictEqual(typeof r.option.series[1].itemStyle.color, 'function');
  // ...and takes ITS palette entry when nothing matches.
  assert.strictEqual(r.option.series[1].itemStyle.color(datum(0)), '#91cc75');
});

test('...and an unscoped one reaches every series, each with its own colour', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } }],
    { axes: { x: { labels: ['dept'] }, y: { labels: ['revenue', 'margin'] } } });
  assert.strictEqual(r.option.series[0].itemStyle.color(datum(0)), '#5470c6');
  assert.strictEqual(r.option.series[1].itemStyle.color(datum(0)), '#91cc75');
});

test('every comparison, over numbers and over text', function () {
  var matches = require('../lib/rules').matches;
  var cases = [
    [{ op: 'lt', value: 5 }, 3, true], [{ op: 'lt', value: 5 }, 7, false],
    [{ op: 'lte', value: 5 }, 5, true],
    [{ op: 'gt', value: 5 }, 7, true],
    [{ op: 'gte', value: 5 }, 5, true],
    [{ op: 'between', value: 0, value2: 10 }, 7, true],
    [{ op: 'between', value: 10, value2: 0 }, 7, true],     // given backwards
    [{ op: 'between', value: 0, value2: 10 }, 11, false],
    [{ op: 'eq', value: 'IPD' }, 'IPD', true],
    [{ op: 'eq', value: 'ipd' }, 'IPD', true],              // case does not decide it
    [{ op: 'eq', value: 0 }, '0', true],                    // numeric where both are
    [{ op: 'neq', value: 'IPD' }, 'OPD', true],
    [{ op: 'contains', value: 'PD' }, 'IPD', true],
    [{ op: 'startsWith', value: 'I' }, 'IPD', true],
    [{ op: 'startsWith', value: 'P' }, 'IPD', false],
    [{ op: 'endsWith', value: 'PD' }, 'IPD', true],
    [{ op: 'isEmpty' }, '', true], [{ op: 'isEmpty' }, null, true], [{ op: 'isEmpty' }, 0, false],
    [{ op: 'notEmpty' }, 'x', true],
    // A numeric comparison against something that is not a number is not a
    // match — it is a question with no answer.
    [{ op: 'gt', value: 5 }, 'IPD', false],
    [{ op: 'nonsense', value: 1 }, 1, false]
  ];
  cases.forEach(function (c) {
    assert.strictEqual(matches(c[0], c[1]), c[2], JSON.stringify(c[0]) + ' vs ' + JSON.stringify(c[1]));
  });
});

test('a numeric string is a number', function () {
  var r = withRules([{ field: 'ratio', op: 'gt', value: 1, target: 'mark', then: { color: '#c2372e' } }]);
  assert.strictEqual(r.option.series[0].itemStyle.color({ data: { ratio: '2.5' } }), '#c2372e');
  assert.strictEqual(r.option.series[0].itemStyle.color({ data: { ratio: '0.5' } }), '#5470c6');
});

test('rules that could only mislead are dropped and reported', function () {
  var r = withRules([
    { op: 'lt', value: 0, target: 'mark', then: { color: '#c2372e' } },              // no column
    { field: 'margin', target: 'mark', then: { color: '#c2372e' } },                 // no comparison
    { field: 'margin', op: 'lt', value: 0, target: 'nowhere', then: { color: '#c' } }, // no such object
    { field: 'margin', op: 'lt', value: 0, target: 'mark', then: {} },               // sets nothing
    { field: 'margin', op: 'lt', value: 0, series: 'nosuch', target: 'mark', then: { color: '#c' } }
  ]);
  assert.strictEqual(r.option.series[0].itemStyle, undefined);
  assert.strictEqual(r.warnings.length, 5, r.warnings.join('\n'));
});

test('a property the target has no such thing as is dropped, and named', function () {
  // A bar has no font; a label has no opacity. The panel is generated per
  // target so this should not arise from the UI — which is exactly why an
  // arrival from anywhere else deserves saying out loud.
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, target: 'mark',
    then: { color: '#c2372e', fontWeight: 'bold' } }]);
  assert.ok(r.warnings.some(function (w) { return /fontWeight/.test(w) && /mark/.test(w); }), r.warnings.join('|'));
  assert.strictEqual(r.option.series[0].itemStyle.color(datum(1)), '#c2372e');
});

test('a target defaults to the mark', function () {
  var r = withRules([{ field: 'margin', op: 'lt', value: 0, then: { color: '#c2372e' } }]);
  assert.strictEqual(r.option.series[0].itemStyle.color(datum(1)), '#c2372e');
});

test('no rules, nothing touched', function () {
  var r = withRules([]);
  assert.strictEqual(r.option.series[0].itemStyle, undefined);
  assert.strictEqual(r.option.visualMap, undefined);
});

test('number formatting, as a person reads it', function () {
  var f = require('../lib/rules').formatNumber;
  assert.strictEqual(f(1234.5, { decimals: 2 }), '1,234.50');
  assert.strictEqual(f(1234.5, { decimals: 0, useGrouping: false }), '1235');
  assert.strictEqual(f(1234.5, { style: 'currency', currency: 'USD', decimals: 2 }), '$1,234.50');
  assert.strictEqual(f(0.185, { style: 'percent', decimals: 1 }), '18.5%');
  assert.strictEqual(f(12, { decimals: 0, prefix: '~', suffix: ' units' }), '~12 units');
  // Not a number: left alone rather than turned into NaN.
  assert.strictEqual(f('IPD', { decimals: 2 }), null);
});

test('containLabel follows whether any axis is actually drawn', function () {
  // It exists to stop axis labels being clipped. With both axes hidden there
  // is no text to contain, so leaving it on reserved space for nothing — and
  // a chart asked for zero margin on every edge still had visible space
  // around it. Which is the whole of what "minimalist" is for.
  var both = toOption({
    data: ROWS, axes: { x: { labels: ['m'] }, y: { labels: ['v'] } }, chartType: 'bar',
    chartArea: { margin: { top: '0', right: '0', bottom: '0', left: '0' } }
  });
  assert.strictEqual(both.option.grid.containLabel, true);

  var neither = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'], show: false }, y: { labels: ['v'], show: false } },
    chartType: 'bar',
    chartArea: { margin: { top: '0', right: '0', bottom: '0', left: '0' } }
  });
  assert.strictEqual(neither.option.grid.containLabel, false);
  assert.strictEqual(neither.option.grid.top, 0);
  assert.strictEqual(neither.option.grid.left, 0);

  // ONE axis still showing is still a reason to contain — half a chart's
  // labels clipped is not better than all of them.
  var one = toOption({
    data: ROWS,
    axes: { x: { labels: ['m'], show: false }, y: { labels: ['v'] } },
    chartType: 'bar',
    chartArea: { margin: { top: '0' } }
  });
  assert.strictEqual(one.option.grid.containLabel, true);
});

// ── the value axis range ────────────────────────────────────────────────
//
// `boundaryGap: [0, '10%']` — the headroom that stops a peak sitting on the
// top gridline — did NOTHING for years, because ECharts ignores it on a value
// axis while `scale` is off: it builds a rounded range from zero instead and
// absorbs the extension into the rounding.
//
// The zero baseline that produced was never a decision. It is ECharts' default
// for `scale`, and a comment explaining the `0` in boundaryGap as "a baseline
// belongs at zero" credited that value with a job it does not do.
//
// So the axis range is now chosen per chart shape, and these pin which shape
// gets which — because the difference is not cosmetic. A truncated bar states
// something false about its numbers; a zero-based line hides the change it was
// drawn to show.

var RANGE_DATA = [{ c: 'a', v: 62000 }, { c: 'b', v: 65000 }, { c: 'c', v: 63500 }, { c: 'd', v: 66000 }];
function valueAxisFor(chartType, axes) {
  var r = toOption({
    data: RANGE_DATA,
    chartType: chartType,
    axes: axes || { x: { labels: ['c'] }, y: { labels: [{ field: 'v', name: 'V' }] } }
  });
  var horizontal = chartType === 'hbar' || chartType === 'stackedHbar';
  return (horizontal ? r.option.xAxis : r.option.yAxis) || {};
}

test('value axis: a line and a scatter fit the DATA — they encode change', function () {
  assert.strictEqual(valueAxisFor('line').scale, true);
  assert.strictEqual(valueAxisFor('scatter').scale, true);
});

test('value axis: bars keep zero — length IS the quantity', function () {
  ['bar', 'hbar', 'stackedBar', 'stackedHbar'].forEach(function (t) {
    assert.strictEqual(valueAxisFor(t).scale, false, t + ' must stay zero-based');
  });
});

test('value axis: a filled area keeps zero — the fill reads as volume', function () {
  assert.strictEqual(valueAxisFor('area').scale, false);
  // Stacked as well as filled: the segments are cumulative sums from a
  // baseline, and moving the baseline stops them adding to their own total.
  assert.strictEqual(valueAxisFor('stackedArea').scale, false);
});

test('value axis: headroom is applied to every cartesian chart', function () {
  ['line', 'bar', 'area', 'scatter'].forEach(function (t) {
    assert.deepStrictEqual(valueAxisFor(t).boundaryGap, [0, '10%'], t);
  });
});

test('value axis: the caller overrules the per-shape default, both ways', function () {
  var axes = { x: { labels: ['c'] }, y: { labels: [{ field: 'v', name: 'V' }], scale: false } };
  assert.strictEqual(valueAxisFor('line', axes).scale, false, 'a line can be pinned to zero');

  var barAxes = { x: { labels: ['c'] }, y: { labels: [{ field: 'v', name: 'V' }], scale: true } };
  assert.strictEqual(valueAxisFor('bar', barAxes).scale, true, 'a bar can be scaled, if somebody insists');
});

test('value axis: a category axis is never given a scale', function () {
  // A heatmap is cartesian with TWO category axes; `scale` means nothing there
  // and setting it would be a property ECharts quietly ignores.
  var r = toOption({
    data: [{ x: 'a', y: 'p', v: 1 }, { x: 'b', y: 'q', v: 2 }],
    chartType: 'heatmap',
    axes: { x: { labels: ['x', 'y'] }, y: { labels: [{ field: 'v', name: 'V' }] } }
  });
  assert.strictEqual(r.option.xAxis.scale, undefined);
  assert.strictEqual(r.option.yAxis.scale, undefined);
});
