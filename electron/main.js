const { app, BrowserWindow, ipcMain, systemPreferences, screen, globalShortcut, session, desktopCapturer } = require('electron');
const path = require('path');

let overlayWin = null;
let controlWin = null;

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
    width: 560, height: 130,
    x: Math.floor((width - 560) / 2), y: height - 160,
    transparent: true, frame: false, alwaysOnTop: true,
    hasShadow: false, resizable: false, skipTaskbar: true, focusable: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  overlayWin.setContentProtection(true);
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWin.setIgnoreMouseEvents(true);
  overlayWin.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
}

function createControl() {
  controlWin = new BrowserWindow({
    width: 380, height: 640,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090f',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Grant ALL media permissions to renderer
  controlWin.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    const allowed = ['media', 'microphone', 'display-capture', 'screen'];
    callback(allowed.includes(permission));
  });

  // Also handle permission checks (not just requests)
  controlWin.webContents.session.setPermissionCheckHandler((wc, permission) => {
    const allowed = ['media', 'microphone', 'display-capture', 'screen'];
    return allowed.includes(permission);
  });

  controlWin.loadFile(path.join(__dirname, 'renderer', 'control.html'));
}

app.whenReady().then(async () => {
  // Try to pre-prompt macOS mic access (non-blocking — getUserMedia handles it in renderer)
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch {}
  }

  createControl();
  createOverlay();

  // Cmd+Shift+Space triggers next whisper
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (controlWin) controlWin.webContents.send('trigger-demo-whisper');
  });

  // Cmd+Shift+H hides overlay
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (overlayWin && !overlayWin.isDestroyed())
      overlayWin.webContents.send('hide');
  });
});

// IPC: forward whisper from control → overlay
ipcMain.on('whisper', (_, data) => {
  if (overlayWin && !overlayWin.isDestroyed())
    overlayWin.webContents.send('whisper', data);
});

// IPC: hide overlay
ipcMain.on('hide-overlay', () => {
  if (overlayWin && !overlayWin.isDestroyed())
    overlayWin.webContents.send('hide');
});

// IPC: provide desktop sources for screen capture
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 0, height: 0 }
  });
  return sources.map(s => ({ id: s.id, name: s.name }));
});

ipcMain.handle('get-ws-url', () => process.env.WS_URL || 'ws://localhost:8080');

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
