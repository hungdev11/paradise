# Thiết Kế Chi Tiết: Các Tính Năng Tương Tác Cộng Đồng Sảnh Hội Ngộ (Zen Plaza)

**Mã tài liệu:** `2026-10-06-zen-community-interactions-design`  
**Ngày:** 06/10/2026  
**Trạng thái:** Đã phê duyệt (Approved)  
**Phạm vi:** Nâng cấp tính năng tương tác người dùng nhiều người chơi trong Sảnh Hội Ngộ (Zen Plaza), bao gồm Cây Bồ Đề Nguyện Ước, Vòng Tròn Tọa Thiền Cộng Hưởng và Menu Tương Tác Giao Hảo Trực Tiếp.

---

## 1. Bối Cảnh & Mục Tiêu

### 1.1. Bối cảnh hiện tại
Ứng dụng hiện đã có Sảnh Hội Ngộ (`ZenPlaza`) hỗ trợ nhiều người chơi theo thời gian thực (WebSocket) trên bản đồ 3600x2200 với 3 ngôi đền (Đại Hùng Bảo Điện, Điện Quán Thế Âm, Thiền Đường Trúc Lâm), 2 hồ nước (Hồ Sen Tịnh Tâm, Hồ Phóng Sinh Bát Nhã), cơ chế vào/ra nội điện, hệ thống thả cá phóng sinh, nhặt vật phẩm công đức và luận võ gõ mõ so tài.

### 1.2. Mục tiêu cải tiến
Tạo thêm các tương tác mang đậm nét văn hóa tâm linh thanh tịnh, ấm áp, kết nối tình đạo hữu giữa những người tham gia:
1. **Cây Bồ Đề Nguyện Ước (Bodhi Wish Tree):** Nơi treo dải lụa cầu an, chiêm ngưỡng lời ước nguyện của cộng đồng và bấm "Tùy Hỷ Công Đức" để cùng nhau tăng trưởng phước lành.
2. **Vòng Tròn Tọa Thiền Cộng Hưởng (Group Meditation Circle):** Khi 2 hoặc nhiều người cùng ngồi thiền cạnh nhau, hào quang Mandala liên kết tỏa sáng rực rỡ, định kỳ ngân chuông Bát Nhã và ban thưởng điểm công đức thanh tịnh.
3. **Menu Giao Hảo Đạo Hữu (Direct Player Interaction & Radial Menu):** Bổ sung các hành động thiện lành khi tiếp xúc trực tiếp giữa 2 người que: Dâng trà sen, Tặng hoa sen phước lành, Cung kính bái kiến bên cạnh tính năng Luận võ gõ mõ.
4. **Cải tiến Trải nghiệm & An ninh Hệ thống:**
   - Đưa vị trí hiển thị Tên & Danh hiệu người chơi xuống **dưới chân** thay vì trên đầu để không che khuất nón lá, hào quang và biểu cảm khuôn mặt.
   - **Chống gian lận / sửa điểm bằng F12 (DevTools Anti-tamper & Server-Authoritative Merits):** Điểm công đức được quản lý và xác thực có thẩm quyền từ phía Server WebSocket, kèm mã hóa kiểm tra toàn vẹn (integrity checksum) ở LocalStorage.
   - **Chống spam vào/ra đền bằng phím Space:** Áp dụng cơ chế edge-trigger (chặn `e.repeat`) và thời gian hồi chiêu (cooldown 1.5s) khi chuyển cảnh.

---

## 2. Kiến Trúc Hệ Thống & Mô Hình Dữ Liệu

### 2.1. Cập nhật Domain Models (`src/types/zen.ts`)

#### A. Cây Bồ Đề Nguyện Ước:
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
  rejoicedBy: string[]; // Danh sách playerId đã bấm tùy hỷ (chống duplicate)
  branchIndex: number;  // Chỉ số cành cây đung đưa trên tán (0 - 15)
}
```

#### B. Trạng thái Hiệu ứng Giao Hảo Người Chơi (`SocialStatus`):
```typescript
export type SocialActionType = 'offer_tea' | 'gift_lotus' | 'mutual_bow';

export interface PlayerSocialStatus {
  type: SocialActionType;
  partnerId?: string;
  partnerName?: string;
  expiresAt: number; // Timestamp ms hết hiệu ứng visual (ví dụ 10-12 giây)
}

