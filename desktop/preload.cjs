const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('companion', {
  onFrame(callback) {
    const listener = (_event, frame) => callback(frame);
    ipcRenderer.on('companion:frame', listener);
    return () => ipcRenderer.removeListener('companion:frame', listener);
  },
  ready: () => ipcRenderer.send('companion:ready')
});
