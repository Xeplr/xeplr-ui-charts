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

test('marks.bar → series borderRadius + surface-gap ring', function () {
  var r = toOption({
    data: [{ m: 'Jan', v: 1 }],
    axes: { x: { labels: ['m'] }, y: { labels: ['v'] } },
    chartType: 'bar',
    marks: { bar: { border: { radius: '4px' }, gap: { color: '#fff', width: '2px' } } }
  });
  assert.deepStrictEqual(r.option.series[0].itemStyle, { borderRadius: 4, borderColor: '#fff', borderWidth: 2 });
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
