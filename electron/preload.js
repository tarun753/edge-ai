const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edge', {
  getWsUrl: () => ipcRenderer.invoke('get-ws-url'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  sendWhisper: (data) => ipcRenderer.send('whisper', data),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
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
});
