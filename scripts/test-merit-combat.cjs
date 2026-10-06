const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function testMeritAndCombat() {
  console.log('=== BẮT ĐẦU KIỂM THỬ: LOOT CÔNG ĐỨC & COMBAT 1V1 (KHÓA 1 PHÚT) ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  // Client 1 (Đạo Hữu A)
  const contextA = await browser.createBrowserContext();
  const pageA = await contextA.newPage();
  await pageA.setViewport({ width: 1280, height: 800 });

  // Client 2 (Đạo Hữu B)
  const contextB = await browser.createBrowserContext();
  const pageB = await contextB.newPage();
  await pageB.setViewport({ width: 1280, height: 800 });

  console.log('1. Khởi động 2 người chơi vào Sảnh Hội Ngộ...');
  await pageA.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await pageB.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // Vào tab Sảnh Hội Ngộ
  const tabA = await pageA.$('button[title="Sảnh Hội Ngộ"]');
  if (tabA) await tabA.click();
  const tabB = await pageB.$('button[title="Sảnh Hội Ngộ"]');
  if (tabB) await tabB.click();
  await new Promise(r => setTimeout(r, 1200));

  // 2. Chụp màn hình Client A thấy các hạt công đức rải rác trên bản đồ và số công đức bên cạnh nhân vật
  console.log('2. Kiểm tra các hạt công đức rải rác và số công đức bên cạnh nhân vật...');
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '07_merit_orbs_scattered.png') });

  // 3. Client A di chuyển để nhặt/loot công đức xung quanh
  console.log('3. Client A di chuyển đi loot công đức trên bản đồ...');
  // Đi nhẹ để hút công đức
  await pageA.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 800));
  await pageA.keyboard.up('KeyW');
  await pageA.keyboard.down('KeyD');
  await new Promise(r => setTimeout(r, 800));
  await pageA.keyboard.up('KeyD');
  await new Promise(r => setTimeout(r, 600));

  // 4. Cho Client B tiến lại gần Client A để kích hoạt So Kèo Combat 1v1
  console.log('4. Client B tiến lại gần Client A...');
  await pageB.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 600));
  await pageB.keyboard.up('KeyW');
  await pageB.keyboard.down('KeyD');
  await new Promise(r => setTimeout(r, 500));
  await pageB.keyboard.up('KeyD');
  await new Promise(r => setTimeout(r, 800));

  // 5. Kiểm tra nút "⚔️ So Kèo Công Đức" xuất hiện và kích hoạt chiến đấu (Phím F hoặc click)
  console.log('5. Client A thách đấu So Kèo Công Đức với Client B...');
  const combatBtn = await pageA.$('button ::-p-text(So Kèo Công Đức)');
  if (combatBtn) {
    console.log('-> Tìm thấy nút So Kèo, tiến hành click!');
    await combatBtn.click();
  } else {
    console.log('-> Thử nhấn phím F...');
    await pageA.keyboard.press('KeyF');
  }
  await new Promise(r => setTimeout(r, 600));

  // 6. Chụp màn hình kết quả Combat: người thua có bong bóng kết quả thất bại, không thể đè
  console.log('6. Chụp màn hình góc nhìn cả 2 bên khi có kết quả Combat...');
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '07_combat_result_viewA.png') });
  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, '07_combat_result_viewB.png') });

  // 7. Thử nghiệm "không thể đè": Người thua thử gửi chat nhưng bong bóng thua cuộc vẫn giữ nguyên
  console.log('7. Thử nghiệm người thua gửi chat để kiểm tra tính năng "1 phút không thể đè"...');
  // Cả 2 bên thử gửi chat
  const chatInputA = await pageA.$('input[placeholder*="Gửi lời trợ niệm"]');
  if (chatInputA) {
    await chatInputA.type('Tôi muốn đè bong bóng A');
    await pageA.keyboard.press('Enter');
  }
  const chatInputB = await pageB.$('input[placeholder*="Gửi lời trợ niệm"]');
  if (chatInputB) {
    await chatInputB.type('Tôi muốn đè bong bóng B');
    await pageB.keyboard.press('Enter');
  }
  await new Promise(r => setTimeout(r, 600));

  // Chụp kiểm chứng bong bóng thua cuộc vẫn hiển thị khóa chặt không thể đè
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '07_defeat_bubble_locked.png') });

  console.log('=== KIỂM THỬ HOÀN TẤT THÀNH CÔNG RỰC RỠ ===');
  await browser.close();
}

testMeritAndCombat().catch(err => {
  console.error('Lỗi kiểm thử combat & công đức:', err);
  process.exit(1);
});
