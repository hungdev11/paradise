const assert = require('assert');

// Giả lập thuật toán checksum và storage
const SECRET_SALT = 'zen_sacred_merit_salt_2026';
function computeChecksum(stats) {
  const payload = `${stats.fishTaps}|${stats.incenseLit}|${stats.beadCount}|${stats.bellStrikes}|${SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function verifyAndLoad(rawStats, savedChecksum) {
  const currentChecksum = computeChecksum(rawStats);
  if (currentChecksum !== savedChecksum) {
    return { tampered: true, stats: { fishTaps: 0, incenseLit: 0, beadCount: 0, bellStrikes: 0 } };
  }
  return { tampered: false, stats: rawStats };
}

// Case 1: Dữ liệu hợp lệ
const validStats = { fishTaps: 10, incenseLit: 3, beadCount: 108, bellStrikes: 5 };
const validCheck = computeChecksum(validStats);
const res1 = verifyAndLoad(validStats, validCheck);
assert.strictEqual(res1.tampered, false);
assert.strictEqual(res1.stats.fishTaps, 10);

// Case 2: Người dùng sửa F12 đổi fishTaps thành 999999 mà không có checksum hợp lệ
const tamperedStats = { fishTaps: 999999, incenseLit: 3, beadCount: 108, bellStrikes: 5 };
const res2 = verifyAndLoad(tamperedStats, validCheck);
assert.strictEqual(res2.tampered, true);
assert.strictEqual(res2.stats.fishTaps, 0, 'Phải reset về 0 khi bị tamper!');

console.log('✅ Anti-tamper checksum test passed successfully!');
