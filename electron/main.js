const { app, BrowserWindow, ipcMain, systemPreferences, screen, globalShortcut, session, desktopCapturer, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let overlayWin = null;
let controlWin = null;
let tray = null;

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
  controlWin.webContents.session.setPermissionCheckHandler((wc, permission) => {
    const allowed = ['media', 'microphone', 'display-capture', 'screen'];
    return allowed.includes(permission);
  });

  controlWin.loadFile(path.join(__dirname, 'renderer', 'control.html'));

  controlWin.on('close', (e) => {
    // Hide instead of close so tray can reopen it
    if (!app.isQuitting) {
      e.preventDefault();
      controlWin.hide();
    }
  });
}

// ─── Tray Icon (menu bar) ───
function createTray() {
  // Create a 22x22 template image for macOS menu bar (white on transparent)
  const iconSize = 22;
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 22 22">
      <rect x="3" y="3" width="16" height="16" rx="4" fill="none" stroke="white" stroke-width="1.5"/>
      <text x="11" y="15" text-anchor="middle" font-family="Arial" font-weight="900" font-size="11" fill="white">E</text>
    </svg>`;

  // Use a simple nativeImage approach — create from dataURL
  const img = nativeImage.createFromDataURL(
    'data:image/svg+xml;base64,' + Buffer.from(canvas).toString('base64')
  );
  img.setTemplateImage(true);

  tray = new Tray(img);
  tray.setToolTip('EDGE — Conversation Intelligence');

  const updateMenu = (isLive = false) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isLive ? '🟢 EDGE is Live' : '⚫ EDGE — Idle',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '🎯 Start Live Session',
        enabled: !isLive,
        click: () => {
          showControlWindow();
          if (controlWin) controlWin.webContents.send('tray-start-live');
        },
      },
      {
        label: '▶️ Demo Mode',
        enabled: !isLive,
        click: () => {
          showControlWindow();
          if (controlWin) controlWin.webContents.send('tray-start-demo');
        },
      },
      {
        label: '⏹ End Session',
        enabled: isLive,
        click: () => {
          if (controlWin) controlWin.webContents.send('tray-stop');
        },
      },
      { type: 'separator' },
      {
        label: 'Show Control Panel',
        click: () => showControlWindow(),
      },
      {
        label: 'Hide Overlay',
        click: () => {
          if (overlayWin && !overlayWin.isDestroyed()) overlayWin.webContents.send('hide');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit EDGE',
        click: () => { app.isQuitting = true; app.quit(); },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateMenu(false);
  tray.on('click', () => showControlWindow());

  // Listen for status updates from renderer to update tray menu
  ipcMain.on('session-status', (_, status) => {
    updateMenu(status === 'live');
    tray.setToolTip(status === 'live' ? 'EDGE — Live Session' : 'EDGE — Idle');
  });
}

function showControlWindow() {
  if (!controlWin || controlWin.isDestroyed()) {
    createControl();
  }
  controlWin.show();
  controlWin.focus();
}

app.whenReady().then(async () => {
  // Try to pre-prompt macOS mic access
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch {}
  }

  // Hide dock icon on macOS so it's a clean menu bar app
  if (process.platform === 'darwin') {
    app.dock.setIcon(nativeImage.createEmpty());
  }

  createControl();
  createOverlay();
  createTray();

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
