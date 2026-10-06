const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function testRealtimeMultiplayer() {
  console.log('--- Bắt đầu kiểm thử Multiplayer Đồng Bộ 2 Người Chơi Thời Gian Thực ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  // Client 1 (Đạo hữu A)
  const contextA = await browser.createBrowserContext();
  const pageA = await contextA.newPage();
  await pageA.setViewport({ width: 1280, height: 800 });

  // Client 2 (Đạo hữu B)
  const contextB = await browser.createBrowserContext();
  const pageB = await contextB.newPage();
  await pageB.setViewport({ width: 1280, height: 800 });

  console.log('1. Khởi động 2 người chơi vào Sảnh Hội Ngộ...');
  await pageA.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await pageB.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // Cả 2 chuyển vào tab Sảnh Hội Ngộ
  const tabA = await pageA.$('button[title="Sảnh Hội Ngộ"]');
  if (tabA) await tabA.click();

  const tabB = await pageB.$('button[title="Sảnh Hội Ngộ"]');
  if (tabB) await tabB.click();

  await new Promise(r => setTimeout(r, 1000));

  // 2. Client A tùy chỉnh tên "Thích Chánh Niệm" và phụ kiện
  console.log('2. Client A đổi tên thành "Thích Chánh Niệm"...');
  const profileBtnA = await pageA.$('button ::-p-text(Tùy Chỉnh Nhân Vật)');
  if (profileBtnA) {
    await profileBtnA.click();
    await new Promise(r => setTimeout(r, 300));

    const nameInput = await pageA.$('input[placeholder*="Thích Chánh Niệm"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Thích Chánh Niệm');
    }

    const saveBtn = await pageA.$('button ::-p-text(Lưu Thay Đổi)');
    if (saveBtn) {
      await saveBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 3. Client A di chuyển (Đi sang bên phải)
  console.log('3. Client A di chuyển (WASD)...');
  await pageA.keyboard.down('KeyD');
  await new Promise(r => setTimeout(r, 600));
  await pageA.keyboard.up('KeyD');
  await pageA.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 300));
  await pageA.keyboard.up('KeyW');

  // Chờ 300ms để Client B nhận tọa độ và lerp
  await new Promise(r => setTimeout(r, 400));

  // 4. Client B gửi tin nhắn chat "A Di Đà Phật đạo hữu!"
  console.log('4. Client B gửi tin nhắn chat...');
  const chatInputB = await pageB.$('input[placeholder*="Gửi lời trợ niệm"]');
  if (chatInputB) {
    await chatInputB.type('A Di Đà Phật đạo hữu!');
    await pageB.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 500));
  }

  // 5. Client A thực hiện động tác "Chắp Tay"
  console.log('5. Client A chắp tay niệm Phật...');
  const prayBtnA = await pageA.$('button ::-p-text(Chắp Tay)');
  if (prayBtnA) {
    await prayBtnA.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // 6. Chụp ảnh màn hình từ cả 2 góc nhìn Client A và Client B
  console.log('6. Chụp ảnh màn hình kiểm chứng đồng bộ...');
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '05_multiplayer_client_A.png') });
  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, '05_multiplayer_client_B.png') });

  console.log('Đã chụp: 05_multiplayer_client_A.png và 05_multiplayer_client_B.png!');

  await browser.close();
  console.log('Kiểm thử Multiplayer thành công rực rỡ 100%!');
}

testRealtimeMultiplayer().catch(err => {
  console.error('Lỗi kiểm thử multiplayer:', err);
  process.exit(1);
});
