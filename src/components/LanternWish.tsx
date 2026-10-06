import React, { useState } from 'react';
import { WishLantern } from '../types/zen';
import { audioEngine } from '../services/audio-engine';
import { Send, Heart, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LanternWishProps {
  isOpen: boolean;
  onClose: () => void;
  onWishReleased: (lantern: WishLantern) => void;
}

const LANTERN_COLORS = [
  { id: 'pink', name: 'Sen Hồng', hex: '#ec4899', flame: '#fde047' },
  { id: 'gold', name: 'Hoàng Kim', hex: '#eab308', flame: '#fef08a' },
  { id: 'cyan', name: 'Lam Ngọc', hex: '#06b6d4', flame: '#67e8f9' },
  { id: 'purple', name: 'Tử Sa', hex: '#a855f7', flame: '#f0abfc' },
];

export const LanternWish: React.FC<LanternWishProps> = ({ isOpen, onClose, onWishReleased }) => {
  const [wishText, setWishText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LANTERN_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) return;

    audioEngine.playWishChime();

    // Subtle gentle sparkles
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#fde047', '#f472b6', '#eab308'],
    });

    const newLantern: WishLantern = {
      id: `${Date.now()}-${Math.random()}`,
      text: wishText.trim(),
      author: authorName.trim() || 'Người Hữu Duyên',
      color: selectedColor.hex,
      x: Math.random() * (window.innerWidth - 120) + 60,
      y: window.innerHeight - 80,
      speed: Math.random() * 0.4 + 0.3,
      scale: Math.random() * 0.3 + 0.85,
      createdAt: Date.now(),
    };

    onWishReleased(newLantern);
    setWishText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md zen-glass p-6 sm:p-7 rounded-3xl border border-pink-500/30 shadow-2xl flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400">
            <Heart className="w-5 h-5 fill-pink-500/40" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-100">Thả Hoa Đăng Cầu Nguyện</h3>
            <p className="text-xs text-stone-400">Gửi lời chúc lành trôi theo dòng sông sao</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wish Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-300">Lời Nguyện Cầu</label>
            <textarea
              required
              rows={3}
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="VD: Nguyện cầu cho cha mẹ mạnh khỏe bình an, thân tâm thanh thản, vạn sự hanh thông..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900/80 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Author Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-300">Tên Của Bạn (Không bắt buộc)</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="VD: Phật tử Diệu Thiện, Nguyễn Văn A..."
              className="w-full px-3.5 py-2 rounded-xl bg-stone-900/80 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Lantern Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-300">Sắc Màu Hoa Đăng</label>
            <div className="grid grid-cols-4 gap-2">
              {LANTERN_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedColor(c)}
                  className={`py-2 px-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    selectedColor.id === c.id
                      ? 'border-amber-400 bg-amber-500/10 shadow'
                      : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shadow-inner"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[11px] text-stone-300">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Thắp Sáng & Thả Hoa Đăng</span>
          </button>
        </form>
      </div>
    </div>
  );
};
