import React from 'react';
import { 
  Music, 
  Image as ImageIcon, 
  Scroll, 
  Heart, 
  Award, 
  Maximize, 
  Minimize, 
  Sparkles,
  HelpCircle,
  Layers,
  Flame,
  CheckCircle2,
  Bell,
  Users
} from 'lucide-react';

export type ZenViewMode = 'all' | 'fish' | 'incense' | 'mala' | 'bell' | 'plaza';

interface ControlBarProps {
  viewMode: ZenViewMode;
  onChangeViewMode: (mode: ZenViewMode) => void;
  onOpenAudio: () => void;
  onOpenBackground: () => void;
  onOpenOracle: () => void;
  onOpenWish: () => void;
  onOpenStats: () => void;
  onOpenHelp: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isZenFocus: boolean;
  onToggleZenFocus: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  viewMode,
  onChangeViewMode,
  onOpenAudio,
  onOpenBackground,
  onOpenOracle,
  onOpenWish,
  onOpenStats,
  onOpenHelp,
  isFullscreen,
  onToggleFullscreen,
  isZenFocus,
  onToggleZenFocus,
}) => {
  const views = [
    { id: 'all', label: 'Ban Thờ Chung', icon: Layers },
    { id: 'fish', label: 'Gõ Mõ', icon: Sparkles },
    { id: 'incense', label: 'Dâng Hương', icon: Flame },
    { id: 'mala', label: 'Tràng Hạt', icon: CheckCircle2 },
    { id: 'bell', label: 'Chuông Ngân', icon: Bell },
    { id: 'plaza', label: 'Sảnh Hội Ngộ', icon: Users },
  ] as const;

  return (
    <>
      {/* Top Header Navigation */}
      <header className={`fixed top-0 inset-x-0 z-40 p-3 sm:p-4 flex items-center justify-between transition-all duration-300 ${
        isZenFocus ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
      }`}>
        {/* Logo & App Title */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl zen-glass shadow-lg">
          <span className="text-xl">🪷</span>
          <div>
            <h1 className="font-serif font-bold text-sm sm:text-base text-amber-200 tracking-wider">
              TỊNH TÂM
            </h1>
            <p className="text-[10px] text-stone-400 hidden sm:block">Chánh niệm trong từng hơi thở</p>
          </div>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center rounded-2xl p-1 zen-glass border border-amber-500/20 shadow-lg">
          {views.map((v) => {
            const Icon = v.icon;
            const isActive = viewMode === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onChangeViewMode(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif transition-all ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/50'
                }`}
                title={v.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl zen-glass shadow-lg">
          <button
            onClick={onOpenAudio}
            className="p-2 rounded-xl text-stone-300 hover:text-amber-300 hover:bg-stone-800/60 transition-colors"
            title="Âm thanh & Tụng kinh"
          >
            <Music className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenBackground}
            className="p-2 rounded-xl text-stone-300 hover:text-amber-300 hover:bg-stone-800/60 transition-colors"
            title="Cài đặt hình nền (Upload, Drag, Zoom)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleZenFocus}
            className="p-2 rounded-xl text-stone-300 hover:text-amber-300 hover:bg-stone-800/60 transition-colors hidden sm:block"
            title="Chế độ Tịnh Tâm Tập Trung (Ẩn giao diện)"
          >
            {isZenFocus ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Floating Zen Focus Exit Button (Visible when UI is hidden) */}
      {isZenFocus && (
        <button
          onClick={onToggleZenFocus}
          className="fixed top-4 right-4 z-50 px-3.5 py-1.5 rounded-full zen-glass text-xs text-amber-300/80 hover:text-amber-200 border border-amber-500/30 shadow-2xl transition-all animate-fade-in"
        >
          Hiện Lại Bảng Điều Khiển
        </button>
      )}

      {/* Bottom Floating Zen Toolbar */}
      <footer className={`fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 transition-all duration-300 ${
        isZenFocus ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-2xl zen-glass border border-amber-500/30 shadow-2xl">
          <button
            onClick={onOpenOracle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif text-stone-300 hover:text-amber-200 hover:bg-stone-800/60 transition-all active:scale-95"
          >
            <Scroll className="w-3.5 h-3.5 text-amber-400" />
            <span>Xin Xăm</span>
          </button>

          <button
            onClick={onOpenWish}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif text-stone-300 hover:text-pink-300 hover:bg-stone-800/60 transition-all active:scale-95"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>Thả Hoa Đăng</span>
          </button>

          <div className="w-px h-4 bg-stone-800 mx-1" />

          <button
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif text-stone-300 hover:text-amber-200 hover:bg-stone-800/60 transition-all active:scale-95"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Sổ Công Đức</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-xl text-stone-400 hover:text-amber-300 hover:bg-stone-800/60 transition-colors"
            title="Phím tắt & Hướng dẫn"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-xl text-stone-400 hover:text-amber-300 hover:bg-stone-800/60 transition-colors"
            title="Toàn màn hình"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
};
