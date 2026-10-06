import { MeritStats, BackgroundConfig } from '../types/zen';

const STATS_KEY = 'zen_merit_stats_v1';
const BG_CONFIG_KEY = 'zen_bg_config_v1';
const BLESSING_TEXT_KEY = 'zen_blessing_text_v1';

const defaultStats: MeritStats = {
  fishTaps: 0,
  incenseLit: 0,
  beadCount: 0,
  beadRounds: 0,
  bellStrikes: 0,
  wishesReleased: 0,
  oraclesDrawn: 0,
  meditationSeconds: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().slice(0, 10),
};

export const defaultBackgroundConfig: BackgroundConfig = {
  type: 'preset',
  url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85', // Hồ Núi Sương Khói
  panX: 0,
  panY: 0,
  zoom: 1.0,
  brightness: 0.65,
  blur: 0,
  candleFlicker: true,
  zenMotes: true,
};

export const storage = {
  getStats(): MeritStats {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // check streak
        const today = new Date().toISOString().slice(0, 10);
        if (parsed.lastActiveDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (parsed.lastActiveDate === yesterday) {
            parsed.streakDays = (parsed.streakDays || 1) + 1;
          } else {
            parsed.streakDays = 1;
          }
          parsed.lastActiveDate = today;
          localStorage.setItem(STATS_KEY, JSON.stringify(parsed));
        }
        return { ...defaultStats, ...parsed };
      }
    } catch {
      // fallback
    }
    return defaultStats;
  },

  saveStats(stats: MeritStats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  },

  getBgConfig(): BackgroundConfig {
    try {
      const saved = localStorage.getItem(BG_CONFIG_KEY);
      if (saved) {
        return { ...defaultBackgroundConfig, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return defaultBackgroundConfig;
  },

  saveBgConfig(config: BackgroundConfig) {
    try {
      localStorage.setItem(BG_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  },

  getBlessingText(): string {
    return localStorage.getItem(BLESSING_TEXT_KEY) || 'Công Đức +1';
  },

  saveBlessingText(text: string) {
    localStorage.setItem(BLESSING_TEXT_KEY, text);
  }
};
