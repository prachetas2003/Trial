const path = require('node:path');
module.exports = function windowOptions(x, y, width = 1440, height = 900) {
  return {
    width, height, x, y,
    transparent: true, backgroundColor: '#00000000', frame: false,
    hasShadow: false, thickFrame: false, roundedCorners: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    resizable: false, movable: false, maximizable: false, minimizable: false,
    show: false, autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      backgroundThrottling: false, webSecurity: true, autoplayPolicy: 'no-user-gesture-required'
    }
  };
};
