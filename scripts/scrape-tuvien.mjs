import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const audioDir = path.join(rootDir, 'public', 'audio', 'tuvien');
const imageDir = path.join(rootDir, 'public', 'images', 'tuvien');

fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(imageDir, { recursive: true });

const AUDIO_FILES = [
  { name: 'adidaphat0.mp3', url: 'https://tuvien.com/chua_online/audio/adidaphat0.mp3' },
  { name: 'adidaphat1.mp3', url: 'https://tuvien.com/chua_online/audio/adidaphat1.mp3' },
  { name: 'dieu_phap_lien_hoa.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0000.dieu%20phap%20lien%20hoa.mp3' },
  { name: 'kinh_vu_lan.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0001.Kinh%20Vu%20Lan.mp3' },
  { name: 'kinh_lang_nghiem.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0002.Kinh%20Lang%20%20nghiem%20-%20cong%20phu%20khuya.mp3' },
  { name: 'kinh_duoc_su.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0003.Kinh%20Duoc%20Su.mp3' },
  { name: 'kinh_pho_mon.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0004.Kinh-PhoMonNghia_TriThoat.mp3' },
  { name: 'kinh_tam_dieu_tu_tam.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0005.Kinh%20Tam%20Dieu%20Tu%20Tam.mp3' },
  { name: 'kinh_a_di_da.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0006.A%20di%20da.mp3' },
  { name: 'kinh_vo_luong_tho.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0007.ThayTriThoat_KinhVoLuongTho-Nghia.mp3' },
  { name: 'tu_bi_thuy_sam.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0008.tu%20bi%20thuy%20sam.mp3' },
  { name: 'dia_tang_bon_nguyen.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0009.dia%20tang%20bon%20nguyen.mp3' },
  { name: '48_loi_nguyen.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0010.48%20Loi%20Nguyen.mp3' },
  { name: 'luc_tu_di_da.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/0011.Luc%20Tu%20Di%20Da.mp3' },
  { name: 'chu_dai_bi.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/chu_dai_bi.mp3' },
  { name: 'cong_phu_khuya.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/Cong%20Phu%20Khuya.mp3' },
  { name: 'kinh_a_di_da_cau_sieu.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/Kinh%20A%20DI%20DA%20cau%20sieu.mp3' },
  { name: 'kinh_bao_hieu.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/Kinh%20bao%20hieu.mp3' },
  { name: 'kinh_sam_hoi.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/Kinh%20sam%20hoi.mp3' },
  { name: 'kinh_tong_tang.mp3', url: 'https://tuvien.com/chua_online/audio/kinh/Kinh%20tung%20tong%20tang.mp3' },
];

const IMAGE_FILES = [];

// Scene0 to Scene9 and Scene0_ to Scene9_
for (let i = 0; i <= 9; i++) {
  IMAGE_FILES.push({
    name: `scene${i}.jpg`,
    url: `https://tuvien.com/chua_online/img/Scene${i}.jpg`,
  });
  IMAGE_FILES.push({
    name: `scene${i}_lit.jpg`,
    url: `https://tuvien.com/chua_online/img/Scene${i}_.jpg`,
  });
}

// Special rooms
IMAGE_FILES.push(
  { name: 'causieu1.jpg', url: 'https://tuvien.com/chua_online/img/causieu1.jpg' },
  { name: 'causieu1_lit.jpg', url: 'https://tuvien.com/chua_online/img/causieu1_.jpg' },
  { name: 'honiem1.jpg', url: 'https://tuvien.com/chua_online/img/honiem1.jpg' },
  { name: 'honiem1_lit.jpg', url: 'https://tuvien.com/chua_online/img/honiem1_.jpg' },
  { name: 'ngaygio1.jpg', url: 'https://tuvien.com/chua_online/img/ngaygio1.jpg' },
  { name: 'ngaygio1_lit.jpg', url: 'https://tuvien.com/chua_online/img/ngaygio1_.jpg' },
  { name: 'khoi.png', url: 'https://tuvien.com/chua_online/img/khoi.png' }
);

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://tuvien.com/chua_online/',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`Failed ${url}: HTTP ${res.statusCode}`));
        }

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      }
    );

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(new Error(`Timeout ${url}`));
    });
  });
}

async function run() {
  console.log('--- BẮT ĐẦU TẢI AUDIO TỪ TUVIEN.COM ---');
  for (const item of AUDIO_FILES) {
    const dest = path.join(audioDir, item.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`[BỎ QUA] Đã có: ${item.name} (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
      continue;
    }
    process.stdout.write(`Đang tải audio ${item.name}... `);
    try {
      await downloadFile(item.url, dest);
      const size = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`THÀNH CÔNG (${size} KB)`);
    } catch (err) {
      console.log(`LỖI: ${err.message}`);
    }
  }

  console.log('\n--- BẮT ĐẦU TẢI HÌNH ẢNH TỪ TUVIEN.COM ---');
  for (const item of IMAGE_FILES) {
    const dest = path.join(imageDir, item.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
      console.log(`[BỎ QUA] Đã có: ${item.name} (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
      continue;
    }
    process.stdout.write(`Đang tải ảnh ${item.name}... `);
    try {
      await downloadFile(item.url, dest);
      const size = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`THÀNH CÔNG (${size} KB)`);
    } catch (err) {
      console.log(`LỖI: ${err.message}`);
    }
  }

  console.log('\n--- HOÀN TẤT TẢI DỮ LIỆU ---');
}

run();
