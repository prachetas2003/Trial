// Run with `npm start` serving the local preview. Exports the same procedural
// ink artwork used in the app, without external artwork or image services.
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(new URL('roam/', process.env.TEST_URL || 'http://127.0.0.1:3000/').href);
    await page.waitForFunction(() => window.__buildlingsFrame);
    const images = await page.evaluate(async () => {
      const { MonkeyScene } = await import('/roam/assets/monkey.js?v=0.4.0');
      const scene = new MonkeyScene(document.createElement('div'));
      scene.draw({ ...window.__buildlingsFrame, x: 160, y: 336, vx: 0, vy: 0,
        lean: 0, lookX: 0, lookY: 0, hop: 0, walkPhase: 0, walkWeight: 0,
        petWeight: 0, reach: 0, scaleX: 1, scaleY: 1, sparkleId: 0 }, 500);
      const encode = canvas => canvas.toDataURL('image/png').split(',')[1];
      const preview = document.createElement('canvas'); preview.width = preview.height = 512;
      const p = preview.getContext('2d'); p.fillStyle = '#f7f5ef'; p.fillRect(0, 0, 512, 512);
      p.drawImage(scene.canvas, 84*2, 130*2, 204*2, 218*2, 52, 42, 408, 436);
      const icon = document.createElement('canvas'); icon.width = icon.height = 256;
      icon.getContext('2d').drawImage(scene.canvas, 92*2, 135*2, 139*2, 139*2, 0, 0, 256, 256);
      const tray = document.createElement('canvas'); tray.width = tray.height = 32;
      const t = tray.getContext('2d'); t.fillStyle = '#ff8751'; t.beginPath(); t.arc(16,16,15,0,Math.PI*2); t.fill();
      t.drawImage(scene.canvas, 88*2, 140*2, 144*2, 120*2, 0, 2, 32, 27);
      return { preview: encode(preview), icon: encode(icon), tray: encode(tray) };
    });
    await fs.writeFile('site/roam/monkey-preview.png', Buffer.from(images.preview, 'base64'));
    await fs.writeFile('desktop/assets/tray.png', Buffer.from(images.tray, 'base64'));
    const png = Buffer.from(images.icon, 'base64'), header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
    header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
    header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
    await fs.writeFile('desktop/assets/icon.ico', Buffer.concat([header, png]));
    console.log('Original monkey preview, tray icon, and Windows icon exported.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
