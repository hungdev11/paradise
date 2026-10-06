const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function captureGrandLandmarks() {
  console.log('--- Khởi động chụp ảnh các danh thắng trong Sảnh Hội Ngộ ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // Vào Sảnh Hội Ngộ
  const tab = await page.$('button[title="Sảnh Hội Ngộ"]');
  if (tab) await tab.click();
  await new Promise(r => setTimeout(r, 800));

  // 1. Chụp toàn cảnh khu vực Trung Tâm
  console.log('1. Chụp khu vực Trung Tâm...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_grand_plaza_center.png') });

  // 2. Đi lên phía Bắc: Đại Hùng Bảo Điện
  console.log('2. Di chuyển đến Đại Hùng Bảo Điện...');
  // Giữ phím W trong 2.5s để đi lên phía Bắc
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 2600));
  await page.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_grand_plaza_pagoda.png') });

  // 3. Đi sang phía Tây: Tượng Phật A Di Đà
  console.log('3. Di chuyển đến Tượng Phật A Di Đà...');
  await page.keyboard.down('KeyS');
  await new Promise(r => setTimeout(r, 1800));
  await page.keyboard.up('KeyS');
  await page.keyboard.down('KeyA');
  await new Promise(r => setTimeout(r, 3200));
  await page.keyboard.up('KeyA');
  await new Promise(r => setTimeout(r, 500));

  // Bấm phím 1 để Chắp Tay trước Phật
  await page.keyboard.press('Digit1');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_grand_plaza_buddha.png') });

  // 4. Đi xuống góc Tây Nam: Hồ Sen Tịnh Tâm & Cầu Gỗ Đỏ
  console.log('4. Di chuyển đến Hồ Sen & Cầu Gỗ Đỏ...');
  await page.keyboard.down('KeyS');
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.up('KeyS');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_grand_plaza_lotus_pond.png') });

  console.log('Đã chụp hoàn tất các danh thắng!');
  await browser.close();
}

captureGrandLandmarks().catch(err => {
  console.error('Lỗi khi chụp danh thắng:', err);
  process.exit(1);
});
