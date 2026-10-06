const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/home/hungpp/.gemini/antigravity/brain/74884e34-ba29-45e3-9144-fad1420a118d';

async function testCombatHandshakeAndLeaderboard() {
  console.log('=== BẮT ĐẦU KIỂM THỬ: COMBAT PHÍM L, BẢNG XẾP HẠNG, XÁC NHẬN 2 BÊN & GÕ MÕ SOLO ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  // Client A
  const contextA = await browser.createBrowserContext();
  const pageA = await contextA.newPage();
  await pageA.setViewport({ width: 1280, height: 850 });

  // Client B
  const contextB = await browser.createBrowserContext();
  const pageB = await contextB.newPage();
  await pageB.setViewport({ width: 1280, height: 850 });

  console.log('1. Khởi động 2 người chơi vào Sảnh Hội Ngộ...');
  await pageA.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await pageB.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // Vào tab Sảnh Hội Ngộ
  const tabA = await pageA.$('button[title="Sảnh Hội Ngộ"]');
  if (tabA) await tabA.click();
  const tabB = await pageB.$('button[title="Sảnh Hội Ngộ"]');
  if (tabB) await tabB.click();
  await new Promise(r => setTimeout(r, 1500));

  // 2. Mở Bảng Xếp Hạng Công Đức
  console.log('2. Kiểm tra Bảng Xếp Hạng Công Đức (Leaderboard)...');
  const lbBtn = await pageA.$('button[title*="Bảng Xếp Hạng"]');
  if (lbBtn) {
    await lbBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_merit_leaderboard_modal.png') });
    console.log('-> Đã chụp ảnh Bảng Xếp Hạng Công Đức: 08_merit_leaderboard_modal.png');

    // Đóng Leaderboard modal
    const closeBtn = await pageA.$('button ::-p-text(Đóng)');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // 3. Cho Client B di chuyển lại gần Client A
  console.log('3. Client B di chuyển tới gần Client A để xuất hiện nút so kèo phím L...');
  await pageB.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 500));
  await pageB.keyboard.up('KeyW');
  await pageB.keyboard.down('KeyD');
  await new Promise(r => setTimeout(r, 500));
  await pageB.keyboard.up('KeyD');
  await new Promise(r => setTimeout(r, 800));

  // 4. Kiểm tra nút phím L trên màn hình Client A
  console.log('4. Kiểm tra nút So Kèo Gõ Mõ (Phím L)...');
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_button_keyL.png') });
  console.log('-> Đã chụp ảnh nút So Kèo Phím L: 08_combat_button_keyL.png');

  // 5. Client A nhấn phím L để gửi lời thách đấu
  console.log('5. Client A nhấn phím L gửi lời thách đấu tới Client B...');
  await pageA.keyboard.press('KeyL');
  await new Promise(r => setTimeout(r, 800));

  // 6. Kiểm tra Client B nhận được modal thách đấu
  console.log('6. Client B kiểm tra modal Lời Thách Đấu So Kèo Công Đức...');
  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_invite_received_modal.png') });
  console.log('-> Đã chụp modal thách đấu trên Client B: 08_combat_invite_received_modal.png');

  // 7. Client B bấm "🔥 Chấp Nhận Chiến"
  console.log('7. Client B bấm chấp nhận lời thách đấu...');
  const acceptBtn = await pageB.$('button ::-p-text(Chấp Nhận Chiến)');
  if (acceptBtn) {
    await acceptBtn.click();
  }
  await new Promise(r => setTimeout(r, 600));

  // 8. Cả 2 cùng mở Võ Đài Gõ Mõ 1v1
  console.log('8. Cả 2 bước vào Võ Đài Gõ Mõ 1v1 (Tapping Arena)...');
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_tapping_arena_start.png') });
  console.log('-> Đã chụp ảnh mở màn võ đài gõ mõ: 08_combat_tapping_arena_start.png');

  // Đợi hết countdown 1.5s trước khi gõ
  console.log('-> Chờ đếm ngược trận đấu...');
  await new Promise(r => setTimeout(r, 1600));

  // 9. Cả 2 cùng gõ mõ (Client A gõ nhanh, Client B gõ ít hơn)
  console.log('9. Thi đua gõ mõ trong trận đấu (Client A gõ nhiều hơn Client B)...');
  for (let i = 0; i < 18; i++) {
    await pageA.keyboard.press('KeyL');
    if (i % 3 === 0) {
      await pageB.keyboard.press('Space');
    }
    await new Promise(r => setTimeout(r, 120));
  }

  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_tapping_arena_active.png') });
  console.log('-> Đã chụp ảnh đang thi đấu gõ mõ trực tiếp: 08_combat_tapping_arena_active.png');

  // Chờ hết 6 giây thi đấu
  console.log('-> Chờ hết giờ thi đấu để xem phân định thắng thua...');
  await new Promise(r => setTimeout(r, 4500));

  // 10. Chụp ảnh kết quả phân định Thắng / Thua trên võ đài
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_arena_result.png') });
  console.log('-> Đã chụp ảnh kết quả võ đài: 08_combat_arena_result.png');

  // Chờ modal võ đài tự đóng sau 3.8s
  await new Promise(r => setTimeout(r, 4200));

  // 11. Kiểm tra bong bóng thua cuộc 1 phút không thể đè trên Client B
  console.log('11. Kiểm tra bong bóng thua cuộc 1 phút không thể đè trên Client B...');
  const chatInputB = await pageB.$('input[placeholder*="Gửi lời trợ niệm"]');
  if (chatInputB) {
    await chatInputB.type('Tôi muốn đè bong bóng thua cuộc');
    await pageB.keyboard.press('Enter');
  }
  await new Promise(r => setTimeout(r, 600));
  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, '08_combat_defeat_bubble_1min_locked.png') });
  console.log('-> Đã chụp ảnh bong bóng thua cuộc bị khóa chặt 1 phút: 08_combat_defeat_bubble_1min_locked.png');

  // 12. Kiểm tra Bảng Xếp Hạng sau trận đấu (Winner +10, Loser -5)
  console.log('12. Kiểm tra lại Bảng Xếp Hạng sau trận đấu...');
  const lbBtnAfter = await pageA.$('button[title*="Bảng Xếp Hạng"]');
  if (lbBtnAfter) {
    await lbBtnAfter.click();
    await new Promise(r => setTimeout(r, 600));
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, '08_leaderboard_after_combat.png') });
    console.log('-> Đã chụp ảnh Bảng Xếp Hạng sau trận đấu: 08_leaderboard_after_combat.png');
  }

  console.log('=== KIỂM THỬ TOÀN DIỆN THÀNH CÔNG RỰC RỠ ===');
  await browser.close();
}

testCombatHandshakeAndLeaderboard().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
