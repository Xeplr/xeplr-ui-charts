// Pure unit tests for buildOption — no echarts, no react, no DOM.
// Run: node --test test/build-option.test.js

var test = require('node:test');
var assert = require('node:assert');
var buildOption = require('../lib/build-option');

var ROWS = [
  { month: 'Jan', sales: 10, product: 'A' },
  { month: 'Feb', sales: 20, product: 'A' }
];

test('data rows become dataset.source', function () {
  var opt = buildOption({ data: ROWS, xAxis: { field: 'month' }, series: [{ type: 'bar', field: 'sales' }] });
  assert.deepStrictEqual(opt.dataset, { source: ROWS });
  assert.strictEqual(opt.data, undefined);   // sugar key removed
});

test('field-binding: axis field + series field → encode, axis types defaulted, sugar stripped', function () {
  var opt = buildOption({ data: ROWS, xAxis: { field: 'month' }, yAxis: {}, series: [{ type: 'bar', field: 'sales', name: 'Sales' }] });
  assert.strictEqual(opt.xAxis.type, 'category');   // defaulted
  assert.strictEqual(opt.yAxis.type, 'value');      // defaulted
  assert.strictEqual(opt.xAxis.field, undefined);   // sugar stripped
  assert.deepStrictEqual(opt.series[0].encode, { x: 'month', y: 'sales' });
  assert.strictEqual(opt.series[0].field, undefined);
  assert.strictEqual(opt.series[0].name, 'Sales'); // real props preserved
});

test('horizontal cartesian: category on yAxis → encode swaps', function () {
  var opt = buildOption({ data: ROWS, yAxis: { field: 'month' }, xAxis: {}, series: [{ type: 'bar', field: 'sales' }] });
  assert.deepStrictEqual(opt.series[0].encode, { y: 'month', x: 'sales' });
});

test('pie (no axes): categoryField + field → itemName/value encode, tooltip trigger item', function () {
  var opt = buildOption({ data: ROWS, series: [{ type: 'pie', field: 'sales', categoryField: 'product' }] });
  assert.deepStrictEqual(opt.series[0].encode, { itemName: 'product', value: 'sales' });
  assert.strictEqual(opt.tooltip.trigger, 'item');   // non-cartesian default
  assert.strictEqual(opt.grid, undefined);           // no grid for non-cartesian
});

test('single series → object form accepted, no legend by default', function () {
  var opt = buildOption({ data: ROWS, xAxis: { field: 'month' }, series: { type: 'line', field: 'sales' } });
  assert.ok(Array.isArray(opt.series));              // normalized to array
  assert.strictEqual(opt.legend, undefined);         // single series → no auto legend
});

test('multi-series → legend defaulted on', function () {
  var opt = buildOption({
    data: ROWS, xAxis: { field: 'month' },
    series: [{ type: 'bar', field: 'sales', name: 'A' }, { type: 'line', field: 'sales', name: 'B' }]
  });
  assert.deepStrictEqual(opt.legend, {});
});

test('cartesian defaults: grid + tooltip trigger axis', function () {
  var opt = buildOption({ xAxis: {}, yAxis: {}, series: [{ type: 'bar' }] });
  assert.strictEqual(opt.tooltip.trigger, 'axis');
  assert.strictEqual(opt.grid.containLabel, true);
  assert.strictEqual(opt.animation, true);
});

test('spec wins over defaults (deep-merged)', function () {
  var opt = buildOption({ xAxis: {}, yAxis: {}, tooltip: { trigger: 'item', confine: true }, series: [{ type: 'bar' }] });
  assert.strictEqual(opt.tooltip.trigger, 'item');   // overridden
  assert.strictEqual(opt.tooltip.confine, true);     // added
});

test('legend can be disabled explicitly', function () {
  var opt = buildOption({
    xAxis: { field: 'month' }, legend: false,
    series: [{ type: 'bar', field: 'a', name: 'A' }, { type: 'bar', field: 'b', name: 'B' }]
  });
  assert.strictEqual(opt.legend, false);
});

test('explicit encode is respected (not overwritten by field)', function () {
  var opt = buildOption({ data: ROWS, xAxis: { field: 'month' }, series: [{ type: 'bar', field: 'sales', encode: { x: 'month', y: 'custom' } }] });
  assert.deepStrictEqual(opt.series[0].encode, { x: 'month', y: 'custom' });
});

test('escape hatch: arbitrary ECharts props pass straight through', function () {
  var opt = buildOption({
    xAxis: {}, yAxis: {},
    series: [{ type: 'bar', barGap: '10%', itemStyle: { borderRadius: 4 } }],
    visualMap: { min: 0, max: 100 },
    toolbox: { feature: { saveAsImage: {} } }
  });
  assert.strictEqual(opt.series[0].barGap, '10%');
  assert.deepStrictEqual(opt.series[0].itemStyle, { borderRadius: 4 });
  assert.deepStrictEqual(opt.visualMap, { min: 0, max: 100 });
  assert.ok(opt.toolbox.feature.saveAsImage);
});

test('meta keys (renderer/theme) are stripped from the option', function () {
  var opt = buildOption({ renderer: 'svg', theme: 'xeplr-dark', xAxis: {}, yAxis: {}, series: [{ type: 'bar' }] });
  assert.strictEqual(opt.renderer, undefined);
  assert.strictEqual(opt.theme, undefined);
});

test('does not mutate the input spec', function () {
  var spec = { data: ROWS, xAxis: { field: 'month' }, series: [{ type: 'bar', field: 'sales' }] };
  var snapshot = JSON.stringify(spec);
  buildOption(spec);
  assert.strictEqual(JSON.stringify(spec), snapshot);
});

test('raw dataset passthrough (no data sugar)', function () {
  var opt = buildOption({ dataset: { source: [['month', 'sales'], ['Jan', 10]] }, xAxis: {}, yAxis: {}, series: [{ type: 'bar' }] });
  assert.deepStrictEqual(opt.dataset.source[0], ['month', 'sales']);
});
