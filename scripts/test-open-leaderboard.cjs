const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function testLeaderboardModal() {
  console.log('=== CHỤP ẢNH BẢNG XẾP HẠNG CÔNG ĐỨC ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Click tab Sảnh Hội Ngộ
  const tab = await page.$('button[title="Sảnh Hội Ngộ"]');
  if (tab) await tab.click();
  await new Promise(r => setTimeout(r, 1200));

  // Find all buttons containing "Bảng Xếp Hạng"
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Bảng Xếp Hạng'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Button clicked in browser:', clicked);
  await new Promise(r => setTimeout(r, 1000));

  // Check if modal text is visible in DOM
  const modalText = await page.evaluate(() => {
    return document.body.innerText.includes('Bảng Xếp Hạng Công Đức');
  });
  console.log('Is modal text present in DOM:', modalText);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_merit_leaderboard_modal.png') });
  console.log('Successfully saved 08_merit_leaderboard_modal.png!');

  await browser.close();
}

testLeaderboardModal().catch(e => {
  console.error(e);
  process.exit(1);
});
