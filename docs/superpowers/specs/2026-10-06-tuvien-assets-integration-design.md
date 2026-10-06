# Thiết Kế Tích Hợp Tài Nguyên Kinh Tụng & Hình Nền Từ tuvien.com

**Ngày tạo:** 2026-10-06  
**Chủ đề:** Cào âm thanh và hình ảnh từ `https://tuvien.com/chua_online/` và tích hợp vào hệ thống cấu hình Background & Audio Player của bonk-bonk.

---

## 1. Mục tiêu & Phạm vi
- Tải toàn bộ tài nguyên nhạc kinh tụng (20 bài MP3) và hình ảnh chánh điện/phòng thờ (10+ ảnh JPG) từ trang Chùa Online (`https://tuvien.com/chua_online/`).
- Lưu trữ cục bộ trong thư mục `public/` của dự án để đảm bảo tính sẵn sàng, không phụ thuộc mạng ngoại vi, tránh lỗi CORS âm thanh.
- Tích hợp các cảnh chánh điện vào danh sách `BACKGROUND_PRESETS` trong `src/data/presets.ts` để người dùng có thể chọn làm hình nền thiền định.
- Tích hợp các bài kinh tụng vào danh mục `CHANT_TRACKS` và cập nhật giao diện `AudioPlayer.tsx` để người dùng có thể nghe tụng kinh trực tiếp với đầy đủ điều khiển âm lượng và thanh phát.

---

## 2. Danh mục tài nguyên

### 2.1. Âm thanh (MP3) - Lưu tại `public/audio/tuvien/`
1. `adidaphat0.mp3` - A Di Đà Phật
2. `adidaphat1.mp3` - Nam Mô A Di Đà Phật
3. `dieu_phap_lien_hoa.mp3` - Kinh Diệu Pháp Liên Hoa
4. `kinh_vu_lan.mp3` - Kinh Vu Lan
5. `kinh_lang_nghiem.mp3` - Kinh Lăng Nghiêm (Công phu khuya)
6. `kinh_duoc_su.mp3` - Kinh Dược Sư
7. `kinh_pho_mon.mp3` - Kinh Phổ Môn
8. `kinh_tam_dieu_tu_tam.mp3` - Kinh Tám Điều Từ Tâm
9. `kinh_a_di_da.mp3` - Kinh A Di Đà
10. `kinh_vo_luong_tho.mp3` - Kinh Vô Lượng Thọ
11. `tu_bi_thuy_sam.mp3` - Kinh Từ Bi Thủy Sám
12. `dia_tang_bon_nguyen.mp3` - Kinh Địa Tạng Bồ Tát Bổn Nguyện
13. `48_loi_nguyen.mp3` - 48 Lời Nguyện Phật A Di Đà
14. `luc_tu_di_da.mp3` - Kinh Lục Tự Di Đà
15. `chu_dai_bi.mp3` - Chú Đại Bi
16. `cong_phu_khuya.mp3` - Công Phu Khuya
17. `kinh_a_di_da_cau_sieu.mp3` - Kinh A Di Đà Cầu Siêu
18. `kinh_bao_hieu.mp3` - Kinh Báo Hiếu Phụ Mẫu
19. `kinh_sam_hoi.mp3` - Kinh Sám Hối Hồng Danh
20. `kinh_tong_tang.mp3` - Kinh Tụng Tống Táng

### 2.2. Hình ảnh - Lưu tại `public/images/tuvien/`
1. `scene0.jpg` đến `scene9.jpg`: 10 cảnh bàn thờ Chánh Điện trang nghiêm (Phật A Di Đà, Thích Ca, Quán Thế Âm, Địa Tạng, Dược Sư,...).
2. `scene0_lit.jpg` đến `scene9_lit.jpg`: Cảnh bàn thờ sau khi thắp hương.
3. `causieu1.jpg`: Cảnh trang nghiêm Phòng Cầu Siêu.
4. `honiem1.jpg`: Cảnh trang nghiêm Phòng Hộ Niệm - Cầu An.
5. `ngaygio1.jpg`: Cảnh trang nghiêm Phòng Lễ Giỗ Tổ Tiên.
6. `khoi.png`: Hiệu ứng khói hương nghi ngút.

---

## 3. Kiến trúc & Tích hợp mã nguồn

### 3.1. Kịch bản cào dữ liệu (`scripts/scrape-tuvien.mjs`)
- Tải file qua HTTPS với stream piping, tự động tạo thư mục `public/audio/tuvien/` và `public/images/tuvien/`.
- Chuẩn hóa tên file, kiểm tra Content-Length và HTTP status code 200.

### 3.2. Cấu hình Background (`src/data/presets.ts`)
- Khai báo các đối tượng `BackgroundPreset` mới trỏ về `/images/tuvien/sceneX.jpg` và các phòng lễ.
- Gắn nhãn phân loại hoặc mô tả rõ ràng tôn tượng trong từng cảnh để người dùng dễ chọn lựa.
- Tương thích 100% với các tính năng tinh chỉnh hình nền hiện có của `BackgroundManager` (độ mờ, độ sáng, hiệu ứng nến, bụi vàng).

### 3.3. Cấu hình & Trình phát âm thanh (`src/services/audio-engine.ts`, `src/types/zen.ts`, `src/components/AudioPlayer.tsx`)
- `ChantTrack` được gán trường `src: '/audio/tuvien/xxx.mp3'` và danh mục phân loại (`category: 'synth' | 'tuvien'`).
- `ZenAudioEngine`: Phương thức `playCustomAudio` hoặc `playChantTrack` hỗ trợ phát file MP3 cục bộ, kết nối với `chantGain` để điều chỉnh âm lượng chuẩn xác, hỗ trợ tạm dừng, tiếp tục và tua nhạc.
- `AudioPlayer.tsx`:
  - Hiển thị tab hoặc phân mục: "Niệm Phật & Nhạc Thiền (Tổng hợp)" và "Kinh Tụng Tự Viện (Thực tế)".
  - Có thanh tìm kiếm/lọc bài kinh nhanh chóng.
  - Hiển thị trạng thái đang phát, nút Play/Pause và thanh thời lượng khi phát file MP3.

---

## 4. Xử lý lỗi & Biên kiểm thử
- **Mạng chập chờn khi cào:** Script tải có cơ chế kiểm tra dung lượng file, không lưu file rỗng khi gặp mã lỗi 404/500.
- **Tương thích trình duyệt:** Các file MP3 được phục vụ nội bộ qua Vite static server, không vướng vấn đề CORS hay Cross-Origin Resource Policy.
- **Hiệu năng:** Audio chỉ được tải khi người dùng bấm phát bài tương ứng, không làm chậm tốc độ tải ban đầu của web.
