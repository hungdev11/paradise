# Thiết Kế Chi Tiết: Đại Bản Đồ Quảng Trường Chùa, Vào/Ra Các Đền, Phóng Sinh Cá & Hệ Thống Âm Công Đức

## 1. Bối cảnh & Mục tiêu
Nâng cấp toàn diện trải nghiệm thế giới ảo thiền định Zen Plaza:
- **Công đức có thể âm:** Không còn chặn min = 0; người chơi nhặt vũ khí (súng, búa, dao) hoặc thua so kèo sẽ bị trừ công đức âm tự do, kèm hiệu ứng hắc khí và danh hiệu hài hước.
- **Bản đồ mở rộng ($3600 \times 2200$):** Cảnh quan phong phú gồm Cổng Tam Quan, 3 ngôi đền (Đại Hùng Bảo Điện, Điện Quán Âm, Thiền Đường Trúc Lâm), 2 hồ nước (Hồ Sen Tịnh Tâm, Hồ Phóng Sinh Bát Nhã), Rừng Trúc, Bồ Đề Cổ Thụ, Tháp Đèn Đá.
- **Vào / Ra các Đền:** Hệ thống chuyển cảnh mượt mà đưa nhân vật vào không gian Chánh Điện bên trong: chiêm bái bàn thờ Phật Thích Ca dát vàng, nến sáng lung linh, gõ mõ nội điện, bồ đoàn quỳ lạy, và cửa bước ra lại sân chùa.
- **Chức năng Thả Cá (Phóng Sinh):** Khi đứng gần các hồ nước trong bản đồ, Phật tử có thể phóng sinh các loài cá (Cá Chép Đỏ, Cá Vàng Ba Đuôi, Cá Koi Ngũ Sắc, Cá Rồng Hoàng Kim) nếu có đủ công đức tích lũy; hành động thả cá trừ công đức tương ứng và sinh ra đàn cá bơi lội sinh động trong lòng hồ.

---

## 2. Kiến Trúc & Cấu Trúc Dữ Liệu

### 2.1 Mở rộng Bản đồ ($3600 \times 2200$)
- Kích thước thế giới mới: `WORLD_WIDTH = 3600`, `WORLD_HEIGHT = 2200`.
- Camera viewport: Theo dõi nhân vật trung tâm, giới hạn biên `Math.min(WORLD_WIDTH - canvas.width, Math.max(0, camX))`.
- Minimap: Cập nhật tỷ lệ scale và radar hiển thị đầy đủ các phân khu, đền đài, hồ nước và vị trí người chơi / vật phẩm.
- Tọa độ các phân khu chính:
  - Cổng Tam Quan: $X: 1800, Y: 2050$
  - Đại Hùng Bảo Điện: $X: 1800, Y: 300$
  - Điện Quán Thế Âm: $X: 800, Y: 500$
  - Thiền Đường Trúc Lâm: $X: 2800, Y: 500$
  - Hồ Sen Tịnh Tâm: $X: 900, Y: 1500$
  - Hồ Phóng Sinh Bát Nhã: $X: 2700, Y: 1500$
  - Cây Bồ Đề & Bảo Tháp: $X: 1800, Y: 1200$

### 2.2 Hệ thống Vào / Ra Đền (Temple Interior)
- Vùng tương tác cửa đền ngoài trời (Doorway Trigger):
  - Khi cự ly $d(\text{player}, \text{templeDoor}) \le 80\text{px}$, hiển thị nút / phím tắt `[E] Bước Vào Đền`.
- Trạng thái màn chơi:
  - `currentScene: 'plaza' | 'temple_interior'`
  - `activeTempleId: 'dai_hung' | 'quan_am' | 'thien_duong'`
- Không gian Chánh Điện bên trong ($1200 \times 800$ canvas):
  - Gian thờ Phật uy nghiêm, lư trầm hương nghi ngút.
  - Mõ gỗ tương tác nội điện (bấm gõ tích công đức).
  - Bồ đoàn thiền tọa và quỳ lạy.
  - Cửa bước ra sân chùa: đưa nhân vật trở lại đúng vị trí cửa đền bên ngoài.

