const fs = require('node:fs/promises');
const path = require('node:path');
const { packager } = require('@electron/packager');
const { initializeProxy } = require('@electron/get');
const root = path.resolve(__dirname, '..');

(async () => {
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) initializeProxy();
  const stage = path.join(root, '.tools/package-stage');
  await fs.rm(stage, { recursive: true, force: true });
  await fs.mkdir(stage, { recursive: true });
  await fs.cp(path.join(root, 'desktop'), path.join(stage, 'desktop'), { recursive: true });
  await fs.mkdir(path.join(stage, 'site'), { recursive: true });
  await fs.copyFile(path.join(root, 'site/core.js'), path.join(stage, 'site/core.js'));
  await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: 'buildlings-desktop', version: '0.3.0', private: true, main: 'desktop/main.cjs', description: 'A transparent roaming desktop companion.' }, null, 2));
  const platform = process.argv[2] || 'win32';
  if (!['win32', 'linux', 'darwin'].includes(platform)) throw new Error('Choose win32, linux, or darwin.');
  const electronVersion = require('../node_modules/electron/package.json').version;
  const output = await packager({
    dir: stage, name: 'Buildlings', out: path.join(root, 'dist'),
    platform, arch: process.argv[3] || 'x64', electronVersion,
    asar: true, overwrite: true, prune: false,
    icon: path.join(root, 'desktop/assets/icon.ico'),
    download: { cacheRoot: path.join(root, '.tools/electron-cache'), checksums: require('../node_modules/electron/checksums.json') },
    appVersion: '0.3.0', appCopyright: 'Buildlings creator',
    win32metadata: { CompanyName: 'Buildlings', FileDescription: 'Buildlings desktop companion', ProductName: 'Buildlings' }
  });
  console.log('Desktop application packaged:', output.join(', '));
})().catch(error => { console.error(error); process.exitCode = 1; });
