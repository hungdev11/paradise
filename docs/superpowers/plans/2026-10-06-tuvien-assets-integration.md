# Kế Hoạch Triển Khai: Tích Hợp Tài Nguyên Kinh Tụng & Hình Nền tuvien.com

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cào 20 file kinh tụng MP3 và toàn bộ ảnh chánh điện từ tuvien.com, thay thế bộ ảnh/nhạc cũ trong hệ thống cấu hình Background & Audio Player của bonk-bonk.

**Architecture:** Sử dụng script Node.js với `https` stream để tải toàn bộ assets về `public/audio/tuvien/` và `public/images/tuvien/`. Cập nhật `src/data/presets.ts`, `src/services/audio-engine.ts` và `src/components/AudioPlayer.tsx` để trình phát âm thanh và quản lý hình nền hoạt động hoàn toàn với các tài nguyên mới tải.

**Tech Stack:** React 19, TypeScript, Vite, Web Audio API / HTMLAudioElement, Node.js.

## Global Constraints
- Tất cả đường dẫn tĩnh phục vụ qua thư mục `public/`: `/audio/tuvien/` và `/images/tuvien/`.
- Tiền tố lệnh shell luôn tuân thủ quy tắc RTK (`rtk <cmd>`).
- Kiểm tra TypeScript (`tsc -b`) và Vite build (`npm run build`) hoàn tất không có lỗi.

---

### Task 1: Tạo Script Cào Assets & Tải Dữ Liệu Về Thư Mục Public

**Files:**
- Create: `scripts/scrape-tuvien.mjs`
- Output: `public/audio/tuvien/*.mp3`, `public/images/tuvien/*.jpg`, `public/images/tuvien/khoi.png`

**Interfaces:**
- Produces: 20 file MP3 và 14 file hình ảnh sẵn sàng phục vụ tĩnh trên `/audio/tuvien/` và `/images/tuvien/`.

- [ ] **Step 1: Viết script `scripts/scrape-tuvien.mjs`**
Tạo file `scripts/scrape-tuvien.mjs` chứa logic tải file với kiểm tra lỗi, timeout và retry.

- [ ] **Step 2: Chạy script tải toàn bộ tài nguyên**
Chạy: `rtk node scripts/scrape-tuvien.mjs`
Xác nhận: Toàn bộ 20 file MP3 và các file ảnh tải thành công vào thư mục `public/`.

- [ ] **Step 3: Kiểm tra tính hợp lệ của file tải về**
Xác nhận dung lượng các file > 0 byte và cấu trúc thư mục chính xác.

---

### Task 2: Cập Nhật Cấu Hình Dữ Liệu Presets Cho Background & Audio

**Files:**
- Modify: `src/types/zen.ts`
- Modify: `src/data/presets.ts`

**Interfaces:**
- Consumes: Files tại `/images/tuvien/` và `/audio/tuvien/`.
- Produces: `BACKGROUND_PRESETS` và `CHANT_TRACKS` mới chứa danh sách 10+ cảnh chánh điện và 20 bài kinh tụng.

- [ ] **Step 1: Cập nhật kiểu dữ liệu `ChantTrack` trong `src/types/zen.ts`**
Đảm bảo hỗ trợ trường `src: string`, `category?: string`, `duration?: string`.

- [ ] **Step 2: Cập nhật `src/data/presets.ts`**
Thay thế toàn bộ `BACKGROUND_PRESETS` cũ bằng danh sách cảnh chánh điện tuvien.com (Scene0 - Scene9, causieu1, honiem1, ngaygio1).
Thay thế toàn bộ `CHANT_TRACKS` cũ bằng danh sách 20 bài kinh tụng mới chỉ định rõ `src: '/audio/tuvien/...'`.

- [ ] **Step 3: Chạy TypeScript check để kiểm tra tính tương thích**
Chạy: `rtk tsc -b`
Xác nhận: Không phát sinh lỗi kiểu dữ liệu.

---

### Task 3: Nâng Cấp Audio Engine & Giao Diện AudioPlayer

**Files:**
- Modify: `src/services/audio-engine.ts`
- Modify: `src/components/AudioPlayer.tsx`

**Interfaces:**
- Consumes: `CHANT_TRACKS` từ `src/data/presets.ts`.
- Produces: Trình phát MP3 hoàn chỉnh với thanh tiến trình, hiển thị thời lượng, tìm kiếm, play/pause và volume control.

- [ ] **Step 1: Cải tiến `ZenAudioEngine` trong `src/services/audio-engine.ts`**
Thêm hàm điều khiển phát MP3 (play, pause, seek, currentTime, duration, onTimeUpdate/onEnded listener) thông qua `customAudio` được kết nối qua AudioContext bus (`chantGain` -> `masterGain`).

- [ ] **Step 2: Cập nhật `src/components/AudioPlayer.tsx`**
Bổ sung:
- Thanh tìm kiếm bài kinh (search input).
- Thanh hiển thị thời lượng và tiến trình phát (progress scrubber).
- Danh sách 20 bài kinh tụng với biểu tượng play/pause rõ ràng.
- Xóa các lựa chọn nhạc synth cũ không còn cần thiết theo yêu cầu người dùng.

- [ ] **Step 3: Kiểm tra build toàn bộ dự án**
Chạy: `rtk npm run build`
Xác nhận: Build thành công (exit code 0).

---

### Task 4: Kiểm Thử Toàn Diện & Tinh Chỉnh

**Files:**
- Kiểm tra: `public/audio/tuvien/`, `public/images/tuvien/`, `src/data/presets.ts`, `src/components/BackgroundManager.tsx`, `src/components/AudioPlayer.tsx`

- [ ] **Step 1: Kiểm tra hiển thị hình nền trong BackgroundManager**
Đảm bảo khi chọn các scene mới, hình nền đổi tức thì, hiệu ứng nến và bụi vàng hoạt động mượt mà.

- [ ] **Step 2: Kiểm tra phát âm thanh các bài kinh**
Đảm bảo bấm play các bài kinh MP3 âm thanh phát rõ, điều chỉnh âm lượng chant/master hoạt động.

- [ ] **Step 3: Dọn dẹp các script tạm và xác nhận hoàn tất**
