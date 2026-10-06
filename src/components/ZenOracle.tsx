import React, { useState } from 'react';
import { ORACLE_CARDS } from '../data/presets';
import { OracleCard } from '../types/zen';
import { audioEngine } from '../services/audio-engine';
import { Scroll, Sparkles, RotateCw, X, Share2, Heart } from 'lucide-react';

interface ZenOracleProps {
  isOpen: boolean;
  onClose: () => void;
  onOracleDrawn: () => void;
}

export const ZenOracle: React.FC<ZenOracleProps> = ({ isOpen, onClose, onOracleDrawn }) => {
  const [isShaking, setIsShaking] = useState(false);
  const [drawnCard, setDrawnCard] = useState<OracleCard | null>(null);

  if (!isOpen) return null;

  const handleDrawOracle = () => {
    setIsShaking(true);
    setDrawnCard(null);

    // Play bamboo sticks clatter
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        audioEngine.playBeadClick();
      }, i * 110);
    }

    setTimeout(() => {
      setIsShaking(false);
      const randomIndex = Math.floor(Math.random() * ORACLE_CARDS.length);
      setDrawnCard(ORACLE_CARDS[randomIndex]);
      audioEngine.playTempleBell(280);
      onOracleDrawn();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg zen-glass-gold p-6 sm:p-8 rounded-3xl border border-amber-500/40 shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-4">
          <Scroll className="w-5 h-5 text-amber-400" />
          <h3 className="font-serif font-bold text-xl text-amber-100 tracking-wide">
            Xin Xăm Bình An • Quẻ Thiền
          </h3>
        </div>

        {!drawnCard ? (
          /* Shaking Tube State */
          <div className="my-6 flex flex-col items-center">
            {/* Bamboo Tube SVG */}
            <div
              className={`relative cursor-pointer transition-transform ${
                isShaking ? 'animate-bounce' : 'hover:scale-105'
              }`}
              onClick={handleDrawOracle}
            >
              <svg viewBox="0 0 120 180" className="w-32 h-44 filter drop-shadow-xl">
                <defs>
                  <linearGradient id="bamboo-cyl" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="35%" stopColor="#b45309" />
                    <stop offset="70%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                </defs>

                {/* Wooden Divination Sticks sticking out top */}
                <line x1="45" y1="45" x2="40" y2="10" stroke="#fef08a" strokeWidth="4" strokeLinecap="round" />
                <line x1="55" y1="45" x2="52" y2="5" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
                <line x1="65" y1="45" x2="68" y2="8" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" />
                <line x1="75" y1="45" x2="80" y2="14" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />

                {/* Bamboo Cylinder */}
                <rect x="35" y="40" width="50" height="130" rx="6" fill="url(#bamboo-cyl)" stroke="#ca8a04" strokeWidth="2" />
                {/* Bamboo Joint Rings */}
                <line x1="35" y1="85" x2="85" y2="85" stroke="#451a03" strokeWidth="4" />
                <line x1="35" y1="135" x2="85" y2="135" stroke="#451a03" strokeWidth="4" />

                {/* Red Character Seal */}
                <rect x="50" y="98" width="20" height="24" rx="2" fill="#991b1b" />
                <text x="60" y="115" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="bold" fontFamily="serif">
                  禪
                </text>
              </svg>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-stone-300 max-w-xs font-serif leading-relaxed">
              Hãy lắng lòng tĩnh tâm trong ba nhịp thở, giữ tâm nguyện hướng thiện, rồi chạm vào ống xăm để rút một quẻ bình an.
            </p>

            <button
              onClick={handleDrawOracle}
              disabled={isShaking}
              className="mt-6 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isShaking ? 'Đang Lắc Ống Xăm...' : 'Lắc Ống Xăm'}</span>
            </button>
          </div>
        ) : (
          /* Drawn Card Reveal State */
          <div className="w-full my-3 flex flex-col items-center animate-in zoom-in-95 duration-300">
            {/* Sacred Card Box */}
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-stone-900/90 to-stone-950 border border-amber-400/50 shadow-inner relative overflow-hidden text-center">
              <div className="text-amber-400 font-serif text-3xl font-bold tracking-widest mb-1">
                {drawnCard.chineseTitle}
              </div>
              <h4 className="text-lg font-serif font-semibold text-amber-200 mb-3">
                {drawnCard.title}
              </h4>

              {/* Poetic Verse */}
              <div className="p-3.5 my-3 rounded-xl bg-amber-500/10 border border-amber-500/20 font-serif text-amber-100 text-sm italic whitespace-pre-line leading-relaxed">
                "{drawnCard.verse}"
              </div>

              {/* Explanation */}
              <div className="space-y-2 text-left mt-4 text-xs sm:text-sm">
                <div>
                  <span className="font-semibold text-amber-300">Ý nghĩa: </span>
                  <span className="text-stone-300">{drawnCard.explanation}</span>
                </div>
                <div>
                  <span className="font-semibold text-amber-300">Lời khuyên chánh niệm: </span>
                  <span className="text-stone-200 font-medium">{drawnCard.advice}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleDrawOracle}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-semibold transition-all active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rút Quẻ Khác</span>
              </button>

              <button
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 text-xs font-bold transition-all active:scale-95"
              >
                Tâm Nhận Lời Dạy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
