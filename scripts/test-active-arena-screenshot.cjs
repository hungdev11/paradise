const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function captureActiveArena() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const ctxA = await browser.createBrowserContext();
  const pageA = await ctxA.newPage();
  await pageA.setViewport({ width: 1280, height: 850 });

  const ctxB = await browser.createBrowserContext();
  const pageB = await ctxB.newPage();
  await pageB.setViewport({ width: 1280, height: 850 });

  await pageA.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await pageB.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await pageA.click('button[title="Sảnh Hội Ngộ"]');
  await pageB.click('button[title="Sảnh Hội Ngộ"]');
  await new Promise(r => setTimeout(r, 1200));

  // Move B close to A
  await pageB.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 400));
  await pageB.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 600));

  // Press L on A
  await pageA.keyboard.press('KeyL');
  await new Promise(r => setTimeout(r, 600));

  // Click accept on B
  const acceptBtn = await pageB.$('button ::-p-text(Chấp Nhận Chiến)');
  if (acceptBtn) await acceptBtn.click();
  await new Promise(r => setTimeout(r, 400));

  // Wait for countdown to finish (1.5s countdown)
  await new Promise(r => setTimeout(r, 1800));

  // Tap a few times on page A
  for (let i = 0; i < 7; i++) {
    await pageA.keyboard.press('KeyL');
    await new Promise(r => setTimeout(r, 80));
  }
  for (let i = 0; i < 4; i++) {
    await pageB.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 80));
  }

  // Take screenshot while duel is actively counting down (around 4-5s remaining)
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_tapping_arena_active.png') });
  console.log('Saved active arena screenshot to 08_combat_tapping_arena_active.png!');

  await browser.close();
}

captureActiveArena().catch(console.error);
