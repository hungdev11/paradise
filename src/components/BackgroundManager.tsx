import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BackgroundConfig, BackgroundPreset } from '../types/zen';
import { BACKGROUND_PRESETS } from '../data/presets';
import { storage } from '../services/storage';
import { 
  Image as ImageIcon, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  Sun, 
  Sparkles, 
  Flame, 
  RotateCcw,
  Check,
  X,
  Eye
} from 'lucide-react';

interface BackgroundManagerProps {
  config: BackgroundConfig;
  onChangeConfig: (newConfig: BackgroundConfig) => void;
  isCustomizing: boolean;
  setIsCustomizing: (val: boolean) => void;
}

export const BackgroundManager: React.FC<BackgroundManagerProps> = ({
  config,
  onChangeConfig,
  isCustomizing,
  setIsCustomizing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Zen Floating Golden Motes Canvas
  useEffect(() => {
    if (!config.zenMotes) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const motesCount = 45;
    const motes = Array.from({ length: motesCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.6,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.4 - 0.15,
      alpha: Math.random() * 0.6 + 0.2,
      maxAlpha: Math.random() * 0.7 + 0.3,
      alphaStep: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      motes.forEach((m) => {
        m.x += m.speedX;
        m.y += m.speedY;
        m.alpha += m.alphaStep;

        if (m.alpha > m.maxAlpha || m.alpha < 0.1) {
          m.alphaStep = -m.alphaStep;
        }

        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 224, 71, ${Math.max(0, m.alpha)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(234, 179, 8, 0.8)';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [config.zenMotes]);

  // Pointer drag handling for pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isCustomizing) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: config.panX,
      startPanY: config.panY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !isCustomizing) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    onChangeConfig({
      ...config,
      panX: Math.round(dragStartRef.current.startPanX + dx),
      panY: Math.round(dragStartRef.current.startPanY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      storage.saveBgConfig(config);
    }
  };

  // Wheel zoom handling while customizing
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isCustomizing) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(2.5, Math.max(0.8, config.zoom + delta));
      onChangeConfig({
        ...config,
        zoom: parseFloat(newZoom.toFixed(2)),
      });
    },
    [config, isCustomizing, onChangeConfig]
  );

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 12MB
    if (file.size > 12 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh nhỏ hơn 12MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const updated: BackgroundConfig = {
          ...config,
          type: 'custom',
          url: result,
          panX: 0,
          panY: 0,
          zoom: 1.0,
        };
        onChangeConfig(updated);
        storage.saveBgConfig(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetTransform = () => {
    const updated: BackgroundConfig = {
      ...config,
      panX: 0,
      panY: 0,
      zoom: 1.0,
    };
    onChangeConfig(updated);
    storage.saveBgConfig(updated);
  };

  return (
    <>
      {/* Background Image Layer */}
      <div 
        className={`fixed inset-0 overflow-hidden select-none pointer-events-${isCustomizing ? 'auto' : 'none'} ${
          isCustomizing ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-75 will-change-transform"
          style={{
            backgroundImage: `url("${config.url}")`,
            transform: `translate3d(${config.panX}px, ${config.panY}px, 0) scale(${config.zoom})`,
            filter: `brightness(${config.brightness}) blur(${config.blur}px)`,
          }}
        />

        {/* Ambient Darkening Gradient Vignette */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(12,10,9,0.15) 0%, rgba(12,10,9,0.78) 85%, rgba(12,10,9,0.95) 100%)',
          }}
        />

        {/* Candlelight Warm Ambient Glow */}
        {config.candleFlicker && (
          <div 
            className="absolute inset-0 pointer-events-none animate-candle-ambient"
            style={{
              background: 'radial-gradient(ellipse at 50% 75%, rgba(245,158,11,0.22) 0%, rgba(180,83,9,0.1) 45%, transparent 80%)',
            }}
          />
        )}

        {/* Zen Golden Dust Motes Canvas */}
        {config.zenMotes && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
          />
        )}

        {/* Helper overlay during customization */}
        {isCustomizing && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/75 backdrop-blur-md border border-amber-500/40 rounded-full text-amber-200 text-xs sm:text-sm font-medium shadow-2xl flex items-center gap-2 pointer-events-none animate-pulse">
            <Move className="w-4 h-4 text-amber-400" />
            <span>Kéo chuột để di chuyển • Cuộn chuột để phóng to / thu nhỏ ảnh nền</span>
          </div>
        )}
      </div>

      {/* Background Customizer Drawer / Modal */}
      {isCustomizing && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 zen-glass p-6 z-50 flex flex-col justify-between overflow-y-auto shadow-2xl border-l border-amber-500/30 animate-in slide-in-from-right duration-300">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-lg text-amber-100">Không Gian & Hình Nền</h3>
                  <p className="text-xs text-stone-400">Tùy biến cảnh quan tĩnh tâm</p>
                </div>
              </div>
              <button
                onClick={() => {
                  storage.saveBgConfig(config);
                  setIsCustomizing(false);
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom File Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-amber-300 tracking-wider uppercase">Tải Ảnh Của Bạn</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-200 text-sm flex items-center justify-center gap-2 transition-all font-medium"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Tải ảnh từ máy tính (ảnh thờ, chùa, phong cảnh)</span>
              </button>
            </div>

            {/* Preset Gallery */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-amber-300 tracking-wider uppercase">Ảnh Mẫu Thanh Tịnh</label>
              <div className="grid grid-cols-2 gap-2.5">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isSelected = config.url === preset.url;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        const updated: BackgroundConfig = {
                          ...config,
                          type: 'preset',
                          url: preset.url,
                        };
                        onChangeConfig(updated);
                        storage.saveBgConfig(updated);
                      }}
                      className={`relative group rounded-xl overflow-hidden aspect-video border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-amber-400 shadow-md shadow-amber-500/20' 
                          : 'border-stone-800 hover:border-stone-600'
                      }`}
                    >
                      <img
                        src={preset.thumbnail}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 flex flex-col justify-end">
                        <span className="text-[11px] font-medium text-white truncate">{preset.name}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-amber-500 text-black rounded-full p-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transform Controls (Zoom & Pan Reset) */}
            <div className="space-y-3 pt-2 border-t border-stone-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 tracking-wider uppercase">Thu Phóng & Vị Trí</span>
                <button
                  onClick={resetTransform}
                  className="text-xs text-stone-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Căn giữa lại</span>
                </button>
              </div>

              {/* Zoom Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-300">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-stone-400" />
                    Độ thu phóng
                  </span>
                  <span className="font-mono text-amber-400">{Math.round(config.zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.05"
                  value={config.zoom}
                  onChange={(e) => {
                    const updated = { ...config, zoom: parseFloat(e.target.value) };
                    onChangeConfig(updated);
                    storage.saveBgConfig(updated);
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Brightness Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-300">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-stone-400" />
                    Độ sáng nền
                  </span>
                  <span className="font-mono text-amber-400">{Math.round(config.brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.1"
                  step="0.05"
                  value={config.brightness}
                  onChange={(e) => {
                    const updated = { ...config, brightness: parseFloat(e.target.value) };
                    onChangeConfig(updated);
                    storage.saveBgConfig(updated);
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Blur Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-300">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                    Độ mờ chiều sâu (Blur)
                  </span>
                  <span className="font-mono text-amber-400">{config.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  step="1"
                  value={config.blur}
                  onChange={(e) => {
                    const updated = { ...config, blur: parseInt(e.target.value, 10) };
                    onChangeConfig(updated);
                    storage.saveBgConfig(updated);
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Ambient Atmosphere Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
              <label className="text-xs font-semibold text-amber-300 tracking-wider uppercase">Hiệu Ứng Khí Thiền</label>
              
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 cursor-pointer hover:border-stone-700 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-stone-200">Ánh nến bập bùng</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.candleFlicker}
                  onChange={(e) => {
                    const updated = { ...config, candleFlicker: e.target.checked };
                    onChangeConfig(updated);
                    storage.saveBgConfig(updated);
                  }}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 cursor-pointer hover:border-stone-700 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm text-stone-200">Hạt bụi vàng thanh tịnh</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.zenMotes}
                  onChange={(e) => {
                    const updated = { ...config, zenMotes: e.target.checked };
                    onChangeConfig(updated);
                    storage.saveBgConfig(updated);
                  }}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-800">
            <button
              onClick={() => {
                storage.saveBgConfig(config);
                setIsCustomizing(false);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98]"
            >
              Hoàn Tất & Lưu Cài Đặt
            </button>
          </div>
        </div>
      )}
    </>
  );
};
