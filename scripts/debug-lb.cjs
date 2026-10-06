const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function debugLeaderboard() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.setViewport({ width: 1280, height: 850 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Switch to plaza tab
  await page.click('button[title="Sảnh Hội Ngộ"]');
  await new Promise(r => setTimeout(r, 1200));

  const result = await page.evaluate(() => {
    const btn = document.querySelector('button[title*="Bảng Xếp Hạng"]');
    if (!btn) return 'Button not found!';
    btn.click();
    return 'Clicked button!';
  });
  console.log('Evaluation:', result);

  await new Promise(r => setTimeout(r, 800));

  const modalFound = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h3'));
    return headings.map(h => h.innerText);
  });
  console.log('H3 headings after click:', modalFound);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_merit_leaderboard_modal.png') });
  console.log('Saved screenshot to 08_merit_leaderboard_modal.png');

  await browser.close();
}

debugLeaderboard().catch(console.error);
