import { MeritStats, BackgroundConfig } from '../types/zen';

const STATS_KEY = 'zen_merit_stats_v1';
const STATS_CHECKSUM_KEY = 'zen_merit_chk_v1';
const SECRET_SALT = 'zen_sacred_merit_salt_2026';
const BG_CONFIG_KEY = 'zen_bg_config_v1';
const BLESSING_TEXT_KEY = 'zen_blessing_text_v1';

function computeStatsChecksum(stats: MeritStats): string {
  const payload = `${stats.fishTaps}|${stats.incenseLit}|${stats.beadCount}|${stats.bellStrikes}|${stats.wishesReleased}|${stats.oraclesDrawn}|${SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

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
  url: '/images/tuvien/scene0.jpg', // Chánh Điện Bổn Sư Thích Ca (Tự Viện)
  panX: 0,
  panY: 0,
  zoom: 1.0,
  brightness: 0.75,
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

        // Anti-tamper F12 DevTools Checksum Verification
        const savedChecksum = localStorage.getItem(STATS_CHECKSUM_KEY);
        if (savedChecksum && savedChecksum !== computeStatsChecksum(parsed)) {
          console.warn('⚠️ Phát hiện can thiệp điểm số trái phép (F12 DevTools Tamper)! Công đức hóa hư không.');
          localStorage.setItem(STATS_KEY, JSON.stringify(defaultStats));
          localStorage.setItem(STATS_CHECKSUM_KEY, computeStatsChecksum(defaultStats));
          return defaultStats;
        }

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
          localStorage.setItem(STATS_CHECKSUM_KEY, computeStatsChecksum(parsed));
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
      localStorage.setItem(STATS_CHECKSUM_KEY, computeStatsChecksum(stats));
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
