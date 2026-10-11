const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..'), target = path.join(root, 'site/roam/assets');
require('./compile-quotes.cjs');
const vendor = path.join(root, 'desktop/vendor');
fs.mkdirSync(vendor, { recursive: true }); fs.mkdirSync(target, { recursive: true });
// Vendored from the exact npm-locked package; rendering never needs a CDN.
for (const [source, name] of [['build/three.module.js', 'three.module.js'], ['build/three.core.js', 'three.core.js'], ['LICENSE', 'LICENSE.three.txt']]) {
  fs.copyFileSync(path.join(root, 'node_modules/three', source), path.join(vendor, name));
}
for (const [source, name] of [
  ['desktop/motion.js', 'motion.js'], ['desktop/art.js', 'art.js'], ['desktop/sprout3d.js', 'sprout3d.js'], ['desktop/monkey.js', 'monkey.js'],
  ['desktop/renderer.js', 'renderer.js'], ['desktop/renderer.css', 'renderer.css'], ['site/core.js', 'core.js'],
  ['desktop/focus.js', 'focus.js'], ['desktop/quotes.js', 'quotes.js'], ['desktop/bubbles.js', 'bubbles.js'],
  ['desktop/focus-ui.js', 'focus-ui.js'], ['desktop/focus-ui.css', 'focus-ui.css']
]) fs.copyFileSync(path.join(root, source), path.join(target, name));
fs.cpSync(vendor, path.join(target, 'vendor'), { recursive: true });
console.log('Movement preview shares the original marker monkey, renderer, and motion.');
