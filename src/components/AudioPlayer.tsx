import React, { useState, useRef } from 'react';
import { CHANT_TRACKS, AMBIENT_TRACKS } from '../data/presets';
import { audioEngine } from '../services/audio-engine';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Radio, 
  CloudRain, 
  Waves, 
  BellRing, 
  Sparkles,
  X,
  Upload,
  Square
} from 'lucide-react';

interface AudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ isOpen, onClose }) => {
  const [isPlayingChant, setIsPlayingChant] = useState(false);
  const [currentChantId, setCurrentChantId] = useState<string | null>(null);

  const [isPlayingAmbient, setIsPlayingAmbient] = useState(false);
  const [currentAmbientId, setCurrentAmbientId] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [masterVol, setMasterVol] = useState(80);
  const [chantVol, setChantVol] = useState(70);
  const [ambientVol, setAmbientVol] = useState(50);
  const [sfxVol, setSfxVol] = useState(90);

  const [customAudioName, setCustomAudioName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Chant Play / Pause / Toggle-off
  const toggleChant = (trackId: string) => {
    const track = CHANT_TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    if (isPlayingChant && currentChantId === trackId) {
      // Toggle OFF: Stop playing
      audioEngine.stopChant();
      setIsPlayingChant(false);
      setCurrentChantId(null);
    } else {
      // Switch or Start
      setCurrentChantId(trackId);
      audioEngine.startChant(track.synthType as any);
      setIsPlayingChant(true);
      setCustomAudioName(null);
    }
  };

  const stopChant = () => {
    audioEngine.stopChant();
    setIsPlayingChant(false);
    setCurrentChantId(null);
    setCustomAudioName(null);
  };

  // Ambient Play / Pause / Toggle-off
  const toggleAmbient = (trackId: string) => {
    const track = AMBIENT_TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    if (isPlayingAmbient && currentAmbientId === trackId) {
      // Toggle OFF: Stop playing
      audioEngine.stopAmbient();
      setIsPlayingAmbient(false);
      setCurrentAmbientId(null);
    } else {
      // Switch or Start
      setCurrentAmbientId(trackId);
      audioEngine.startAmbient(track.synthType as any);
      setIsPlayingAmbient(true);
    }
  };

  const stopAmbient = () => {
    audioEngine.stopAmbient();
    setIsPlayingAmbient(false);
    setCurrentAmbientId(null);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCustomAudioName(file.name);
    setCurrentChantId('custom');
    setIsPlayingChant(true);
    audioEngine.playCustomAudio(url);
  };

  const handleMuteToggle = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const getAmbientIcon = (iconName: string) => {
    switch (iconName) {
      case 'CloudRain':
        return <CloudRain className="w-4 h-4" />;
      case 'Waves':
        return <Waves className="w-4 h-4" />;
      case 'BellRing':
        return <BellRing className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] zen-glass p-6 z-50 flex flex-col justify-between overflow-y-auto shadow-2xl border-l border-amber-500/30 animate-in slide-in-from-right duration-300">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-amber-100">Âm Thanh & Tụng Kinh</h3>
              <p className="text-xs text-stone-400">Nhạc tụng chánh niệm & Hòa âm thiên nhiên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Mute & Volume */}
        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMuteToggle}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isMuted
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'Đang Tắt Âm' : 'Âm Thanh Bật'}</span>
            </button>
            <span className="font-mono text-xs text-amber-400 font-bold">{masterVol}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={masterVol}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setMasterVol(val);
              audioEngine.setMasterVolume(val / 100);
            }}
            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded cursor-pointer"
          />
        </div>

        {/* Chanting Tracks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-amber-300 tracking-wider uppercase">
                Nhạc Tụng Kinh & Thần Chú
              </label>
              <p className="text-[11px] text-stone-400 mt-0.5">Nhấp vào bài đang phát để tắt/bỏ chọn</p>
            </div>
            {isPlayingChant && (
              <button
                onClick={stopChant}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs transition-colors"
                title="Dừng phát toàn bộ nhạc tụng"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Tắt Nhạc</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {CHANT_TRACKS.map((track) => {
              const isSelected = currentChantId === track.id;
              const isCurrentPlaying = isSelected && isPlayingChant;

              return (
                <div
                  key={track.id}
                  onClick={() => toggleChant(track.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isCurrentPlaying
                      ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-stone-900/40 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className={`font-serif text-sm font-medium truncate ${isCurrentPlaying ? 'text-amber-200' : 'text-stone-200'}`}>
                        {track.title}
                      </h5>
                      {isCurrentPlaying && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 font-bold">
                          ĐANG PHÁT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">{track.description}</p>
                  </div>

                  <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isCurrentPlaying
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}

            {/* Custom MP3 Chanting Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleCustomAudioUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2.5 px-3.5 rounded-xl border border-dashed text-xs flex items-center justify-between gap-2 transition-all ${
                customAudioName && isPlayingChant
                  ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                  : 'border-stone-700 bg-stone-900/40 hover:border-amber-500/40 text-stone-300 hover:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {customAudioName ? `File: ${customAudioName}` : 'Tải file MP3 kinh tụng từ máy tính...'}
                </span>
              </div>
              {customAudioName && isPlayingChant && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    stopChant();
                  }}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Dừng"
                >
                  <Square className="w-3 h-3 fill-current" />
                </span>
              )}
            </button>
          </div>

          {/* Chant Volume Slider */}
          <div className="pt-1.5 flex items-center gap-3 text-xs text-stone-300">
            <span className="w-24 shrink-0 text-stone-400">Âm lượng kinh:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={chantVol}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setChantVol(val);
                audioEngine.setChantVolume(val / 100);
              }}
              className="flex-1 accent-amber-500 h-1 bg-stone-800 rounded cursor-pointer"
            />
            <span className="font-mono text-amber-400 w-8 text-right">{chantVol}%</span>
          </div>
        </div>

        {/* Ambient Nature Soundscape */}
        <div className="space-y-3 pt-2 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-amber-300 tracking-wider uppercase">
                Âm Thanh Thiên Nhiên
              </label>
              <p className="text-[11px] text-stone-400 mt-0.5">Nhấp vào âm đang bật để tắt/bỏ chọn</p>
            </div>
            {isPlayingAmbient && (
              <button
                onClick={stopAmbient}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs transition-colors"
                title="Dừng phát âm thiên nhiên"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Tắt Âm</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AMBIENT_TRACKS.map((amb) => {
              const isSelected = currentAmbientId === amb.id;
              const isCurrentPlaying = isSelected && isPlayingAmbient;

              return (
                <button
                  key={amb.id}
                  onClick={() => toggleAmbient(amb.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    isCurrentPlaying
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow'
                      : 'bg-stone-900/40 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isCurrentPlaying ? 'bg-amber-500/30 text-amber-300' : 'bg-stone-800'}`}>
                    {getAmbientIcon(amb.iconName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block">{amb.title}</span>
                    {isCurrentPlaying && (
                      <span className="text-[9px] text-amber-400 font-bold block">BẬT</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ambient Volume Slider */}
          <div className="pt-1.5 flex items-center gap-3 text-xs text-stone-300">
            <span className="w-24 shrink-0 text-stone-400">Âm lượng tự nhiên:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={ambientVol}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setAmbientVol(val);
                audioEngine.setAmbientVolume(val / 100);
              }}
              className="flex-1 accent-amber-500 h-1 bg-stone-800 rounded cursor-pointer"
            />
            <span className="font-mono text-amber-400 w-8 text-right">{ambientVol}%</span>
          </div>

          {/* SFX Volume Slider */}
          <div className="pt-1.5 flex items-center gap-3 text-xs text-stone-300">
            <span className="w-24 shrink-0 text-stone-400">Âm mõ / chuông:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sfxVol}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setSfxVol(val);
                audioEngine.setSfxVolume(val / 100);
              }}
              className="flex-1 accent-amber-500 h-1 bg-stone-800 rounded cursor-pointer"
            />
            <span className="font-mono text-amber-400 w-8 text-right">{sfxVol}%</span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-stone-800">
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-sm transition-all"
        >
          Xong
        </button>
      </div>
    </div>
  );
};
