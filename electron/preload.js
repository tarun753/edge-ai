const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edge', {
  getWsUrl: () => ipcRenderer.invoke('get-ws-url'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  sendWhisper: (data) => ipcRenderer.send('whisper', data),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
  setSessionStatus: (status) => ipcRenderer.send('session-status', status),
  onWhisper: (cb) => {
    ipcRenderer.removeAllListeners('whisper');
    ipcRenderer.on('whisper', (_, data) => cb(data));
  },
  onHide: (cb) => {
    ipcRenderer.removeAllListeners('hide');
    ipcRenderer.on('hide', () => cb());
  },
  onTriggerDemo: (cb) => {
    ipcRenderer.removeAllListeners('trigger-demo-whisper');
    ipcRenderer.on('trigger-demo-whisper', () => cb());
  },
  onTrayStartLive: (cb) => {
    ipcRenderer.removeAllListeners('tray-start-live');
    ipcRenderer.on('tray-start-live', () => cb());
  },
  onTrayStartDemo: (cb) => {
    ipcRenderer.removeAllListeners('tray-start-demo');
    ipcRenderer.on('tray-start-demo', () => cb());
  },
  onTrayStop: (cb) => {
    ipcRenderer.removeAllListeners('tray-stop');
    ipcRenderer.on('tray-stop', () => cb());
  },
});
