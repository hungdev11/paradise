export interface BlessingItem {
  id: string;
  text: string;
  x: number;
  y: number;
}

export type WoodenFishSkinId = 'classic-wood' | 'gold-leaf' | 'jade-stone' | 'obsidian';

export interface WoodenFishSkin {
  id: WoodenFishSkinId;
  name: string;
  primary: string;
  accent: string;
  highlight: string;
  ringColor: string;
  description: string;
}

export interface IncenseItem {
  id: string;
  stickIndex: number; // 0, 1, 2, etc.
  litTime: number; // timestamp ms
  duration: number; // in seconds (e.g. 60s or 180s)
  isBurning: boolean;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  description: string;
}

export interface BackgroundConfig {
  type: 'preset' | 'custom';
  url: string;
  panX: number;
  panY: number;
  zoom: number; // 0.8 to 2.5
  brightness: number; // 0.2 to 1.0
  blur: number; // 0 to 16
  candleFlicker: boolean;
  zenMotes: boolean;
}

export interface MeritStats {
  fishTaps: number;
  incenseLit: number;
  beadCount: number;
  beadRounds: number;
  bellStrikes: number;
  wishesReleased: number;
  oraclesDrawn: number;
  meditationSeconds: number;
  streakDays: number;
  lastActiveDate: string;
}

export interface ChantTrack {
  id: string;
  title: string;
  description: string;
  duration?: string;
  src?: string;
  synthType?: 'chu-dai-bi' | 'a-di-da-phat' | 'tam-kinh' | 'om-mani';
}

export interface AmbientTrack {
  id: string;
  title: string;
  iconName: string;
  synthType: 'rain' | 'stream' | 'wind-chimes' | 'singing-bowl';
}

export interface OracleCard {
  id: number;
  title: string;
  chineseTitle?: string;
  verse: string;
  explanation: string;
  advice: string;
}

export interface WishLantern {
  id: string;
  text: string;
  author: string;
  color: string;
  x: number;
  y: number;
  speed: number;
  scale: number;
  createdAt: number;
}

export type StickmanAction = 'idle' | 'walk' | 'pray' | 'bow' | 'tap_fish' | 'sit';

export type PlazaItemType = 'lotus' | 'sparkle' | 'orb' | 'gun' | 'hammer' | 'knife';

export interface MeritOrb {
  id: string;
  x: number;
  y: number;
  value: number; // Điểm công đức (+1, +2 cho vật phẩm thanh tịnh; -10, -5, -3 cho vũ khí)
  type?: PlazaItemType;
  created: number;
}

export interface CombatInvite {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerAvatar: string;
  targetId: string;
  targetName: string;
  timestamp: number;
}

export interface ActiveCombatSession {
  duelId: string;
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  playerAAvatar: string;
  playerBAvatar: string;
  playerATaps: number;
  playerBTaps: number;
  startTime: number;
  duration: number; // in ms, e.g. 6000
}

export interface CombatResult {
  duelId?: string;
  challengerId: string;
  challengerName: string;
  targetId: string;
  targetName: string;
  winnerId?: string | null;
  loserId?: string | null;
  isDraw?: boolean;
  drawTaps?: number;
  winnerTaps?: number;
  loserTaps?: number;
  meritsTransferred?: number;
  winnerMeritsGain?: number; // rule: +10 Công Đức
  loserMeritsLoss?: number;  // rule: -5 Công Đức khi thua cuộc
  drawMeritsBonus?: number;  // rule: +2 Công Đức khi hòa
  defeatUntil?: number; // 60s locked defeat bubble (only for loser in non-draw)
}


export interface PlazaPlayer {
  id: string;
  name: string;
  avatar: string; // Image Data URL or Emoji
  color: string;  // Body color
  hat: 'none' | 'non_la' | 'halo' | 'lotus';
  weapon?: 'gun' | 'hammer' | 'knife' | null; // Vũ khí đang cầm (nhặt bị trừ công đức)
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  isMoving: boolean;
  action: StickmanAction;
  lastActionTime: number;
  chatText?: string;
  chatTime?: number;
  isLocal?: boolean;
  merits: number;
  defeatUntil?: number;
  socialStatus?: PlayerSocialStatus;
  inMeditationCluster?: boolean;
}

export type FishTypeId = 'red_carp' | 'goldfish' | 'koi' | 'dragon_fish';

export interface FishSpec {
  id: FishTypeId;
  name: string;
  cost: number;
  color: string;
  size: number;
  speed: number;
  blessing: string;
  icon: string;
}

export const FISH_CATALOG: FishSpec[] = [
  {
    id: 'red_carp',
    name: 'Cá Chép Đỏ (Chu Sa)',
    cost: 5,
    color: '#ef4444',
    size: 9,
    speed: 1.1,
    blessing: 'Cầu mong hanh thông, vượt vũ môn hóa rồng! 🐟',
    icon: '🐟',
  },
  {
    id: 'goldfish',
    name: 'Cá Vàng Ba Đuôi',
    cost: 15,
    color: '#f59e0b',
    size: 11,
    speed: 0.95,
    blessing: 'Tâm an trí sáng, duyên lành đưa tới! 🐠',
    icon: '🐠',
  },
  {
    id: 'koi',
    name: 'Cá Koi Ngũ Sắc',
    cost: 35,
    color: '#ec4899',
    size: 13,
    speed: 1.3,
    blessing: 'Phước lộc tràn đầy, gia đạo bình an! 🐡',
    icon: '🐡',
  },
  {
    id: 'dragon_fish',
    name: 'Cá Rồng Hoàng Kim',
    cost: 80,
    color: '#eab308',
    size: 16,
    speed: 1.5,
    blessing: 'Đại cát đại lợi, vạn sự cát tường! 🐉',
    icon: '🐉',
  },
];

export interface ActiveFishEntity {
  id: string;
  type: FishTypeId;
  lakeId: 'lotus_pond' | 'liberation_pond';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  color: string;
  size: number;
  tailPhase: number;
  releasedBy: string;
}

export type TempleId = 'dai_hung' | 'quan_am' | 'thien_duong';

export interface TempleDoorTrigger {
  id: TempleId;
  name: string;
  doorX: number;
  doorY: number;
  returnX: number;
  returnY: number;
}

export type WishRibbonColor = 'red' | 'yellow' | 'blue' | 'pink' | 'purple';

export interface BodhiWishRibbon {
  id: string;
  senderId: string;
  senderName: string;
  color: WishRibbonColor;
  wishText: string;
  createdAt: number;
  rejoiceCount: number;
  rejoicedBy: string[]; // Danh sách playerId đã tùy hỷ
  branchIndex: number;  // 0 - 15 vị trí cành cây
}

export type SocialActionType = 'offer_tea' | 'gift_lotus' | 'mutual_bow';

export interface PlayerSocialStatus {
  type: SocialActionType;
  partnerId?: string;
  partnerName?: string;
  expiresAt: number; // Timestamp ms hết hạn hiệu ứng
}

export interface MeditationCluster {
  id: string;
  playerIds: string[];
  centerX: number;
  centerY: number;
  radius: number;
  durationSeconds: number;
}


