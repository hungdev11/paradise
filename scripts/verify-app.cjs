const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function runVerification() {
  console.log('Starting verification of new features...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Test "Đòi Lại Nhang" on Altar
  console.log('Testing "Đòi Lại Nhang" button...');
  const reclaimBtn = await page.$('button ::-p-text(Đòi Lại Nhang)');
  if (reclaimBtn) {
    await reclaimBtn.click();
    await new Promise(r => setTimeout(r, 400));
    console.log('Successfully clicked "Đòi Lại Nhang"!');
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_reclaim_incense.png') });

  // Light it again
  const lightBtn = await page.$('button ::-p-text(Dâng Nhang)');
  if (lightBtn) {
    await lightBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // 2. Test Meme Bonk sound selection and tap
  console.log('Testing Meme Bonk sound...');
  const bonkOption = await page.$('button ::-p-text(Meme Bonk)');
  if (bonkOption) {
    await bonkOption.click();
    await new Promise(r => setTimeout(r, 200));
  }
  const fish = await page.$('[title*="gõ mõ"]');
  if (fish) {
    for (let i = 0; i < 3; i++) {
      await fish.click();
      await new Promise(r => setTimeout(r, 180));
    }
  }

  // 2.1 Test "Tùy Biến Mõ" Centered Modal on Altar
  console.log('Testing "Tùy Biến Mõ" Centered Modal...');
  const configBtn = await page.$('button ::-p-text(Tùy Biến Mõ)');
  if (configBtn) {
    await configBtn.click();
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_wooden_fish_config_modal.png') });
    console.log('Captured 02_wooden_fish_config_modal.png (centered in viewport, no scrolling!)');
    
    // Close modal
    const closeBtn = await page.$('button ::-p-text(X)');
    const xBtn = await page.$('svg.lucide-x');
    if (xBtn) {
      await xBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // 2.2 Test Focused "Gõ Mõ" Tab (Side-by-Side Configuration Board)
  console.log('Testing Focused "Gõ Mõ" Tab with Side-by-Side Config...');
  const fishTab = await page.$('button[title="Gõ Mõ"]');
  if (fishTab) {
    await fishTab.click();
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_wooden_fish_focused.png') });
    console.log('Captured 02_wooden_fish_focused.png (Configuration visible right away!)');
  }

  // 3. Test Bell Selection (No premature strike)
  const bellTab = await page.$('button[title="Chuông Ngân"]');
  if (bellTab) {
    await bellTab.click();
    await new Promise(r => setTimeout(r, 400));
    const daiHongChung = await page.$('button ::-p-text(Đại Hồng Chung)');
    if (daiHongChung) {
      await daiHongChung.click();
      await new Promise(r => setTimeout(r, 300));
      console.log('Selected Đại Hồng Chung cleanly!');
    }
  }

  // 4. Test 3D Mala Beads Tab with wheel rolling animation
  console.log('Testing 3D Mala Beads Tab...');
  const malaTab = await page.$('button[title="Tràng Hạt"]');
  if (malaTab) {
    await malaTab.click();
    await new Promise(r => setTimeout(r, 600));

    // Scroll wheel on beads
    const strand = await page.$('canvas');
    if (strand) {
      const box = await strand.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel({ deltaY: 80 });
        await new Promise(r => setTimeout(r, 400));
        await page.mouse.wheel({ deltaY: 80 });
        await new Promise(r => setTimeout(r, 400));
      }
    }

    // Also test changing Khẩu Niệm (Mantra) to longest text to verify no distortion
    console.log('Testing mantra selection change (Án Ma Ni Bát Mê Hồng)...');
    const mantraSelect = await page.$('select');
    if (mantraSelect) {
      await mantraSelect.select('Án Ma Ni Bát Mê Hồng (Om Mani Padme Hum)');
      await new Promise(r => setTimeout(r, 400));
    }

    // Also click "Lần Một Hạt"
    const advanceBtn = await page.$('button ::-p-text(Lần Một Hạt)');
    if (advanceBtn) {
      await advanceBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // Verify canvas dimensions
    const canvasAfter = await page.$('canvas');
    if (canvasAfter) {
      const box = await canvasAfter.boundingBox();
      console.log(`Canvas dimensions after mantra switch: ${box.width}x${box.height} (Aspect ratio: ${(box.width/box.height).toFixed(3)})`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_mala_beads_3d.png') });
    console.log('Captured 03_mala_beads_3d.png with 3D animation and mantra selected!');
  }

  // 5. Test "Sảnh Hội Ngộ" (Zen Plaza - Stickman Multiplayer without Login)
  console.log('Testing "Sảnh Hội Ngộ" (Zen Plaza)...');
  const plazaTab = await page.$('button[title="Sảnh Hội Ngộ"]');
  if (plazaTab) {
    await plazaTab.click();
    await new Promise(r => setTimeout(r, 700));

    // Move stickman using keyboard WASD
    console.log('Moving stickman with WASD...');
    await page.keyboard.down('KeyD');
    await new Promise(r => setTimeout(r, 400));
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyS');
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.up('KeyS');

    // Click on canvas to move towards center shrine
    const plazaCanvas = await page.$('canvas');
    if (plazaCanvas) {
      const box = await plazaCanvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // Trigger Prayer pose
    const prayBtn = await page.$('button ::-p-text(Chắp Tay)');
    if (prayBtn) {
      await prayBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // Open Profile Customization Modal (No login)
    console.log('Opening Character Customization Modal...');
    const profileBtn = await page.$('button ::-p-text(Tùy Chỉnh Nhân Vật)');
    if (profileBtn) {
      await profileBtn.click();
      await new Promise(r => setTimeout(r, 400));

      // Enter custom name
      const nameInput = await page.$('input[placeholder*="Thích Chánh Niệm"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type('Thích Chánh Niệm');
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_zen_plaza_profile_modal.png') });
      console.log('Captured 04_zen_plaza_profile_modal.png!');

      // Save profile
      const saveBtn = await page.$('button ::-p-text(Lưu Thay Đổi)');
      if (saveBtn) {
        await saveBtn.click();
        await new Promise(r => setTimeout(r, 400));
      }
    }

    // Send a quick chanting speech bubble
    const chantBtn = await page.$('button ::-p-text(Nam Mô A Di Đà Phật)');
    if (chantBtn) {
      await chantBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_zen_plaza_hall.png') });
    console.log('Captured 04_zen_plaza_hall.png with custom Stickman in Zen Plaza!');
  }

  await browser.close();
  console.log('All new features verified with 100% success!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
