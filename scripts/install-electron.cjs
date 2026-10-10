const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const installer = path.resolve(__dirname, '../node_modules/electron/install.js');
if (fs.existsSync(installer)) {
  const cache = path.resolve(__dirname, '../.tools/electron-cache');
  fs.mkdirSync(cache, { recursive: true });
  const result = spawnSync(process.execPath, [installer], {
    stdio: 'inherit',
    env: { ...process.env, electron_config_cache: cache, ...((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) ? { ELECTRON_GET_USE_PROXY: '1' } : {}) }
  });
  if (result.error) throw result.error;
  process.exitCode = result.status || 0;
}
