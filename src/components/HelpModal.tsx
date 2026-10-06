import React from 'react';
import { HelpCircle, X, Keyboard, Sparkles, Heart } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Gõ mõ tích công đức (nhấn nhả hoặc giữ nhịp)' },
    { key: 'B', desc: 'Lần một hạt trong tràng chuỗi 108 hạt' },
    { key: 'C', desc: 'Thỉnh chuông Bát Nhã ngân vang' },
    { key: 'M', desc: 'Bật / tắt nhanh toàn bộ âm thanh' },
    { key: 'F', desc: 'Bật / tắt chế độ toàn màn hình' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md zen-glass p-6 rounded-3xl border border-amber-500/30 shadow-2xl flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-100">Hướng Dẫn & Phím Tắt</h3>
            <p className="text-xs text-stone-400">Trải nghiệm tịnh tâm thuận tiện nhất</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Shortcuts list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider">
              <Keyboard className="w-4 h-4" />
              <span>Phím Tắt Bàn Phím</span>
            </div>

            <div className="divide-y divide-stone-800 rounded-2xl bg-stone-900/60 border border-stone-800/80 overflow-hidden">
              {shortcuts.map((sc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                  <span className="text-stone-300">{sc.desc}</span>
                  <kbd className="px-2 py-1 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono font-bold text-[11px] shadow-sm">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Quick tips */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed font-serif">
            💡 <strong>Mẹo Tùy Biến:</strong> Bấm vào biểu tượng Hình Ảnh trên thanh công cụ để tải ảnh ban thờ / phong cảnh của riêng bạn, sau đó dùng chuột kéo rê (drag) và cuộn (zoom) để căn góc đẹp nhất!
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-all"
        >
          Đã Hiểu
        </button>
      </div>
    </div>
  );
};
