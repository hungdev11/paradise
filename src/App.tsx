import React, { useState, useEffect, useCallback } from 'react';
import { BackgroundConfig, MeritStats, WishLantern } from './types/zen';
import { storage } from './services/storage';
import { audioEngine } from './services/audio-engine';

// Components
import { BackgroundManager } from './components/BackgroundManager';
import { WoodenFish } from './components/WoodenFish';
import { IncenseAltar } from './components/IncenseAltar';
import { MalaBeads } from './components/MalaBeads';
import { SingingBowl } from './components/SingingBowl';
import { AudioPlayer } from './components/AudioPlayer';
import { ZenOracle } from './components/ZenOracle';
import { LanternWish } from './components/LanternWish';
import { MeritStatsModal } from './components/MeritStatsModal';
import { HelpModal } from './components/HelpModal';
import { ControlBar, ZenViewMode } from './components/ControlBar';
import { FloatingLanternsLayer } from './components/FloatingLanternsLayer';
import { ZenPlaza } from './components/ZenPlaza';

export function App() {
  // State
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(storage.getBgConfig());
  const [stats, setStats] = useState<MeritStats>(storage.getStats());
  const [viewMode, setViewMode] = useState<ZenViewMode>('all');

  // Modals & Panels
  const [isCustomizingBg, setIsCustomizingBg] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [isWishOpen, setIsWishOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Floating Lanterns
  const [lanterns, setLanterns] = useState<WishLantern[]>([]);

  // Update Stats helper
  const updateStats = useCallback((updater: (prev: MeritStats) => MeritStats) => {
    setStats((prev) => {
      const next = updater(prev);
      storage.saveStats(next);
      return next;
    });
  }, []);

  // Event Handlers
  const handleTapFish = useCallback((count: number) => {
    updateStats((prev) => ({
      ...prev,
      fishTaps: prev.fishTaps + count,
    }));
  }, [updateStats]);

  const handleIncenseLit = useCallback((count: number) => {
    updateStats((prev) => ({
      ...prev,
      incenseLit: prev.incenseLit + count,
    }));
  }, [updateStats]);

  const handleBeadAdvance = useCallback((count: number, roundCompleted: boolean) => {
    updateStats((prev) => ({
      ...prev,
      beadCount: prev.beadCount + count,
      beadRounds: roundCompleted ? prev.beadRounds + 1 : prev.beadRounds,
    }));
  }, [updateStats]);

  const handleBellStrike = useCallback(() => {
    updateStats((prev) => ({
      ...prev,
      bellStrikes: prev.bellStrikes + 1,
    }));
  }, [updateStats]);

  const handleOracleDrawn = useCallback(() => {
    updateStats((prev) => ({
      ...prev,
      oraclesDrawn: prev.oraclesDrawn + 1,
    }));
  }, [updateStats]);

  const handleWishReleased = useCallback((newLantern: WishLantern) => {
    setLanterns((prev) => [...prev, newLantern]);
    updateStats((prev) => ({
      ...prev,
      wishesReleased: prev.wishesReleased + 1,
    }));
  }, [updateStats]);

  const handleRemoveLantern = useCallback((id: string) => {
    setLanterns((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        audioEngine.toggleMute();
      } else if (e.key === 'Escape') {
        setIsCustomizingBg(false);
        setIsAudioOpen(false);
        setIsOracleOpen(false);
        setIsWishOpen(false);
        setIsStatsOpen(false);
        setIsHelpOpen(false);
        setIsZenFocus(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track meditation time
  useEffect(() => {
    const timer = setInterval(() => {
      updateStats((prev) => ({
        ...prev,
        meditationSeconds: prev.meditationSeconds + 10,
      }));
    }, 10000);
    return () => clearInterval(timer);
  }, [updateStats]);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between font-sans">
      {/* 1. Dynamic Background & Atmosphere Canvas */}
      <BackgroundManager
        config={bgConfig}
        onChangeConfig={setBgConfig}
        isCustomizing={isCustomizingBg}
        setIsCustomizing={setIsCustomizingBg}
      />

      {/* 2. Floating Sky Lanterns Layer */}
      <FloatingLanternsLayer
        lanterns={lanterns}
        onRemoveLantern={handleRemoveLantern}
      />

      {/* 3. Navigation Header & Bottom Control Bar */}
      <ControlBar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenAudio={() => setIsAudioOpen(true)}
        onOpenBackground={() => setIsCustomizingBg(true)}
        onOpenOracle={() => setIsOracleOpen(true)}
        onOpenWish={() => setIsWishOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isZenFocus={isZenFocus}
        onToggleZenFocus={() => setIsZenFocus(!isZenFocus)}
      />

      {/* 4. Central Zen Sacred Altar Area */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 pt-16 pb-20 overflow-y-auto">
        {/* BAN THỜ CHUNG (Grand Altar Layout: Bell on left, Incense in center, Fish on right) */}
        {viewMode === 'all' && (
          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 px-4 animate-in fade-in zoom-in-95 duration-300">
            {/* Left: Temple Bell / Singing Bowl */}
            <div className="order-2 lg:order-1 flex flex-col items-center">
              <SingingBowl onStrike={handleBellStrike} />
            </div>

            {/* Center: Incense Altar (Dâng Hương Trầm) */}
            <div className="order-1 lg:order-2 flex flex-col items-center">
              <IncenseAltar
                onIncenseLit={handleIncenseLit}
                lifetimeLit={stats.incenseLit}
              />
            </div>

            {/* Right: Wooden Fish (Gõ Mõ) */}
            <div className="order-3 lg:order-3 flex flex-col items-center">
              <WoodenFish
                onTapCount={handleTapFish}
                lifetimeCount={stats.fishTaps}
              />
            </div>
          </div>
        )}

        {/* FOCUSED VIEW: GÕ MÕ */}
        {viewMode === 'fish' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 w-full">
            <WoodenFish
              onTapCount={handleTapFish}
              lifetimeCount={stats.fishTaps}
              isFocusedView={true}
            />
          </div>
        )}

        {/* FOCUSED VIEW: DÂNG HƯƠNG */}
        {viewMode === 'incense' && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <IncenseAltar
              onIncenseLit={handleIncenseLit}
              lifetimeLit={stats.incenseLit}
            />
          </div>
        )}

        {/* FOCUSED VIEW: TRÀNG CHUỖI 108 HẠT */}
        {viewMode === 'mala' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <MalaBeads
              onBeadAdvance={handleBeadAdvance}
              lifetimeBeads={stats.beadCount}
              lifetimeRounds={stats.beadRounds}
            />
          </div>
        )}

        {/* FOCUSED VIEW: CHUÔNG BÁT NHÃ */}
        {viewMode === 'bell' && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <SingingBowl onStrike={handleBellStrike} />
          </div>
        )}

        {/* FOCUSED VIEW: SẢNH HỘI NGỘ (KHU VỰC GẶP GỠ NGƯỜI QUE) */}
        {viewMode === 'plaza' && (
          <div className="w-full max-w-5xl mx-auto px-2 animate-in fade-in zoom-in-95 duration-200">
            <ZenPlaza />
          </div>
        )}
      </main>

      {/* 5. Modals & Side Drawers */}
      <AudioPlayer
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
      />

      <ZenOracle
        isOpen={isOracleOpen}
        onClose={() => setIsOracleOpen(false)}
        onOracleDrawn={handleOracleDrawn}
      />

      <LanternWish
        isOpen={isWishOpen}
        onClose={() => setIsWishOpen(false)}
        onWishReleased={handleWishReleased}
      />

      <MeritStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

export default App;
