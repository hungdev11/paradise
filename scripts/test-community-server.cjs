const assert = require('assert');

// Giả lập logic xử lý tin nhắn của server
const wishes = new Map();
const players = new Map([
  ['p1', { id: 'p1', name: 'Đạo Hữu A', merits: 20 }],
  ['p2', { id: 'p2', name: 'Đạo Hữu B', merits: 10 }]
]);

function handleCreateWish(playerId, wishText, color) {
  const p = players.get(playerId);
  if (!p || p.merits < 5) return { error: 'Not enough merits' };
  p.merits -= 5;
  const ribbon = {
    id: `ribbon_${Date.now()}`,
    senderId: p.id,
    senderName: p.name,
    color: color || 'yellow',
    wishText,
    createdAt: Date.now(),
    rejoiceCount: 0,
    rejoicedBy: [],
    branchIndex: Math.floor(Math.random() * 16)
  };
  wishes.set(ribbon.id, ribbon);
  return { success: true, ribbon, newMerits: p.merits };
}

function handleRejoice(readerId, ribbonId) {
  const ribbon = wishes.get(ribbonId);
  const reader = players.get(readerId);
  if (!ribbon || !reader) return { error: 'Not found' };
  if (ribbon.rejoicedBy.includes(readerId)) return { error: 'Already rejoiced' };

  ribbon.rejoicedBy.push(readerId);
  ribbon.rejoiceCount += 1;
  reader.merits += 1; // Người đọc được +1
  const author = players.get(ribbon.senderId);
  if (author) author.merits += 1; // Người viết được +1

  return { success: true, ribbon, readerMerits: reader.merits, authorMerits: author ? author.merits : null };
}

function handleSocialAction(senderId, targetId, action) {
  const sender = players.get(senderId);
  const target = players.get(targetId);
  if (!sender || !target) return { error: 'Player not found' };

  if (action === 'gift_lotus') {
    if (sender.merits < 2) return { error: 'Not enough merits to gift lotus' };
    sender.merits -= 2;
    target.merits += 2;
  }
  return { success: true, action, senderId, targetId, senderMerits: sender.merits, targetMerits: target.merits };
}

// 1. Test tạo lời ước
const wRes = handleCreateWish('p1', 'Cầu quốc thái dân an 🙏', 'red');
assert.strictEqual(wRes.success, true);
assert.strictEqual(wRes.newMerits, 15);
assert.strictEqual(wishes.size, 1);

// 2. Test tùy hỷ
const rRes = handleRejoice('p2', wRes.ribbon.id);
assert.strictEqual(rRes.success, true);
assert.strictEqual(rRes.readerMerits, 11);
assert.strictEqual(rRes.authorMerits, 16);

// 3. Test chống tùy hỷ lặp lại
const rRes2 = handleRejoice('p2', wRes.ribbon.id);
assert.strictEqual(rRes2.error, 'Already rejoiced');

// 4. Test tặng hoa sen
const sRes = handleSocialAction('p1', 'p2', 'gift_lotus');
assert.strictEqual(sRes.success, true);
assert.strictEqual(sRes.senderMerits, 13);
assert.strictEqual(sRes.targetMerits, 13);

console.log('✅ Server community logic unit test passed successfully!');
