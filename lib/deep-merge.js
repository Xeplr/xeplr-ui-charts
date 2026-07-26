// Deep-merge for plain objects only. Arrays and non-plain values are REPLACED
// (not merged) — so `series: [...]` from the spec overrides wholesale, while
// nested config objects (grid, tooltip, textStyle, …) merge key-by-key.
// Right side (override) wins.

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  var out = {};
  var k;
  for (k in base) out[k] = base[k];
  for (k in override) {
    if (isPlainObject(out[k]) && isPlainObject(override[k])) out[k] = deepMerge(out[k], override[k]);
    else out[k] = override[k];
  }
  return out;
}

module.exports = deepMerge;
module.exports.isPlainObject = isPlainObject;
