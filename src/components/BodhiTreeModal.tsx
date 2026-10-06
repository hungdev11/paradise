import React, { useState, useEffect } from 'react';
import { WishRibbonColor, BodhiWishRibbon } from '../types/zen';
import { plazaService } from '../services/plaza-service';
import { audioEngine } from '../services/audio-engine';
import { X, Sparkles, Heart, Send, Check, Trees } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BodhiTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMerits: number;
}

const RIBBON_COLORS: { id: WishRibbonColor; name: string; hex: string; bgClass: string; desc: string }[] = [
  { id: 'yellow', name: 'Vàng Kim', hex: '#f59e0b', bgClass: 'bg-amber-500', desc: 'Trí Huệ & Cát Tường' },
  { id: 'red', name: 'Đỏ Chu Sa', hex: '#ef4444', bgClass: 'bg-rose-500', desc: 'Bình An & Phúc Lộc' },
  { id: 'blue', name: 'Xanh Lam', hex: '#06b6d4', bgClass: 'bg-cyan-500', desc: 'Sức Khỏe & Tịnh Tâm' },
  { id: 'pink', name: 'Hồng Sen', hex: '#ec4899', bgClass: 'bg-pink-500', desc: 'Duyên Lành & Hòa Hợp' },
  { id: 'purple', name: 'Tím Trầm', hex: '#8b5cf6', bgClass: 'bg-purple-500', desc: 'Tiêu Trừ Nghiệp Chướng' },
];

export const BodhiTreeModal: React.FC<BodhiTreeModalProps> = ({ isOpen, onClose, userMerits }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [wishText, setWishText] = useState('');
  const [selectedColor, setSelectedColor] = useState<WishRibbonColor>('yellow');
  const [wishes, setWishes] = useState<BodhiWishRibbon[]>([]);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const myProfile = plazaService.getProfile();

  // Reload wishes
  useEffect(() => {
    if (isOpen) {
      setWishes(plazaService.getBodhiWishes());
    }
  }, [isOpen]);

  // Subscribe to live wish events
  useEffect(() => {
    const unsubCreate = plazaService.onBodhiWishCreated((_ribbon) => {
      setWishes(plazaService.getBodhiWishes());
    });
    const unsubRejoice = plazaService.onBodhiWishRejoiced((_id) => {
      setWishes(plazaService.getBodhiWishes());
    });
    return () => {
      unsubCreate();
      unsubRejoice();
    };
  }, []);

  if (!isOpen) return null;

  const handleCreateWish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = wishText.trim();
    if (!trimmed) return;

    if (userMerits < 5) {
      setAlertMsg('Bạn cần tối thiểu 5 Điểm Công Đức để treo dải lụa Bồ Đề! Hãy gõ mõ hoặc dâng hương tích thêm phước.');
      setTimeout(() => setAlertMsg(null), 4000);
      return;
    }

    const success = plazaService.createBodhiWish(trimmed, selectedColor);
    if (success) {
      audioEngine.playTempleBell();
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ec4899', '#38bdf8', '#86efac'],
        });
      } catch {}

      setWishText('');
      setAlertMsg('🙏 Đã treo dải lụa nguyện ước thành công lên Cây Bồ Đề (-5 Công Đức)!');
      setTimeout(() => {
        setAlertMsg(null);
        setActiveTab('list');
      }, 1500);
    }
  };

  const handleRejoice = (ribbonId: string) => {
    plazaService.rejoiceBodhiWish(ribbonId);
    audioEngine.playWoodenFish(true);
    try {
      confetti({
        particleCount: 20,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#10b981'],
      });
    } catch {}

    setAlertMsg('🙏 Tùy hỷ công đức! Cả bạn và đạo hữu đều được +1 Công Đức.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-amber-200 tracking-wide">
                CÂY BỒ ĐỀ NGUYỆN ƯỚC
              </h2>
              <p className="text-xs text-stone-400">
                Gốc cổ thụ ngàn năm • Tùy hỷ phước lành cộng đồng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Công Đức: <b>{userMerits}</b></span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-800 bg-stone-950/60 p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'create'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Treo Dải Lụa Cầu An
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'list'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400" />
            Chiêm Ngưỡng & Tùy Hỷ ({wishes.length})
          </button>
        </div>

        {/* Notification Alert Banner */}
        {alertMsg && (
          <div className="px-4 py-2 bg-amber-950/80 border-b border-amber-600/40 text-amber-200 text-xs text-center flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{alertMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateWish} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  1. Chọn Màu Dải Lụa Cầu Nguyện
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RIBBON_COLORS.map((c) => {
                    const isSelected = selectedColor === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedColor(c.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-400 text-white shadow-md'
                            : 'bg-stone-800/40 border-stone-700/60 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full ${c.bgClass} flex-shrink-0 shadow-sm`} />
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium truncate text-stone-200">{c.name}</div>
                          <div className="text-[10px] text-stone-400 truncate">{c.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-stone-300">
                    2. Lời Nguyện / Tâm Niệm (Tối đa 120 ký tự)
                  </label>
                  <span className={`text-[10px] ${wishText.length > 110 ? 'text-amber-400' : 'text-stone-400'}`}>
                    {wishText.length}/120
                  </span>
                </div>
                <textarea
                  value={wishText}
                  onChange={(e) => setWishText(e.target.value.slice(0, 120))}
                  placeholder="Ví dụ: Cầu mong gia đạo bình an, tâm hồn thanh tịnh, mọi người an lành... 🙏"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400 placeholder:text-stone-400 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-xs text-stone-300 flex items-center justify-between">
                <span>Chi phí treo dải lụa:</span>
                <span className="font-bold text-amber-300">5 Điểm Công Đức (Hiện có: {userMerits})</span>
              </div>

              <button
                type="submit"
                disabled={!wishText.trim() || userMerits < 5}
                className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
                Treo Dải Lụa Cầu An Lên Cây Bồ Đề
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {wishes.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  Chưa có dải lụa nào được treo. Hãy là người đầu tiên gửi gắm ước nguyện!
                </div>
              ) : (
                wishes.map((w) => {
                  const colorSpec = RIBBON_COLORS.find((c) => c.id === w.color) || RIBBON_COLORS[0];
                  const hasRejoiced = w.rejoicedBy?.includes(myProfile.id);
                  const isAuthor = w.senderId === myProfile.id;
                  const timeFormatted = new Date(w.createdAt).toLocaleDateString([], {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={w.id}
                      className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800/80 hover:border-amber-600/30 transition flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${colorSpec.bgClass} shadow-sm`} />
                          <span className="text-xs font-semibold text-amber-200">{w.senderName}</span>
                          <span className="text-[10px] text-stone-400">{timeFormatted}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                          {colorSpec.name}
                        </span>
                      </div>

                      <p className="text-sm text-stone-200 leading-relaxed pl-1 font-serif">
                        &ldquo;{w.wishText}&rdquo;
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/50">
                        <span className="text-xs text-amber-300/90 flex items-center gap-1 font-mono">
                          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                          {w.rejoiceCount} lượt tùy hỷ
                        </span>

                        {isAuthor ? (
                          <span className="text-[11px] text-stone-400 italic">Dải lụa của bạn</span>
                        ) : hasRejoiced ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                            <Check className="w-3.5 h-3.5" /> Đã Tùy Hỷ (+1 Công Đức)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRejoice(w.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-1.5 transition"
                          >
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                            Tùy Hỷ Công Đức 🙏 (+1)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