export interface MeditationCluster {
  id: string;
  playerIds: string[];
  centerX: number;
  centerY: number;
  radius: number;
  durationSeconds: number;
  lastRewardTime: number;
}
```

Mở rộng `PlazaPlayer` và `VisualEntity` với thuộc tính:
- `socialStatus?: PlayerSocialStatus;`
- `inMeditationCluster?: boolean;`

### 2.2. Giao Thức Mạng WebSocket (`src/server/plaza-plugin.ts` & `src/services/plaza-service.ts`)

| Loại thông điệp Client -> Server | Payload | Mô tả |
| :--- | :--- | :--- |
| `create_bodhi_wish` | `{ wishText: string, color: WishRibbonColor }` | Treo dải lụa mới (trừ 5 công đức, kiểm tra $\text{merits} \ge 5$) |
| `rejoice_bodhi_wish` | `{ ribbonId: string }` | Bấm tùy hỷ (+1 công đức cho người bấm & chủ nhân lời ước) |
| `social_interact` | `{ targetId: string, action: SocialActionType }` | Gửi tương tác trực tiếp tới đạo hữu |

| Loại thông điệp Server -> Client Broadcast | Payload | Mô tả |
| :--- | :--- | :--- |
| `bodhi_wish_created` | `{ ribbon: BodhiWishRibbon, newMerits: number }` | Đồng bộ dải lụa mới tới toàn bộ phòng |
| `bodhi_wish_rejoiced` | `{ ribbonId: string, rejoiceCount: number, rejoicedBy: string, authorId: string }` | Cập nhật số lượt tùy hỷ và cộng công đức |
| `social_event_broadcast` | `{ senderId: string, targetId: string, action: SocialActionType, timestamp: number }` | Kích hoạt hiệu ứng visual & âm thanh trên client |
| `meditation_reward_broadcast` | `{ playerIds: string[], bonus: number }` | Thưởng chuông và điểm công đức khi thiền đủ 15s |

---

## 3. Đặc Tả Chi Tiết Từng Tính Năng

### 3.1. Cây Bồ Đề Nguyện Ước (Bodhi Wish Tree)
1. **Đồ Họa & Vị Trí Canvas:**
   - Đặt tại tọa độ trung tâm sân quảng trường: $(x: 1800, y: 1050)$.
   - Gốc cây đại thụ: Thân rễ uốn lượn uy nghi, tán bồ đề 3 tầng phủ bóng mát đường kính $\approx 320\text{px}$.
   - Dải lụa ngũ sắc rủ xuống từ các cành, đung đưa theo hàm sóng `Math.sin(time * 0.002 + branchIndex)`.
   - Bệ đá hoa sen hình tròn bao quanh gốc cây.
2. **Khu Vực Tương Tác:**
   - Khoảng cách kích hoạt: $R \le 180\text{px}$ quanh tâm cây.
   - Khi tiến vào khu vực: Xuất hiện nút nổi hoặc phím tắt `[🌳 Chiêm Ngưỡng & Treo Lời Nguyện Bồ Đề]`.
3. **Giao Diện Modal (`BodhiTreeModal.tsx`):**
   - **Tab 1 - Treo Dải Lụa:** Nhập lời chúc/nguyện (tối đa 120 ký tự), chọn màu lụa (Đỏ, Vàng, Xanh, Hồng, Tím), chi phí 5 công đức.
   - **Tab 2 - Chiêm Ngưỡng & Tùy Hỷ:** Danh sách thẻ lụa cuộn mềm mại, kèm nút bấm `[🙏 Tùy Hỷ Công Đức]`. Bấm tùy hỷ sẽ bắn cánh hoa sen confetti nhỏ và phát tiếng chuông ngân.

### 3.2. Vòng Tròn Tọa Thiền Cộng Hưởng (Group Meditation Circle)
1. **Thuật Toán Gom Cụm (Real-time Clustering):**
   - Lọc người chơi có `action === 'sit' || action === 'pray'`.
   - Gom các người chơi có khoảng cách $\le 160\text{px}$ thành một cụm.
   - Chỉ kích hoạt hiệu ứng khi cụm có $\ge 2$ thành viên.
2. **Hiệu Ứng Canvas:**
   - Dưới chân cụm xuất hiện đồ án hoa văn Mandala xoay chậm bằng ánh vàng hổ phách dịu mát.
   - Tia sáng quang học (golden threads) uốn lượn nối giữa tâm các người chơi trong cụm.
   - Hạt bụi vàng và cánh sen bay là là từ mặt đất lên cao quanh vòng tròn.
3. **Phần Thưởng Thiền Định:**
   - Đếm thời gian ngồi thiền liên tục.
   - Mỗi mốc 15 giây: Chuông Bát Nhã ngân vang thanh thoát, bay lên chữ `"+2 Cộng Hưởng Thanh Tịnh ✨"`, cộng +2 công đức cho mỗi người tham gia.

### 3.3. Menu Tương Tác Giao Hảo Đạo Hữu (Direct Player Interaction)
1. **Kích Hoạt:**
   - Click/tap vào một người que khác trong bán kính $\le 300\text{px}$ sẽ mở Menu Vòng Tròn (Radial Menu) hoặc Popup thẻ tương tác.
2. **Các Hành Động:**
   - 🍵 **Dâng Trà Sen:** Hai người que làm động tác nâng chén trà, hiệu ứng khói hương ngọc bích bay lên trên đầu trong 8 giây.
   - 🪷 **Tặng Hoa Sen:** Chi phí 2 công đức của người tặng; người nhận được +2 công đức kèm đóa sen lấp lánh nở trên đầu trong 12 giây.
   - 🙏 **Cung Kính Bái Kiến:** Cả 2 cùng chuyển sang tư thế xá chào (`bow`) trong 2.5 giây kèm tiếng khánh chuông nhẹ.
   - ⚔️ **Luận Võ Gõ Mõ:** Gửi lời mời so tài gõ mõ 6 giây (tính năng hiện có).

### 3.4. Hiển Thị Tên & Danh Hiệu Dưới Chân Người Dùng
- **Hiện trạng:** Tên, nón lá, hào quang và bong bóng chat đang dồn hết lên trên đỉnh đầu nhân vật khiến không gian phía trên bị chật chội và che khuất nhau khi người chơi đội nón lá hoặc có hào quang sen.
- **Thiết kế mới:**
  - Di chuyển bảng tên (Nameplate), danh hiệu công đức (và hắc khí nếu bị âm điểm) xuống vị trí **dưới chân** nhân vật: $y_{\text{foot}} + 18\text{px} \rightarrow y_{\text{foot}} + 32\text{px}$.
  - Nền mờ mềm mại màu đen bán trong suốt `rgba(0, 0, 0, 0.45)` bo góc viên thuốc (pill badge).
  - Phía trên đầu người que chỉ để dành riêng cho: Nón lá / Hào quang, Bong bóng chat tạm thời và Biểu tượng cảm xúc / hiệu ứng hoa sen khi tương tác.

### 3.5. Cơ Chế Chống Sửa Điểm F12 (DevTools Anti-Tamper & Authoritative Merits)
- **Vấn đề cần giải quyết:** Người dùng mở F12 Console hoặc chỉnh sửa trực tiếp `localStorage` hay biến bộ nhớ để buff điểm công đức lên hàng triệu.
- **Giải pháp bảo vệ đa tầng (Multi-layer Protection):**
  1. **Server-Authoritative Merits (Máy chủ nắm quyền thẩm định):**
     - Điểm công đức của người chơi trong phòng multiplayer được máy chủ WebSocket lưu trữ và tính toán chính thống.
     - Client không được phép tự tiện gửi gói tin cập nhật điểm số tùy ý (`client_set_merits`). Mọi biến động điểm (nhặt hạt công đức, thả cá, tùy hỷ, thiền định, luận võ, tặng hoa sen) đều phát sinh từ sự kiện được Server thẩm định và broadcast ngược lại cho client.
     - Khi một client mới kết nối, server sẽ kiểm tra tính hợp lệ của điểm khởi đầu hoặc gán mốc điểm an toàn.
  2. **Client-Side Storage Integrity Checksum:**
     - Khi lưu dữ liệu công đức vào `localStorage`, lưu kèm một mã băm chữ ký toàn vẹn (HMAC-like signature / checksum với khóa muối bí mật).
     - Khi đọc lại từ `localStorage`, nếu checksum không khớp với dữ liệu điểm (dấu hiệu người dùng mở F12 sửa chuỗi JSON), hệ thống sẽ phát hiện hành vi can thiệp trái phép, tự động reset điểm về mốc chuẩn và cảnh báo hài hước nhẹ nhàng: *"Tâm bất chính thì công đức hóa hư không 🙏"*.

### 3.6. Chống Spam Vào / Ra Đền Bằng Cách Giữ Phím Space
- **Hiện trạng:** Khi đứng gần cửa đền, người chơi giữ phím Space có thể kích hoạt liên tục sự kiện `keydown` do cơ chế lặp phím tự động của hệ điều hành (`e.repeat`), làm nhấp nháy chuyển cảnh màn hình liên tục.
- **Giải pháp:**
  1. **Edge-Trigger (Bắt sườn xung):** Kiểm tra `if (e.repeat) return;` – người chơi bắt buộc phải **nhả phím Space ra** rồi nhấn lại thì mới nhận diện lần nhấn mới.
  2. **Chống dội / Cooldown (Transition Debounce):** Bổ sung biến trạng thái khóa chuyển cảnh với thời gian hồi chiêu tối thiểu là 1.5 giây giữa 2 lần ra/vào đền (`lastDoorTransitionTime + 1500ms`). Trong thời gian chuyển cảnh, vô hiệu hóa toàn bộ phím Space liên quan đến cửa đền.

---

## 4. Kiểm Thử & Tiêu Chí Chất Lượng (QA & Acceptance Criteria)

1. **Hiệu Năng Canvas:** Vẫn duy trì 60 FPS ổn định, các hiệu ứng Mandala và dải lụa cây Bồ Đề sử dụng các phép tính toán học nhẹ, không tạo GC pressure.
2. **Xử Lý Lỗi & Chống Gian Lận (Edge Cases):**
   - Không cho phép người chơi bị âm điểm hoặc $< 5$ công đức treo dải lụa.
   - Không cho phép 1 người bấm tùy hỷ nhiều hơn 1 lần trên cùng 1 dải lụa.
   - Rời khỏi cụm thiền hoặc đứng dậy sẽ lập tức ngắt chu kỳ nhận thưởng 15s của cá nhân đó mà không làm ảnh hưởng các thành viên còn lại trong cụm.
3. **Không Lỗi Biên Dịch:** `rtk tsc -b` vượt qua kiểm tra với 0 lỗi (0 errors, 0 diagnostics).
