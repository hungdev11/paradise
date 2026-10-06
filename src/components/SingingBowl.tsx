import React, { useState, useEffect, useRef } from 'react';
import { audioEngine, TempleBellSoundType } from '../services/audio-engine';
import { Bell, Disc } from 'lucide-react';

interface SingingBowlProps {
  onStrike: () => void;
}

const BELL_SOUND_OPTIONS: { id: TempleBellSoundType; label: string }[] = [
  { id: 'gia-tri', label: 'Chuông Gia Trì' },
  { id: 'dai-hong-chung', label: 'Đại Hồng Chung' },
  { id: 'crystal', label: 'Khánh Đồng' },
];

export const SingingBowl: React.FC<SingingBowlProps> = ({ onStrike }) => {
  const [bellSound, setBellSound] = useState<TempleBellSoundType>(audioEngine.getBellSoundType());
  const [isVibrating, setIsVibrating] = useState(false);
  const [isSingingContinuous, setIsSingingContinuous] = useState(false);
  const vibrateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectSound = (e: React.MouseEvent, type: TempleBellSoundType) => {
    e.stopPropagation();
    setBellSound(type);
    audioEngine.setBellSoundType(type);
  };

  const strikeBell = () => {
    audioEngine.playTempleBell();
    onStrike();

    setIsVibrating(true);
    if (vibrateTimeoutRef.current) clearTimeout(vibrateTimeoutRef.current);
    vibrateTimeoutRef.current = setTimeout(() => setIsVibrating(false), 4200);
  };

  // Keyboard shortcut: 'C' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        strikeBell();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSingingContinuous = () => {
    if (isSingingContinuous) {
      audioEngine.stopAmbient();
      setIsSingingContinuous(false);
    } else {
      audioEngine.startAmbient('singing-bowl');
      setIsSingingContinuous(true);
    }
  };

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Title */}
      <div className="mb-3 px-4 py-1.5 rounded-full bg-stone-900/80 border border-amber-500/40 backdrop-blur-md">
        <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Chuông Bát Nhã</span>
      </div>

      {/* Bell Sound Quick Switcher - Isolated from Bell Strike Area */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="mb-3 flex items-center gap-1.5 p-1 rounded-2xl bg-stone-900/80 border border-stone-800 backdrop-blur-md z-30 shadow-lg"
      >
        {BELL_SOUND_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => handleSelectSound(e, opt.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-serif transition-all ${
              bellSound === opt.id
                ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Bell / Singing Bowl Visual - ENLARGED FOR PC/LAPTOP */}
      <div className="relative w-64 h-64 sm:w-76 sm:h-76 lg:w-88 lg:h-88 flex items-center justify-center">
        {/* Soundwave Echo Rings */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-amber-400/50 pointer-events-none transition-all duration-1000 ${
            isVibrating || isSingingContinuous ? 'scale-125 opacity-70 animate-ping' : 'scale-90 opacity-0'
          }`}
        />

        <div
          onClick={strikeBell}
          className={`cursor-pointer transition-transform transform active:scale-95 will-change-transform ${
            isVibrating ? 'scale-105' : 'hover:scale-[1.03]'
          }`}
          title="Nhấp để thỉnh chuông (hoặc bấm phím C)"
        >
          <svg viewBox="0 0 160 160" className="w-56 h-56 sm:w-68 sm:h-68 lg:w-80 lg:h-80 filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)]">
            <defs>
              <radialGradient id="bowl-gold" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
              <linearGradient id="rim-specular" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>

            {/* Cushion Cushion underneath */}
            <ellipse cx="80" cy="142" rx="58" ry="13" fill="#991b1b" />
            <ellipse cx="80" cy="140" rx="53" ry="10" fill="#dc2626" />

            {/* Bell/Bowl Body */}
            <path
              d="M 25 65 
                 C 25 125, 135 125, 135 65
                 C 135 48, 25 48, 25 65 Z"
              fill="url(#bowl-gold)"
              stroke="#ca8a04"
              strokeWidth="2.8"
            />

            {/* Bowl Rim */}
            <ellipse cx="80" cy="55" rx="55" ry="16" fill="#78350f" />
            <ellipse cx="80" cy="55" rx="52" ry="14" fill="#451a03" />
            <ellipse cx="80" cy="55" rx="55" ry="16" fill="none" stroke="url(#rim-specular)" strokeWidth="3.5" />

            {/* Sanskrit Om Inscription */}
            <circle cx="80" cy="92" r="18" fill="none" stroke="#78350f" strokeWidth="1.8" opacity="0.65" />
            <text
              x="80"
              y="98"
              textAnchor="middle"
              fill="#78350f"
              fontSize="16"
              fontWeight="bold"
              fontFamily="serif"
              opacity="0.8"
            >
              ॐ
            </text>
          </svg>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={strikeBell}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-semibold transition-all shadow active:scale-95"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Thỉnh Chuông</span>
        </button>

        <button
          onClick={toggleSingingContinuous}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all ${
            isSingingContinuous
              ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/30 animate-pulse font-bold'
              : 'bg-stone-900/60 text-stone-400 border-stone-800 hover:text-stone-200'
          }`}
          title="Bật âm ngân chuông xoay 432Hz liên tục"
        >
          <Disc className={`w-3.5 h-3.5 ${isSingingContinuous ? 'animate-spin' : ''}`} />
          <span>{isSingingContinuous ? 'Đang Ngân 432Hz' : 'Ngân Vang 432Hz'}</span>
        </button>
      </div>

      <div className="mt-2 text-xs text-stone-400/90 tracking-wide font-sans">
        Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono text-[11px]">C</kbd> hoặc chạm chuông để thỉnh
      </div>
    </div>
  );
};
