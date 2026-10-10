const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'site/roam/assets');
fs.mkdirSync(target, { recursive: true });
for (const [source, name] of [
  ['desktop/motion.js', 'motion.js'], ['desktop/art.js', 'art.js'],
  ['desktop/renderer.js', 'renderer.js'], ['desktop/renderer.css', 'renderer.css'],
  ['site/core.js', 'core.js']
]) fs.copyFileSync(path.join(root, source), path.join(target, name));
console.log('Movement preview uses the same motion model, artwork, and renderer as the desktop app.');
