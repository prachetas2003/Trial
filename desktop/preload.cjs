const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('companion', {
  native: true,
  onInput(callback) {
    const listener = (_event, input) => callback(input);
    ipcRenderer.on('companion:input', listener);
    return () => ipcRenderer.removeListener('companion:input', listener);
  },
  report: frame => ipcRenderer.send('companion:report', frame),
  ready: () => ipcRenderer.send('companion:ready')
});
