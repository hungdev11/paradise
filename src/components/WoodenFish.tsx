import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WoodenFishSkinId, BlessingItem } from '../types/zen';
import { WOODEN_FISH_SKINS } from '../data/presets';
import { audioEngine, WoodenFishSoundType } from '../services/audio-engine';
import { storage } from '../services/storage';
import { Play, Pause, Sparkles, Settings2, RotateCcw, X } from 'lucide-react';

interface WoodenFishProps {
  onTapCount: (increment: number) => void;
  lifetimeCount: number;
  isFocusedView?: boolean;
}

const BLESSING_PHRASES = [
  'Công Đức +1',
  'Tâm An +1',
  'Phiền Não -1',
  'Bình An +1',
  'Phước Đức +1',
  'Trí Tuệ +1',
  'Bồ Đề Tâm +1',
];

const SOUND_OPTIONS: { id: WoodenFishSoundType; label: string }[] = [
  { id: 'classic', label: 'Gỗ Mít Cổ' },
  { id: 'deep', label: 'Trầm Hương Cổ' },
  { id: 'crisp', label: 'Mõ Gỗ Mun' },
  { id: 'bonk', label: '🔥 Meme Bonk' },
];

export const WoodenFish: React.FC<WoodenFishProps> = ({ 
  onTapCount, 
  lifetimeCount,
  isFocusedView = false 
}) => {
  const [skinId, setSkinId] = useState<WoodenFishSkinId>('classic-wood');
  const [soundType, setSoundType] = useState<WoodenFishSoundType>(audioEngine.getFishSoundType());
  const [isStriking, setIsStriking] = useState(false);
  const [combo, setCombo] = useState(0);
  const [blessings, setBlessings] = useState<BlessingItem[]>([]);
  const [customBlessing, setCustomBlessing] = useState<string>(storage.getBlessingText());
  const [showConfig, setShowConfig] = useState(false);

  // Auto-tap state
  const [isAutoTapping, setIsAutoTapping] = useState(false);
  const [bpm, setBpm] = useState(72);
  const [autoTimerMinutes, setAutoTimerMinutes] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const strikeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fishRef = useRef<HTMLDivElement | null>(null);

  const currentSkin = WOODEN_FISH_SKINS.find((s) => s.id === skinId) || WOODEN_FISH_SKINS[0];

  const handleSelectSound = (e: React.MouseEvent, type: WoodenFishSoundType) => {
    e.stopPropagation();
    setSoundType(type);
    audioEngine.setFishSoundType(type);
  };

  // Core Strike Trigger
  const triggerStrike = useCallback(
    (clientX?: number, clientY?: number) => {
      audioEngine.playWoodenFish(true);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }

      setIsStriking(true);
      if (strikeTimeoutRef.current) clearTimeout(strikeTimeoutRef.current);
      strikeTimeoutRef.current = setTimeout(() => setIsStriking(false), 120);

      onTapCount(1);
      setCombo((prev) => prev + 1);

      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => setCombo(0), 2200);

      const rect = fishRef.current?.getBoundingClientRect();
      const posX = clientX ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
      const posY = clientY ?? (rect ? rect.top + 30 : window.innerHeight / 2);

      let phrase = customBlessing.trim()
        ? customBlessing
        : BLESSING_PHRASES[Math.floor(Math.random() * BLESSING_PHRASES.length)];

      if (soundType === 'bonk' && Math.random() < 0.35) {
        phrase = 'Bonk! 🐕';
      }

      const newBlessing: BlessingItem = {
        id: `${Date.now()}-${Math.random()}`,
        text: phrase,
        x: posX + (Math.random() - 0.5) * 70,
        y: posY + (Math.random() - 0.5) * 30,
      };

      setBlessings((prev) => [...prev.slice(-14), newBlessing]);
    },
    [customBlessing, onTapCount, soundType]
  );

  // Clean old blessings
  useEffect(() => {
    if (blessings.length === 0) return;
    const timer = setTimeout(() => {
      setBlessings((prev) => prev.slice(1));
    }, 1100);
    return () => clearTimeout(timer);
  }, [blessings]);

  // Spacebar hotkey listener
  useEffect(() => {
    let lastKeyTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastKeyTime > 50) {
          lastKeyTime = now;
          triggerStrike();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerStrike]);

  // Auto-tap loop
  useEffect(() => {
    if (!isAutoTapping) {
      if (autoTapIntervalRef.current) clearInterval(autoTapIntervalRef.current);
      return;
    }

    const intervalMs = Math.round((60 / bpm) * 1000);
    autoTapIntervalRef.current = setInterval(() => {
      triggerStrike();
    }, intervalMs);

    return () => {
      if (autoTapIntervalRef.current) clearInterval(autoTapIntervalRef.current);
    };
  }, [isAutoTapping, bpm, triggerStrike]);

  // Auto-tap timer countdown
  useEffect(() => {
    if (!isAutoTapping || remainingSeconds <= 0) return;
    const countdown = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsAutoTapping(false);
          audioEngine.playTempleBell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [isAutoTapping, remainingSeconds]);

  const handlePointerDown = (e: React.PointerEvent) => {
    triggerStrike(e.clientX, e.clientY);
  };

  const startAutoTapWithTimer = (mins: number) => {
    setAutoTimerMinutes(mins);
    if (mins > 0) {
      setRemainingSeconds(mins * 60);
    } else {
      setRemainingSeconds(0);
    }
    setIsAutoTapping(true);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Reusable Configuration Dashboard Content
  const renderConfigContent = (isModal: boolean = false) => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300 font-serif">
            Cấu Hình Mõ & Trợ Niệm
          </h4>
        </div>
        {isModal && (
          <button
            onClick={() => setShowConfig(false)}
            className="p-1 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white text-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 1. Âm Sắc Tiếng Mõ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-stone-300 font-medium">Âm Sắc Tiếng Mõ</label>
          <span className="text-[10px] text-amber-400 font-mono">
            {SOUND_OPTIONS.find((s) => s.id === soundType)?.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={(e) => handleSelectSound(e, opt.id)}
              className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center justify-between ${
                soundType === opt.id
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-md'
                  : 'border-stone-800 bg-stone-900/50 text-stone-400 hover:border-stone-700 hover:text-stone-300'
              }`}
            >
              <span>{opt.label}</span>
              {soundType === opt.id && <Sparkles className="w-3 h-3 text-amber-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Chất Liệu Mõ (Skins) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-stone-300 font-medium">Chất Liệu Mõ (Skins)</label>
          <span className="text-[10px] text-stone-400">{currentSkin.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {WOODEN_FISH_SKINS.map((skin) => (
            <button
              key={skin.id}
              onClick={() => setSkinId(skin.id)}
              className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center gap-2 ${
                skinId === skin.id
                  ? 'border-amber-400 bg-amber-500/15 text-amber-200 font-semibold shadow-md'
                  : 'border-stone-800 bg-stone-900/50 text-stone-400 hover:border-stone-700 hover:text-stone-300'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-stone-600 shrink-0 shadow-sm"
                style={{ backgroundColor: skin.accent }}
              />
              <span className="truncate text-xs">{skin.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Chữ Bay Lên Khi Gõ */}
      <div className="space-y-2">
        <label className="text-xs text-stone-300 font-medium">Chữ Bay Lên Khi Gõ</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customBlessing}
            maxLength={22}
            placeholder="VD: Công Đức +1, Tâm An +1..."
            onChange={(e) => {
              setCustomBlessing(e.target.value);
              storage.saveBlessingText(e.target.value);
            }}
            className="flex-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-xs text-amber-200 focus:outline-none focus:border-amber-400 placeholder:text-stone-600"
          />
          <button
            onClick={() => {
              setCustomBlessing('Công Đức +1');
              storage.saveBlessingText('Công Đức +1');
            }}
            className="px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
            title="Đặt về mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-1">
          {['Công Đức +1', 'Tâm An +1', 'Phiền Não -1', 'Bonk! 🐕', 'A Di Đà Phật'].map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                setCustomBlessing(text);
                storage.saveBlessingText(text);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${
                customBlessing === text
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tự Động Gõ (BPM & Hẹn Giờ) */}
      <div className="space-y-2.5 pt-2 border-t border-stone-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (isAutoTapping) {
                setIsAutoTapping(false);
              } else {
                startAutoTapWithTimer(autoTimerMinutes);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isAutoTapping
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-amber-500/50'
            }`}
          >
            {isAutoTapping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAutoTapping ? 'Đang Tự Gõ' : 'Bật Tự Động Gõ'}</span>
          </button>

          <span className="font-mono text-xs text-amber-400 font-bold">
            {bpm} BPM {isAutoTapping && remainingSeconds > 0 && `[${formatTimer(remainingSeconds)}]`}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-400">
            <span>Nhịp độ (BPM)</span>
            <span>{bpm} nhịp/phút</span>
          </div>
          <input
            type="range"
            min="30"
            max="160"
            step="2"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-stone-400">Hẹn Giờ Tự Tắt</span>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[0, 5, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => startAutoTapWithTimer(mins)}
                className={`py-1.5 rounded-xl border text-center transition-all ${
                  autoTimerMinutes === mins && isAutoTapping
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                    : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700'
                }`}
              >
                {mins === 0 ? 'Vô hạn' : `${mins}p`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // SVG Wooden Fish Graphic
  const renderWoodenFishGraphic = () => (
    <div className="relative flex items-center justify-center p-4 lg:p-6">
      {/* Ripple Shockwave Ring on Strike */}
      <div
        className={`absolute w-72 h-72 sm:w-96 sm:h-96 lg:w-[420px] lg:h-[420px] rounded-full border-2 border-amber-400/50 pointer-events-none transition-all duration-300 ease-out ${
          isStriking ? 'scale-110 opacity-90' : 'scale-90 opacity-0'
        }`}
      />

      {/* Mallet (Dùi Gõ) */}
      <div
        className={`absolute -top-14 -right-10 lg:-top-16 lg:-right-12 w-28 h-28 lg:w-36 lg:h-36 pointer-events-none transition-transform duration-75 z-20 ${
          isStriking ? 'animate-mallet' : 'rotate-12 translate-x-1 -translate-y-1'
        }`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-lg">
          <line x1="85" y1="15" x2="35" y2="70" stroke="#78350f" strokeWidth="6.5" strokeLinecap="round" />
          <line x1="85" y1="15" x2="35" y2="70" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="73" r="15" fill="#b91c1c" />
          <circle cx="30" cy="70" r="11" fill="#dc2626" />
          <circle cx="28" cy="67" r="4.5" fill="#fca5a5" opacity="0.6" />
          <ellipse cx="38" cy="66" rx="3.5" ry="5.5" fill="#f59e0b" />
        </svg>
      </div>

      {/* The Wooden Fish (Mõ Gỗ) SVG Object */}
      <div
        ref={fishRef}
        onPointerDown={handlePointerDown}
        className={`relative cursor-pointer transition-transform transform active:scale-95 will-change-transform ${
          isStriking ? 'scale-95 translate-y-1.5' : 'hover:scale-[1.03]'
        }`}
        title="Nhấp chuột hoặc bấm phím Space để gõ mõ"
      >
        {/* Glowing under-halo */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-50 transition-opacity"
          style={{ backgroundColor: currentSkin.highlight }}
        />

        <svg
          viewBox="0 0 200 180"
          className="w-64 h-56 sm:w-80 sm:h-72 lg:w-96 lg:h-80 filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]"
        >
          <defs>
            <radialGradient id={`fish-grad-${skinId}`} cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor={currentSkin.highlight} />
              <stop offset="45%" stopColor={currentSkin.accent} />
              <stop offset="85%" stopColor={currentSkin.primary} />
              <stop offset="100%" stopColor="#171717" />
            </radialGradient>

            <linearGradient id="slit-depth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0a0a" />
              <stop offset="100%" stopColor="#262626" />
            </linearGradient>
          </defs>

          {/* Base Cushion / Pillow (Bồ Đoàn Mõ) */}
          <ellipse cx="100" cy="162" rx="88" ry="17" fill="#7f1d1d" opacity="0.95" />
          <ellipse cx="100" cy="160" rx="82" ry="14" fill="#991b1b" />
          <ellipse cx="100" cy="158" rx="74" ry="10" fill="#b91c1c" />
          <circle cx="32" cy="164" r="4.5" fill="#eab308" />
          <circle cx="168" cy="164" r="4.5" fill="#eab308" />
          <circle cx="100" cy="169" r="4.5" fill="#eab308" />

          {/* Main Fish Body (Hình Dáng Mõ Gỗ Cá Hóa Rồng) */}
          <path
            d="M 40 135 
               C 20 115, 18 65, 55 40 
               C 90 18, 140 22, 170 55 
               C 192 82, 188 120, 160 142 
               C 130 160, 68 158, 40 135 Z"
            fill={`url(#fish-grad-${skinId})`}
            stroke={currentSkin.ringColor}
            strokeWidth="4"
          />

          {/* Carved Fish Scales */}
          <path
            d="M 60 55 Q 75 70 90 55 Q 105 70 120 55"
            fill="none"
            stroke={currentSkin.ringColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M 68 75 Q 83 90 98 75 Q 113 90 128 75"
            fill="none"
            stroke={currentSkin.ringColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Mokugyo Fish Eye (Mắt Mõ) */}
          <circle cx="58" cy="62" r="11" fill={currentSkin.ringColor} />
          <circle cx="56" cy="60" r="7.5" fill="#1c1917" />
          <circle cx="54" cy="58" r="3" fill="#fef08a" />

          {/* Mouth Slit */}
          <path
            d="M 32 110 
               C 55 95, 95 105, 125 100 
               C 145 96, 160 88, 168 85
               C 155 108, 115 125, 75 125
               C 50 125, 38 118, 32 110 Z"
            fill="url(#slit-depth)"
            stroke="#0a0a0a"
            strokeWidth="2.5"
          />

          {/* Fish Pearl in mouth */}
          <circle cx="65" cy="114" r="8" fill={currentSkin.accent} stroke="#0a0a0a" strokeWidth="1.5" />
          <circle cx="63" cy="112" r="2.5" fill="#fff" opacity="0.8" />

          {/* Handle / Tail Loop */}
          <path
            d="M 160 58 C 182 50, 185 85, 165 92"
            fill="none"
            stroke={currentSkin.ringColor}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );

  // If in Focused View Mode ("Gõ Mõ" Tab): Display Fish on Left, Configuration Board on Right (Directly visible, no scrolling!)
  if (isFocusedView) {
    return (
      <div className="relative w-full max-w-5xl mx-auto flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8 xl:gap-12 select-none animate-in fade-in zoom-in-95 duration-200">
        {/* Floating Blessings Overlay */}
        {blessings.map((b) => (
          <div
            key={b.id}
            className="fixed z-40 animate-blessing font-serif font-bold text-lg sm:text-2xl text-amber-300 drop-shadow-[0_3px_10px_rgba(234,179,8,0.8)] pointer-events-none whitespace-nowrap"
            style={{ left: `${b.x}px`, top: `${b.y}px` }}
          >
            {b.text}
          </div>
        ))}

        {/* Left Column: The Wooden Fish Interactive Stage */}
        <div className="flex flex-col items-center flex-shrink-0">
          {/* Top Stats Banner */}
          <div className="mb-3 flex flex-col items-center">
            <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-stone-900/80 border border-amber-500/40 backdrop-blur-md shadow-xl">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase tracking-wider text-amber-300/90 font-medium">Công Đức:</span>
              <span className="font-mono text-lg sm:text-xl font-bold text-amber-300">{lifetimeCount.toLocaleString()}</span>
            </div>

            {combo > 2 && (
              <div className="mt-1 text-xs sm:text-sm font-semibold text-amber-400 tracking-widest animate-pulse">
                COMBO x{combo}
              </div>
            )}
          </div>

          {/* Quick Sound Selector Bar */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="mb-2 flex items-center gap-1.5 p-1 rounded-2xl bg-stone-900/80 border border-stone-800 backdrop-blur-md z-30 shadow-lg"
          >
            {SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => handleSelectSound(e, opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif transition-all ${
                  soundType === opt.id
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Wooden Fish Graphic */}
          {renderWoodenFishGraphic()}

          {/* Quick Action Bar & Hint */}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => {
                if (isAutoTapping) {
                  setIsAutoTapping(false);
                } else {
                  startAutoTapWithTimer(autoTimerMinutes);
                }
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all border ${
                isAutoTapping
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20 animate-pulse'
                  : 'bg-stone-900/80 text-stone-200 border-amber-500/40 hover:border-amber-400 shadow-lg'
              }`}
            >
              {isAutoTapping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isAutoTapping ? `Đang Tự Gõ (${bpm} BPM)` : 'Tự Động Gõ'}</span>
              {isAutoTapping && remainingSeconds > 0 && (
                <span className="font-mono text-amber-950 ml-1">[{formatTimer(remainingSeconds)}]</span>
              )}
            </button>
          </div>

          <div className="mt-2.5 text-xs text-stone-400/90 tracking-wide font-sans">
            Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono text-[11px]">Space</kbd> hoặc chạm vào mõ để tích công đức
          </div>
        </div>

        {/* Right Column: Permanent Configuration Dashboard (Directly visible, no scroll!) */}
        <div className="w-full max-w-sm zen-glass p-5 rounded-3xl border border-amber-500/30 shadow-2xl flex-shrink-0">
          {renderConfigContent(false)}
        </div>
      </div>
    );
  }

  // Ban Thờ Chung View Mode: Standard Altar Layout with Centered Modal for Settings
  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Floating Blessings Overlay */}
      {blessings.map((b) => (
        <div
          key={b.id}
          className="fixed z-40 animate-blessing font-serif font-bold text-lg sm:text-2xl text-amber-300 drop-shadow-[0_3px_10px_rgba(234,179,8,0.8)] pointer-events-none whitespace-nowrap"
          style={{ left: `${b.x}px`, top: `${b.y}px` }}
        >
          {b.text}
        </div>
      ))}

      {/* Top Stats Banner */}
      <div className="mb-4 flex flex-col items-center">
        <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-stone-900/80 border border-amber-500/40 backdrop-blur-md shadow-xl">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs uppercase tracking-wider text-amber-300/90 font-medium">Công Đức:</span>
          <span className="font-mono text-lg sm:text-xl font-bold text-amber-300">{lifetimeCount.toLocaleString()}</span>
        </div>

        {combo > 2 && (
          <div className="mt-1 text-xs sm:text-sm font-semibold text-amber-400 tracking-widest animate-pulse">
            COMBO x{combo}
          </div>
        )}
      </div>

      {/* Quick Sound Selector Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="mb-2 flex items-center gap-1.5 p-1 rounded-2xl bg-stone-900/80 border border-stone-800 backdrop-blur-md z-30 shadow-lg"
      >
        {SOUND_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => handleSelectSound(e, opt.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-serif transition-all ${
              soundType === opt.id
                ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Wooden Fish Graphic */}
      {renderWoodenFishGraphic()}

      {/* Control Action Buttons (Auto-tap & Centered Config Modal Trigger) */}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => {
            if (isAutoTapping) {
              setIsAutoTapping(false);
            } else {
              startAutoTapWithTimer(autoTimerMinutes);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
            isAutoTapping
              ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md shadow-amber-500/20 animate-pulse'
              : 'bg-stone-900/60 text-stone-300 border-stone-700 hover:border-amber-500/50 hover:text-white'
          }`}
        >
          {isAutoTapping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isAutoTapping ? `Đang Tự Gõ (${bpm} BPM)` : 'Tự Động Gõ'}</span>
          {isAutoTapping && remainingSeconds > 0 && (
            <span className="font-mono text-amber-400 ml-1">[{formatTimer(remainingSeconds)}]</span>
          )}
        </button>

        {/* Clear "Tùy Biến Mõ" Button */}
        <button
          onClick={() => setShowConfig(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-stone-900/80 hover:bg-stone-800 border border-amber-500/40 text-amber-200 hover:text-white transition-all shadow-md active:scale-95"
          title="Tùy biến Mõ, Tiếng & Lời Chúc"
        >
          <Settings2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Tùy Biến Mõ</span>
        </button>
      </div>

      <div className="mt-2 text-xs text-stone-400/90 tracking-wide font-sans">
        Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono text-[11px]">Space</kbd> hoặc chạm vào mõ để tích công đức
      </div>

      {/* Centered Modal Dialog (Appears Dead-Center in Viewport with Backdrop - No Scrolling Needed!) */}
      {showConfig && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowConfig(false)}
        >
          <div 
            className="w-full max-w-md max-h-[88vh] overflow-y-auto zen-glass p-6 rounded-3xl border border-amber-500/40 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {renderConfigContent(true)}
          </div>
        </div>
      )}
    </div>
  );
};
