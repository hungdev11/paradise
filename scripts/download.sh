#!/usr/bin/env bash
set -e

mkdir -p public/audio/tuvien public/images/tuvien

BASE_URL="https://tuvien.com/chua_online"

download_file() {
    local url="$1"
    local dest="$2"
    if [ -f "$dest" ] && [ -s "$dest" ]; then
        echo "[EXISTS] $dest"
    else
        echo "Downloading: $dest"
        curl -s -L --retry 3 -H "User-Agent: Mozilla/5.0" "$url" -o "$dest"
    fi
}

echo "=== DOWNLOADING AUDIO ==="
download_file "$BASE_URL/audio/adidaphat0.mp3" "public/audio/tuvien/adidaphat0.mp3"
download_file "$BASE_URL/audio/adidaphat1.mp3" "public/audio/tuvien/adidaphat1.mp3"
download_file "$BASE_URL/audio/kinh/0000.dieu%20phap%20lien%20hoa.mp3" "public/audio/tuvien/dieu_phap_lien_hoa.mp3"
download_file "$BASE_URL/audio/kinh/0001.Kinh%20Vu%20Lan.mp3" "public/audio/tuvien/kinh_vu_lan.mp3"
download_file "$BASE_URL/audio/kinh/0002.Kinh%20Lang%20%20nghiem%20-%20cong%20phu%20khuya.mp3" "public/audio/tuvien/kinh_lang_nghiem.mp3"
download_file "$BASE_URL/audio/kinh/0003.Kinh%20Duoc%20Su.mp3" "public/audio/tuvien/kinh_duoc_su.mp3"
download_file "$BASE_URL/audio/kinh/0004.Kinh-PhoMonNghia_TriThoat.mp3" "public/audio/tuvien/kinh_pho_mon.mp3"
download_file "$BASE_URL/audio/kinh/0005.Kinh%20Tam%20Dieu%20Tu%20Tam.mp3" "public/audio/tuvien/kinh_tam_dieu_tu_tam.mp3"
download_file "$BASE_URL/audio/kinh/0006.A%20di%20da.mp3" "public/audio/tuvien/kinh_a_di_da.mp3"
download_file "$BASE_URL/audio/kinh/0007.ThayTriThoat_KinhVoLuongTho-Nghia.mp3" "public/audio/tuvien/kinh_vo_luong_tho.mp3"
download_file "$BASE_URL/audio/kinh/0008.tu%20bi%20thuy%20sam.mp3" "public/audio/tuvien/tu_bi_thuy_sam.mp3"
download_file "$BASE_URL/audio/kinh/0009.dia%20tang%20bon%20nguyen.mp3" "public/audio/tuvien/dia_tang_bon_nguyen.mp3"
download_file "$BASE_URL/audio/kinh/0010.48%20Loi%20Nguyen.mp3" "public/audio/tuvien/48_loi_nguyen.mp3"
download_file "$BASE_URL/audio/kinh/0011.Luc%20Tu%20Di%20Da.mp3" "public/audio/tuvien/luc_tu_di_da.mp3"
download_file "$BASE_URL/audio/kinh/chu_dai_bi.mp3" "public/audio/tuvien/chu_dai_bi.mp3"
download_file "$BASE_URL/audio/kinh/Cong%20Phu%20Khuya.mp3" "public/audio/tuvien/cong_phu_khuya.mp3"
download_file "$BASE_URL/audio/kinh/Kinh%20A%20DI%20DA%20cau%20sieu.mp3" "public/audio/tuvien/kinh_a_di_da_cau_sieu.mp3"
download_file "$BASE_URL/audio/kinh/Kinh%20bao%20hieu.mp3" "public/audio/tuvien/kinh_bao_hieu.mp3"
download_file "$BASE_URL/audio/kinh/Kinh%20sam%20hoi.mp3" "public/audio/tuvien/kinh_sam_hoi.mp3"
download_file "$BASE_URL/audio/kinh/Kinh%20tung%20tong%20tang.mp3" "public/audio/tuvien/kinh_tong_tang.mp3"

echo "=== DOWNLOADING IMAGES ==="
for i in {0..9}; do
    download_file "$BASE_URL/img/Scene$i.jpg" "public/images/tuvien/scene$i.jpg"
    download_file "$BASE_URL/img/Scene$i"_"".jpg "public/images/tuvien/scene${i}_lit.jpg"
done

download_file "$BASE_URL/img/causieu1.jpg" "public/images/tuvien/causieu1.jpg"
download_file "$BASE_URL/img/causieu1_.jpg" "public/images/tuvien/causieu1_lit.jpg"
download_file "$BASE_URL/img/honiem1.jpg" "public/images/tuvien/honiem1.jpg"
download_file "$BASE_URL/img/honiem1_.jpg" "public/images/tuvien/honiem1_lit.jpg"
download_file "$BASE_URL/img/ngaygio1.jpg" "public/images/tuvien/ngaygio1.jpg"
download_file "$BASE_URL/img/ngaygio1_.jpg" "public/images/tuvien/ngaygio1_lit.jpg"
download_file "$BASE_URL/img/khoi.png" "public/images/tuvien/khoi.png"

echo "=== ALL DOWNLOADS COMPLETED ==="