### 2.3 Chức năng Thả Cá Phóng Sinh (Fish Release System)
- Định nghĩa loài cá (`FishSpec`):
  1. `red_carp`: Cá Chép Đỏ, Yêu cầu & Chi phí: **10 Công Đức**, Màu: `#ef4444`, Tốc độ: 1.2
  2. `goldfish`: Cá Vàng Ba Đuôi, Yêu cầu & Chi phí: **25 Công Đức**, Màu: `#f59e0b`, Tốc độ: 1.0
  3. `koi`: Cá Koi Ngũ Sắc, Yêu cầu & Chi phí: **60 Công Đức**, Màu: `#ec4899`, Tốc độ: 1.4
  4. `dragon_fish`: Cá Rồng Hoàng Kim, Yêu cầu & Chi phí: **150 Công Đức**, Màu: `#eab308`, Tốc độ: 1.6
- Vùng kích hoạt thả cá:
  - Chỉ khi $d(\text{player}, \text{lakeCenter}) \le \text{lakeRadius} + 60\text{px}$.
  - Nút HUD `🐟 Phóng Sinh Cá [Phím F]`.
- Logic thả cá:
  - Kiểm tra `player.merits >= fish.cost`. Nếu không đủ hoặc công đức $< 0$, vô hiệu hóa lựa chọn kèm lý do.
  - Khi thả:
    - Trừ công đức: `player.merits -= fish.cost`.
    - Sinh cá mới (`ActiveFishEntity`) tại mép hồ với hoạt ảnh bơi lượn (quẫy đuôi tuần hoàn, xoay góc theo hướng di chuyển, bọt nước gợn sóng).
    - Tạo hiệu ứng hạt bong bóng nước & chữ nổi `+ Phước lành phóng sinh!`.
    - Gửi tin nhắn chat hoan hỉ trên đầu nhân vật.

### 2.4 Cơ Chế Công Đức Âm & Danh Hiệu Hài Hước
- Cho phép điểm âm: Không dùng `Math.max(0, merits)`.
- Khi `merits < 0`:
  - Hiển thị HUD: `⚠️ [merits] Công Đức` màu đỏ neon cảnh báo.
  - Danh hiệu trên đầu nhân vật:
    - $-10 \le \text{merits} < 0$: `[😅 Nợ Nghiệp Quấn Thân]`
    - $-30 \le \text{merits} < -10$: `[😈 Nghịch Tử Cửa Phật]`
    - $\text{merits} < -30$: `[💀 Chúa Chổm Công Đức]`
  - Hiệu ứng thị giác: Làn khói đen / hắc khí (`karma shadow mist`) mờ ảo bay quanh chân nhân vật.
  - Không được phép phóng sinh cá khi công đức âm.

---

## 3. Kế Hoạch Kiểm Thử & Xác Minh (Verification)
1. **Kiểm tra công đức âm:**
   - Nhặt súng (-10), búa (-5), dao (-3) -> điểm số giảm xuống dưới 0 âm thực tế.
   - Thua so kèo (-5) -> điểm giảm âm không bị chặn tại 0.
   - Kiểm tra danh hiệu hài hước và hiệu ứng hắc khí hiển thị chuẩn xác theo từng mốc âm.
2. **Kiểm tra bản đồ mở rộng:**
   - Di chuyển qua toàn bộ 7 phân khu $3600 \times 2200$.
   - Kiểm tra camera viewport cuộn êm ái, minimap hiển thị đầy đủ và chính xác.
3. **Kiểm tra vào/ra đền:**
   - Tiến lại cửa Đại Hùng Bảo Điện, bấm `E` -> Chuyển cảnh vào Chánh Điện.
   - Gõ mõ, quỳ lạy trong điện.
   - Tiến lại cửa ra, bấm `E` -> Trở lại sân chùa đúng vị trí ban đầu.
4. **Kiểm tra thả cá:**
   - Khi đứng xa hồ -> Nút phóng sinh không khả dụng.
   - Khi đứng cạnh hồ và đủ công đức -> Thả cá thành công, điểm bị trừ, cá xuất hiện bơi lội sinh động trong lòng hồ.
   - Khi thiếu công đức hoặc công đức âm -> Hiển thị thông báo không đủ công đức.
5. **Build & Typecheck:**
   - Chạy `rtk npm run build` đảm bảo không có bất kỳ lỗi TypeScript hay parse JSX nào.
