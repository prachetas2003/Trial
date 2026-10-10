const path = require('node:path');
const { WINDOW } = require('./motion.js');
module.exports = function windowOptions(x, y) {
  return {
    width: WINDOW.width, height: WINDOW.height, x, y,
    transparent: true, backgroundColor: '#00000000', frame: false,
    hasShadow: false, thickFrame: false, roundedCorners: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    resizable: false, movable: false, maximizable: false, minimizable: false,
    show: false, autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      backgroundThrottling: false, webSecurity: true
    }
  };
};
