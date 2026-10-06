import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../services/audio-engine';
import { Flame, Undo2, Sparkles } from 'lucide-react';

interface IncenseAltarProps {
  onIncenseLit: (count: number) => void;
  lifetimeLit?: number;
}

interface StickState {
  id: number;
  isLit: boolean;
  progress: number;
}

export const IncenseAltar: React.FC<IncenseAltarProps> = ({ onIncenseLit }) => {
  const [stickCount, setStickCount] = useState<1 | 3 | 5>(3);
  const [sticks, setSticks] = useState<StickState[]>([
    { id: 0, isLit: true, progress: 0.15 },
    { id: 1, isLit: true, progress: 0.08 },
    { id: 2, isLit: true, progress: 0.12 },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setSticks((prev) => {
      const result: StickState[] = [];
      const anyLit = prev.some((s) => s.isLit);
      for (let i = 0; i < stickCount; i++) {
        result.push(prev[i] || { id: i, isLit: anyLit, progress: 0.05 });
      }
      return result;
    });
  }, [stickCount]);

  // Incense Smoke Particle Simulation on Canvas (60fps)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      maxSize: number;
      alpha: number;
      life: number;
      maxLife: number;
      curl: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 110;

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const litSticks = sticks.filter((s) => s.isLit && s.progress < 1.0);
      const stickSpacing = 36;
      const totalWidth = (stickCount - 1) * stickSpacing;
      const startX = canvas.width / 2 - totalWidth / 2;

      litSticks.forEach((stick) => {
        if (particles.length < maxParticles && Math.random() < 0.65) {
          const stickX = startX + stick.id * stickSpacing;
          const fullHeight = 170;
          const currentHeight = fullHeight * (1 - stick.progress);
          const tipY = canvas.height - 65 - currentHeight;

          particles.push({
            x: stickX + (Math.random() - 0.5) * 2.5,
            y: tipY,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 1.1 - 0.8,
            size: Math.random() * 3 + 2.5,
            maxSize: Math.random() * 18 + 22,
            alpha: 0.45,
            life: 0,
            maxLife: Math.random() * 140 + 100,
            curl: (Math.random() - 0.5) * 0.035,
          });
        }
      });

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        const progress = p.life / p.maxLife;

        p.x += p.vx + Math.sin(time + p.y * 0.02) * 0.8;
        p.y += p.vy;
        p.vx += p.curl;

        const curSize = p.size + (p.maxSize - p.size) * Math.pow(progress, 0.7);

        if (progress < 0.15) {
          p.alpha = (progress / 0.15) * 0.45;
        } else {
          p.alpha = (1 - progress) * 0.45;
        }

        if (p.life >= p.maxLife || p.y < -30) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 225, 220, ${Math.max(0, p.alpha)})`;
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [sticks, stickCount]);

  useEffect(() => {
    const burnInterval = setInterval(() => {
      setSticks((prev) =>
        prev.map((s) => {
          if (!s.isLit || s.progress >= 1.0) return s;
          const next = s.progress + 0.003;
          return {
            ...s,
            progress: next >= 1.0 ? 1.0 : next,
            isLit: next < 1.0,
          };
        })
      );
    }, 1000);

    return () => clearInterval(burnInterval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2500);
  };

  // Dâng Nhang / Thắp Nhang
  const handleLightIncense = () => {
    audioEngine.playIncenseLight();
    onIncenseLit(stickCount);

    setSticks((prev) =>
      prev.map((s) => ({
        ...s,
        isLit: true,
        progress: 0,
      }))
    );
    showToast(`Dâng ${stickCount} nén tâm hương thanh tịnh 🙏`);
  };

  // 🔥 "ĐÒI LẠI NHANG" - Thu hồi / rút lại nhang
  const handleReclaimIncense = () => {
    audioEngine.playBeadClick(); // Subtle click
    setSticks((prev) =>
      prev.map((s) => ({
        ...s,
        isLit: false,
        progress: 0,
      }))
    );
    showToast('Đòi lại nhang thành công! (Công đức giữ nguyên 😆)');
  };

  const stickSpacing = 36;
  const totalWidth = (stickCount - 1) * stickSpacing;
  const burnerCenter = 190;
  const startX = burnerCenter - totalWidth / 2;

  const anyBurning = sticks.some((s) => s.isLit && s.progress < 1.0);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Humorous / Mindfulness Toast Message */}
      {toastMessage && (
        <div className="absolute -top-10 z-40 px-4 py-1.5 rounded-full bg-stone-900/90 border border-amber-500/50 text-amber-200 text-xs font-serif shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Altar Status & Controls */}
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex rounded-full bg-stone-900/80 border border-amber-500/40 p-1 backdrop-blur-md">
          {([1, 3, 5] as const).map((num) => (
            <button
              key={num}
              onClick={() => setStickCount(num)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-serif transition-all ${
                stickCount === num
                  ? 'bg-amber-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-amber-200'
              }`}
            >
              {num === 1 ? '1 Nén' : num === 3 ? '3 Nén (Tam Bảo)' : '5 Nén'}
            </button>
          ))}
        </div>

        {/* Dâng Nhang */}
        <button
          onClick={handleLightIncense}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-semibold transition-all shadow-md active:scale-95"
          title="Dâng thêm hương mới"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
          <span>{anyBurning ? 'Thắp Lại' : 'Dâng Nhang'}</span>
        </button>

        {/* 🔥 ĐÒI LẠI NHANG BUTTON */}
        {anyBurning && (
          <button
            onClick={handleReclaimIncense}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 text-xs font-semibold transition-all shadow-md active:scale-95 animate-in fade-in duration-200"
            title="Thu hồi lại nhang đã cắm"
          >
            <Undo2 className="w-3.5 h-3.5 text-red-400" />
            <span>Đòi Lại Nhang</span>
          </button>
        )}
      </div>

      {/* Main Incense Burner & Smoke Display */}
      <div className="relative w-80 h-76 sm:w-96 sm:h-88 lg:w-[420px] lg:h-[380px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={380}
          height={340}
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
        />

        <svg viewBox="0 0 380 340" className="w-full h-full filter drop-shadow-2xl">
          <defs>
            <radialGradient id="bronze-body-lg" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="35%" stopColor="#b45309" />
              <stop offset="75%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#292524" />
            </radialGradient>

            <radialGradient id="ember-glow-lg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#ef4444" />
              <stop offset="85%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <linearGradient id="sand-texture-lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="100%" stopColor="#44403c" />
            </linearGradient>
          </defs>

          {/* Incense Sticks */}
          {sticks.map((stick) => {
            const x = startX + stick.id * stickSpacing;
            const fullHeight = 170;
            const remainingHeight = fullHeight * (1 - stick.progress);
            const baseY = 275;
            const tipY = baseY - remainingHeight;

            // If not lit and reclaimed, don't show the sticks or show empty burner!
            if (!stick.isLit && stick.progress === 0) {
              return null;
            }

            return (
              <g key={stick.id} className="transition-opacity duration-300">
                <line
                  x1={x}
                  y1={baseY}
                  x2={x}
                  y2={Math.min(baseY, tipY + 35)}
                  stroke="#b91c1c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {remainingHeight > 0 && (
                  <line
                    x1={x}
                    y1={Math.min(baseY, tipY + 35)}
                    x2={x}
                    y2={tipY}
                    stroke="#92400e"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                )}

                {stick.isLit && stick.progress < 1.0 && (
                  <g>
                    <circle cx={x} cy={tipY} r="9" fill="url(#ember-glow-lg)" opacity="0.85">
                      <animate
                        attributeName="r"
                        values="7;11;7"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.7;1;0.7"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx={x} cy={tipY} r="3" fill="#fef08a" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Incense Burner Rim Lip */}
          <ellipse cx="190" cy="275" rx="80" ry="18" fill="url(#sand-texture-lg)" />
          <ellipse cx="190" cy="273" rx="82" ry="16" fill="none" stroke="#ca8a04" strokeWidth="3.5" />

          {/* Incense Burner Bowl */}
          <path
            d="M 110 275
               C 100 315, 138 335, 190 335
               C 242 335, 280 315, 270 275
               Z"
            fill="url(#bronze-body-lg)"
            stroke="#eab308"
            strokeWidth="2"
          />

          {/* Lotus / Cloud Engraving */}
          <path
            d="M 160 305 Q 190 295 220 305 Q 190 315 160 305 Z"
            fill="#ca8a04"
            opacity="0.65"
          />

          {/* Burner Base Legs */}
          <circle cx="140" cy="333" r="7" fill="#78350f" />
          <circle cx="190" cy="336" r="8" fill="#78350f" />
          <circle cx="240" cy="333" r="7" fill="#78350f" />

          {/* Twin Ear Handles */}
          <path
            d="M 110 278 C 80 275, 82 300, 112 304"
            fill="none"
            stroke="#d97706"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 270 278 C 300 275, 298 300, 268 304"
            fill="none"
            stroke="#d97706"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="text-center text-xs text-amber-200/90 font-serif">
        {!anyBurning && 'Lư hương tĩnh mịch — Hãy dâng một nén tâm hương'}
        {anyBurning && stickCount === 1 && 'Dâng một nén tâm hương — Tỏ lòng thanh tịnh'}
        {anyBurning && stickCount === 3 && 'Dâng ba nén hương — Kính ngưỡng Tam Bảo'}
        {anyBurning && stickCount === 5 && 'Dâng năm nén hương — Nguyện đủ Ngũ phần hương giải thoát'}
      </div>
    </div>
  );
};
