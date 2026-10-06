import React, { useEffect, useState } from 'react';
import { WishLantern } from '../types/zen';

interface FloatingLanternsLayerProps {
  lanterns: WishLantern[];
  onRemoveLantern: (id: string) => void;
}

export const FloatingLanternsLayer: React.FC<FloatingLanternsLayerProps> = ({
  lanterns,
  onRemoveLantern,
}) => {
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number; opacity: number } }>({});

  useEffect(() => {
    if (lanterns.length === 0) return;

    let animId: number;
    let time = 0;

    const loop = () => {
      time += 0.015;
      setPositions((prev) => {
        const next: typeof prev = {};
        lanterns.forEach((l) => {
          const current = prev[l.id] || { x: l.x, y: l.y, opacity: 1 };
          const newY = current.y - l.speed;
          const newX = current.x + Math.sin(time + l.createdAt) * 0.45;
          const newOpacity = Math.max(0, newY / (window.innerHeight * 0.85));

          if (newY < -80 || newOpacity <= 0) {
            onRemoveLantern(l.id);
          } else {
            next[l.id] = { x: newX, y: newY, opacity: newOpacity };
          }
        });
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [lanterns, onRemoveLantern]);

  if (lanterns.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {lanterns.map((l) => {
        const pos = positions[l.id] || { x: l.x, y: l.y, opacity: 1 };
        return (
          <div
            key={l.id}
            className="absolute transition-opacity duration-300 pointer-events-auto group cursor-pointer"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              opacity: pos.opacity,
              transform: `scale(${l.scale})`,
            }}
          >
            {/* Wish text tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-amber-500/40 text-amber-200 text-xs font-serif whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="font-semibold text-amber-400">"{l.text}"</span>
              <span className="block text-[10px] text-stone-400 mt-0.5">— {l.author}</span>
            </div>

            {/* Glowing Lotus Lantern SVG */}
            <svg viewBox="0 0 80 70" className="w-16 h-14 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
              {/* Flame Glow */}
              <circle cx="40" cy="30" r="10" fill="#fde047" opacity="0.8" className="animate-pulse" />
              <circle cx="40" cy="30" r="4" fill="#fff" />

              {/* Lotus Petals Base */}
              <path
                d="M 15 50 C 25 35, 35 48, 40 54 C 45 48, 55 35, 65 50 C 58 64, 22 64, 15 50 Z"
                fill={l.color}
                opacity="0.9"
              />
              {/* Side Petals */}
              <path
                d="M 22 46 C 10 32, 28 26, 36 44 Z"
                fill={l.color}
                opacity="0.75"
              />
              <path
                d="M 58 46 C 70 32, 52 26, 44 44 Z"
                fill={l.color}
                opacity="0.75"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};
