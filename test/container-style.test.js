// Pure tests for the container-frame resolver. No react. Run: node --test

var test = require('node:test');
var assert = require('node:assert');
var containerStyle = require('../lib/container-style');

test('defaults: 100% width, 320 height, static (no position)', function () {
  assert.deepStrictEqual(containerStyle({ chartOptions: {} }), { width: '100%', height: 320 });
});

test('reads width/height from chartOptions (CSS values pass through)', function () {
  var s = containerStyle({ chartOptions: { width: '640px', height: '50%' } });
  assert.strictEqual(s.width, '640px');
  assert.strictEqual(s.height, '50%');
  assert.strictEqual(s.position, undefined);   // no top/left → not positioned
});

test('top/left switch the container to absolute positioning', function () {
  var s = containerStyle({ chartOptions: { top: '20px', left: 40, width: 500, height: 300 } });
  assert.strictEqual(s.position, 'absolute');
  assert.strictEqual(s.top, '20px');
  assert.strictEqual(s.left, 40);
  assert.strictEqual(s.width, 500);
});

test('only one of top/left present still positions', function () {
  var s = containerStyle({ chartOptions: { top: 10 } });
  assert.strictEqual(s.position, 'absolute');
  assert.strictEqual(s.top, 10);
  assert.strictEqual(s.left, undefined);
});

test('React props override chartOptions frame', function () {
  var s = containerStyle({ chartOptions: { width: 500, height: 300 }, width: 800, height: 400 });
  assert.strictEqual(s.width, 800);
  assert.strictEqual(s.height, 400);
});

test('props.style wins over everything', function () {
  var s = containerStyle({ chartOptions: { height: 300 }, style: { height: 999, border: '1px' } });
  assert.strictEqual(s.height, 999);
  assert.strictEqual(s.border, '1px');
});

test('missing chartOptions entirely → still safe defaults', function () {
  assert.deepStrictEqual(containerStyle({}), { width: '100%', height: 320 });
  assert.deepStrictEqual(containerStyle(), { width: '100%', height: 320 });
});
