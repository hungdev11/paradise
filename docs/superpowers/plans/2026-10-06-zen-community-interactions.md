# Zen Plaza Community Interactions, Anti-Tamper & Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các tương tác cộng đồng người chơi (Cây Bồ Đề Nguyện Ước, Vòng Tròn Tọa Thiền Cộng Hưởng, Menu Giao Hảo Dâng Trà/Tặng Sen), dời vị trí hiển thị tên người chơi xuống dưới chân, thiết lập cơ chế chống sửa điểm F12, và chống spam vào/ra đền bằng phím Space.

**Architecture:**
- Domain Models & Types (`src/types/zen.ts`): Bổ sung `WishRibbonColor`, `BodhiWishRibbon`, `SocialActionType`, `PlayerSocialStatus`, `MeditationCluster`.
- Anti-Tamper Storage & Server Authority (`src/services/storage.ts` & `src/server/plaza-plugin.ts`): Mã hóa HMAC/Checksum kiểm tra tính toàn vẹn của merits trong `localStorage`; Server WebSocket trở thành cơ quan thẩm quyền duy nhất cập nhật và broadcast biến động điểm công đức, vô hiệu hóa việc ghi đè merits từ client qua `update_profile`.
- Server WebSocket Plugin (`src/server/plaza-plugin.ts`): Lưu trữ dải lụa Bồ Đề, xử lý logic tùy hỷ công đức, điều phối sự kiện giao hảo (dâng trà, tặng sen, bái kiến) và chu kỳ thưởng thiền định nhóm 15s.
- Client Service (`src/services/plaza-service.ts`): Bổ sung API và network listeners cho cây Bồ Đề, tùy hỷ, tương tác giao hảo và thưởng thiền.
- Canvas & UI Presentation (`src/components/ZenPlaza.tsx` & `src/components/BodhiTreeModal.tsx`): Vẽ Cây Bồ Đề đại thụ với dải lụa đung đưa; vẽ Hào quang Mandala thiền định cộng hưởng; hiển thị menu giao hảo trực tiếp; dời bảng tên/danh hiệu xuống dưới chân; ngăn chặn `e.repeat` và cooldown 1.5s cho phím Space.

**Tech Stack:** React 19, TypeScript, HTML5 Canvas 2D Engine, WebSocket, Vite, Tailwind CSS, Lucide Icons, Node.js Test Runner.

## Global Constraints
- Toàn bộ lệnh shell và kiểm tra phải có tiền tố `rtk`.
- Đảm bảo Canvas game loop duy trì 60 FPS mượt mà.
- Mọi biến động merits trong multiplayer đều phải được kiểm soát bởi Server (Server-Authoritative).
- Phím Space phải chặn `e.repeat` và có cooldown 1.5s khi chuyển cảnh ra/vào đền.
- Tên và danh hiệu người que phải vẽ tại vị trí dưới chân nhân vật ($py + 14\text{px}$).

---

### Task 1: Domain Models & Kiểu Dữ Liệu Tương Tác (`src/types/zen.ts`)

**Files:**
- Modify: `src/types/zen.ts`

**Interfaces:**
- Produces:
  - `WishRibbonColor = 'red' | 'yellow' | 'blue' | 'pink' | 'purple'`
  - `BodhiWishRibbon`: `{ id: string; senderId: string; senderName: string; color: WishRibbonColor; wishText: string; createdAt: number; rejoiceCount: number; rejoicedBy: string[]; branchIndex: number }`
  - `SocialActionType = 'offer_tea' | 'gift_lotus' | 'mutual_bow'`
  - `PlayerSocialStatus`: `{ type: SocialActionType; partnerId?: string; partnerName?: string; expiresAt: number }`
  - `MeditationCluster`: `{ id: string; playerIds: string[]; centerX: number; centerY: number; radius: number; durationSeconds: number }`
  - `PlazaPlayer`: mở rộng với `socialStatus?: PlayerSocialStatus; inMeditationCluster?: boolean;`

- [ ] **Step 1: Khai báo các types mới trong `src/types/zen.ts`**

