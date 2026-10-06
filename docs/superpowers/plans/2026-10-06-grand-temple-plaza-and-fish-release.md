# Grand Temple Plaza, Temple Interiors, Fish Release & Negative Merits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở rộng bản đồ thế giới lên 3600x2200 với 3 ngôi đền, 2 hồ nước; thêm cơ chế bước vào/ra nội điện Chánh Điện; thêm tính năng phóng sinh cá có chi phí công đức tại các hồ; và hỗ trợ điểm công đức âm kèm danh hiệu hài hước.

**Architecture:**
- Domain Models & Types (`src/types/zen.ts`): Thêm FishSpec, ActiveFishEntity, TempleId, TempleInteriorState.
- Networking & State Services (`src/services/plaza-service.ts` & `src/server/plaza-plugin.ts`): Bỏ clamping min = 0 cho merits; mở rộng vùng spawn orbs theo bản đồ 3600x2200; bổ sung sự kiện mạng `release_fish` / `fish_released`.
- Presentation & Canvas Engine (`src/components/ZenPlaza.tsx`): Triển khai vẽ 7 phân khu bản đồ lớn, hệ thống chuyển cảnh Nội Điện Chánh Điện, Modal & tương tác phóng sinh cá với mô phỏng cá bơi trong hồ, và bộ hiển thị danh hiệu hài hước khi âm công đức.

**Tech Stack:** React 19, TypeScript, HTML5 Canvas 2D Rendering Engine, WebSocket, Vite, Tailwind CSS, Lucide Icons.

## Global Constraints
- Luôn giữ trải nghiệm 60 FPS mượt mà cho Canvas game loop.
- Toàn bộ lệnh shell biên dịch / kiểm tra phải có tiền tố `rtk`.
- Không được dùng `Math.max(0, merits - penalty)` khi trừ công đức để cho phép điểm âm tự nhiên.
- Chỉ cho phép thả cá khi người chơi đứng trong phạm vi hồ nước và có đủ điểm công đức yêu cầu (không bị âm).

---

### Task 1: Mở rộng Domain Models & Kiểu Dữ Liệu (`src/types/zen.ts`)

**Files:**
- Modify: `src/types/zen.ts`

**Interfaces:**
- Produces:
  - `FishTypeId = 'red_carp' | 'goldfish' | 'koi' | 'dragon_fish'`
  - `FishSpec`: `{ id: FishTypeId; name: string; cost: number; color: string; size: number; speed: number; blessing: string; icon: string }`
  - `ActiveFishEntity`: `{ id: string; type: FishTypeId; lakeId: 'lotus_pond' | 'liberation_pond'; x: number; y: number; vx: number; vy: number; angle: number; color: string; size: number; tailAngle: number; releasedBy: string }`
  - `TempleId = 'dai_hung' | 'quan_am' | 'thien_duong'`

- [ ] **Step 1: Khai báo các types và constants cho Cá Phóng Sinh & Đền Chùa trong `src/types/zen.ts`**
Thêm các định nghĩa sau vào cuối file `src/types/zen.ts`:
```typescript
export type FishTypeId = 'red_carp' | 'goldfish' | 'koi' | 'dragon_fish';

export interface FishSpec {
  id: FishTypeId;
  name: string;
  cost: number;
  color: string;
  size: number;
  speed: number;
  blessing: string;
  icon: string;
}

export const FISH_CATALOG: FishSpec[] = [
  {
    id: 'red_carp',
    name: 'Cá Chép Đỏ (Chu Sa)',
    cost: 10,
    color: '#ef4444',
    size: 9,
    speed: 1.1,
    blessing: 'Cầu mong hanh thông, vượt vũ môn hóa rồng! 🐟',
    icon: '🐟',
  },
  {
    id: 'goldfish',
    name: 'Cá Vàng Ba Đuôi',
    cost: 25,
    color: '#f59e0b',
    size: 11,
    speed: 0.95,
    blessing: 'Tâm an trí sáng, duyên lành đưa tới! 🐠',
    icon: '🐠',
  },
  {
    id: 'koi',
    name: 'Cá Koi Ngũ Sắc',
    cost: 60,
    color: '#ec4899',
    size: 13,
    speed: 1.3,
    blessing: 'Phước lộc tràn đầy, gia đạo bình an! 🐡',
    icon: '🐡',
  },
  {
    id: 'dragon_fish',
    name: 'Cá Rồng Hoàng Kim',
    cost: 150,
    color: '#eab308',
    size: 16,
    speed: 1.5,
    blessing: 'Đại cát đại lợi, vạn sự cát tường! 🐉',
    icon: '🐉',
  },
];

export interface ActiveFishEntity {
  id: string;
  type: FishTypeId;
  lakeId: 'lotus_pond' | 'liberation_pond';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  color: string;
  size: number;
  tailPhase: number;
  releasedBy: string;
}

export type TempleId = 'dai_hung' | 'quan_am' | 'thien_duong';

export interface TempleDoorTrigger {
  id: TempleId;
  name: string;
  doorX: number;
  doorY: number;
  returnX: number;
  returnY: number;
}
```

