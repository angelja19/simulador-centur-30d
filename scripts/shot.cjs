// Captura de pantalla con Electron: electron scripts/shot.cjs URL salida.png ancho alto [js-a-ejecutar] [espera-ms]
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const [url, out, w, h, js, wait] = JSON.parse(fs.readFileSync(process.env.SHOT_CFG || 'work/shot.json', 'utf8'));
app.commandLine.appendSwitch('force-device-scale-factor', '1');
if (process.env.SHOT_NOGPU) app.disableHardwareAcceleration();
fs.writeFileSync('work/shot-start.txt', JSON.stringify(process.argv));
process.on('uncaughtException', e => { fs.writeFileSync('work/shot-err.txt', String(e.stack)); app.exit(2); });
process.on('unhandledRejection', e => { fs.writeFileSync('work/shot-err.txt', String(e && e.stack || e)); app.exit(3); });
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: +w, height: +h, show: true, x: -4000, y: 0, skipTaskbar: true, frame: false, webPreferences: { backgroundThrottling: false }, paintWhenInitiallyHidden: true });
  const logs = [];
  win.webContents.session.on('will-download', (e, item) => { const f = require('path').resolve('work/downloads', item.getFilename()); require('fs').mkdirSync('work/downloads', { recursive: true }); item.setSavePath(f); item.once('done', (ev, st) => logs.push('DOWNLOAD ' + st + ' ' + item.getFilename() + ' ' + item.getTotalBytes())); });
  win.webContents.on('console-message', (e, level, msg) => logs.push(`[${level}] ${msg}`));
  win.webContents.on('render-process-gone', (e, d) => logs.push('GONE ' + JSON.stringify(d)));
  await win.loadURL(url);
  await new Promise(r => setTimeout(r, 1500));
  if (js) {
    const code = fs.existsSync(js) ? fs.readFileSync(js, 'utf8') : js;
    try { const r = await win.webContents.executeJavaScript(code); if (r !== undefined) logs.push('RESULT ' + JSON.stringify(r)); } catch (e) { logs.push('JSERR ' + e.message); }
  }
  await new Promise(r => setTimeout(r, +(wait || 800)));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(out, img.toPNG());
  console.log(logs.join('\n'));
  app.quit();
});