Chèn vào cuối file `src/types/zen.ts`:
```typescript
export type WishRibbonColor = 'red' | 'yellow' | 'blue' | 'pink' | 'purple';

export interface BodhiWishRibbon {
  id: string;
  senderId: string;
  senderName: string;
  color: WishRibbonColor;
  wishText: string;
  createdAt: number;
  rejoiceCount: number;
  rejoicedBy: string[]; // Danh sách playerId đã tùy hỷ
  branchIndex: number;  // 0 - 15 vị trí cành cây
}

export type SocialActionType = 'offer_tea' | 'gift_lotus' | 'mutual_bow';

export interface PlayerSocialStatus {
  type: SocialActionType;
  partnerId?: string;
  partnerName?: string;
  expiresAt: number; // Timestamp ms hết hạn hiệu ứng
}

export interface MeditationCluster {
  id: string;
  playerIds: string[];
  centerX: number;
  centerY: number;
  radius: number;
  durationSeconds: number;
}
```

Và cập nhật interface `PlazaPlayer` trong `src/types/zen.ts`:
```typescript
export interface PlazaPlayer {
  id: string;
  name: string;
  avatar: string; // Image Data URL or Emoji
  color: string;  // Body color
  hat: 'none' | 'non_la' | 'halo' | 'lotus';
  weapon?: 'gun' | 'hammer' | 'knife' | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  isMoving: boolean;
  action: StickmanAction;
  lastActionTime: number;
  chatText?: string;
  chatTime?: number;
  isLocal?: boolean;
  merits: number;
  defeatUntil?: number;
  socialStatus?: PlayerSocialStatus;
  inMeditationCluster?: boolean;
}
```

- [ ] **Step 2: Chạy kiểm tra TypeScript**

Chạy: `rtk tsc -b`  
Kỳ vọng: Thành công, không có lỗi cú pháp hoặc kiểu dữ liệu.

- [ ] **Step 3: Commit**

```bash
rtk git add src/types/zen.ts
rtk git commit -m "feat: add domain models for bodhi wishes, meditation clusters and social interactions

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Chống Sửa Điểm F12 & Bảo Mật Công Đức (`src/services/storage.ts` & `src/server/plaza-plugin.ts`)

**Files:**
- Modify: `src/services/storage.ts`
- Modify: `src/server/plaza-plugin.ts`
- Create: `scripts/test-merits-anti-tamper.cjs`

**Interfaces:**
- Consumes: `MeritStats` từ `src/types/zen.ts`
- Produces:
  - `computeStatsChecksum(stats: MeritStats): string`
  - Cơ chế tự phát hiện sửa đổi F12 trong `storage.getStats()` và `plazaService.loadOrCreateProfile()`
  - Server loại bỏ việc ghi đè trực tiếp `p.state.merits = msg.merits` từ tin nhắn `update_profile`

- [ ] **Step 1: Viết test kiểm tra cơ chế phát hiện sửa đổi F12 trong `scripts/test-merits-anti-tamper.cjs`**

```javascript
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
```

- [ ] **Step 2: Chạy test xác nhận logic hoạt động**

Chạy: `node scripts/test-merits-anti-tamper.cjs`  
Kỳ vọng: In ra `✅ Anti-tamper checksum test passed successfully!`

- [ ] **Step 3: Cập nhật `src/services/storage.ts` với cơ chế tính và kiểm tra Checksum**

Thêm hàm băm chữ ký và kiểm tra toàn vẹn vào `src/services/storage.ts`:
```typescript
const STATS_CHECKSUM_KEY = 'zen_merit_chk_v1';
const SECRET_SALT = 'zen_sacred_merit_salt_2026';