- [ ] **Step 2: Chạy kiểm tra kiểu `rtk tsc -b` để đảm bảo hợp lệ**
Run: `rtk tsc -b`
Expected: 0 errors.

---

### Task 2: Cập Nhật Server WebSocket Plugin (`src/server/plaza-plugin.ts`) Cho Phép Âm Điểm, Mở Rộng Biên Spawn & Broadcast Thả Cá

**Files:**
- Modify: `src/server/plaza-plugin.ts`

**Interfaces:**
- Consumes: `FishTypeId` từ `src/types/zen.ts`
- Produces: Nhận thông điệp `release_fish`, trừ merits không chặn min, gửi broadcast `fish_released` và `player_updated`.

- [ ] **Step 1: Bỏ `Math.max(0, ...)` ở logic trừ công đức**
Tại các khối:
- `msg.type === 'loot_orb'`:
```typescript
if (isWeapon) {
  const penalty = Math.abs(addedVal);
  p.state.merits = (p.state.merits || 0) - penalty;
  p.state.weapon = orb.type;
}
```
- `msg.type === 'combat_finish' || msg.type === 'combat_clash'`:
```typescript
if (loserClient) {
  loserClient.state.merits = (loserClient.state.merits || 0) - loserMeritsLoss;
  loserClient.state.defeatUntil = defeatExpiry;
  loserClient.state.chatText = undefined;
}
```
- [ ] **Step 2: Mở rộng tọa độ spawn vật phẩm ngẫu nhiên lên map 3600x2200**
Cập nhật hàm `generateRandomOrb()`:
```typescript
return {
  id: `orb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  x: Math.floor(250 + Math.random() * 3100),
  y: Math.floor(280 + Math.random() * 1650),
  value,
  type: t,
  created: Date.now(),
};
```
- [ ] **Step 3: Thêm xử lý `msg.type === 'release_fish'`**
```typescript
} else if (msg.type === 'release_fish') {
  if (currentId && players.has(currentId)) {
    const p = players.get(currentId)!;
    const fishType = msg.fishType as string;
    const cost = Number(msg.cost) || 0;
    const lakeId = msg.lakeId;

    if (p.state.merits >= cost && cost > 0) {
      p.state.merits -= cost;
      const fishPayload = JSON.stringify({
        type: 'fish_released',
        id: `fish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fishType,
        lakeId,
        x: msg.x,
        y: msg.y,
        releasedBy: p.state.name,
      });
      for (const client of players.values()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(fishPayload);
        }
      }
    }
  }
}
```
- [ ] **Step 4: Kiểm tra build lại**
Run: `rtk tsc -b`
Expected: 0 errors.

---

### Task 3: Cập Nhật Client Service (`src/services/plaza-service.ts`) Cho Phép Âm Điểm & Quản Lý Thả Cá

**Files:**
- Modify: `src/services/plaza-service.ts`

**Interfaces:**
- Produces: `plazaService.releaseFish(fishType, cost, lakeId, x, y): boolean` và sự kiện `onFishReleased(cb)`.

- [ ] **Step 1: Bỏ `Math.max(0, ...)` trong `lootOrb` và `handleCombatResult`**
Trong `src/services/plaza-service.ts`:
- `lootOrb`:
```typescript
if (orb.type === 'gun' || orb.type === 'hammer' || orb.type === 'knife') {
  const penalty = Math.abs(addedVal);
  local.merits = (local.merits || 0) - penalty;
  local.weapon = orb.type;
  this.localProfile.weapon = orb.type;
}
```
- `handleCombatResult`:
```typescript
if (loser) {
  loser.merits = (loser.merits || 0) - loserLoss;
  loser.defeatUntil = defeatExpiry;
  ...
}
```
- [ ] **Step 2: Thêm hàm `releaseFish` và listener `fishReleasedListeners`**
Thêm kiểu listener và method:
```typescript
type FishReleasedListener = (fishData: {
  id: string;
  fishType: FishTypeId;
  lakeId: 'lotus_pond' | 'liberation_pond';
  x: number;
  y: number;
  releasedBy: string;
}) => void;
```
Bổ sung `public releaseFish(...)` gửi thông điệp mạng `release_fish` và cập nhật trừ công đức của người chơi cục bộ ngay tức khắc.
- [ ] **Step 3: Cập nhật hàm tạo Orbs local `generateLocalOrbs()` phủ theo map 3600x2200**
- [ ] **Step 4: Kiểm tra build**
Run: `rtk tsc -b`
Expected: 0 errors.

---

### Task 4: Triển Khai Bản Đồ Mở Rộng 3600x2200, 3 Đền, 2 Hồ & Cổng Tam Quan Trên Canvas (`src/components/ZenPlaza.tsx`)

**Files:**
- Modify: `src/components/ZenPlaza.tsx`

- [ ] **Step 1: Cập nhật hằng số kích thước thế giới**
```typescript
const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 2200;
```
Cập nhật vị trí xuất phát mặc định của nhân vật tại trung tâm quảng trường:
`x: 1800, y: 1100`.

- [ ] **Step 2: Vẽ các phân khu & công trình trên Canvas thế giới**
1. **Đường lát đá hoa sen** kết nối từ Cổng Tam Quan ($X: 1800, Y: 2050$) -> Tâm quảng trường Bồ Đề ($1800, 1200$) -> Đại Hùng Bảo Điện ($1800, 300$), rẽ trái sang Điện Quán Âm ($800, 500$) & Hồ Sen ($900, 1500$), rẽ phải sang Thiền Đường ($2800, 500$) & Hồ Phóng Sinh ($2700, 1500$).
2. **Cổng Tam Quan** ($1800, 2050$): Cổng cổ 3 gian mái ngói đỏ, cột gỗ lim, biển đề "CHÙA TÂM AN".
3. **Đại Hùng Bảo Điện** ($1800, 300$): Tòa chánh điện nguy nga, thềm đá hoa cương, đỉnh hương khổng lồ, biển hiệu dát vàng. Có cửa chính với thảm đỏ tại ($1800, 360$).
4. **Điện Quán Thế Âm** ($800, 500$): Tượng Mẹ Quán Âm bằng đá cẩm thạch trắng ngự tòa sen, tháp đèn đá, hoa sen trắng bao quanh. Cửa đền tại ($800, 550$).
5. **Thiền Đường Trúc Lâm** ($2800, 500$): Thiền xá bằng gỗ rêu phong, rặng trúc xanh đung đưa trong gió, chuông gió vang ngân. Cửa đền tại ($2800, 550$).
6. **Hồ Sen Tịnh Tâm** ($900, 1500$): Bán kính $220\text{px}$, hoa sen nở rộ, cầu vòm gỗ đỏ bắc qua.
7. **Hồ Phóng Sinh Bát Nhã** ($2700, 1500$): Bán kính $240\text{px}$, nước biếc trong xanh, có **Bến Gỗ Phóng Sinh** vươn ra lòng hồ, đèn hoa đăng lấp lánh.
8. **Cây Bồ Đề Cổ Thụ & Tháp 7 Tầng** ($1800, 1200$): Tán lá bồ đề đại thụ xum xuê, dải lụa đỏ cầu an bay phất phơ.

- [ ] **Step 3: Cập nhật Minimap Radar**
Tính toán tỷ lệ radar minimap theo `WORLD_WIDTH = 3600` và `WORLD_HEIGHT = 2200` với các chấm tượng trưng cho 3 đền và 2 hồ nước.
- [ ] **Step 4: Kiểm tra build**
Run: `rtk tsc -b`
Expected: 0 errors.

---

### Task 5: Triển Khai Cơ Chế Vào / Ra Các Đền (Nội Cảnh Chánh Điện)

**Files:**
- Modify: `src/components/ZenPlaza.tsx`

- [ ] **Step 1: Quản lý trạng thái Scene & Điểm Cửa Đền**
Khai báo danh sách cửa đền:
```typescript
const TEMPLE_DOORS: TempleDoorTrigger[] = [
  { id: 'dai_hung', name: 'Đại Hùng Bảo Điện', doorX: 1800, doorY: 360, returnX: 1800, returnY: 410 },
  { id: 'quan_am', name: 'Điện Quán Thế Âm', doorX: 800, doorY: 550, returnX: 800, returnY: 600 },
  { id: 'thien_duong', name: 'Thiền Đường Trúc Lâm', doorX: 2800, doorY: 550, returnX: 2800, returnY: 600 },
];
```
State:
`currentScene: 'plaza' | 'temple_interior'`
`activeTemple: TempleDoorTrigger | null`
`indoorPosRef: { x: number; y: number }` (tọa độ nhân vật trong nội điện).

- [ ] **Step 2: Nút tương tác / Phím `E` bước vào đền**
Khi nhân vật đứng cách cửa đền $< 85\text{px}$:
Hiển thị banner tương tác: `[E] Bước Vào [Tên Đền]`.
Khi kích hoạt:
Chuyển `currentScene = 'temple_interior'`, chuyển vị trí nhân vật vào sảnh trước cửa nội điện.

- [ ] **Step 3: Render Canvas Không Gian Chánh Điện Nội Khu**
Khi `currentScene === 'temple_interior'`:
Vẽ không gian nội điện trang nghiêm ấm cúng:
- Nền gạch hoa sen cổ điển với thảm nhung đỏ trải dài.
- Tượng Phật Thích Ca (hoặc Phật Bà Quán Âm tùy theo đền) dát vàng uy nghiêm ngự trên đài sen cao.
- Nến thơm và đèn dầu lung linh hai bên.
- Lư trầm hương tỏa khói thơm nghi ngút uốn lượn.
- Bồ đoàn quỳ lạy (Prayer mats): Người chơi đến đứng lên bồ đoàn sẽ tự động quỳ lạy trang nghiêm (`action: 'pray'`).
- Mõ Gỗ Nội Điện Khổng Lồ: Bấm gõ mõ tích công đức với âm vang ngân nga.
- Cửa thoát ra sân chùa ở cạnh dưới: Đi đến cửa và bấm `[E]` hoặc nút `Bước Ra Sân Chùa` để quay trở lại bản đồ ngoài trời tại đúng tọa độ `activeTemple.returnX, activeTemple.returnY`.

---

### Task 6: Triển Khai Chức Năng Thả Cá Phóng Sinh Tại 2 Hồ Nước

**Files:**
- Modify: `src/components/ZenPlaza.tsx`

- [ ] **Step 1: Quản lý danh sách cá bơi trong hồ (`activeFishesRef`)**
Khởi tạo đàn cá ban đầu bơi lượn trong 2 hồ (mỗi hồ 6-8 con cá gồm chép, koi, cá vàng).
Mỗi frame cập nhật vị trí cá:
- Cá bơi theo vector `vx, vy` kèm lực hướng tâm giữ cá trong lòng hồ hình elip.
- Quẫy đuôi mềm mại theo góc xoay `tailPhase += dt * speed * 8`.
- Vẽ thân cá hình thoi thuôn dài, vây cá uốn lượn và mắt cá sinh động.

- [ ] **Step 2: Nhận diện người chơi đứng gần bờ hồ**
Xác định khoảng cách của người chơi tới tâm 2 hồ nước:
- Hồ Sen: $X: 900, Y: 1500$, Bán kính: $220\text{px}$
- Hồ Phóng Sinh: $X: 2700, Y: 1500$, Bán kính: $240\text{px}$
Khi khoảng cách $\le$ Bán kính $+ 60\text{px}$, hiển thị nút:
`🐟 Phóng Sinh Cá [Phím F]`.

- [ ] **Step 3: Modal / Bảng Chọn Phóng Sinh Cá**
Hiển thị danh sách 4 loại cá:
1. 🐟 **Cá Chép Đỏ**: Yêu cầu 10 Công Đức
2. 🐠 **Cá Vàng Ba Đuôi**: Yêu cầu 25 Công Đức
3. 🐡 **Cá Koi Ngũ Sắc**: Yêu cầu 60 Công Đức
4. 🐉 **Cá Rồng Hoàng Kim**: Yêu cầu 150 Công Đức

Kiểm tra:
- Nếu `localMerits < fish.cost`: Nút "Phóng Sinh" bị vô hiệu hóa, hiển thị số điểm còn thiếu.
- Nếu `localMerits < 0`: Hiển thị cảnh báo màu đỏ: *"Đang bị âm công đức! Hãy tĩnh tâm sám hối, gõ mõ hoặc lạy Phật trước khi phóng sinh"*.
- Nếu đủ điểm: Bấm nút -> Gọi `plazaService.releaseFish(...)`, trừ công đức, phát hiệu ứng âm thanh tịnh độ, sinh hạt nước tung tóe và thả cá bơi vào hồ.
- Nhân vật tự động phát câu chat: `🙏 Nam Mô A Di Đà Phật! Đã phóng sinh [Tên Cá]!`.

---

### Task 7: Hiển Thị Điểm Công Đức Âm, Hắc Khí & Danh Hiệu Hài Hước

**Files:**
- Modify: `src/components/ZenPlaza.tsx`

- [ ] **Step 1: Cập nhật HUD hiển thị Công Đức**
Khi `localMerits < 0`:
- Đổi màu số điểm sang màu đỏ neon: `⚠️ ${localMerits} Công Đức`
- Hiển thị nhãn cảnh báo nghiệp duyên: *(Nợ Nghiệp Cần Sám Hối)*

- [ ] **Step 2: Danh hiệu hài hước trên đầu Stickman**
Trong hàm vẽ người chơi `drawStickman`:
Nếu `merits < 0`:
Xác định danh hiệu:
- $-10 \le \text{merits} \le -1$: `[😅 Nợ Nghiệp Quấn Thân]` (Màu cam nhạt)
- $-30 \le \text{merits} \le -11$: `[😈 Nghịch Tử Cửa Phật]` (Màu đỏ tía)
- $\text{merits} < -30$: `[💀 Chúa Chổm Công Đức]` (Màu đỏ thẫm rực cháy)

Vẽ danh hiệu nhỏ gọn ngay bên dưới tên người chơi.

- [ ] **Step 3: Hiệu ứng hắc khí u tối bay quanh chân (`Karma Mist`)**
Nếu `merits < 0`:
Vẽ 3-4 hạt khói đen mờ ảo bốc lên từ gót chân của stickman (`rgba(30, 20, 20, 0.4)`), tạo hiệu ứng hình ảnh độc đáo và hài hước.

---

### Task 8: Kiểm Thử Toàn Diện & Hoàn Thiện

**Files:**
- Build check: `rtk npm run build`
- Runtime test: `timeout 3 npm run dev -- --host 0.0.0.0 || true`

- [ ] **Step 1: Chạy build production kiểm tra TypeScript**
Run: `rtk npm run build`
Expected: Biên dịch thành công 100%, 0 lỗi.

- [ ] **Step 2: Khởi động dev server kiểm tra**
Run: `timeout 3 npm run dev -- --host 0.0.0.0 || true`
Expected: Server sẵn sàng, cấu hình tải mượt mà.
