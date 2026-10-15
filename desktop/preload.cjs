const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('companion', {
  native: true,
  onInput(callback) {
    const listener = (_event, input) => callback(input);
    ipcRenderer.on('companion:input', listener);
    return () => ipcRenderer.removeListener('companion:input', listener);
  },
  timerDrag: phase=>ipcRenderer.send('companion:timer-drag',phase),
  timerRect: rect=>ipcRenderer.send('companion:timer-rect',rect),
  setDragging: value => ipcRenderer.send('companion:dragging', value),
  setInteractive: value => ipcRenderer.send('companion:interactive', value),
  openFocus: view => ipcRenderer.send('companion:open-focus', view),
  diagnostic: value => ipcRenderer.send('companion:diagnostic', value),
  report: frame => ipcRenderer.send('companion:report', frame),
  getFocusState: () => ipcRenderer.invoke('companion:focus-state'),
  focusAction: action => ipcRenderer.invoke('companion:focus-action', action),
  hideFocus: () => ipcRenderer.send('companion:focus-hide'),
  onFocusState(callback) {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('companion:focus-state', listener);
    return () => ipcRenderer.removeListener('companion:focus-state', listener);
  },
  onFocusView(callback) {
    const listener = (_event, view) => callback(view);
    ipcRenderer.on('companion:focus-view', listener);
    return () => ipcRenderer.removeListener('companion:focus-view', listener);
  },
  ready: () => ipcRenderer.send('companion:ready')
});