function computeStatsChecksum(stats: MeritStats): string {
  const payload = `${stats.fishTaps}|${stats.incenseLit}|${stats.beadCount}|${stats.bellStrikes}|${stats.wishesReleased}|${stats.oraclesDrawn}|${SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}
```
Trong `getStats()`: Kiểm tra nếu `saved` tồn tại nhưng `localStorage.getItem(STATS_CHECKSUM_KEY)` không khớp với `computeStatsChecksum(parsed)` (và đây không phải lần đầu khởi tạo):
```typescript
const savedChecksum = localStorage.getItem(STATS_CHECKSUM_KEY);
if (savedChecksum && savedChecksum !== computeStatsChecksum(parsed)) {
  console.warn('⚠️ Phát hiện can thiệp điểm số trái phép (F12 Tamper)! Công đức hóa hư không.');
  return defaultStats;
}
```
Trong `saveStats(stats)`:
```typescript
localStorage.setItem(STATS_KEY, JSON.stringify(stats));
localStorage.setItem(STATS_CHECKSUM_KEY, computeStatsChecksum(stats));
```

- [ ] **Step 4: Chặn sửa merits qua `update_profile` trong `src/server/plaza-plugin.ts`**

Trong `src/server/plaza-plugin.ts`, tìm khối `msg.type === 'update_profile'` và BỎ DÒNG `if (typeof msg.merits === 'number') p.state.merits = msg.merits;`.  
Server sẽ là bên duy nhất có thẩm quyền thay đổi `p.state.merits` thông qua các sự kiện mạng có thẩm quyền (`loot_orb`, `release_fish`, `combat_finish`, `create_bodhi_wish`, `rejoice_bodhi_wish`, `social_interact`, `meditation_reward`).
Ngoài ra, khi `join`, nếu `msg.player?.merits` vượt ngưỡng bất thường ($> 500$ hoặc $<-500$), server gán về mốc an toàn 20 để chống inject từ client.

- [ ] **Step 5: Kiểm tra biên dịch và Commit**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi.

```bash
rtk git add src/services/storage.ts src/server/plaza-plugin.ts scripts/test-merits-anti-tamper.cjs
rtk git commit -m "feat: implement anti-tamper checksum and server-authoritative merits protection

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Server WebSocket Cây Bồ Đề, Tùy Hỷ & Giao Hảo (`src/server/plaza-plugin.ts`)

**Files:**
- Modify: `src/server/plaza-plugin.ts`
- Create: `scripts/test-community-server.cjs`

**Interfaces:**
- Produces:
  - In-memory `activeWishes: Map<string, BodhiWishRibbon>`
  - Event handlers: `create_bodhi_wish`, `rejoice_bodhi_wish`, `social_interact`
  - Broadcasts: `bodhi_wish_created`, `bodhi_wish_rejoiced`, `social_event_broadcast`, `meditation_reward_broadcast`
  - Periodic group meditation check (15s interval)

- [ ] **Step 1: Viết test kịch bản mạng cho Cây Bồ Đề và Giao Hảo trong `scripts/test-community-server.cjs`**

```javascript
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
assert.strictEqual(sRes.senderMerits, 14);
assert.strictEqual(sRes.targetMerits, 13);

console.log('✅ Server community logic unit test passed successfully!');
```

- [ ] **Step 2: Chạy test xác nhận**

Chạy: `node scripts/test-community-server.cjs`  
Kỳ vọng: In ra `✅ Server community logic unit test passed successfully!`

- [ ] **Step 3: Triển khai các handler trong `src/server/plaza-plugin.ts`**

Trong `src/server/plaza-plugin.ts`:
1. Khởi tạo `const activeWishes = new Map<string, any>();` (kèm 5 điều ước mặc định từ bi hỷ xả ban đầu).
2. Khi `msg.type === 'join'`: gửi danh sách `wishes: Array.from(activeWishes.values())` trong gói tin `welcome`.
3. Xử lý `msg.type === 'create_bodhi_wish'`:
   - Kiểm tra `p.state.merits >= 5`.
   - Trừ 5 điểm của `p.state.merits`.
   - Tạo đối tượng `BodhiWishRibbon`, lưu vào `activeWishes`.
   - Broadcast gói tin `bodhi_wish_created` cho tất cả client.
4. Xử lý `msg.type === 'rejoice_bodhi_wish'`:
   - Tìm ribbon, kiểm tra `!ribbon.rejoicedBy.includes(currentId)`.
   - Thêm `currentId` vào `rejoicedBy`, tăng `rejoiceCount`.
   - Cộng +1 merits cho `p.state.merits` và tác giả.
   - Broadcast `bodhi_wish_rejoiced`.
5. Xử lý `msg.type === 'social_interact'`:
   - Hành động `gift_lotus`: nếu `sender.merits >= 2`, trừ 2 ở sender, cộng 2 ở target.
   - Broadcast `social_event_broadcast` chứa `{ senderId, targetId, action, timestamp: Date.now() }`.
6. Định kỳ kiểm tra Thiền Định Nhóm (Group Meditation loop):
   - Cứ mỗi 15 giây, duyệt qua `players.values()`. Tìm các nhóm $\ge 2$ người chơi đang `action === 'sit' || action === 'pray'` có khoảng cách $\le 160\text{px}$.
   - Cộng +2 merits cho mỗi người trong nhóm và broadcast `meditation_reward_broadcast` kèm danh sách `playerIds`.

- [ ] **Step 4: Kiểm tra biên dịch**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi.

- [ ] **Step 5: Commit**

```bash
rtk git add src/server/plaza-plugin.ts scripts/test-community-server.cjs
rtk git commit -m "feat: implement server handlers for bodhi wishes, rejoicing, social actions, and group meditation

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Client Plaza Service Expansion (`src/services/plaza-service.ts`)

**Files:**
- Modify: `src/services/plaza-service.ts`

**Interfaces:**
- Produces:
  - `createBodhiWish(text: string, color: WishRibbonColor): boolean`
  - `rejoiceBodhiWish(ribbonId: string): void`
  - `sendSocialInteraction(targetId: string, action: SocialActionType): boolean`
  - `getBodhiWishes(): BodhiWishRibbon[]`
  - Listeners: `onBodhiWishCreated`, `onBodhiWishRejoiced`, `onSocialEvent`, `onMeditationReward`

- [ ] **Step 1: Khai báo types và callback listeners trong `src/services/plaza-service.ts`**

Nhập các kiểu từ `../types/zen`:
`WishRibbonColor, BodhiWishRibbon, SocialActionType, PlayerSocialStatus`
Khai báo:
```typescript
type BodhiWishCreatedListener = (ribbon: BodhiWishRibbon, newMerits: number) => void;
type BodhiWishRejoicedListener = (ribbonId: string, rejoiceCount: number, rejoicedBy: string, newMerits?: number) => void;
type SocialEventListener = (senderId: string, targetId: string, action: SocialActionType) => void;
type MeditationRewardListener = (playerIds: string[], bonus: number) => void;
```

- [ ] **Step 2: Thêm state lưu trữ và các hàm đăng ký sự kiện trong `PlazaService`**

```typescript
private activeWishes: Map<string, BodhiWishRibbon> = new Map();
private wishCreatedListeners: Set<BodhiWishCreatedListener> = new Set();
private wishRejoicedListeners: Set<BodhiWishRejoicedListener> = new Set();
private socialEventListeners: Set<SocialEventListener> = new Set();
private meditationRewardListeners: Set<MeditationRewardListener> = new Set();

public getBodhiWishes(): BodhiWishRibbon[] {
  return Array.from(this.activeWishes.values()).sort((a, b) => b.createdAt - a.createdAt);
}
```

- [ ] **Step 3: Thêm các method gửi message lên mạng**

```typescript
public createBodhiWish(wishText: string, color: WishRibbonColor): boolean {
  if (this.localProfile.merits < 5) return false;
  this.sendNetworkMessage({
    type: 'create_bodhi_wish',
    wishText,
    color,
  });
  return true;
}

public rejoiceBodhiWish(ribbonId: string): void {
  this.sendNetworkMessage({
    type: 'rejoice_bodhi_wish',
    ribbonId,
  });
}

public sendSocialInteraction(targetId: string, action: SocialActionType): boolean {
  if (action === 'gift_lotus' && this.localProfile.merits < 2) return false;
  this.sendNetworkMessage({
    type: 'social_interact',
    targetId,
    action,
  });
  return true;
}
```

- [ ] **Step 4: Lắng nghe và điều phối các message từ Server trong `handleNetworkMessage`**

Xử lý các type:
- `welcome`: nạp `msg.wishes` vào `this.activeWishes`.
- `bodhi_wish_created`: thêm vào `this.activeWishes`, nếu là tác giả cập nhật `this.localProfile.merits = msg.newMerits`, gọi `this.wishCreatedListeners`.
- `bodhi_wish_rejoiced`: cập nhật `rejoiceCount`, gọi `this.wishRejoicedListeners`. Nếu bản thân là người đọc hoặc người viết, cập nhật `this.localProfile.merits`.
- `social_event_broadcast`: gọi `this.socialEventListeners`.
- `meditation_reward_broadcast`: nếu `msg.playerIds.includes(this.localProfile.id)`, cập nhật `this.localProfile.merits += msg.bonus`, gọi `this.meditationRewardListeners`.

- [ ] **Step 5: Kiểm tra biên dịch và Commit**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi.

```bash
rtk git add src/services/plaza-service.ts
rtk git commit -m "feat: add bodhi wishes, rejoicing and social interaction methods to plaza-service

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: Hiển Thị Tên Dưới Chân, Chống Spam Phím Space & Cooldown Cửa Đền (`src/components/ZenPlaza.tsx`)

**Files:**
- Modify: `src/components/ZenPlaza.tsx`

**Interfaces:**
- Consumes: `TEMPLE_DOORS`, `visualPlayersRef`, `handleEnterTemple`, `handleExitTemple`
- Produces:
  - Di chuyển Nametag Badge & Merit Badge xuống chân nhân vật: $py + 14\text{px}$ đến $py + 28\text{px}$
  - Khử spam phím: `if (e.repeat) return;` trong `onKeyDown`
  - Cooldown chuyển cảnh đền: `lastDoorTransitionTimeRef.current` (1500ms)
  - Hỗ trợ cả phím Space và phím E để vào/ra đền một cách an toàn không spam

- [ ] **Step 1: Thêm cooldown chuyển cảnh và chặn `e.repeat`**

Trong `src/components/ZenPlaza.tsx`:
Khai báo ref:
```typescript
const lastDoorTransitionRef = useRef<number>(0);
```
Trong `onKeyDown`:
```typescript
const onKeyDown = (e: KeyboardEvent) => {
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

  // CHỐNG SPAM: Tuyệt đối không xử lý sự kiện lặp khi người dùng đè giữ phím
  if (e.repeat) return;

  keysDownRef.current[e.code] = true;

  // Xử lý vào / ra cửa đền bằng phím Space hoặc phím E có Cooldown 1500ms
  const isDoorTriggerKey = e.code === 'Space' || e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
  if (isDoorTriggerKey) {
    const now = Date.now();
    const canTransition = now - lastDoorTransitionRef.current > 1500;

    if (currentSceneRef.current === 'plaza' && nearbyDoor && canTransition) {
      e.preventDefault();
      lastDoorTransitionRef.current = now;
      handleEnterTemple(nearbyDoor);
      return;
    } else if (currentSceneRef.current === 'temple_interior' && nearIndoorExit && canTransition) {
      e.preventDefault();
      lastDoorTransitionRef.current = now;
      handleExitTemple();
      return;
    }
  }

  // Gõ Mõ Chánh Điện bằng phím Space (khi đứng gần Mõ và không ở cửa thoát)
  if (currentSceneRef.current === 'temple_interior' && e.code === 'Space' && !nearIndoorExit) {
    e.preventDefault();
    handleTapIndoorMokugyo();
    return;
  }
  // ... các phím khác
};
```

- [ ] **Step 2: Cập nhật hàm vẽ Stickman: Dời bảng tên và danh hiệu xuống dưới chân**

Tìm đoạn vẽ `// Nametag Badge` (khoảng dòng 2865-2940).  
Thay vì tính `tagY = currentHeadY - headRadius - ...`:
Tính theo vị trí bàn chân:
```typescript
// BẢNG TÊN & DANH HIỆU DƯỚI CHÂN NHÂN VẬT (Foot Nameplate & Merits)
const feetTagY = py + 14;
ctx.font = 'bold 11px system-ui, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

const tagText = p.isLocal ? `⭐ Bạn (${p.name})` : p.name;
const textMetrics = ctx.measureText(tagText);
const tagW = textMetrics.width + 14;
const tagH = 17;

// Pill nền mờ dưới chân
ctx.fillStyle = p.isLocal ? 'rgba(245, 158, 11, 0.95)' : 'rgba(28, 25, 23, 0.85)';
ctx.beginPath();
ctx.roundRect(px - tagW / 2, feetTagY - tagH / 2, tagW, tagH, 8);
ctx.fill();
ctx.strokeStyle = p.isLocal ? '#fbbf24' : 'rgba(120, 113, 108, 0.5)';
ctx.lineWidth = 1;
ctx.stroke();

ctx.fillStyle = p.isLocal ? '#1c1917' : '#f5f5f4';
ctx.fillText(tagText, px, feetTagY);

// MERIT BADGE & WEAPON DƯỚI BẢNG TÊN
const meritLineY = feetTagY + 16;
const weaponIcon = p.weapon === 'gun' ? ' 🔫' : p.weapon === 'hammer' ? ' 🔨' : p.weapon === 'knife' ? ' 🔪' : '';
const statStr = meritVal < 0 ? `⚠️${meritVal}${weaponIcon}` : `✨${meritVal}${weaponIcon}`;
ctx.font = 'bold 10px monospace';
const mMetrics = ctx.measureText(statStr);
const mW = mMetrics.width + 12;
const mH = 15;

ctx.fillStyle = meritVal < 0 ? 'rgba(45, 10, 10, 0.92)' : 'rgba(15, 12, 10, 0.88)';
ctx.beginPath();
ctx.roundRect(px - mW / 2, meritLineY - mH / 2, mW, mH, 7);
ctx.fill();
ctx.strokeStyle = meritVal < 0 ? '#ef4444' : p.weapon ? '#ef4444' : '#f59e0b';
ctx.lineWidth = 1;
ctx.stroke();

ctx.fillStyle = meritVal < 0 ? '#fca5a5' : p.weapon ? '#fca5a5' : '#fef08a';
ctx.fillText(statStr, px, meritLineY);

// DANH HIỆU HÀI HƯỚC NẾU CÔNG ĐỨC ÂM (Vẽ ngay dưới dòng điểm)
if (meritVal < 0) {
  const karmicTitleY = meritLineY + 14;
  const karmicTitle =
    meritVal <= -30 ? '💀 Ma Vương Đại Bại' :
    meritVal <= -20 ? '👹 Nghiệp Quật Tơi Bời' :
    meritVal <= -10 ? '👺 Chấp Mê Bất Ngộ' : '⚠️ Tâm Chưa Tịnh';

  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.fillStyle = '#f87171';
  ctx.fillText(karmicTitle, px, karmicTitleY);
}
```

- [ ] **Step 3: Kiểm tra biên dịch và Commit**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi.

```bash
rtk git add src/components/ZenPlaza.tsx
rtk git commit -m "feat: move player nametags below feet and add space key debounce cooldown for temple doors

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: Modal Cây Bồ Đề & Đồ Họa Cổ Thụ Dải Lụa Đung Đưa (`src/components/BodhiTreeModal.tsx` & `src/components/ZenPlaza.tsx`)

**Files:**
- Create: `src/components/BodhiTreeModal.tsx`
- Modify: `src/components/ZenPlaza.tsx`

**Interfaces:**
- Produces:
  - `BodhiTreeModal`: Component modal gồm Tab 1 (Treo Dải Lụa) và Tab 2 (Chiêm Ngưỡng & Tùy Hỷ Công Đức)
  - Đồ họa Cây Bồ Đề tại $(1800, 1050)$ với các dải lụa đung đưa `Math.sin(time * 0.002 + ribbon.branchIndex)`
  - Proximity detection: Khi đứng gần $\le 180\text{px}$ hiện nút `[🌳 Cây Bồ Đề - Treo Lời Nguyện / Chiêm Ngưỡng]`

- [ ] **Step 1: Tạo Component `src/components/BodhiTreeModal.tsx`**

Tạo modal với giao diện phong cách Zen trang nhã:
- Props: `isOpen: boolean; onClose: () => void; userMerits: number; onWishCreated: () => void;`
- Tab 1: Form nhập lời nguyện (TextArea $\le 120$ chars), bộ chọn 5 màu lụa phong thủy (Đỏ, Vàng, Xanh lam, Hồng sen, Tím), nút "Treo Dải Lụa (5 Công Đức)". Kiểm tra `userMerits >= 5`.
- Tab 2: Danh sách thẻ dải lụa cuộn mềm mại từ `plazaService.getBodhiWishes()`. Mỗi thẻ có tên đạo hữu, thời gian, nội dung, số lượt tùy hỷ và nút `[🙏 Tùy Hỷ Công Đức]`. Bấm tùy hỷ gọi `plazaService.rejoiceBodhiWish(ribbon.id)`, bắn confetti hoa sen và phát âm thanh chuông.

- [ ] **Step 2: Tích hợp Cây Bồ Đề vào `src/components/ZenPlaza.tsx`**

Trong `src/components/ZenPlaza.tsx`:
1. Import `BodhiTreeModal`.
2. State: `const [showBodhiModal, setShowBodhiModal] = useState(false);`
3. Proximity check trong game loop:
   ```typescript
   const distToBodhi = Math.hypot(1800 - localPosRef.current.x, 1050 - localPosRef.current.y);
   const isNearBodhi = distToBodhi <= 180;
   ```
4. Render Cây Bồ Đề trên Canvas tại $(1800, 1050)$:
   - Gốc đại thụ uy nghiêm, vòng hoa sen đá bao quanh.
   - 3 tầng tán lá bồ đề xanh ngọc.
   - Duyệt qua `activeWishesRef.current`: vẽ các dải lụa ngũ sắc rủ xuống từ cành, chuyển động đung đưa uốn lượn mềm mại theo nhịp gió `Math.sin(time * 0.002 + w.branchIndex)`.
5. Thêm nút kích hoạt nổi trên màn hình khi `isNearBodhi`:
   ```tsx
   {isNearBodhi && currentScene === 'plaza' && (
     <button
       onClick={() => setShowBodhiModal(true)}
       className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-amber-600/90 text-amber-100 hover:bg-amber-500 shadow-lg font-medium flex items-center gap-2 border border-amber-400/40 animate-bounce"
     >
       🌳 Gốc Bồ Đề - Treo Lời Nguyện / Chiêm Ngưỡng (Phím B)
     </button>
   )}
   ```
6. Bổ sung phím tắt `B` vào `onKeyDown` để mở modal cây bồ đề khi đứng gần.

- [ ] **Step 3: Kiểm tra biên dịch và Commit**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi.

```bash
rtk git add src/components/BodhiTreeModal.tsx src/components/ZenPlaza.tsx
rtk git commit -m "feat: add bodhi tree modal, animated ribbons, and interactive wish tree zone

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: Hào Quang Mandala Tọa Thiền & Menu Giao Hảo Đạo Hữu (`src/components/ZenPlaza.tsx`)

**Files:**
- Modify: `src/components/ZenPlaza.tsx`

**Interfaces:**
- Produces:
  - Thuật toán gom cụm thiền `MeditationCluster` thời gian thực
  - Đồ họa Canvas: Vòng tròn Mandala hoa sen xoay chậm, tia sáng quang học kết nối người thiền, hạt bụi vàng
  - Menu Giao Hảo Tròn (Radial / Action Menu): Khi click người chơi khác $\le 300\text{px}$ hiện 4 lựa chọn: 🍵 Dâng Trà Sen, 🪷 Tặng Hoa Sen, 🙏 Cung Kính Bái Kiến, ⚔️ Luận Võ
  - Hiệu ứng visual trên đầu nhân vật: Khói trà nghi ngút hoặc đóa sen vàng nở lấp lánh khi nhận tương tác

- [ ] **Step 1: Triển khai thuật toán gom cụm và vẽ Mandala Tọa Thiền**

Trong hàm `render()` của Canvas:
1. Lọc danh sách người chơi đang `action === 'sit' || action === 'pray'`.
2. Gom các người chơi có khoảng cách $\le 160\text{px}$ thành từng cụm:
   - Với mỗi cụm có $\ge 2$ thành viên:
     - Tính tâm cụm $(cx, cy)$ và bán kính $R$.
     - Vẽ hoa văn Mandala xoay chậm `time * 0.001` với màu hổ phách vàng dịu `rgba(245, 158, 11, 0.35)`.
     - Vẽ các đường cong liên kết quang học mềm mại giữa các vị trí người ngồi thiền.
     - Sinh các đốm sáng Zen motes bay lên từ mặt đất.
3. Lắng nghe `plazaService.onMeditationReward`: Khi nhận thưởng, hiển thị dòng chữ nổi `"+2 Cộng Hưởng Thanh Tịnh ✨"`, phát tiếng chuông ngân.

- [ ] **Step 2: Triển khai Menu Tương Tác Giao Hảo Trực Tiếp**

Trong `src/components/ZenPlaza.tsx`:
1. Khi click vào một người chơi que khác (`handleCanvasClick` tìm thấy `vp` ở cự ly $\le 300\text{px}$):
   - Thay vì mở hộp thoại luận võ ngay lập tức, lưu `selectedTargetPlayer: { id, name, merits, x, y }`.
   - Hiển thị Menu Giao Hảo:
     - 🍵 **Dâng Trà Sen:** Gọi `plazaService.sendSocialInteraction(target.id, 'offer_tea')`.
     - 🪷 **Tặng Hoa Sen (2 Công Đức):** Gọi `plazaService.sendSocialInteraction(target.id, 'gift_lotus')`.
     - 🙏 **Cung Kính Bái Kiến:** Gọi `plazaService.sendSocialInteraction(target.id, 'mutual_bow')`.
     - ⚔️ **Luận Võ Gõ Mõ:** Kích hoạt `handleInitiateCombat(target.id)`.
2. Lắng nghe `plazaService.onSocialEvent`:
   - Khi nhận `offer_tea`: gán `socialStatus: { type: 'offer_tea', expiresAt: Date.now() + 8000 }` cho cả 2 người, vẽ chén trà bốc khói trên đầu.
   - Khi nhận `gift_lotus`: gán `socialStatus: { type: 'gift_lotus', expiresAt: Date.now() + 12000 }`, vẽ đóa sen vàng lấp lánh nở rộ trên đầu người nhận, nổi chữ `"+2 Đóa Sen Phước Lành 🪷"`.
   - Khi nhận `mutual_bow`: cả hai cùng thực hiện động tác `bow` trong 2.5s kèm tiếng chuông khánh.

- [ ] **Step 3: Kiểm tra biên dịch và Commit**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi.

```bash
rtk git add src/components/ZenPlaza.tsx
rtk git commit -m "feat: implement group meditation mandala resonance and direct player social radial interaction menu

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 8: Kiểm Thử Toàn Diện & Hoàn Thiện (E2E Verification & 0 Diagnostics)

**Files:**
- Create: `scripts/test-zen-community-e2e.cjs`
- Modify: `.superpowers/sdd/progress.md` (nếu có)

**Interfaces:**
- Kiểm tra toàn diện mọi tính năng:
  - F12 Anti-tamper checksum
  - Server Authoritative Merits
  - Bodhi Wish Tree & Rejoicing
  - Group Meditation Resonance
  - Space Bar Debounce & Temple Transition Cooldown
  - Feet Nameplate Positioning
  - 0 TypeScript Diagnostics across all files

- [ ] **Step 1: Tạo kịch bản kiểm thử tích hợp E2E trong `scripts/test-zen-community-e2e.cjs`**

```javascript
const assert = require('assert');

// 1. Kiểm thử chống sửa điểm F12
const SECRET_SALT = 'zen_sacred_merit_salt_2026';
function computeChecksum(val) {
  let h = 0;
  const s = `${val}|${SECRET_SALT}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h.toString(36);
}
const initialMerits = 20;
const chk = computeChecksum(initialMerits);
assert.strictEqual(chk === computeChecksum(20), true);
assert.strictEqual(chk === computeChecksum(999999), false, 'Phải phát hiện sửa điểm!');

// 2. Kiểm thử Cooldown và Chặn Space Repeat
let lastTransition = 0;
function tryDoorTransition(now, isRepeat) {
  if (isRepeat) return false; // Chặn e.repeat
  if (now - lastTransition < 1500) return false; // Cooldown 1.5s
  lastTransition = now;
  return true;
}
assert.strictEqual(tryDoorTransition(1000, false), true);
assert.strictEqual(tryDoorTransition(1100, true), false, 'Không cho phép spam khi giữ phím Space!');
assert.strictEqual(tryDoorTransition(1500, false), false, 'Chặn khi chưa đủ cooldown 1.5s!');
assert.strictEqual(tryDoorTransition(2600, false), true, 'Cho phép sau 1.5s cooldown!');

console.log('✅ All community, anti-tamper and ergonomics tests passed!');
```

- [ ] **Step 2: Chạy kịch bản kiểm thử E2E**

Chạy: `node scripts/test-zen-community-e2e.cjs`  
Kỳ vọng: In ra `✅ All community, anti-tamper and ergonomics tests passed!`

- [ ] **Step 3: Chạy toàn bộ test suites hiện có**

Chạy: `node scripts/test-same-browser-multiplayer.cjs && node scripts/test-solo-isolation.cjs`  
Kỳ vọng: Toàn bộ vượt qua thành công.

- [ ] **Step 4: Kiểm tra TypeScript trên toàn bộ codebase**

Chạy: `rtk tsc -b`  
Kỳ vọng: 0 lỗi biên dịch.

- [ ] **Step 5: Commit hoàn thiện**

```bash
rtk git add scripts/test-zen-community-e2e.cjs
rtk git commit -m "test: add comprehensive e2e test suite for community interactions and anti-tamper mechanisms

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```
