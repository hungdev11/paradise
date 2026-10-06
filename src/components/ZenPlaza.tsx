import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlazaPlayer,
  StickmanAction,
  MeritOrb,
  CombatResult,
  CombatInvite,
  ActiveCombatSession,
  FishTypeId,
  FISH_CATALOG,
  FishSpec,
  ActiveFishEntity,
  TempleId,
  TempleDoorTrigger,
  PlayerSocialStatus,
  SocialActionType,
} from '../types/zen';
import { plazaService, LocalProfile } from '../services/plaza-service';
import { audioEngine } from '../services/audio-engine';
import { BodhiTreeModal } from './BodhiTreeModal';
import {
  Users,
  Settings2,
  Send,
  Sparkles,
  Upload,
  Volume2,
  X,
  Compass,
  MessageSquare,
  MapPin,
  Flame,
  Swords,
  Trophy,
  AlertTriangle,
  Check,
  Timer,
  Fish,
  DoorOpen,
  LogOut
} from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
}

interface VisualEntity {
  id: string;
  name: string;
  avatar: string;
  color: string;
  hat: 'none' | 'non_la' | 'halo' | 'lotus';
  weapon?: 'gun' | 'hammer' | 'knife' | null;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  isMoving: boolean;
  action: StickmanAction;
  walkCycle: number;
  chatText?: string;
  chatTime?: number;
  isLocal: boolean;
  merits: number;
  defeatUntil?: number;
  socialStatus?: PlayerSocialStatus;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

interface CombatClashEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// World Dimensions: Spacious, grand temple sanctuary
const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 2200;

export const TEMPLE_DOORS: TempleDoorTrigger[] = [
  { id: 'dai_hung', name: 'Đại Hùng Bảo Điện', doorX: 1800, doorY: 360, returnX: 1800, returnY: 420 },
  { id: 'quan_am', name: 'Điện Quán Thế Âm', doorX: 800, doorY: 550, returnX: 800, returnY: 610 },
  { id: 'thien_duong', name: 'Thiền Đường Trúc Lâm', doorX: 2800, doorY: 550, returnX: 2800, returnY: 610 },
];

export const LAKES = [
  { id: 'lotus_pond' as const, name: 'Hồ Sen Tịnh Tâm', x: 900, y: 1500, radiusX: 230, radiusY: 150 },
  { id: 'liberation_pond' as const, name: 'Hồ Phóng Sinh Bát Nhã', x: 2700, y: 1500, radiusX: 250, radiusY: 160 },
];

const QUICK_CHATS = [
  'Nam Mô A Di Đà Phật 🙏',
  'Tâm an vạn sự an 🪷',
  'Chúc quý đạo hữu an lạc ✨',
  'Om Mani Padme Hum 🕊️',
  'Công đức vô lượng 🌿',
  'Bonk! 🐕',
];

const EMOJI_AVATARS = ['🪷', '🧘', '🕊️', '☀️', '🕯️', '🔔', '🐕', '🌿', '🌸', '✨'];
const THEME_COLORS = [
  { name: 'Vàng Kim', hex: '#f59e0b' },
  { name: 'Xanh Ngọc', hex: '#10b981' },
  { name: 'Xanh Lam', hex: '#06b6d4' },
  { name: 'Đỏ Chu Sa', hex: '#ef4444' },
  { name: 'Tím Sen', hex: '#8b5cf6' },
  { name: 'Hồng Phấn', hex: '#ec4899' },
  { name: 'Bạch Y', hex: '#f8fafc' },
];

function drawTempleInterior(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  player: { x: number; y: number; vx: number; vy: number; facing: 1 | -1 },
  profile: LocalProfile,
  templeName: string,
  time: number,
  walkCycle: number,
  mokugyoHits: number,
  floatingTexts: FloatingText[]
) {
  // 1. Interior Wall & Floor
  ctx.fillStyle = '#17110e';
  ctx.fillRect(0, 0, width, height);

  // Lotus ceramic floor tiles
  const floorY = 160;
  ctx.fillStyle = '#261b16';
  ctx.fillRect(0, floorY, width, height - floorY);

  // Red velvet ceremonial runner carpet
  const carpetW = 220;
  const carpetX = width / 2 - carpetW / 2;
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(carpetX, floorY, carpetW, height - floorY);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(carpetX, floorY, carpetW, height - floorY);

  // Carpet gold borders
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(carpetX + 12, floorY);
  ctx.lineTo(carpetX + 12, height);
  ctx.moveTo(carpetX + carpetW - 12, floorY);
  ctx.lineTo(carpetX + carpetW - 12, height);
  ctx.stroke();

  // 2. Temple Wooden Pillars
  ctx.fillStyle = '#451a03';
  for (let px = 60; px < width; px += 240) {
    ctx.fillRect(px, 0, 22, height);
  }

  // 3. Grand Altar (Bàn thờ Phật dát vàng nguy nga)
  const altarX = width / 2;
  const altarY = 170;

  // Altar radiance halo
  const haloGrad = ctx.createRadialGradient(altarX, altarY - 45, 20, altarX, altarY - 45, 140);
  haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
  haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
  haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(altarX, altarY - 45, 140, 0, Math.PI * 2);
  ctx.fill();

  // Multi-tier Golden Lotus Pedestal
  ctx.fillStyle = '#78350f';
  ctx.fillRect(altarX - 160, altarY + 20, 320, 45);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(altarX - 160, altarY + 20, 320, 45);

  // Lotus Petals
  ctx.fillStyle = '#f59e0b';
  for (let a = 0; a < Math.PI; a += Math.PI / 8) {
    const lx = altarX + Math.cos(a + Math.PI) * 110;
    const ly = altarY + 15 + Math.sin(a + Math.PI) * 20;
    ctx.beginPath();
    ctx.arc(lx, ly, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden Sakyamuni Buddha
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(altarX, altarY - 10, 52, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Robe
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.moveTo(altarX - 28, altarY - 8);
  ctx.lineTo(altarX - 20, altarY - 60);
  ctx.lineTo(altarX + 20, altarY - 60);
  ctx.lineTo(altarX + 28, altarY - 8);
  ctx.closePath();
  ctx.fill();
  // Head
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(altarX, altarY - 72, 24, 0, Math.PI * 2);
  ctx.fill();
  // Ushnisha
  ctx.beginPath();
  ctx.arc(altarX, altarY - 98, 9, 0, Math.PI * 2);
  ctx.fill();

  // Temple Plaque (Hoành phi câu đối)
  ctx.fillStyle = '#78350f';
  ctx.fillRect(altarX - 150, 35, 300, 36);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(altarX - 150, 35, 300, 36);
  ctx.font = 'bold 15px serif';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.fillText(templeName.toUpperCase(), altarX, 58);

  // Giant Bronze Incense Cauldron in front of Altar
  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(altarX, altarY + 68, 38, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Incense Smoke curls
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(altarX - 5, altarY + 60);
  ctx.bezierCurveTo(altarX - 25, altarY + 20, altarX + 15, altarY - 20, altarX - 5, altarY - 60);
  ctx.stroke();

  // 4. Candle Stands & Lanterns
  const candles = [
    { x: altarX - 200, y: altarY + 30 },
    { x: altarX + 200, y: altarY + 30 },
  ];
  for (const c of candles) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(c.x - 6, c.y - 30, 12, 60);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(c.x - 8, c.y - 50, 16, 22);
    // Candle flame
    const flameFlicker = Math.sin(time * 0.01 + c.x) * 3;
    const flameGrad = ctx.createRadialGradient(c.x, c.y - 58 + flameFlicker, 2, c.x, c.y - 58, 24);
    flameGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
    flameGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(c.x, c.y - 58, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Giant Interactive Wooden Fish (Mõ Gỗ Nội Điện) at Center
  const mokugyoX = width / 2;
  const mokugyoY = 380;

  // Cushion under Mokugyo
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.ellipse(mokugyoX, mokugyoY + 22, 55, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Carved wooden fish body
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(mokugyoX, mokugyoY, 44, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Fish slit carving
  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(mokugyoX + 10, mokugyoY, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🪵', mokugyoX - 10, mokugyoY + 9);

  // Label badge for Mokugyo
  ctx.font = 'bold 11px system-ui';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('MÕ GỖ NỘI ĐIỆN (Space / Bấm để gõ)', mokugyoX, mokugyoY + 56);
  if (mokugyoHits > 0) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#86efac';
    ctx.fillText(`✨ Đã gõ: ${mokugyoHits} lần (+${mokugyoHits} Công Đức)`, mokugyoX, mokugyoY + 70);
  }

  // 6. Prayer Cushions on left and right
  const prayerMats = [
    { x: altarX - 120, y: 480 },
    { x: altarX + 120, y: 480 },
  ];
  for (const m of prayerMats) {
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, 35, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '14px serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('🪷', m.x, m.y + 4);
  }

  // 7. Exit Doorway at bottom center
  const doorX = width / 2;
  const doorY = height - 40;
  ctx.fillStyle = '#450a0a';
  ctx.fillRect(doorX - 60, doorY - 30, 120, 50);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX - 60, doorY - 30, 120, 50);
  ctx.font = 'bold 11px system-ui';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('🚪 CỬA RA SÂN CHÙA', doorX, doorY);

  // 8. Draw Player Stickman in Interior
  const isMoving = Math.abs(player.vx) > 0.05 || Math.abs(player.vy) > 0.05;
  const isPraying = !isMoving && player.y > 440 && player.y < 510 && Math.abs(player.x - width / 2) < 160;

  // Player shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura if praying on mats
  if (isPraying) {
    const auraPulse = Math.sin(time * 0.005) * 6;
    const auraGrad = ctx.createRadialGradient(player.x, player.y - 30, 8, player.x, player.y - 30, 48 + auraPulse);
    auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
    auraGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.2)');
    auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 30, 48 + auraPulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stickman lines
  ctx.strokeStyle = profile.color || '#f59e0b';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const neckY = player.y - 34;
  const pelvisY = player.y - 18;

  ctx.beginPath();
  ctx.moveTo(player.x, neckY);
  ctx.lineTo(player.x, pelvisY);
  ctx.stroke();

  // Legs
  const legPhase = isMoving ? Math.sin(walkCycle) * 12 : 0;
  ctx.beginPath();
  ctx.moveTo(player.x, pelvisY);
  ctx.lineTo(player.x + legPhase * player.facing, player.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(player.x, pelvisY);
  ctx.lineTo(player.x - legPhase * player.facing, player.y);
  ctx.stroke();

  // Arms
  if (isPraying) {
    ctx.beginPath();
    ctx.moveTo(player.x, neckY + 4);
    ctx.lineTo(player.x + player.facing * 9, neckY + 10);
    ctx.lineTo(player.x + player.facing * 7, neckY + 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(player.x, neckY + 4);
    ctx.lineTo(player.x + player.facing * 11, neckY + 16);
    ctx.stroke();
  }

  // Head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 48, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = profile.color || '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Avatar emoji
  ctx.font = '15px serif';
  ctx.textAlign = 'center';
  ctx.fillText(profile.avatar || '🧘', player.x, player.y - 43);

  // Name Tag
  ctx.font = 'bold 11px system-ui';
  ctx.fillStyle = '#fef08a';
  ctx.fillText(profile.name, player.x, player.y - 68);

  // Floating text inside temple
  for (const ft of floatingTexts) {
    ctx.font = 'bold 12px serif';
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
}

export const ZenPlaza: React.FC = () => {
  const [profile, setProfile] = useState<LocalProfile>(plazaService.getProfile());
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [activeAction, setActiveAction] = useState<StickmanAction>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [allPlayersList, setAllPlayersList] = useState<PlazaPlayer[]>([]);

  // Merit & Combat States
  const [localMerits, setLocalMerits] = useState<number>(profile.merits || 5);
  const [defeatCountdown, setDefeatCountdown] = useState<number>(0);
  const [combatAlert, setCombatAlert] = useState<string | null>(null);
  const [nearbyOpponent, setNearbyOpponent] = useState<{ id: string; name: string; merits: number; weapon?: string | null; isDefeated: boolean } | null>(null);

  // 1v1 Handshake & Tapping Arena States
  const [incomingInvite, setIncomingInvite] = useState<CombatInvite | null>(null);
  const [pendingInviteTarget, setPendingInviteTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeDuel, setActiveDuel] = useState<ActiveCombatSession | null>(null);
  const [duelTimeLeft, setDuelTimeLeft] = useState<string>('6.0');
  const [duelCountdown, setDuelCountdown] = useState<number>(0);
  const [myDuelTaps, setMyDuelTaps] = useState<number>(0);
  const [oppDuelTaps, setOppDuelTaps] = useState<number>(0);
  const [duelResult, setDuelResult] = useState<{
    winnerId: string | null;
    loserId: string | null;
    isDraw?: boolean;
    drawTaps?: number;
    winnerTaps: number;
    loserTaps: number;
    isWinner: boolean;
  } | null>(null);

  // Profile Edit Form State
  const [editName, setEditName] = useState(profile.name);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [editColor, setEditColor] = useState(profile.color);
  const [editHat, setEditHat] = useState(profile.hat);

  // Social Interaction Target State
  const [selectedSocialPlayer, setSelectedSocialPlayer] = useState<{
    id: string;
    name: string;
    merits: number;
    avatar: string;
    color: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Temple & Fish Release States
  const [currentScene, setCurrentScene] = useState<'plaza' | 'temple_interior'>('plaza');
  const [activeTemple, setActiveTemple] = useState<TempleDoorTrigger | null>(null);
  const [nearbyDoor, setNearbyDoor] = useState<TempleDoorTrigger | null>(null);
  const [nearbyLake, setNearbyLake] = useState<{ id: 'lotus_pond' | 'liberation_pond'; name: string; x: number; y: number; radiusX: number; radiusY: number } | null>(null);
  const [showFishModal, setShowFishModal] = useState<boolean>(false);
  const [showBodhiModal, setShowBodhiModal] = useState<boolean>(false);
  const [isNearBodhi, setIsNearBodhi] = useState<boolean>(false);
  const [indoorMokugyoHits, setIndoorMokugyoHits] = useState<number>(0);
  const [nearIndoorExit, setNearIndoorExit] = useState<boolean>(false);
  const currentSceneRef = useRef<'plaza' | 'temple_interior'>('plaza');
  const activeTempleRef = useRef<TempleDoorTrigger | null>(null);
  const indoorMokugyoHitsRef = useRef<number>(0);
  const lastNearbyDoorIdRef = useRef<string | null>(null);
  const lastNearbyLakeIdRef = useRef<string | null>(null);
  const lastNearBodhiRef = useRef<boolean>(false);
  const lastNearIndoorExitRef = useRef<boolean>(false);

  // Canvas & Game Loop Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  // Camera tracking in world coordinates
  const cameraRef = useRef<{ x: number; y: number }>({ x: 1800 - 500, y: 1100 - 350 });

  // Visual Players Map (Decoupled from React render loop for 60fps silky smooth movement)
  const visualPlayersRef = useRef<Map<string, VisualEntity>>(new Map());
  const visualOrbsRef = useRef<Map<string, MeritOrb>>(new Map());
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const clashEffectsRef = useRef<CombatClashEffect[]>([]);
  const activeFishesRef = useRef<ActiveFishEntity[]>([]);
  const splashRipplesRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; alpha: number; color: string }[]>([]);

  const localPosRef = useRef<{ x: number; y: number; vx: number; vy: number; facing: 1 | -1 }>({
    x: 1800,
    y: 1100,
    vx: 0,
    vy: 0,
    facing: 1,
  });

  const indoorPosRef = useRef<{ x: number; y: number; vx: number; vy: number; facing: 1 | -1 }>({
    x: 600,
    y: 540,
    vx: 0,
    vy: 0,
    facing: 1,
  });

  const targetClickRef = useRef<{ x: number; y: number } | null>(null);
  const clickRipplesRef = useRef<{ x: number; y: number; radius: number; alpha: number }[]>([]);
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const lastDoorTransitionRef = useRef<number>(0);

  // Petals particle system (blossom leaves floating in breeze)
  const petalsRef = useRef<
    { x: number; y: number; vx: number; vy: number; rot: number; rotSpeed: number; size: number }[]
  >([]);

  // Update defeat countdown every 500ms
  useEffect(() => {
    const timer = setInterval(() => {
      const p = plazaService.getProfile();
      if (p.defeatUntil && p.defeatUntil > Date.now()) {
        setDefeatCountdown(Math.ceil((p.defeatUntil - Date.now()) / 1000));
      } else {
        setDefeatCountdown(0);
      }
      setLocalMerits(p.merits ?? 5);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Connect to Plaza Service and setup multiplayer network events
  useEffect(() => {
    plazaService.connect(1800, 1100);

    // Initial setup for local visual player
    const myProfile = plazaService.getProfile();
    const local = plazaService.getPlayersMap().get(myProfile.id);
    const startX = local ? local.x : 1800;
    const startY = local ? local.y : 1100;
    localPosRef.current.x = startX;
    localPosRef.current.y = startY;
    setLocalMerits(myProfile.merits ?? 5);

    visualPlayersRef.current.set(myProfile.id, {
      id: myProfile.id,
      name: myProfile.name,
      avatar: myProfile.avatar,
      color: myProfile.color,
      hat: myProfile.hat,
      weapon: myProfile.weapon || null,
      currentX: startX,
      currentY: startY,
      targetX: startX,
      targetY: startY,
      vx: 0,
      vy: 0,
      facing: 1,
      isMoving: false,
      action: 'idle',
      walkCycle: 0,
      isLocal: true,
      merits: myProfile.merits ?? 5,
      defeatUntil: myProfile.defeatUntil || 0,
    });

    // Populate already connected remote peers
    for (const p of plazaService.getPlayersMap().values()) {
      if (p.id !== myProfile.id) {
        visualPlayersRef.current.set(p.id, {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
          hat: p.hat,
          weapon: p.weapon || null,
          currentX: p.x,
          currentY: p.y,
          targetX: p.x,
          targetY: p.y,
          vx: p.vx,
          vy: p.vy,
          facing: p.facing,
          isMoving: p.isMoving,
          action: p.action,
          walkCycle: 0,
          chatText: p.chatText,
          chatTime: p.chatTime,
          isLocal: false,
          merits: p.merits ?? 5,
          defeatUntil: p.defeatUntil || 0,
        });
      }
    }

    // Load initial orbs from service
    const currentOrbs = plazaService.getOrbs();
    visualOrbsRef.current.clear();
    for (const orb of currentOrbs) {
      visualOrbsRef.current.set(orb.id, orb);
    }

    // Initialize swimming fish in the 2 sacred ponds (7 in each pond)
    const initialFishes: ActiveFishEntity[] = [];
    LAKES.forEach((lake) => {
      for (let i = 0; i < 7; i++) {
        const spec = FISH_CATALOG[i % FISH_CATALOG.length];
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 0.7;
        initialFishes.push({
          id: `fish_${lake.id}_${i}`,
          type: spec.id,
          lakeId: lake.id,
          x: lake.x + Math.cos(angle) * (lake.radiusX * dist),
          y: lake.y + Math.sin(angle) * (lake.radiusY * dist),
          vx: (Math.random() - 0.5) * spec.speed,
          vy: (Math.random() - 0.5) * spec.speed,
          angle: Math.random() * Math.PI * 2,
          color: spec.color,
          size: spec.size,
          tailPhase: Math.random() * Math.PI * 2,
          releasedBy: 'Chùa Tâm An',
        });
      }
    });
    activeFishesRef.current = initialFishes;

    // Initialize 35 gentle floating sakura petals
    petalsRef.current = Array.from({ length: 35 }, () => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: 0.5 + Math.random() * 0.8,
      vy: 0.3 + Math.random() * 0.6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      size: 4 + Math.random() * 4,
    }));

    // 1. Remote Player Move Listener: Smooth position update without React re-render
    const unsubMove = plazaService.onPlayerMove((id, x, y, vx, vy, facing, isMoving) => {
      let vp = visualPlayersRef.current.get(id);
      if (vp) {
        vp.targetX = x;
        vp.targetY = y;
        vp.vx = vx;
        vp.vy = vy;
        vp.facing = facing;
        vp.isMoving = isMoving;
      }
    });

    // 2. Remote Action Listener: Emotes (pray, bow, fish, sit)
    const unsubAction = plazaService.onPlayerAction((id, action) => {
      const vp = visualPlayersRef.current.get(id);
      if (vp) {
        vp.action = action;
        if (action === 'pray') {
          audioEngine.playTempleBell();
        } else if (action === 'tap_fish') {
          audioEngine.playWoodenFish(false);
        } else if (action === 'bow') {
          audioEngine.playBeadClick();
        }
      }
    });

    // 3. Remote Chat Listener: Updates speech bubble & adds to chat feed
    const unsubChat = plazaService.onPlayerChat((id, name, text) => {
      const vp = visualPlayersRef.current.get(id);
      if (vp) {
        // Only show chat bubble if not defeated
        if (!vp.defeatUntil || vp.defeatUntil <= Date.now()) {
          vp.chatText = text;
          vp.chatTime = Date.now();
        }
      }
      audioEngine.playBeadClick();

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages((prev) => [
        ...prev.slice(-6),
        {
          id: `${Date.now()}-${Math.random()}`,
          senderId: id,
          senderName: name,
          text,
          time: timeStr,
        },
      ]);
    });

    // 4. Players List Change Listener (Join / Leave / Profile Updates)
    const unsubList = plazaService.onPlayersListChange((list) => {
      setOnlineCount(list.length);
      setAllPlayersList(list);

      const currentIds = new Set(list.map((p) => p.id));
      for (const [id] of visualPlayersRef.current.entries()) {
        if (!currentIds.has(id)) {
          visualPlayersRef.current.delete(id);
        }
      }

      for (const p of list) {
        let vp = visualPlayersRef.current.get(p.id);
        if (!vp) {
          visualPlayersRef.current.set(p.id, {
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            hat: p.hat,
            currentX: p.x,
            currentY: p.y,
            targetX: p.x,
            targetY: p.y,
            vx: p.vx,
            vy: p.vy,
            facing: p.facing,
            isMoving: p.isMoving,
            action: p.action,
            walkCycle: 0,
            chatText: p.chatText,
            chatTime: p.chatTime,
            isLocal: p.isLocal || false,
            merits: p.merits ?? 5,
            weapon: p.weapon || null,
            defeatUntil: p.defeatUntil || 0,
          });
        } else {
          vp.name = p.name;
          vp.avatar = p.avatar;
          vp.color = p.color;
          vp.hat = p.hat;
          vp.merits = p.merits ?? 5;
          vp.weapon = p.weapon || null;
          vp.defeatUntil = p.defeatUntil || 0;
          if (p.chatText && p.chatTime) {
            vp.chatText = p.chatText;
            vp.chatTime = p.chatTime;
          }
        }
      }
    });

    // 5. Orbs Change Listener: Synchronize scattered merit orbs on map
    const unsubOrbs = plazaService.onOrbsChange((orbs) => {
      visualOrbsRef.current.clear();
      for (const orb of orbs) {
        visualOrbsRef.current.set(orb.id, orb);
      }
    });

    // 6. Orb Looted Listener: Spawn floating merit text particle
    const unsubLooted = plazaService.onOrbLooted((orbId, playerId, value, totalMerits) => {
      visualOrbsRef.current.delete(orbId);
      const vp = visualPlayersRef.current.get(playerId);
      if (vp) {
        vp.merits = totalMerits;
        const isWeaponPenalty = value < 0;

        if (isWeaponPenalty) {
          const weaponName = value <= -8 ? 'Súng 🔫' : value <= -4 ? 'Búa 🔨' : 'Dao 🔪';
          floatingTextsRef.current.push({
            id: `ft_${Date.now()}_${Math.random()}`,
            x: vp.currentX,
            y: vp.currentY - 48,
            text: `${value} Công Đức! ⚠️ (${weaponName})`,
            color: '#ef4444',
            alpha: 1.0,
          });

          // Warning shockwave
          clashEffectsRef.current.push({
            x: vp.currentX,
            y: vp.currentY,
            radius: 8,
            maxRadius: 52,
            alpha: 0.9,
          });

          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setChatMessages((prev) => [
            ...prev.slice(-6),
            {
              id: `loot_${Date.now()}_${Math.random()}`,
              senderId: 'system',
              senderName: '⚠️ PHẠM GIỚI',
              text: `${vp.name} đã nhặt ${weaponName} và bị trừ ${Math.abs(value)} Công Đức!`,
              time: timeStr,
            },
          ]);
        } else {
          floatingTextsRef.current.push({
            id: `ft_${Date.now()}_${Math.random()}`,
            x: vp.currentX,
            y: vp.currentY - 48,
            text: `+${value} Công Đức! ✨`,
            color: '#fbbf24',
            alpha: 1.0,
          });
        }
      }
      audioEngine.playWoodenFish(false);
    });

    // 7. Combat Result Listener: Clash sound, shockwave effect, and announcement
    const unsubCombat = plazaService.onCombatResult((result) => {
      const myP = plazaService.getProfile();
      const isParticipant =
        myP.id === result.challengerId ||
        myP.id === result.targetId ||
        myP.id === result.winnerId ||
        myP.id === result.loserId;

      // Play authentic Bonk wooden fish sound only for participants
      if (isParticipant) {
        audioEngine.playWoodenFish(true);
      }

      const pA = visualPlayersRef.current.get(result.challengerId);
      const pB = visualPlayersRef.current.get(result.targetId);

      if (pA && pB) {
        const midX = (pA.currentX + pB.currentX) / 2;
        const midY = (pA.currentY + pB.currentY) / 2;
        clashEffectsRef.current.push({
          x: midX,
          y: midY,
          radius: 12,
          maxRadius: 85,
          alpha: 1.0,
        });
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (result.isDraw) {
        // DRAW CASE: Both players get +2 merits each
        const drawTaps = result.drawTaps ?? 0;
        const alertMsg = `🤝 TRẬN SO KÈO HÒA NHAU! Cả hai cùng đạt ${drawTaps} tiếng mõ (+2 Công Đức giao duyên)! ✨`;
        if (isParticipant) {
          setCombatAlert(alertMsg);
          setTimeout(() => setCombatAlert(null), 5000);
        }

        if (pA) {
          pA.chatText = `🤝 Hòa nhau! (${drawTaps} Mõ)`;
          pA.chatTime = Date.now();
        }
        if (pB) {
          pB.chatText = `🤝 Hòa nhau! (${drawTaps} Mõ)`;
          pB.chatTime = Date.now();
        }

        setChatMessages((prev) => [
          ...prev.slice(-6),
          {
            id: `combat_${Date.now()}`,
            senderId: 'system',
            senderName: '🤝 SO KÈO BẤT PHÂN THẮNG BẠI',
            text: alertMsg,
            time: timeStr,
          },
        ]);
        return;
      }

      // WIN / LOSS CASE: Winner +10 Merits, Loser -5 Merits
      const winner = result.winnerId ? visualPlayersRef.current.get(result.winnerId) : undefined;
      const loser = result.loserId ? visualPlayersRef.current.get(result.loserId) : undefined;

      const alertMsg = `⚔️ ${winner ? winner.name : 'Đạo hữu'} ĐÃ THẮNG SO KÈO (+10 Công Đức)! ${loser ? loser.name : 'Đạo hữu'} THUA CUỘC (-5 Công Đức, khóa bại trận 1 phút)!`;
      if (isParticipant) {
        setCombatAlert(alertMsg);
        setTimeout(() => setCombatAlert(null), 5000);
      }

      if (loser) {
        loser.defeatUntil = result.defeatUntil;
        loser.chatText = undefined;
      }
      if (winner) {
        winner.chatText = '🙏 Thắng không kiêu!';
        winner.chatTime = Date.now();
      }

      setChatMessages((prev) => [
        ...prev.slice(-6),
        {
          id: `combat_${Date.now()}`,
          senderId: 'system',
          senderName: '⚔️ KẾT QUẢ SO KÈO CÔNG ĐỨC',
          text: alertMsg,
          time: timeStr,
        },
      ]);
    });

    // 8. Combat Invite Received (Handshake: Requires acceptance)
    const unsubInvite = plazaService.onCombatInviteReceived((invite) => {
      setIncomingInvite(invite);
      audioEngine.playTempleBell();
    });

    // 9. Combat Invite Declined
    const unsubDeclined = plazaService.onCombatDeclined((_, targetName) => {
      setCombatAlert(`${targetName} đã từ chối lời so kèo.`);
      setPendingInviteTarget(null);
      setTimeout(() => setCombatAlert(null), 3500);
    });

    // 10. Combat Duel Started: Only the 2 participants enter 1v1 Tapping Arena
    const unsubStarted = plazaService.onCombatStarted((duel) => {
      const myP = plazaService.getProfile();
      // Only the two players in the duel enter the tapping arena
      if (myP.id !== duel.playerAId && myP.id !== duel.playerBId) {
        return;
      }
      setActiveDuel(duel);
      setPendingInviteTarget(null);
      setIncomingInvite(null);
      setMyDuelTaps(0);
      setOppDuelTaps(0);
      setDuelResult(null);
      audioEngine.playWoodenFish(true);
    });

    // 11. Combat Tap Event: Sync real-time taps (only for duel participants)
    const unsubTapped = plazaService.onCombatTapped((duelId, _playerId, aTaps, bTaps) => {
      setActiveDuel((curr) => {
        if (!curr || curr.duelId !== duelId) return curr;
        const myP = plazaService.getProfile();
        if (myP.id !== curr.playerAId && myP.id !== curr.playerBId) return null;
        const isPlayerA = myP.id === curr.playerAId;
        setMyDuelTaps(isPlayerA ? aTaps : bTaps);
        setOppDuelTaps(isPlayerA ? bTaps : aTaps);
        return { ...curr, playerATaps: aTaps, playerBTaps: bTaps };
      });
    });

    // 12. Fish Released Event from Network
    const unsubFish = plazaService.onFishReleased((f) => {
      const spec = FISH_CATALOG.find((s) => s.id === f.fishType) || FISH_CATALOG[0];
      const lake = LAKES.find((l) => l.id === f.lakeId) || LAKES[0];
      const newFish: ActiveFishEntity = {
        id: f.id,
        type: f.fishType,
        lakeId: f.lakeId,
        x: f.x || lake.x,
        y: f.y || lake.y,
        vx: (Math.random() - 0.5) * spec.speed,
        vy: (Math.random() - 0.5) * spec.speed,
        angle: Math.random() * Math.PI * 2,
        color: spec.color,
        size: spec.size,
        tailPhase: 0,
        releasedBy: f.releasedBy,
      };
      activeFishesRef.current.push(newFish);

      // Water splash ripple effect
      splashRipplesRef.current.push({
        x: newFish.x,
        y: newFish.y,
        radius: 12,
        maxRadius: 65,
        alpha: 1,
        color: spec.color,
      });

      // Floating celebration text
      floatingTextsRef.current.push({
        id: `ft_fish_${Date.now()}_${Math.random()}`,
        x: newFish.x,
        y: newFish.y - 20,
        text: `✨ ${f.releasedBy} Phóng Sinh ${spec.name}!`,
        color: '#67e8f9',
        alpha: 1,
      });
      audioEngine.playTempleBell();
    });

    // 13. Social Interaction Events (Dâng trà, tặng sen, bái chào)
    const unsubSocial = plazaService.onSocialEvent((senderId, senderName, targetId, targetName, action, senderMerits, targetMerits) => {
      const myId = plazaService.getProfile().id;
      const isParticipant = myId === senderId || myId === targetId;

      const sPlayer = visualPlayersRef.current.get(senderId);
      const tPlayer = visualPlayersRef.current.get(targetId);
      if (sPlayer && typeof senderMerits === 'number') sPlayer.merits = senderMerits;
      if (tPlayer && typeof targetMerits === 'number') tPlayer.merits = targetMerits;

      if (action === 'offer_tea') {
        if (sPlayer) sPlayer.socialStatus = { type: 'offer_tea', partnerName: targetName, expiresAt: Date.now() + 8000 };
        if (tPlayer) tPlayer.socialStatus = { type: 'offer_tea', partnerName: senderName, expiresAt: Date.now() + 8000 };
        if (isParticipant) {
          audioEngine.playBeadClick();
          floatingTextsRef.current.push({
            id: `ft_tea_${Date.now()}`,
            x: sPlayer?.currentX || 1800,
            y: (sPlayer?.currentY || 1100) - 40,
            text: `🍵 ${senderName} dâng chén trà sen tịnh tâm tới ${targetName}!`,
            color: '#6ee7b7',
            alpha: 1,
          });
        }
      } else if (action === 'gift_lotus') {
        if (tPlayer) tPlayer.socialStatus = { type: 'gift_lotus', partnerName: senderName, expiresAt: Date.now() + 12000 };
        if (isParticipant) {
          audioEngine.playTempleBell();
          floatingTextsRef.current.push({
            id: `ft_lotus_${Date.now()}`,
            x: tPlayer?.currentX || 1800,
            y: (tPlayer?.currentY || 1100) - 40,
            text: `🪷 ${senderName} tặng đóa sen phước lành (+2 Công Đức) cho ${targetName}!`,
            color: '#fbbf24',
            alpha: 1,
          });
        }
      } else if (action === 'mutual_bow') {
        if (sPlayer) sPlayer.action = 'bow';
        if (tPlayer) tPlayer.action = 'bow';
        if (isParticipant) {
          audioEngine.playBeadClick();
          floatingTextsRef.current.push({
            id: `ft_bow_${Date.now()}`,
            x: sPlayer?.currentX || 1800,
            y: (sPlayer?.currentY || 1100) - 40,
            text: `🙏 ${senderName} và ${targetName} cung kính bái chào nhau!`,
            color: '#fef08a',
            alpha: 1,
          });
          setTimeout(() => {
            if (sPlayer && sPlayer.action === 'bow') sPlayer.action = 'idle';
            if (tPlayer && tPlayer.action === 'bow') tPlayer.action = 'idle';
          }, 2500);
        }
      }
    });

    // 14. Group Meditation Reward Event (Cộng hưởng thanh tịnh)
    const unsubMeditation = plazaService.onMeditationReward((playerIds, bonus) => {
      const myId = plazaService.getProfile().id;
      if (playerIds.includes(myId)) {
        audioEngine.playTempleBell();
        const myVp = visualPlayersRef.current.get(myId);
        if (myVp) {
          floatingTextsRef.current.push({
            id: `ft_med_${Date.now()}`,
            x: myVp.currentX,
            y: myVp.currentY - 45,
            text: `✨ +${bonus} Cộng Hưởng Thanh Tịnh (Tọa Thiền Đồng Tu)!`,
            color: '#fbbf24',
            alpha: 1,
          });
        }
        setLocalMerits(plazaService.getProfile().merits ?? 5);
      }
    });

    return () => {
      unsubMove();
      unsubAction();
      unsubChat();
      unsubList();
      unsubOrbs();
      unsubLooted();
      unsubCombat();
      unsubInvite();
      unsubDeclined();
      unsubStarted();
      unsubTapped();
      unsubFish();
      unsubSocial();
      unsubMeditation();
      plazaService.disconnect();
    };
  }, []);


  // Save Character Profile Updates
  const handleSaveProfile = () => {
    const trimmed = editName.trim() || 'Đạo Hữu';
    const updates = {
      name: trimmed,
      avatar: editAvatar,
      color: editColor,
      hat: editHat,
    };
    plazaService.updateProfile(updates);

    const updated = plazaService.getProfile();
    setProfile(updated);

    const myVp = visualPlayersRef.current.get(updated.id);
    if (myVp) {
      myVp.name = updated.name;
      myVp.avatar = updated.avatar;
      myVp.color = updated.color;
      myVp.hat = updated.hat;
    }

    setShowProfileModal(false);
  };

  // Image Upload handler for Avatar
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh dung lượng dưới 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 96;
        tempCanvas.height = 96;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 96, 96);
          const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
          setEditAvatar(dataUrl);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Trigger Action Emote
  const triggerAction = useCallback((action: StickmanAction) => {
    // Toggle off if currently performing this action (e.g. dừng thiền, dừng quỳ)
    if (activeAction === action) {
      setActiveAction('idle');
      plazaService.sendLocalAction('idle');
      const myProfile = plazaService.getProfile();
      const myVp = visualPlayersRef.current.get(myProfile.id);
      if (myVp) myVp.action = 'idle';
      return;
    }

    setActiveAction(action);
    plazaService.sendLocalAction(action);

    const myProfile = plazaService.getProfile();
    const myVp = visualPlayersRef.current.get(myProfile.id);
    if (myVp) {
      myVp.action = action;
    }

    if (action === 'pray') {
      audioEngine.playTempleBell();
    } else if (action === 'tap_fish') {
      audioEngine.playWoodenFish(true);
    } else if (action === 'bow') {
      audioEngine.playBeadClick();
    }

    if (action !== 'sit') {
      setTimeout(() => {
        setActiveAction((curr) => (curr === action ? 'idle' : curr));
        const currVp = visualPlayersRef.current.get(myProfile.id);
        if (currVp && currVp.action === action) {
          currVp.action = 'idle';
          plazaService.sendLocalAction('idle');
        }
      }, 2500);
    }
  }, [activeAction]);

  // Tap Wooden Fish during 1v1 Combat Duel
  const handleDuelTap = useCallback(() => {
    if (!activeDuel || duelResult) return;
    const myId = profile.id;
    if (myId !== activeDuel.playerAId && myId !== activeDuel.playerBId) return;
    const now = Date.now();
    if (now < activeDuel.startTime || now > activeDuel.startTime + activeDuel.duration) return;

    setMyDuelTaps((prev) => prev + 1);
    audioEngine.playWoodenFish(false);
    plazaService.sendCombatTap(activeDuel.duelId);
  }, [activeDuel, duelResult, profile.id]);

  // Accept incoming 1v1 Combat Challenge
  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    plazaService.acceptCombatInvite(incomingInvite.id, incomingInvite.challengerId);
    setIncomingInvite(null);
  };

  // Decline incoming 1v1 Combat Challenge
  const handleDeclineInvite = () => {
    if (!incomingInvite) return;
    plazaService.declineCombatInvite(incomingInvite.id);
    setIncomingInvite(null);
  };

  // 1v1 Duel Game Loop & Clock
  useEffect(() => {
    if (!activeDuel) return;
    const myId = profile.id;
    if (myId !== activeDuel.playerAId && myId !== activeDuel.playerBId) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const start = activeDuel.startTime;
      const end = start + activeDuel.duration;

      if (now < start) {
        // Pre-duel countdown
        setDuelCountdown(Math.ceil((start - now) / 1000));
        setDuelTimeLeft((activeDuel.duration / 1000).toFixed(1));
      } else if (now < end) {
        // Active duel tapping phase
        setDuelCountdown(0);
        const rem = Math.max(0, (end - now) / 1000);
        setDuelTimeLeft(rem.toFixed(1));
      } else {
        // Duel ended!
        setDuelCountdown(0);
        setDuelTimeLeft('0.0');

        if (!duelResult) {
          const myProfile = plazaService.getProfile();
          const isPlayerA = myProfile.id === activeDuel.playerAId;
          const aTaps = isPlayerA ? myDuelTaps : oppDuelTaps;
          const bTaps = isPlayerA ? oppDuelTaps : myDuelTaps;

          const isDraw = aTaps === bTaps;
          if (isDraw) {
            const res = {
              winnerId: null,
              loserId: null,
              isDraw: true,
              drawTaps: aTaps,
              winnerTaps: aTaps,
              loserTaps: bTaps,
              isWinner: false,
            };
            setDuelResult(res);

            if (isPlayerA) {
              plazaService.finishCombatDuel(
                activeDuel.duelId,
                null,
                null,
                aTaps,
                bTaps,
                true,
                activeDuel.playerAId,
                activeDuel.playerBId
              );
            }
          } else {
            const playerAWon = aTaps > bTaps;
            const winnerId = playerAWon ? activeDuel.playerAId : activeDuel.playerBId;
            const loserId = playerAWon ? activeDuel.playerBId : activeDuel.playerAId;
            const winnerTaps = Math.max(aTaps, bTaps);
            const loserTaps = Math.min(aTaps, bTaps);
            const isWinner = myProfile.id === winnerId;

            const res = { isDraw: false, winnerId, loserId, winnerTaps, loserTaps, isWinner };
            setDuelResult(res);

            // Player A sends final resolution packet to ensure consistency
            if (isPlayerA) {
              plazaService.finishCombatDuel(
                activeDuel.duelId,
                winnerId,
                loserId,
                winnerTaps,
                loserTaps,
                false,
                activeDuel.playerAId,
                activeDuel.playerBId
              );
            }
          }

          // Close arena modal after 3.8s
          setTimeout(() => {
            setActiveDuel(null);
            setDuelResult(null);
          }, 3800);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activeDuel, myDuelTaps, oppDuelTaps, duelResult]);

  // Initiate 1v1 Combat Challenge Invite (Handshake requirement)
  const handleInitiateCombat = (targetId: string) => {
    const myProfile = plazaService.getProfile();
    const now = Date.now();
    if (myProfile.defeatUntil && myProfile.defeatUntil > now) {
      const sec = Math.ceil((myProfile.defeatUntil - now) / 1000);
      setCombatAlert(`Bạn đang bại trận, cần tĩnh tâm còn ${sec}s!`);
      setTimeout(() => setCombatAlert(null), 3000);
      return;
    }

    const target = visualPlayersRef.current.get(targetId);
    if (!target) return;

    if (target.defeatUntil && target.defeatUntil > now) {
      setCombatAlert(`${target.name} đang bại trận, không thể so kèo!`);
      setTimeout(() => setCombatAlert(null), 3000);
      return;
    }

    const success = plazaService.sendCombatInvite(targetId);
    if (success) {
      setPendingInviteTarget({ id: targetId, name: target.name });
      setCombatAlert(`Đã gửi lời mời so kèo tới ${target.name}. Đang chờ chấp thuận...`);
      setTimeout(() => {
        setPendingInviteTarget((prev) => (prev?.id === targetId ? null : prev));
        setCombatAlert(null);
      }, 10000);
    } else {
      setCombatAlert('Không thể gửi lời mời so kèo (ngoài cự ly hoặc đối thủ bận)!');
      setTimeout(() => setCombatAlert(null), 3000);
    }
  };

  // Send Chat message
  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    const now = Date.now();
    const myProfile = plazaService.getProfile();
    if (myProfile.defeatUntil && myProfile.defeatUntil > now) {
      const remainSec = Math.ceil((myProfile.defeatUntil - now) / 1000);
      setCombatAlert(`Đang trong trạng thái Bại Trận (còn ${remainSec}s) - Bong bóng thua cuộc không thể bị đè!`);
      setTimeout(() => setCombatAlert(null), 3500);
      return;
    }

    const sent = plazaService.sendChat(text);
    if (sent) setChatInput('');
  };

  // Enter Temple Interior
  const handleEnterTemple = useCallback((door: TempleDoorTrigger) => {
    activeTempleRef.current = door;
    setActiveTemple(door);
    currentSceneRef.current = 'temple_interior';
    setCurrentScene('temple_interior');
    indoorPosRef.current = { x: 550, y: 530, vx: 0, vy: 0, facing: 1 };
    targetClickRef.current = null;
    lastNearIndoorExitRef.current = true;
    setNearIndoorExit(true);
    audioEngine.playTempleBell();
  }, []);

  // Exit Temple Interior
  const handleExitTemple = useCallback(() => {
    const temple = activeTempleRef.current || activeTemple;
    if (temple) {
      localPosRef.current.x = temple.returnX;
      localPosRef.current.y = temple.returnY;
      localPosRef.current.vx = 0;
      localPosRef.current.vy = 0;
      targetClickRef.current = null;
    }
    lastNearIndoorExitRef.current = false;
    setNearIndoorExit(false);
    currentSceneRef.current = 'plaza';
    setCurrentScene('plaza');
    audioEngine.playWoodenFish();
  }, [activeTemple]);

  // Release Fish at lake
  const handleReleaseFish = useCallback((fish: FishSpec) => {
    const lake = nearbyLake || LAKES[0];
    if (localMerits < fish.cost) {
      alert(`Bạn cần tối thiểu ${fish.cost} Công Đức để phóng sinh ${fish.name}! Đi gõ mõ hoặc lạy Phật để tích thêm công đức.`);
      return;
    }

    const angle = Math.random() * Math.PI * 2;
    const spawnX = lake.x + Math.cos(angle) * (lake.radiusX * 0.75);
    const spawnY = lake.y + Math.sin(angle) * (lake.radiusY * 0.75);

    // Call service to broadcast across network & update storage
    plazaService.releaseFish(fish.id, fish.cost, lake.id, spawnX, spawnY);

    // Update local state immediately
    const nextMerits = localMerits - fish.cost;
    setLocalMerits(nextMerits);
    setShowFishModal(false);
    audioEngine.playTempleBell();

    // Spawn animated fish directly into the lake immediately
    const spec = fish;
    const newFish: ActiveFishEntity = {
      id: `fish_usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: fish.id,
      lakeId: lake.id,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * spec.speed,
      vy: (Math.random() - 0.5) * spec.speed,
      angle: Math.random() * Math.PI * 2,
      color: spec.color,
      size: spec.size,
      tailPhase: 0,
      releasedBy: profile.name,
    };
    activeFishesRef.current.push(newFish);

    // Water ripple effect
    splashRipplesRef.current.push({
      x: spawnX,
      y: spawnY,
      radius: 12,
      maxRadius: 75,
      alpha: 1,
      color: spec.color,
    });

    // Floating celebration text
    floatingTextsRef.current.push({
      id: `ft_fish_${Date.now()}`,
      x: spawnX,
      y: spawnY - 20,
      text: `✨ Phóng Sinh ${spec.name} Thành Công! (-${fish.cost} Công Đức)`,
      color: '#67e8f9',
      alpha: 1,
    });

    plazaService.sendChat(`🙏 Nam Mô A Di Đà Phật! Đã phóng sinh ${fish.name}!`);
  }, [nearbyLake, localMerits, profile.name]);

  // Tap Indoor Mokugyo inside Chánh Điện
  const handleTapIndoorMokugyo = useCallback(() => {
    audioEngine.playWoodenFish(false);
    indoorMokugyoHitsRef.current += 1;
    setIndoorMokugyoHits((h) => h + 1);
    setLocalMerits((m) => {
      const next = m + 1;
      plazaService.updateProfile({ merits: next });
      return next;
    });
    floatingTextsRef.current.push({
      id: `ft_indoor_${Date.now()}_${Math.random()}`,
      x: 600,
      y: 350,
      text: '+1 Công Đức 🙏 (Gõ Mõ Chánh Điện)',
      color: '#fde047',
      alpha: 1,
    });
  }, []);

  // Keyboard navigation listeners (Supports Key L for combat and duel tapping)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // CHỐNG SPAM: Ngăn chặn tự động lặp lại khi giữ phím (Edge-trigger)
      if (e.repeat) return;

      keysDownRef.current[e.code] = true;

      // During active duel: Tap wooden fish with Space (only for duel participants)!
      if (activeDuel && !duelResult && (profile.id === activeDuel.playerAId || profile.id === activeDuel.playerBId)) {
        if (e.code === 'Space') {
          e.preventDefault();
          handleDuelTap();
          return;
        }
      }

      // Xử lý vào / ra cửa đền bằng phím Space hoặc phím E có Cooldown 1500ms chống spam
      const isDoorKey = e.code === 'Space' || e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
      if (isDoorKey) {
        const now = Date.now();
        const canTransition = now - lastDoorTransitionRef.current > 1500;
        if (currentSceneRef.current === 'plaza' && nearbyDoor && canTransition) {
          e.preventDefault();
          lastDoorTransitionRef.current = now;
          handleEnterTemple(nearbyDoor);
          return;
        } else if (currentSceneRef.current === 'temple_interior' && nearIndoorExit && canTransition) {
          e.preventDefault();
          lastDoorTransitionRef.current = now;
          handleExitTemple();
          return;
        }
      }

      // Inside Temple Interior: Space taps giant indoor Mokugyo to tích công đức (chỉ khi không ở ngay cửa thoát)
      if (currentSceneRef.current === 'temple_interior' && e.code === 'Space' && !nearIndoorExit) {
        e.preventDefault();
        handleTapIndoorMokugyo();
        return;
      }

      // Key G (or F): Open Fish Release Modal when near a lake
      if (e.code === 'KeyG' || e.key === 'g' || e.key === 'G' || e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        if (currentScene === 'plaza' && nearbyLake) {
          setShowFishModal(true);
          return;
        }
      }

      // Key B: Open Bodhi Tree Wish Modal when near Bodhi Tree
      if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
        if (currentSceneRef.current === 'plaza' && lastNearBodhiRef.current) {
          setShowBodhiModal(true);
          return;
        }
      }

      if (e.key === '1') triggerAction('pray');
      if (e.key === '2') triggerAction('bow');
      if (e.key === '3') triggerAction('tap_fish');
      if (e.key === '4') triggerAction(activeAction === 'sit' ? 'idle' : 'sit');

      // Key L: Trigger 1v1 Combat Invite with nearby opponent
      if (e.code === 'KeyL' || e.key === 'l' || e.key === 'L') {
        if (nearbyOpponent && !nearbyOpponent.isDefeated && !pendingInviteTarget) {
          handleInitiateCombat(nearbyOpponent.id);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    triggerAction,
    activeAction,
    nearbyOpponent,
    activeDuel,
    duelResult,
    handleDuelTap,
    pendingInviteTarget,
    currentScene,
    nearbyDoor,
    nearbyLake,
    nearIndoorExit,
    handleEnterTemple,
    handleExitTemple,
    handleTapIndoorMokugyo
  ]);

  // Click on Canvas to Walk or Challenge Player to Combat
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Screen click position
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;

    // 1. Interior scene handling: click Mokugyo to tap, click exit door to exit, or click to walk!
    if (currentSceneRef.current === 'temple_interior') {
      const centerX = canvas.width / 2;
      const clickDistToMokugyo = Math.hypot(screenX - centerX, screenY - 380);
      if (clickDistToMokugyo < 55) {
        handleTapIndoorMokugyo();
        return;
      }
      if (Math.hypot(screenX - centerX, screenY - (canvas.height - 40)) < 55) {
        handleExitTemple();
        return;
      }

      // If currently meditating or kneeling inside temple, cannot move until finished
      const myProfile = plazaService.getProfile();
      const myVp = visualPlayersRef.current.get(myProfile.id);
      if (myVp && myVp.action && myVp.action !== 'idle') {
        return;
      }

      const clampedX = Math.max(140, Math.min(canvas.width - 140, screenX));
      const clampedY = Math.max(220, Math.min(canvas.height - 45, screenY));
      targetClickRef.current = { x: clampedX, y: clampedY };
      clickRipplesRef.current.push({ x: clampedX, y: clampedY, radius: 4, alpha: 1.0 });
      return;
    }

    // 2. If character is performing an action (thiền, quỳ/đảnh lễ, chắp tay, gõ mõ), cannot move until finished!
    const myProfile = plazaService.getProfile();
    const myVp = visualPlayersRef.current.get(myProfile.id);
    if (myVp && myVp.action && myVp.action !== 'idle') {
      return;
    }

    // Convert Screen Coords -> World Coords using Camera offset!
    const worldX = screenX + cameraRef.current.x;
    const worldY = screenY + cameraRef.current.y;

    // 1. Check if clicked directly on a nearby remote player to interact with them!
    const localX = localPosRef.current.x;
    const localY = localPosRef.current.y;
    for (const [id, vp] of visualPlayersRef.current.entries()) {
      if (!vp.isLocal) {
        const clickDistToPlayer = Math.hypot(vp.currentX - worldX, vp.currentY - worldY);
        const playerDistToPlayer = Math.hypot(vp.currentX - localX, vp.currentY - localY);
        if (clickDistToPlayer < 42 && playerDistToPlayer < 240) {
          setSelectedSocialPlayer({
            id: vp.id,
            name: vp.name,
            merits: vp.merits || 0,
            avatar: vp.avatar,
            color: vp.color,
            screenX,
            screenY,
          });
          return;
        }
      }
    }

    const clampedX = Math.max(60, Math.min(WORLD_WIDTH - 60, worldX));
    const clampedY = Math.max(160, Math.min(WORLD_HEIGHT - 60, worldY));

    targetClickRef.current = { x: clampedX, y: clampedY };

    // Spawn golden ripple in world coords
    clickRipplesRef.current.push({
      x: clampedX,
      y: clampedY,
      radius: 4,
      alpha: 1.0,
    });
  };


  // Main 60fps Game & Animation Loop with Camera Tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let walkCycle = 0;
    let lastNetworkSync = 0;
    let lastOpponentCheck = 0;
    let lastOpponentKey = '';

    const render = (time: number) => {
      const dt = 0.016; // 60fps
      walkCycle += dt * 8;

      // 1. Process Local Movement
      let dx = 0;
      let dy = 0;
      const isSprinting = keysDownRef.current['ShiftLeft'] || keysDownRef.current['ShiftRight'];
      const baseSpeed = isSprinting ? 340 : 230;
      const speed = baseSpeed * dt;

      const keys = keysDownRef.current;
      if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

      // --- SCENE A: TEMPLE INTERIOR SCENE ---
      if (currentSceneRef.current === 'temple_interior') {
        const myProfile = plazaService.getProfile();
        const myVp = visualPlayersRef.current.get(myProfile.id);
        const isPerformingAction = Boolean(myVp && myVp.action && myVp.action !== 'idle');

        if (isPerformingAction) {
          dx = 0;
          dy = 0;
          targetClickRef.current = null;
        }

        if (dx !== 0 || dy !== 0) {
          targetClickRef.current = null;
          const len = Math.sqrt(dx * dx + dy * dy);
          dx = (dx / len) * speed;
          dy = (dy / len) * speed;
        } else if (targetClickRef.current) {
          const tx = targetClickRef.current.x - indoorPosRef.current.x;
          const ty = targetClickRef.current.y - indoorPosRef.current.y;
          const dist = Math.sqrt(tx * tx + ty * ty);
          if (dist > 5) {
            dx = (tx / dist) * Math.min(speed, dist);
            dy = (ty / dist) * Math.min(speed, dist);
          } else {
            targetClickRef.current = null;
          }
        }

        const isIndoorMoving = Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;
        if (isIndoorMoving) {
          indoorPosRef.current.x += dx;
          indoorPosRef.current.y += dy;
          indoorPosRef.current.vx = dx;
          indoorPosRef.current.vy = dy;
          if (dx > 0.1) indoorPosRef.current.facing = 1;
          if (dx < -0.1) indoorPosRef.current.facing = -1;
        } else {
          indoorPosRef.current.vx = 0;
          indoorPosRef.current.vy = 0;
        }

        // Clamp to indoor temple room boundaries
        indoorPosRef.current.x = Math.max(140, Math.min(canvas.width - 140, indoorPosRef.current.x));
        indoorPosRef.current.y = Math.max(220, Math.min(canvas.height - 45, indoorPosRef.current.y));

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTempleInterior(
          ctx,
          canvas.width,
          canvas.height,
          indoorPosRef.current,
          plazaService.getProfile(),
          activeTempleRef.current?.name || activeTemple?.name || 'Đại Hùng Bảo Điện',
          time,
          walkCycle,
          indoorMokugyoHitsRef.current,
          floatingTextsRef.current
        );

        // Draw click ripples in temple interior
        for (let i = clickRipplesRef.current.length - 1; i >= 0; i--) {
          const rip = clickRipplesRef.current[i];
          rip.radius += 1.2;
          rip.alpha -= 0.035;
          if (rip.alpha <= 0) {
            clickRipplesRef.current.splice(i, 1);
          } else {
            ctx.save();
            ctx.strokeStyle = `rgba(251, 191, 36, ${rip.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();

        // Update floating texts
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
          const ft = floatingTextsRef.current[i];
          ft.y -= 1.0;
          ft.alpha -= 0.02;
          if (ft.alpha <= 0) floatingTextsRef.current.splice(i, 1);
        }

        requestRef.current = requestAnimationFrame(render);
        return;
      }

      // --- SCENE B: PLAZA OUTDOOR MOVEMENT ---
      // Check if character is currently performing an action (thiền, quỳ/đảnh lễ, chắp tay, gõ mõ)
      const myProfile = plazaService.getProfile();
      const myVp = visualPlayersRef.current.get(myProfile.id);
      const isPerformingAction = Boolean(myVp && myVp.action && myVp.action !== 'idle');

      if (isPerformingAction) {
        // While meditating (thiền) or kneeling (quỳ/đảnh lễ), character CANNOT MOVE until action finishes!
        dx = 0;
        dy = 0;
        targetClickRef.current = null;
      }

      if (dx !== 0 || dy !== 0) {
        targetClickRef.current = null;
        const len = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / len) * speed;
        dy = (dy / len) * speed;
      } else if (targetClickRef.current) {
        const tx = targetClickRef.current.x - localPosRef.current.x;
        const ty = targetClickRef.current.y - localPosRef.current.y;
        const dist = Math.sqrt(tx * tx + ty * ty);

        if (dist > 5) {
          dx = (tx / dist) * Math.min(speed, dist);
          dy = (ty / dist) * Math.min(speed, dist);
        } else {
          targetClickRef.current = null;
        }
      }

      const isMoving = Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;
      if (isMoving) {
        localPosRef.current.x += dx;
        localPosRef.current.y += dy;
        localPosRef.current.vx = dx;
        localPosRef.current.vy = dy;
        if (dx > 0.1) localPosRef.current.facing = 1;
        if (dx < -0.1) localPosRef.current.facing = -1;

        // World boundaries
        localPosRef.current.x = Math.max(60, Math.min(WORLD_WIDTH - 60, localPosRef.current.x));
        localPosRef.current.y = Math.max(160, Math.min(WORLD_HEIGHT - 60, localPosRef.current.y));
      } else {
        localPosRef.current.vx = 0;
        localPosRef.current.vy = 0;
      }

      // Check proximity to temple doors (only when player is immediately at the door entrance, <= 48px)
      let foundDoor: TempleDoorTrigger | null = null;
      for (const d of TEMPLE_DOORS) {
        if (Math.hypot(d.doorX - localPosRef.current.x, d.doorY - localPosRef.current.y) < 48) {
          foundDoor = d;
          break;
        }
      }
      const doorId = foundDoor ? foundDoor.id : null;
      if (doorId !== lastNearbyDoorIdRef.current) {
        lastNearbyDoorIdRef.current = doorId;
        setNearbyDoor(foundDoor);
      }

      // Check proximity to lakes for fish releasing (strictly at the lake bank or dock, normDist <= 1.05)
      let foundLake: (typeof LAKES)[0] | null = null;
      for (const lake of LAKES) {
        const dx = localPosRef.current.x - lake.x;
        const dy = localPosRef.current.y - lake.y;
        const normDist = Math.sqrt((dx * dx) / (lake.radiusX * lake.radiusX) + (dy * dy) / (lake.radiusY * lake.radiusY));
        if (normDist <= 1.05) {
          foundLake = lake;
          break;
        }
      }
      const lakeId = foundLake ? foundLake.id : null;
      if (lakeId !== lastNearbyLakeIdRef.current) {
        lastNearbyLakeIdRef.current = lakeId;
        setNearbyLake(foundLake);
      }

      // Check proximity to Bodhi Wish Tree (tree at 1740, 1200, radius <= 165px)
      const distToBodhi = Math.hypot(1740 - localPosRef.current.x, 1200 - localPosRef.current.y);
      const nearBodhi = distToBodhi <= 165;
      if (nearBodhi !== lastNearBodhiRef.current) {
        lastNearBodhiRef.current = nearBodhi;
        setIsNearBodhi(nearBodhi);
      }

      // Check proximity for looting scattered merit orbs!
      const currentX = localPosRef.current.x;
      const currentY = localPosRef.current.y;
      for (const orb of visualOrbsRef.current.values()) {
        const d = Math.hypot(orb.x - currentX, orb.y - currentY);
        if (d < 38) {
          plazaService.lootOrb(orb.id);
          break; // Loot one per frame
        }
      }

      // Check nearby opponents for 1v1 combat prompt (strictly close distance <= 50px, throttled every 200ms)
      if (time - lastOpponentCheck > 200) {
        lastOpponentCheck = time;
        let foundOpponent: { id: string; name: string; merits: number; weapon?: string | null; isDefeated: boolean } | null = null;
        let closestDist = 50;

        for (const [id, vp] of visualPlayersRef.current.entries()) {
          if (!vp.isLocal) {
            const d = Math.hypot(vp.currentX - currentX, vp.currentY - currentY);
            if (d < closestDist) {
              closestDist = d;
              const isDef = Boolean(vp.defeatUntil && vp.defeatUntil > Date.now());
              foundOpponent = {
                id: vp.id,
                name: vp.name,
                merits: vp.merits || 0,
                weapon: vp.weapon || null,
                isDefeated: isDef,
              };
            }
          }
        }

        const oppKey = foundOpponent ? `${foundOpponent.id}_${foundOpponent.isDefeated}` : '';
        if (oppKey !== lastOpponentKey) {
          lastOpponentKey = oppKey;
          setNearbyOpponent(foundOpponent);
        }
      }

      // Update local player in visual map
      if (myVp) {
        myVp.currentX = localPosRef.current.x;
        myVp.currentY = localPosRef.current.y;
        myVp.facing = localPosRef.current.facing;
        myVp.isMoving = isMoving;
        if (isMoving && myVp.action !== 'idle') {
          myVp.action = 'idle';
          setActiveAction('idle');
          plazaService.sendLocalAction('idle');
        }
        myVp.merits = myProfile.merits ?? 5;
        myVp.weapon = myProfile.weapon || null;
        myVp.defeatUntil = myProfile.defeatUntil || 0;

        myVp.walkCycle = walkCycle;
      }

      // Sync position to other players at 25Hz (every 40ms)
      if (time - lastNetworkSync > 40) {
        plazaService.sendLocalMove(
          localPosRef.current.x,
          localPosRef.current.y,
          localPosRef.current.vx,
          localPosRef.current.vy,
          localPosRef.current.facing,
          isMoving
        );
        lastNetworkSync = time;
      }

      // 2. Smooth Lerp for ALL Remote Players
      for (const [id, vp] of visualPlayersRef.current.entries()) {
        if (!vp.isLocal) {
          const distToTarget = Math.hypot(vp.targetX - vp.currentX, vp.targetY - vp.currentY);
          if (distToTarget > 0.6) {
            vp.currentX += (vp.targetX - vp.currentX) * 0.22;
            vp.currentY += (vp.targetY - vp.currentY) * 0.22;
            vp.walkCycle += dt * 8;
          } else {
            vp.currentX = vp.targetX;
            vp.currentY = vp.targetY;
            if (!vp.isMoving) vp.walkCycle = 0;
          }
        }
      }

      // 3. Update Camera Viewport (Smoothly follow local player)
      const targetCamX = localPosRef.current.x - canvas.width / 2;
      const targetCamY = localPosRef.current.y - canvas.height / 2;

      cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.09;
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.09;

      // Clamp camera within world bounds
      cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, cameraRef.current.x));
      cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, cameraRef.current.y));

      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;

      // 4. Render World
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply camera transformation!
      ctx.translate(-camX, -camY);

      // --- WORLD MAP BACKGROUND (3600 x 2200) ---
      // Ground Tile / Stone Floor with Organic Paving
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Natural Grass Field Carpets across Sanctuary
      const grassGrad = ctx.createRadialGradient(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 300, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 1750);
      grassGrad.addColorStop(0, '#292524');
      grassGrad.addColorStop(0.4, '#1e2820');
      grassGrad.addColorStop(0.8, '#171e18');
      grassGrad.addColorStop(1, '#141714');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Paved Stone Pathways connecting the 7 Zones
      ctx.strokeStyle = 'rgba(214, 211, 209, 0.16)';
      ctx.lineWidth = 44;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Path 1: Cổng Tam Quan (1800, 2050) <-> Tâm Quảng Trường (1800, 1200) <-> Đại Hùng Bảo Điện (1800, 360)
      ctx.beginPath();
      ctx.moveTo(1800, 2050);
      ctx.lineTo(1800, 360);
      ctx.stroke();

      // Path 2: Tâm Quảng Trường (1800, 1200) <-> Điện Quán Thế Âm (800, 550)
      ctx.beginPath();
      ctx.moveTo(1800, 1200);
      ctx.bezierCurveTo(1450, 1150, 1100, 850, 800, 550);
      ctx.stroke();

      // Path 3: Tâm Quảng Trường (1800, 1200) <-> Thiền Đường Trúc Lâm (2800, 550)
      ctx.beginPath();
      ctx.moveTo(1800, 1200);
      ctx.bezierCurveTo(2150, 1150, 2500, 850, 2800, 550);
      ctx.stroke();

      // Path 4: Tâm Quảng Trường (1800, 1200) <-> Hồ Sen Tịnh Tâm (900, 1500)
      ctx.beginPath();
      ctx.moveTo(1800, 1200);
      ctx.bezierCurveTo(1450, 1250, 1150, 1380, 900, 1500);
      ctx.stroke();

      // Path 5: Tâm Quảng Trường (1800, 1200) <-> Hồ Phóng Sinh Bát Nhã (2700, 1500)
      ctx.beginPath();
      ctx.moveTo(1800, 1200);
      ctx.bezierCurveTo(2150, 1250, 2450, 1380, 2700, 1500);
      ctx.stroke();

      // Path 6: Hồ Sen (900, 1500) <-> Cổng Tam Quan (1800, 2050)
      ctx.beginPath();
      ctx.moveTo(900, 1500);
      ctx.bezierCurveTo(1150, 1750, 1500, 1980, 1800, 2050);
      ctx.stroke();

      // Path 7: Hồ Phóng Sinh (2700, 1500) <-> Cổng Tam Quan (1800, 2050)
      ctx.beginPath();
      ctx.moveTo(2700, 1500);
      ctx.bezierCurveTo(2450, 1750, 2100, 1980, 1800, 2050);
      ctx.stroke();

      // Stone Path borders
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // --- ZONE 1: CỔNG TAM QUAN (1800, 2050) ---
      const gateX = 1800;
      const gateY = 2050;

      // Base Terrace
      ctx.fillStyle = '#292524';
      ctx.fillRect(gateX - 160, gateY - 20, 320, 40);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gateX - 160, gateY - 20, 320, 40);

      // Gate Columns (4 cột lim đỏ)
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(gateX - 130, gateY - 75, 16, 75);
      ctx.fillRect(gateX - 50, gateY - 95, 18, 95);
      ctx.fillRect(gateX + 32, gateY - 95, 18, 95);
      ctx.fillRect(gateX + 114, gateY - 75, 16, 75);

      // Gate Curved Roofs
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(gateX - 90, gateY - 95);
      ctx.quadraticCurveTo(gateX, gateY - 125, gateX + 90, gateY - 95);
      ctx.lineTo(gateX + 75, gateY - 85);
      ctx.quadraticCurveTo(gateX, gateY - 105, gateX - 75, gateY - 85);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gateX - 150, gateY - 75);
      ctx.quadraticCurveTo(gateX - 90, gateY - 95, gateX - 35, gateY - 75);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gateX + 35, gateY - 75);
      ctx.quadraticCurveTo(gateX + 90, gateY - 95, gateX + 150, gateY - 75);
      ctx.fill();
      ctx.stroke();

      // Signboard "CHÙA TÂM AN"
      ctx.fillStyle = '#78350f';
      ctx.fillRect(gateX - 60, gateY - 70, 120, 22);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(gateX - 60, gateY - 70, 120, 22);
      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText('CỔNG TAM QUAN', gateX, gateY - 54);

      // --- ZONE 2: ĐẠI HÙNG BẢO ĐIỆN (1800, 300) ---
      const templeX = 1800;
      const templeY = 300;

      // Temple Base Terrace
      ctx.fillStyle = '#292524';
      ctx.fillRect(templeX - 250, templeY - 70, 500, 150);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(templeX - 250, templeY - 70, 500, 150);

      // Entrance Stairs
      ctx.fillStyle = '#44403c';
      ctx.fillRect(templeX - 80, templeY + 80, 160, 40);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(templeX - 80, templeY + 80, 160, 40);

      // Red carpet
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(templeX - 35, templeY + 40, 70, 80);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(templeX - 35, templeY + 40, 70, 80);

      // Main Pagoda Wall & Red Pillars
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(templeX - 220, templeY - 60, 440, 130);
      ctx.fillStyle = '#991b1b';
      for (let px = -200; px <= 200; px += 80) {
        ctx.fillRect(templeX + px - 7, templeY - 60, 14, 130);
      }

      // Curved Pagoda Roof
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(templeX - 290, templeY - 55);
      ctx.quadraticCurveTo(templeX - 210, templeY - 95, templeX - 130, templeY - 110);
      ctx.lineTo(templeX, templeY - 125);
      ctx.lineTo(templeX + 130, templeY - 110);
      ctx.quadraticCurveTo(templeX + 210, templeY - 95, templeX + 290, templeY - 55);
      ctx.quadraticCurveTo(templeX, templeY - 80, templeX - 290, templeY - 55);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Spire
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(templeX, templeY - 150);
      ctx.lineTo(templeX - 14, templeY - 120);
      ctx.lineTo(templeX + 14, templeY - 120);
      ctx.closePath();
      ctx.fill();

      // Plaque
      ctx.fillStyle = '#78350f';
      ctx.fillRect(templeX - 95, templeY - 35, 190, 26);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(templeX - 95, templeY - 35, 190, 26);
      ctx.font = 'bold 12px serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText('ĐẠI HÙNG BẢO ĐIỆN', templeX, templeY - 17);

      // Entrance Doorway Marker
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(templeX - 26, templeY + 45, 52, 35);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(templeX - 26, templeY + 45, 52, 35);
      ctx.font = 'bold 9px system-ui';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('CHÁNH ĐIỆN', templeX, templeY + 66);

      // Incense Cauldron
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(templeX, templeY + 130, 28, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Smoke
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(templeX - 4, templeY + 120);
      ctx.bezierCurveTo(templeX - 16, templeY + 95, templeX + 12, templeY + 75, templeX - 2, templeY + 50);
      ctx.stroke();

      // --- ZONE 3: ĐIỆN QUÁN THẾ ÂM (800, 500) ---
      const quanAmX = 800;
      const quanAmY = 500;

      ctx.fillStyle = '#292524';
      ctx.fillRect(quanAmX - 150, quanAmY - 40, 300, 100);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(quanAmX - 150, quanAmY - 40, 300, 100);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(quanAmX - 180, quanAmY - 35);
      ctx.quadraticCurveTo(quanAmX, quanAmY - 75, quanAmX + 180, quanAmY - 35);
      ctx.quadraticCurveTo(quanAmX, quanAmY - 50, quanAmX - 180, quanAmY - 35);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(quanAmX - 75, quanAmY - 24, 150, 20);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(quanAmX - 75, quanAmY - 24, 150, 20);
      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('ĐIỆN QUÁN THẾ ÂM', quanAmX, quanAmY - 10);

      // White Marble Avalokiteshvara Statue
      const haloQAGrad = ctx.createRadialGradient(quanAmX, quanAmY - 110, 10, quanAmX, quanAmY - 110, 75);
      haloQAGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      haloQAGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = haloQAGrad;
      ctx.beginPath();
      ctx.arc(quanAmX, quanAmY - 110, 75, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(quanAmX, quanAmY - 70, 22, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(quanAmX, quanAmY - 115, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Doorway marker
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(quanAmX - 24, quanAmY + 35, 48, 25);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(quanAmX - 24, quanAmY + 35, 48, 25);
      ctx.font = 'bold 8px system-ui';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('CỬA ĐIỆN', quanAmX, quanAmY + 50);

      // --- ZONE 4: THIỀN ĐƯỜNG TRÚC LÂM (2800, 500) ---
      const thienX = 2800;
      const thienY = 500;

      ctx.fillStyle = '#292524';
      ctx.fillRect(thienX - 160, thienY - 40, 320, 100);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.strokeRect(thienX - 160, thienY - 40, 320, 100);

      ctx.fillStyle = '#451a03';
      ctx.fillRect(thienX - 140, thienY - 30, 280, 80);
      for (let bx = -130; bx <= 130; bx += 20) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(thienX + bx, thienY - 30, 4, 80);
      }

      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(thienX - 190, thienY - 35);
      ctx.quadraticCurveTo(thienX, thienY - 80, thienX + 190, thienY - 35);
      ctx.quadraticCurveTo(thienX, thienY - 50, thienX - 190, thienY - 35);
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#052e16';
      ctx.fillRect(thienX - 85, thienY - 24, 170, 20);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(thienX - 85, thienY - 24, 170, 20);
      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#86efac';
      ctx.fillText('THIỀN ĐƯỜNG TRÚC LÂM', thienX, thienY - 10);

      // Doorway marker
      ctx.fillStyle = '#052e16';
      ctx.fillRect(thienX - 24, thienY + 35, 48, 25);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(thienX - 24, thienY + 35, 48, 25);
      ctx.font = 'bold 8px system-ui';
      ctx.fillStyle = '#86efac';
      ctx.fillText('CỬA THIỀN', thienX, thienY + 50);

      // Bamboo stalks
      for (let b = -180; b <= 180; b += 35) {
        if (Math.abs(b) > 40) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(thienX + b, thienY + 90);
          ctx.lineTo(thienX + b + Math.sin(time * 0.002 + b) * 8, thienY - 90);
          ctx.stroke();
        }
      }

      // --- ZONE 5: HỒ SEN TỊNH TÂM (900, 1500) ---
      const pondX = 900;
      const pondY = 1500;

      ctx.fillStyle = 'rgba(12, 74, 110, 0.75)';
      ctx.beginPath();
      ctx.ellipse(pondX, pondY, 230, 150, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Floating Lotus Pads & Flowers
      const lotuses = [
        { x: pondX - 140, y: pondY - 20 },
        { x: pondX - 50, y: pondY - 80 },
        { x: pondX + 110, y: pondY - 40 },
        { x: pondX + 70, y: pondY + 80 },
        { x: pondX - 80, y: pondY + 60 },
      ];
      for (const l of lotuses) {
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 17, 0, Math.PI * 1.8);
        ctx.fill();
        ctx.font = '17px serif';
        ctx.fillText('🪷', l.x - 7, l.y + 6);
      }

      // Red Arched Bridge across Lotus Pond
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 28;
      ctx.beginPath();
      ctx.moveTo(pondX - 100, pondY + 90);
      ctx.quadraticCurveTo(pondX, pondY - 30, pondX + 100, pondY - 80);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pondX - 100, pondY + 76);
      ctx.quadraticCurveTo(pondX, pondY - 44, pondX + 100, pondY - 94);
      ctx.stroke();

      ctx.font = 'bold 12px serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('HỒ SEN TỊNH TÂM 🪷', pondX, pondY + 175);

      // --- ZONE 6: HỒ PHÓNG SINH BÁT NHÃ (2700, 1500) ---
      const lakeX = 2700;
      const lakeY = 1500;

      ctx.fillStyle = 'rgba(8, 47, 73, 0.8)';
      ctx.beginPath();
      ctx.ellipse(lakeX, lakeY, 250, 160, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Wooden Pier Dock (Bến Gỗ Phóng Sinh)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(lakeX - 160, lakeY - 25, 90, 50);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(lakeX - 160, lakeY - 25, 90, 50);

      for (let pl = -150; pl < -75; pl += 14) {
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lakeX + pl, lakeY - 25);
        ctx.lineTo(lakeX + pl, lakeY + 25);
        ctx.stroke();
      }

      // Floating Lanterns
      const lanternsFloating = [
        { x: lakeX + 40, y: lakeY - 50 },
        { x: lakeX + 110, y: lakeY + 20 },
        { x: lakeX - 20, y: lakeY + 70 },
      ];
      for (const lf of lanternsFloating) {
        const bobL = Math.sin(time * 0.003 + lf.x) * 3;
        ctx.font = '16px serif';
        ctx.fillText('🕯️', lf.x, lf.y + bobL);
      }

      ctx.font = 'bold 12px serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('HỒ PHÓNG SINH BÁT NHÃ 🐟', lakeX, lakeY + 185);

      // --- SIMULATE & DRAW SWIMMING FISH IN BOTH LAKES ---
      for (const fish of activeFishesRef.current) {
        const lake = LAKES.find((l) => l.id === fish.lakeId) || LAKES[0];
        fish.x += fish.vx;
        fish.y += fish.vy;
        fish.tailPhase += dt * 10;

        // Keep inside lake elliptical bounds
        const fdx = fish.x - lake.x;
        const fdy = fish.y - lake.y;
        const normDist = (fdx * fdx) / ((lake.radiusX - 30) * (lake.radiusX - 30)) + (fdy * fdy) / ((lake.radiusY - 25) * (lake.radiusY - 25));
        if (normDist > 1) {
          fish.vx -= (fdx / lake.radiusX) * 0.12;
          fish.vy -= (fdy / lake.radiusY) * 0.12;
        }

        fish.angle = Math.atan2(fish.vy, fish.vx);

        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);

        // Fish Shadow
        ctx.fillStyle = 'rgba(0, 20, 30, 0.35)';
        ctx.beginPath();
        ctx.ellipse(-2, 3, fish.size, fish.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fish Body
        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.moveTo(fish.size, 0);
        ctx.quadraticCurveTo(0, fish.size * 0.55, -fish.size * 0.7, 0);
        ctx.quadraticCurveTo(0, -fish.size * 0.55, fish.size, 0);
        ctx.fill();

        // Wagging Tail
        const tailWag = Math.sin(fish.tailPhase) * (fish.size * 0.45);
        ctx.beginPath();
        ctx.moveTo(-fish.size * 0.7, 0);
        ctx.lineTo(-fish.size * 1.5, tailWag - fish.size * 0.35);
        ctx.lineTo(-fish.size * 1.25, tailWag);
        ctx.lineTo(-fish.size * 1.5, tailWag + fish.size * 0.35);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.55, -fish.size * 0.18, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(fish.size * 0.6, -fish.size * 0.18, 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Splash Ripples from newly released fish
      for (let i = splashRipplesRef.current.length - 1; i >= 0; i--) {
        const sr = splashRipplesRef.current[i];
        sr.radius += 1.8;
        sr.alpha -= 0.025;
        if (sr.alpha <= 0 || sr.radius >= sr.maxRadius) {
          splashRipplesRef.current.splice(i, 1);
        } else {
          ctx.strokeStyle = `rgba(56, 189, 248, ${sr.alpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(sr.x, sr.y, sr.radius * 1.4, sr.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // --- ZONE 7: TÂM QUẢNG TRƯỜNG: CÂY BỒ ĐỀ CỔ THỤ & BẢO THÁP (1800, 1200) ---
      const treeX = 1740;
      const treeY = 1200;
      const stupaX = 1870;
      const stupaY = 1180;

      // Courtyard circle
      ctx.fillStyle = 'rgba(120, 53, 15, 0.25)';
      ctx.beginPath();
      ctx.ellipse(1800, 1200, 180, 110, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Bodhi Tree Canopy
      ctx.fillStyle = 'rgba(20, 83, 45, 0.88)';
      ctx.beginPath();
      ctx.arc(treeX, treeY - 60, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(22, 101, 52, 0.9)';
      ctx.beginPath();
      ctx.arc(treeX - 40, treeY - 80, 65, 0, Math.PI * 2);
      ctx.arc(treeX + 40, treeY - 80, 65, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(treeX - 25, treeY + 35);
      ctx.quadraticCurveTo(treeX - 35, treeY - 30, treeX, treeY - 50);
      ctx.quadraticCurveTo(treeX + 35, treeY - 30, treeX + 25, treeY + 35);
      ctx.closePath();
      ctx.fill();

      // Dynamic Swaying Bodhi Wish Ribbons
      const allWishes = plazaService.getBodhiWishes();
      const branchOffsets = [
        { dx: -45, dy: -40, len: 42 },
        { dx: -25, dy: -60, len: 55 },
        { dx: -5, dy: -65, len: 48 },
        { dx: 25, dy: -55, len: 52 },
        { dx: 45, dy: -35, len: 40 },
        { dx: -60, dy: -25, len: 38 },
        { dx: -35, dy: -15, len: 45 },
        { dx: 15, dy: -20, len: 46 },
        { dx: 40, dy: -15, len: 42 },
        { dx: 60, dy: -25, len: 36 },
        { dx: -15, dy: -75, len: 60 },
        { dx: 10, dy: -70, len: 58 },
        { dx: -50, dy: -50, len: 44 },
        { dx: 30, dy: -45, len: 48 },
        { dx: -20, dy: -30, len: 50 },
        { dx: 20, dy: -35, len: 46 },
      ];

      const wishesToDraw = allWishes.length > 0 ? allWishes.slice(0, 16) : [
        { id: 'def1', color: 'red', branchIndex: 0 } as any,
        { id: 'def2', color: 'yellow', branchIndex: 3 } as any,
        { id: 'def3', color: 'blue', branchIndex: 7 } as any,
        { id: 'def4', color: 'pink', branchIndex: 11 } as any,
      ];

      wishesToDraw.forEach((w, idx) => {
        const branch = branchOffsets[idx % branchOffsets.length];
        const bx = treeX + branch.dx;
        const by = treeY + branch.dy;
        const swing = Math.sin(time * 0.002 + (w.branchIndex ?? idx) * 0.8) * 8;

        const ribbonColor =
          w.color === 'red' ? '#ef4444' :
          w.color === 'blue' ? '#06b6d4' :
          w.color === 'pink' ? '#ec4899' :
          w.color === 'purple' ? '#8b5cf6' : '#f59e0b';

        ctx.strokeStyle = ribbonColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + swing * 0.6, by + branch.len * 0.5, bx + swing, by + branch.len);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(bx + swing, by + branch.len + 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 7-Tier Ancient Stone Stupa Pagoda
      ctx.fillStyle = '#44403c';
      for (let tier = 0; tier < 7; tier++) {
        const ty = stupaY + 25 - tier * 16;
        const tw = 50 - tier * 6;
        ctx.fillRect(stupaX - tw / 2, ty, tw, 12);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(stupaX - (tw + 10) / 2, ty - 3, tw + 10, 4);
        ctx.fillStyle = '#44403c';
      }
      // Spire
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(stupaX, stupaY - 105);
      ctx.lineTo(stupaX - 6, stupaY - 85);
      ctx.lineTo(stupaX + 6, stupaY - 85);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#86efac';
      ctx.fillText('BỒ ĐỀ CỔ THỤ & BẢO THÁP', 1800, 1265);

      // Nature Elements: Bushes & Stone Lanterns
      const bushes = [
        { x: 1650, y: 1950, r: 24 },
        { x: 1950, y: 1950, r: 24 },
        { x: 1650, y: 550, r: 28 },
        { x: 1950, y: 550, r: 28 },
        { x: 1200, y: 950, r: 26 },
        { x: 2400, y: 950, r: 26 },
        { x: 1350, y: 1650, r: 25 },
        { x: 2250, y: 1650, r: 25 },
      ];
      for (const b of bushes) {
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.arc(b.x - 12, b.y + 4, b.r * 0.75, 0, Math.PI * 2);
        ctx.arc(b.x + 12, b.y + 4, b.r * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(b.x - 6, b.y - 6, 2.5, 0, Math.PI * 2);
        ctx.arc(b.x + 8, b.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stone Lanterns
      const lanterns = [
        { x: 1720, y: 1850 },
        { x: 1880, y: 1850 },
        { x: 1720, y: 650 },
        { x: 1880, y: 650 },
        { x: 1250, y: 1200 },
        { x: 2350, y: 1200 },
      ];
      for (const lt of lanterns) {
        ctx.fillStyle = '#44403c';
        ctx.fillRect(lt.x - 6, lt.y - 12, 12, 16);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(lt.x - 5, lt.y - 20, 10, 8);
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(lt.x - 10, lt.y - 20);
        ctx.lineTo(lt.x, lt.y - 26);
        ctx.lineTo(lt.x + 10, lt.y - 20);
        ctx.closePath();
        ctx.fill();

        const glow = ctx.createRadialGradient(lt.x, lt.y - 16, 2, lt.x, lt.y - 16, 26);
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lt.x, lt.y - 16, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Falling Blossom Petals in the breeze
      for (const petal of petalsRef.current) {
        petal.x += petal.vx;
        petal.y += petal.vy;
        petal.rot += petal.rotSpeed;

        if (petal.x > WORLD_WIDTH) petal.x = 0;
        if (petal.y > WORLD_HEIGHT) petal.y = 0;

        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rot);
        ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size, petal.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Click Target Ripples in World Coords
      for (let i = clickRipplesRef.current.length - 1; i >= 0; i--) {
        const r = clickRipplesRef.current[i];
        r.radius += 2.2;
        r.alpha -= 0.035;

        if (r.alpha <= 0) {
          clickRipplesRef.current.splice(i, 1);
        } else {
          ctx.strokeStyle = `rgba(245, 158, 11, ${r.alpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, r.radius * 1.4, r.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // --- 4.5. DRAW SCATTERED MERIT ORBS & WEAPON ITEMS IN WORLD COORDINATES ---
      for (const orb of visualOrbsRef.current.values()) {
        const bob = Math.sin(time * 0.005 + orb.x * 0.01) * 4.5;
        const orbY = orb.y + bob;
        const isWeapon = orb.type === 'gun' || orb.type === 'hammer' || orb.type === 'knife';

        if (isWeapon) {
          // Ominous red/crimson gradient aura for cursed weapons
          const orbGrad = ctx.createRadialGradient(orb.x, orbY, 2, orb.x, orbY, 28);
          orbGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
          orbGrad.addColorStop(0.4, 'rgba(185, 28, 28, 0.45)');
          orbGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(orb.x, orbY, 28, 0, Math.PI * 2);
          ctx.fill();

          // Pulsing warning spikes / ring
          ctx.save();
          ctx.translate(orb.x, orbY);
          ctx.rotate(-time * 0.003);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Icon: 🔫 Súng | 🔨 Búa | 🔪 Dao
          ctx.font = '19px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = orb.type === 'gun' ? '🔫' : orb.type === 'hammer' ? '🔨' : '🔪';
          ctx.fillText(icon, orb.x, orbY);

          // Penalty badge (-10, -5, -3) in red
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#fca5a5';
          ctx.fillText(`${orb.value}`, orb.x + 13, orbY - 10);
        } else {
          // Glowing radial aura
          const orbGrad = ctx.createRadialGradient(orb.x, orbY, 2, orb.x, orbY, 26);
          orbGrad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
          orbGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.4)');
          orbGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(orb.x, orbY, 26, 0, Math.PI * 2);
          ctx.fill();

          // Pulsing border ring
          ctx.save();
          ctx.translate(orb.x, orbY);
          ctx.rotate(time * 0.002);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Icon
          ctx.font = orb.type === 'lotus' ? '18px serif' : '15px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = orb.type === 'lotus' ? '🪷' : orb.type === 'sparkle' ? '✨' : '🌟';
          ctx.fillText(icon, orb.x, orbY);

          if (orb.value > 1) {
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#fef08a';
            ctx.fillText(`+${orb.value}`, orb.x + 13, orbY - 10);
          }
        }
      }

      // Draw Combat Clash Shockwaves
      for (let i = clashEffectsRef.current.length - 1; i >= 0; i--) {
        const ce = clashEffectsRef.current[i];
        ce.radius += 3.2;
        ce.alpha -= 0.035;
        if (ce.alpha <= 0 || ce.radius >= ce.maxRadius) {
          clashEffectsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.strokeStyle = `rgba(245, 158, 11, ${ce.alpha})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(ce.x, ce.y, ce.radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(239, 68, 68, ${ce.alpha * 0.8})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ce.x, ce.y, ce.radius * 0.65, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Floating Text Particles (+Công Đức)
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 1.1;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = ft.alpha;
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillStyle = ft.color;
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }

      // --- 5. DRAW ALL STICKMEN & GROUP MEDITATION RESONANCE IN WORLD COORDINATES ---
      const renderList = Array.from(visualPlayersRef.current.values());
      renderList.sort((a, b) => a.currentY - b.currentY);

      // --- GROUP MEDITATION RESONANCE MANDALAS ---
      const meditators = renderList.filter((p) => p.action === 'sit' || p.action === 'pray');
      const visitedMed = new Set<string>();
      const clusters: VisualEntity[][] = [];

      for (let i = 0; i < meditators.length; i++) {
        const pA = meditators[i];
        if (visitedMed.has(pA.id)) continue;
        const currentCluster = [pA];
        visitedMed.add(pA.id);

        for (let j = i + 1; j < meditators.length; j++) {
          const pB = meditators[j];
          if (visitedMed.has(pB.id)) continue;
          const dist = Math.hypot(pA.currentX - pB.currentX, pA.currentY - pB.currentY);
          if (dist <= 160) {
            currentCluster.push(pB);
            visitedMed.add(pB.id);
          }
        }
        if (currentCluster.length >= 2) {
          clusters.push(currentCluster);
        }
      }

      for (const cluster of clusters) {
        const count = cluster.length;
        const avgX = cluster.reduce((sum, p) => sum + p.currentX, 0) / count;
        const avgY = cluster.reduce((sum, p) => sum + p.currentY, 0) / count;
        let maxR = 60;
        for (const p of cluster) {
          const d = Math.hypot(p.currentX - avgX, p.currentY - avgY);
          if (d > maxR) maxR = d;
        }
        const mandalaR = maxR + 50;

        // Radial glowing aura
        const mPulse = Math.sin(time * 0.003) * 6;
        const mGrad = ctx.createRadialGradient(avgX, avgY, 10, avgX, avgY, mandalaR + mPulse);
        mGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
        mGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
        mGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(avgX, avgY, mandalaR + mPulse, 0, Math.PI * 2);
        ctx.fill();

        // Rotating sacred Mandala circles & lotus petal ring
        ctx.save();
        ctx.translate(avgX, avgY);
        ctx.rotate(time * 0.0006);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, mandalaR * 0.85, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        const petals = count >= 4 ? 12 : 8;
        for (let a = 0; a < Math.PI * 2; a += 0.05) {
          const r = mandalaR * 0.65 + Math.sin(a * petals) * 14;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Golden resonance threads linking meditators
        for (let i = 0; i < cluster.length; i++) {
          for (let j = i + 1; j < cluster.length; j++) {
            const p1 = cluster[i];
            const p2 = cluster[j];
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p1.currentX, p1.currentY);
            ctx.quadraticCurveTo(avgX, avgY, p2.currentX, p2.currentY);
            ctx.stroke();
          }
        }
      }

      for (const p of renderList) {
        const px = p.currentX;
        const py = p.currentY;
        const pFacing = p.facing;
        const pMoving = p.isMoving || Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1;
        const pAction = p.action;
        const currentWalk = p.walkCycle;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + 2, 17, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Karma Shadow Mist if player has negative merits!
        const meritVal = p.merits ?? 0;
        if (meritVal < 0) {
          ctx.fillStyle = 'rgba(24, 18, 22, 0.45)';
          for (let m = 0; m < 3; m++) {
            const mx = px + Math.sin(time * 0.004 + m * 2) * 12;
            const my = py - 6 - ((time * 0.025 + m * 7) % 20);
            ctx.beginPath();
            ctx.arc(mx, my, 5 + m * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Aura Glow if praying or meditating
        if (pAction === 'pray' || pAction === 'sit') {
          const auraPulse = Math.sin(time * 0.005) * 5;
          const auraGrad = ctx.createRadialGradient(px, py - 30, 6, px, py - 30, 48 + auraPulse);
          auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
          auraGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.2)');
          auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(px, py - 30, 48 + auraPulse, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stickman Skeleton Line
        ctx.strokeStyle = p.color || '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const headY = py - 48;
        const neckY = py - 34;
        const pelvisY = py - 18;

        if (pAction === 'sit') {
          // Sitting pose
          ctx.beginPath();
          ctx.moveTo(px, neckY + 8);
          ctx.lineTo(px, pelvisY + 4);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px - 14, pelvisY + 10);
          ctx.lineTo(px, pelvisY + 12);
          ctx.lineTo(px + 14, pelvisY + 10);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px, neckY + 12);
          ctx.lineTo(px - 12, pelvisY + 2);
          ctx.lineTo(px - 10, pelvisY + 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px, neckY + 12);
          ctx.lineTo(px + 12, pelvisY + 2);
          ctx.lineTo(px + 10, pelvisY + 8);
          ctx.stroke();
        } else if (pAction === 'bow') {
          // Bowing pose
          ctx.beginPath();
          ctx.moveTo(px, neckY);
          ctx.lineTo(px + pFacing * 14, py - 12);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px, neckY + 4);
          ctx.lineTo(px + pFacing * 22, py - 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px - pFacing * 6, pelvisY);
          ctx.lineTo(px - pFacing * 10, py);
          ctx.stroke();
        } else {
          // Standing or Walking pose
          ctx.beginPath();
          ctx.moveTo(px, neckY);
          ctx.lineTo(px, pelvisY);
          ctx.stroke();

          const legPhase = pMoving ? Math.sin(currentWalk) * 12 : 0;
          ctx.beginPath();
          ctx.moveTo(px, pelvisY);
          ctx.lineTo(px + legPhase * pFacing, py);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px, pelvisY);
          ctx.lineTo(px - legPhase * pFacing, py);
          ctx.stroke();

          if (pAction === 'pray') {
            ctx.beginPath();
            ctx.moveTo(px, neckY + 4);
            ctx.lineTo(px + pFacing * 9, neckY + 10);
            ctx.lineTo(px + pFacing * 7, neckY + 6);
            ctx.stroke();

            ctx.font = '12px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🪷', px + pFacing * 9, neckY + 8);
          } else if (pAction === 'tap_fish') {
            const tapAngle = Math.sin(time * 0.015) * 6;
            ctx.beginPath();
            ctx.moveTo(px, neckY + 4);
            ctx.lineTo(px + pFacing * 12, neckY + 10);
            ctx.stroke();
            ctx.fillText('🪵', px + pFacing * 14, neckY + 14);

            ctx.beginPath();
            ctx.moveTo(px, neckY + 4);
            ctx.lineTo(px + pFacing * 10, neckY + 6 + tapAngle);
            ctx.stroke();
          } else {
            const armPhase = pMoving ? Math.sin(currentWalk) * 10 : 0;
            ctx.beginPath();
            ctx.moveTo(px, neckY + 4);
            ctx.lineTo(px - armPhase * pFacing, neckY + 16);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, neckY + 4);
            ctx.lineTo(px + armPhase * pFacing, neckY + 16);
            ctx.stroke();

            // Draw held weapon if player has picked one up (súng, búa, dao)
            if (p.weapon) {
              const weaponIcon = p.weapon === 'gun' ? '🔫' : p.weapon === 'hammer' ? '🔨' : '🔪';
              ctx.save();
              ctx.font = '16px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(weaponIcon, px + armPhase * pFacing + pFacing * 10, neckY + 18);
              ctx.restore();
            }
          }
        }

        // Stickman Head & Custom Avatar
        const headRadius = 13;
        const currentHeadY = pAction === 'sit' ? headY + 8 : pAction === 'bow' ? py - 20 : headY;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, currentHeadY, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1c1917';
        ctx.fill();
        ctx.strokeStyle = p.color || '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.clip();

        if (p.avatar && p.avatar.startsWith('data:image')) {
          let img = imageCacheRef.current.get(p.avatar);
          if (!img) {
            img = new Image();
            img.src = p.avatar;
            imageCacheRef.current.set(p.avatar, img);
          }
          if (img.complete) {
            ctx.drawImage(img, px - headRadius, currentHeadY - headRadius, headRadius * 2, headRadius * 2);
          }
        } else {
          ctx.font = '14px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.avatar || '🪷', px, currentHeadY);
        }
        ctx.restore();

        // Hat
        if (p.hat === 'non_la') {
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.moveTo(px, currentHeadY - headRadius - 8);
          ctx.lineTo(px - 16, currentHeadY - headRadius + 3);
          ctx.lineTo(px + 16, currentHeadY - headRadius + 3);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.hat === 'halo') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px, currentHeadY - headRadius - 4, 12, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.hat === 'lotus') {
          ctx.font = '14px serif';
          ctx.textAlign = 'center';
          ctx.fillText('🪷', px, currentHeadY - headRadius - 2);
        }

        // SOCIAL STATUS VISUAL AURA (Dâng trà sen / Tặng hoa sen)
        if (p.socialStatus && p.socialStatus.expiresAt > Date.now()) {
          if (p.socialStatus.type === 'offer_tea') {
            ctx.save();
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🍵', px + pFacing * 14, currentHeadY - 14);

            // Gentle green steam
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const steamY = currentHeadY - 22 - ((time * 0.02) % 15);
            ctx.moveTo(px + pFacing * 14, currentHeadY - 16);
            ctx.quadraticCurveTo(px + pFacing * 14 + Math.sin(time * 0.005) * 4, steamY, px + pFacing * 14, steamY - 6);
            ctx.stroke();
            ctx.restore();
          } else if (p.socialStatus.type === 'gift_lotus') {
            ctx.save();
            ctx.translate(px, currentHeadY - headRadius - 16);
            ctx.rotate(time * 0.002);
            ctx.font = '18px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🪷', 0, 0);

            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // --- BẢNG TÊN & CÔNG ĐỨC DƯỚI CHÂN NHÂN VẬT (Foot Nameplate & Merits) ---
        const feetTagY = py + 14;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tagText = p.isLocal ? `⭐ Bạn (${p.name})` : p.name;
        const textMetrics = ctx.measureText(tagText);
        const tagW = textMetrics.width + 14;
        const tagH = 17;

        // Pill nền mờ dưới chân
        ctx.fillStyle = p.isLocal ? 'rgba(245, 158, 11, 0.95)' : 'rgba(28, 25, 23, 0.85)';
        ctx.beginPath();
        ctx.roundRect(px - tagW / 2, feetTagY - tagH / 2, tagW, tagH, 8);
        ctx.fill();
        ctx.strokeStyle = p.isLocal ? '#fbbf24' : 'rgba(120, 113, 108, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = p.isLocal ? '#1c1917' : '#f5f5f4';
        ctx.fillText(tagText, px, feetTagY);

        // MERIT BADGE & WEAPON DƯỚI BẢNG TÊN:
        const meritLineY = feetTagY + 16;
        const weaponIcon = p.weapon === 'gun' ? ' 🔫' : p.weapon === 'hammer' ? ' 🔨' : p.weapon === 'knife' ? ' 🔪' : '';
        const statStr = meritVal < 0 ? `⚠️${meritVal}${weaponIcon}` : `✨${meritVal}${weaponIcon}`;
        ctx.font = 'bold 10px monospace';
        const mMetrics = ctx.measureText(statStr);
        const mW = mMetrics.width + 12;
        const mH = 15;

        ctx.fillStyle = meritVal < 0 ? 'rgba(45, 10, 10, 0.92)' : 'rgba(15, 12, 10, 0.88)';
        ctx.beginPath();
        ctx.roundRect(px - mW / 2, meritLineY - mH / 2, mW, mH, 7);
        ctx.fill();
        ctx.strokeStyle = meritVal < 0 ? '#ef4444' : p.weapon ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = meritVal < 0 ? '#fca5a5' : p.weapon ? '#fca5a5' : '#fef08a';
        ctx.fillText(statStr, px, meritLineY);

        // FUNNY KARMIC TITLE IF MERITS < 0 (DƯỚI DÒNG ĐIỂM):
        if (meritVal < 0) {
          const karmicTitle =
            meritVal >= -10
              ? '[😅 Nợ Nghiệp Quấn Thân]'
              : meritVal >= -30
              ? '[😈 Nghịch Tử Cửa Phật]'
              : '[💀 Chúa Chổm Công Đức]';
          const titleColor =
            meritVal >= -10 ? '#fb923c' : meritVal >= -30 ? '#f43f5e' : '#dc2626';

          const karmicTitleY = meritLineY + 14;
          ctx.font = 'bold 9px system-ui';
          ctx.fillStyle = titleColor;
          ctx.fillText(karmicTitle, px, karmicTitleY);
        }

        // --- BONG BÓNG CHAT & BẠI TRẬN TRÊN ĐẦU NHÂN VẬT ---
        const headTopY = currentHeadY - headRadius - (p.hat !== 'none' ? 16 : 8);

        // RESULT SPEECH BUBBLE FOR DEFEATED PLAYER:
        const isDefeated = p.defeatUntil && p.defeatUntil > Date.now();
        if (isDefeated) {
          const remainSec = Math.max(1, Math.ceil((p.defeatUntil! - Date.now()) / 1000));
          const defeatText = `💀 BẠI TRẬN (-5) [${remainSec}s]`;

          ctx.font = 'bold 11px system-ui, sans-serif';
          const dtMetrics = ctx.measureText(defeatText);
          const bubbleW = dtMetrics.width + 20;
          const bubbleH = 26;
          const bubbleY = headTopY - 14;

          ctx.save();
          // Dark ominous defeat bubble with pulsing red border
          const pulse = Math.sin(time * 0.008) * 0.2 + 0.8;
          ctx.fillStyle = 'rgba(38, 10, 10, 0.95)';
          ctx.beginPath();
          ctx.roundRect(px - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 12);
          ctx.fill();
          ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Bubble pointer pointing down to stickman head
          ctx.beginPath();
          ctx.moveTo(px - 5, bubbleY + bubbleH / 2);
          ctx.lineTo(px, bubbleY + bubbleH / 2 + 6);
          ctx.lineTo(px + 5, bubbleY + bubbleH / 2);
          ctx.fillStyle = 'rgba(38, 10, 10, 0.95)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.stroke();

          ctx.fillStyle = '#fca5a5';
          ctx.fillText(defeatText, px, bubbleY);
          ctx.restore();
        } else if (p.chatText && p.chatTime && Date.now() - p.chatTime < 5500) {
          // Regular speech bubble only if player is not defeated
          const age = Date.now() - p.chatTime;
          const bubbleAlpha = age > 4600 ? (5500 - age) / 900 : 1;

          ctx.font = '12px serif';
          const chatMetrics = ctx.measureText(p.chatText);
          const bubbleW = chatMetrics.width + 18;
          const bubbleH = 26;
          const bubbleY = headTopY - 14;

          ctx.save();
          // Dark ominous defeat bubble with pulsing red border
          const pulse = Math.sin(time * 0.008) * 0.2 + 0.8;
          ctx.fillStyle = 'rgba(38, 10, 10, 0.95)';
          ctx.beginPath();
          ctx.roundRect(px - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 12);
          ctx.fill();
          ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Bubble pointer pointing down to stickman head
          ctx.beginPath();
          ctx.moveTo(px - 5, bubbleY + bubbleH / 2);
          ctx.lineTo(px, bubbleY + bubbleH / 2 + 6);
          ctx.lineTo(px + 5, bubbleY + bubbleH / 2);
          ctx.fillStyle = 'rgba(38, 10, 10, 0.95)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.stroke();

          ctx.fillStyle = '#fca5a5';
          ctx.fillText(defeatText, px, bubbleY);
          ctx.restore();
        } else if (p.chatText && p.chatTime && Date.now() - p.chatTime < 5500) {
          // Regular speech bubble only if player is not defeated
          const age = Date.now() - p.chatTime;
          const bubbleAlpha = age > 4600 ? (5500 - age) / 900 : 1;

          ctx.font = '12px serif';
          const chatMetrics = ctx.measureText(p.chatText);
          const bubbleW = chatMetrics.width + 18;
          const bubbleH = 26;
          const bubbleY = tagY - 24;

          ctx.save();
          ctx.globalAlpha = bubbleAlpha;

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(px - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 13);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px - 4, bubbleY + bubbleH / 2);
          ctx.lineTo(px, bubbleY + bubbleH / 2 + 5);
          ctx.lineTo(px + 4, bubbleY + bubbleH / 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.fillStyle = '#1c1917';
          ctx.fillText(p.chatText, px, bubbleY);
          ctx.restore();
        }
      }


      ctx.restore(); // Restore camera translation

      // --- 6. DRAW HUD: MINIMAP RADAR IN TOP-LEFT CORNER (SCALED FOR 3600 x 2200) ---
      const mapW = 160;
      const mapH = 98;
      const mapX = 14;
      const mapY = 14;

      // Minimap background
      ctx.fillStyle = 'rgba(28, 25, 23, 0.88)';
      ctx.beginPath();
      ctx.roundRect(mapX, mapY, mapW, mapH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const scaleMiniX = mapW / WORLD_WIDTH;
      const scaleMiniY = mapH / WORLD_HEIGHT;

      // Tam Quan Gate
      ctx.fillStyle = '#78350f';
      ctx.fillRect(mapX + (gateX - 50) * scaleMiniX, mapY + (gateY - 10) * scaleMiniY, 100 * scaleMiniX, 20 * scaleMiniY);

      // Dai Hung Temple
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(mapX + (templeX - 90) * scaleMiniX, mapY + (templeY - 40) * scaleMiniY, 180 * scaleMiniX, 80 * scaleMiniY);

      // Quan Am Shrine
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(mapX + quanAmX * scaleMiniX, mapY + quanAmY * scaleMiniY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Thien Duong
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(mapX + thienX * scaleMiniX, mapY + thienY * scaleMiniY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Lotus Pond
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.ellipse(mapX + pondX * scaleMiniX, mapY + pondY * scaleMiniY, 230 * scaleMiniX, 150 * scaleMiniY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Liberation Pond
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(mapX + lakeX * scaleMiniX, mapY + lakeY * scaleMiniY, 250 * scaleMiniX, 160 * scaleMiniY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bodhi tree & Stupa
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(mapX + 1800 * scaleMiniX, mapY + 1200 * scaleMiniY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Viewport Camera Rect on minimap
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mapX + camX * scaleMiniX, mapY + camY * scaleMiniY, canvas.width * scaleMiniX, canvas.height * scaleMiniY);

      // Draw Merit Orbs as tiny gold specks & Weapons as red specks on minimap
      for (const orb of visualOrbsRef.current.values()) {
        const isWeapon = orb.type === 'gun' || orb.type === 'hammer' || orb.type === 'knife';
        ctx.fillStyle = isWeapon ? '#ef4444' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(mapX + orb.x * scaleMiniX, mapY + orb.y * scaleMiniY, isWeapon ? 2 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dots for all players on minimap
      for (const p of renderList) {
        ctx.fillStyle = p.isLocal ? '#facc15' : (p.color || '#38bdf8');
        ctx.beginPath();
        ctx.arc(mapX + p.currentX * scaleMiniX, mapY + p.currentY * scaleMiniY, p.isLocal ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = '9px system-ui';
      ctx.fillStyle = '#a8a29e';
      ctx.textAlign = 'left';
      ctx.fillText('Đại Bản Đồ Tu Viện', mapX + 6, mapY + mapH - 5);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="relative flex flex-col items-center w-full max-w-6xl mx-auto select-none animate-in fade-in zoom-in-95 duration-200">
      {/* 1. Header Navigation & Online Count Badge */}
      <div className="w-full flex items-center justify-between gap-3 px-5 py-2.5 rounded-2xl bg-stone-900/80 border border-amber-500/30 backdrop-blur-md shadow-2xl mb-3">
        {/* Left: Plaza Info */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-serif text-amber-200 tracking-wide flex items-center gap-2">
              <span>Đại Tu Viện Tịnh Tâm</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-normal">
                {currentScene === 'temple_interior' ? `Nội Điện: ${activeTemple?.name}` : 'Bản đồ mở rộng 3600x2200'}
              </span>
            </h2>
            <p className="text-[10px] text-stone-400">
              Chiêm Bái 3 Đại Điện • Phóng Sinh Phước Lành • Nhặt Công Đức (🪷 ✨ 🌟) • Cẩn Thận Hung Khí (🔫 🔨 🔪)
            </p>
          </div>
        </div>

        {/* Right: Live Peers Count, Merits Counter, Weapon Badge & Profile Button */}
        <div className="flex items-center gap-2">
          {/* Total Looted Merits Counter (Shows red warning if negative) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs shadow-inner ${
              localMerits < 0
                ? 'bg-red-950/60 border-red-500/70 text-red-300 animate-pulse'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
            title={localMerits < 0 ? 'Bạn đang bị ÂM công đức do nhặt hung khí hoặc thua cuộc!' : 'Số công đức bạn đã tích lũy'}
          >
            {localMerits < 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            <span className="text-[11px] opacity-80 hidden sm:inline">Công Đức:</span>
            <span className={`font-mono font-bold text-sm ${localMerits < 0 ? 'text-red-400' : 'text-amber-300'}`}>
              {localMerits}
            </span>
            {localMerits < 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-800/60 text-red-200 font-bold hidden md:inline">
                (Nợ Nghiệp)
              </span>
            )}
          </div>

          {/* Current Weapon (if holding weapon) */}
          {profile.weapon && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/40 text-xs shadow-inner text-red-300 animate-pulse"
              title={`Đang cầm hung khí (${profile.weapon === 'gun' ? 'Súng' : profile.weapon === 'hammer' ? 'Búa' : 'Dao'})! Nhặt đã bị trừ công đức!`}
            >
              <span className="text-sm">
                {profile.weapon === 'gun' ? '🔫 Súng' : profile.weapon === 'hammer' ? '🔨 Búa' : '🔪 Dao'}
              </span>
              <span className="text-[10px] text-red-400 font-bold hidden sm:inline">(Trừ Điểm)</span>
            </div>
          )}

          {/* Leaderboard Button */}
          <button
            onClick={() => setShowLeaderboardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-md active:scale-95 transition-all"
            title="Xem Bảng Xếp Hạng Công Đức của tất cả đạo hữu"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Bảng Xếp Hạng</span>
          </button>

          {/* Online count pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-800/80 border border-stone-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-mono text-stone-300 font-semibold">{onlineCount}</span>
            <span className="text-[11px] text-stone-400 hidden sm:inline">Đạo Hữu Online</span>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => {
              setEditName(profile.name);
              setEditAvatar(profile.avatar);
              setEditColor(profile.color);
              setEditHat(profile.hat);
              setShowProfileModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            title="Đổi tên và hình ảnh nhân vật của bạn"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Tùy Chỉnh Nhân Vật</span>
          </button>
        </div>
      </div>

      {/* 2. Main Interactive 2D Canvas Stage */}
      <div
        ref={containerRef}
        className="relative w-full h-[500px] sm:h-[560px] lg:h-[620px] rounded-3xl overflow-hidden border border-amber-500/30 bg-stone-950 shadow-2xl cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          width={1100}
          height={620}
          onClick={handleCanvasClick}
          className="w-full h-full block"
          title="Nhấp chuột trên đất để di chuyển. Tiến lại gần người chơi khác để So Kèo Thách Đấu."
        />

        {/* Locked Defeat Banner Overlay ("1 phút không thể đè") */}
        {defeatCountdown > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-red-950/90 border border-red-500/60 backdrop-blur-md shadow-2xl z-30 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs font-bold text-red-200">
              ĐANG BẠI TRẬN! (còn {defeatCountdown}s) — Bong bóng thua cuộc không thể bị đè!
            </span>
          </div>
        )}

        {/* Global Combat Clash Announcement Banner */}
        {combatAlert && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-900/95 border border-amber-500/70 backdrop-blur-md shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-200">
            <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-300">
              {combatAlert}
            </span>
          </div>
        )}

        {/* Nearby Opponent 1v1 Combat Challenge Button (Key L) */}
        {nearbyOpponent && (
          <div className="absolute bottom-14 left-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
            <button
              onClick={() => handleInitiateCombat(nearbyOpponent.id)}
              disabled={nearbyOpponent.isDefeated || defeatCountdown > 0 || Boolean(pendingInviteTarget)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-md transition-all border ${
                nearbyOpponent.isDefeated || defeatCountdown > 0 || Boolean(pendingInviteTarget)
                  ? 'bg-stone-900/90 text-stone-500 border-stone-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-stone-950 border-amber-300 shadow-amber-500/30 hover:scale-105 active:scale-95 animate-pulse'
              }`}
              title="Phím L: Mời so tài gõ mõ 1v1 giữa 2 người chơi!"
            >
              <Swords className="w-4 h-4 text-stone-950" />
              <span>
                {nearbyOpponent.isDefeated
                  ? `🏳️ ${nearbyOpponent.name} đang bại trận`
                  : defeatCountdown > 0
                  ? `💀 Bạn đang tĩnh tâm (${defeatCountdown}s)`
                  : pendingInviteTarget
                  ? `⏳ Đang chờ ${pendingInviteTarget.name} chấp thuận...`
                  : `⚔️ So Kèo Gõ Mõ với ${nearbyOpponent.name}${nearbyOpponent.weapon ? ` (${nearbyOpponent.weapon === 'gun' ? '🔫' : nearbyOpponent.weapon === 'hammer' ? '🔨' : '🔪'})` : ''} (Phím L)`}
              </span>
            </button>
          </div>
        )}

        {/* Temple & Lake Action Prompts */}
        {currentScene === 'temple_interior' && (
          <>
            <div className="absolute top-3 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/85 border border-amber-500/50 text-amber-200 text-xs backdrop-blur-md z-30 shadow-lg">
              <DoorOpen className="w-4 h-4 text-amber-400" />
              <span>Nội Điện: <b>{activeTemple?.name}</b> • Bấm Space để gõ Mõ tích công đức!</span>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 animate-in zoom-in-95 duration-150">
              <button
                onClick={handleExitTemple}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 border border-amber-500/60 hover:border-amber-400 hover:bg-stone-800 text-amber-300 font-bold text-xs shadow-2xl active:scale-95 transition-all"
                title="Phím E: Bước ra lại sân tu viện để di chuyển tiếp"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                <span>🚪 Bước Ra Sân Chùa (Phím E)</span>
              </button>
            </div>
          </>
        )}

        {nearbyDoor && currentScene === 'plaza' && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => handleEnterTemple(nearbyDoor)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-2xl shadow-amber-500/40 border border-amber-300 active:scale-95 transition-all animate-pulse"
              title="Phím E: Bước vào chiêm bái Chánh Điện"
            >
              <DoorOpen className="w-4 h-4 text-stone-950" />
              <span>⛩️ Bước Vào {nearbyDoor.name} (Phím E)</span>
            </button>
          </div>
        )}

        {nearbyLake && currentScene === 'plaza' && (
          <div className="absolute bottom-16 right-4 z-30 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowFishModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-stone-950 font-bold text-xs shadow-2xl shadow-cyan-500/40 border border-cyan-300 active:scale-95 transition-all animate-pulse"
              title="Phím G: Mở bảng chọn loại cá để phóng sinh xuống hồ"
            >
              <Fish className="w-4 h-4 text-stone-950" />
              <span>🐟 Phóng Sinh Cá ({nearbyLake.name}) [Phím G]</span>
            </button>
          </div>
        )}

        {/* Floating Quick Action Overlay Buttons (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap z-20">
          <button
            onClick={() => triggerAction('pray')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all border ${
              activeAction === 'pray'
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg'
                : 'bg-stone-900/80 hover:bg-stone-800 text-amber-200 border-amber-500/30'
            }`}
            title="Phím 1: Chắp tay niệm Phật"
          >
            <span>🙏 Chắp Tay</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">(Phím 1)</span>
          </button>

          <button
            onClick={() => triggerAction('bow')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all border ${
              activeAction === 'bow'
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg'
                : 'bg-stone-900/80 hover:bg-stone-800 text-amber-200 border-amber-500/30'
            }`}
            title="Phím 2: Đảnh lễ quỳ lạy"
          >
            <span>🧎 Đảnh Lễ</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">(Phím 2)</span>
          </button>

          <button
            onClick={() => triggerAction('tap_fish')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all border ${
              activeAction === 'tap_fish'
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg'
                : 'bg-stone-900/80 hover:bg-stone-800 text-amber-200 border-amber-500/30'
            }`}
            title="Phím 3: Gõ mõ cùng nhau"
          >
            <span>🪵 Gõ Mõ</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">(Phím 3)</span>
          </button>

          <button
            onClick={() => triggerAction(activeAction === 'sit' ? 'idle' : 'sit')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all border ${
              activeAction === 'sit'
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg'
                : 'bg-stone-900/80 hover:bg-stone-800 text-amber-200 border-amber-500/30'
            }`}
            title="Phím 4: Tọa thiền an định"
          >
            <span>🧘 Tọa Thiền</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">(Phím 4)</span>
          </button>
        </div>

        {/* Quick Nav Hint (Center-Top) */}
        <div className="absolute top-3 left-44 px-3 py-1 rounded-xl bg-stone-950/75 border border-stone-800 backdrop-blur-md text-[11px] text-stone-300 pointer-events-none hidden md:block">
          Di chuyển: <kbd className="px-1 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">W A S D</kbd> (Giữ <kbd className="px-1 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">Shift</kbd> chạy nhanh) hoặc Nhấp chuột trên đất
        </div>


        {/* Live Chat Stream Overlay (Top-Right) */}
        {chatMessages.length > 0 && (
          <div className="absolute top-14 right-3 max-w-[260px] space-y-1.5 z-20 pointer-events-none">
            {chatMessages.slice(-4).map((msg) => (
              <div
                key={msg.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/85 border border-amber-500/30 backdrop-blur-md text-xs shadow-xl animate-in fade-in slide-in-from-right-4 duration-200"
              >
                <MessageSquare className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="font-bold text-amber-300 truncate max-w-[90px]">{msg.senderName}:</span>
                <span className="text-stone-200 truncate">{msg.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Quick Chat & Chanting Bar (Bottom) */}
      <div className="w-full mt-3 flex flex-col sm:flex-row items-center gap-2">
        {/* Quick Chanting Phrases Pills */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          {QUICK_CHATS.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleSendChat(phrase)}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs bg-stone-900/80 hover:bg-stone-800 border border-amber-500/20 text-stone-300 hover:text-amber-200 transition-all flex-shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Custom Chat Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat(chatInput);
          }}
          className="flex items-center gap-1.5 w-full sm:w-72"
        >
          <input
            type="text"
            value={chatInput}
            maxLength={45}
            placeholder="Gửi lời trợ niệm / chat..."
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-amber-500/30 text-xs text-amber-200 placeholder:text-stone-500 outline-none focus:border-amber-400 shadow-inner"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-md"
            title="Gửi"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 4. Profile Customization Modal (No login / No auth) */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="w-full max-w-md max-h-[90vh] overflow-y-auto zen-glass p-6 rounded-3xl border border-amber-500/40 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-amber-200 uppercase tracking-wider">
                  Hồ Sơ Đạo Hữu (Không Cần Đăng Nhập)
                </h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Character Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-950/60 border border-amber-500/20">
              <span className="text-[11px] text-stone-400 mb-2">Xem Trước Nhân Vật Của Bạn</span>
              <div className="relative w-20 h-24 flex flex-col items-center justify-center">
                {/* Hat */}
                {editHat === 'non_la' && (
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[10px] border-b-amber-600 mb-0.5" />
                )}
                {editHat === 'halo' && (
                  <div className="w-8 h-2 rounded-full border border-amber-400 bg-amber-400/20 mb-1" />
                )}
                {editHat === 'lotus' && <span className="text-sm">🪷</span>}

                {/* Head with Avatar */}
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden shadow-lg"
                  style={{ borderColor: editColor, backgroundColor: '#1c1917' }}
                >
                  {editAvatar.startsWith('data:image') ? (
                    <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">{editAvatar}</span>
                  )}
                </div>

                {/* Body line */}
                <div className="w-1 h-7 rounded-full mt-1" style={{ backgroundColor: editColor }} />
                {/* Legs */}
                <div className="flex gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: editColor }} />
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: editColor }} />
                </div>
              </div>
              <span className="mt-2 text-xs font-bold text-amber-300">
                {editName || 'Đạo Hữu'}
              </span>
            </div>

            {/* 1. Tên / Pháp Danh */}
            <div className="space-y-1.5">
              <label className="text-xs text-stone-300 font-medium">Tên / Pháp Danh Hiển Thị</label>
              <input
                type="text"
                value={editName}
                maxLength={20}
                placeholder="VD: Thích Chánh Niệm, Đạo Hữu An Nhiên..."
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-amber-200 outline-none focus:border-amber-400"
              />
            </div>

            {/* 2. Hình Ảnh Avatar (Tải từ máy tính hoặc chọn emoji) */}
            <div className="space-y-2">
              <label className="text-xs text-stone-300 font-medium">Hình Ảnh Đại Diện</label>

              {/* Upload file button */}
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-amber-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh từ máy tính / điện thoại...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Emoji Gallery */}
              <div className="space-y-1">
                <span className="text-[11px] text-stone-400">Hoặc chọn biểu tượng thiền:</span>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditAvatar(emoji)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border transition-all ${
                        editAvatar === emoji
                          ? 'border-amber-400 bg-amber-500/20 scale-110 shadow-md'
                          : 'border-stone-800 bg-stone-900/50 hover:bg-stone-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Màu Sắc Người Que */}
            <div className="space-y-1.5">
              <label className="text-xs text-stone-300 font-medium">Màu Sắc Người Que</label>
              <div className="flex flex-wrap gap-2">
                {THEME_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setEditColor(c.hex)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                      editColor === c.hex
                        ? 'border-amber-400 bg-stone-800 font-bold shadow-md'
                        : 'border-stone-800 bg-stone-900/60 text-stone-400'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Phụ Kiện Đầu */}
            <div className="space-y-1.5">
              <label className="text-xs text-stone-300 font-medium">Phụ Kiện Đầu</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'non_la', label: '🌾 Nón Lá Việt Nam' },
                  { id: 'halo', label: '✨ Vòng Hào Quang' },
                  { id: 'lotus', label: '🪷 Bông Sen' },
                  { id: 'none', label: '👤 Không Nón' },
                ].map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setEditHat(h.id as any)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      editHat === h.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-semibold'
                        : 'border-stone-800 bg-stone-900/50 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Merit Leaderboard Modal (Bảng Xếp Hạng Công Đức) */}
      {showLeaderboardModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowLeaderboardModal(false)}
        >
          <div 
            className="w-full max-w-lg max-h-[85vh] flex flex-col zen-glass p-6 rounded-3xl border border-amber-500/40 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-amber-200 uppercase tracking-wider">
                    Bảng Xếp Hạng Công Đức
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Công đức nhặt rải rác ngoài sảnh & thắng bại qua so tài gõ mõ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="p-1 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rules Notice */}
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-center justify-between flex-wrap gap-1">
              <span>⚔️ Thắng solo: <b>+10</b> Công Đức</span>
              <span>🤝 Hòa solo: <b>+2</b> Công Đức</span>
              <span>💀 Thua solo: <b>-5</b> Công Đức</span>
              <span>⚠️ Nhặt hung khí: <b>-3 ~ -10</b> Công Đức</span>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {allPlayersList
                .slice()
                .sort((a, b) => (b.merits ?? 0) - (a.merits ?? 0))
                .map((p, idx) => {
                  const isLocal = p.id === profile.id;
                  const isDefeated = Boolean(p.defeatUntil && p.defeatUntil > Date.now());

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all ${
                        isLocal
                          ? 'bg-amber-500/15 border-amber-400/60 shadow-lg'
                          : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank badge */}
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-stone-400">#{idx + 1}</span>}
                        </div>

                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-full border flex items-center justify-center overflow-hidden bg-stone-950 text-base"
                          style={{ borderColor: p.color || '#f59e0b' }}
                        >
                          {p.avatar && p.avatar.startsWith('data:image') ? (
                            <img src={p.avatar} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            p.avatar || '🪷'
                          )}
                        </div>

                        {/* Name and Status */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-amber-200">
                              {p.name}
                            </span>
                            {isLocal && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-mono">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {isDefeated ? (
                              <span className="text-red-400">💀 Đang tĩnh tâm (Bại trận)</span>
                            ) : p.action === 'pray' ? (
                              '🙏 Chắp tay niệm Phật'
                            ) : p.action === 'bow' ? (
                              '🧎 Đảnh lễ'
                            ) : p.action === 'tap_fish' ? (
                              '🪵 Đang gõ mõ'
                            ) : p.action === 'sit' ? (
                              '🧘 Tọa thiền'
                            ) : (
                              '✨ Thanh tịnh'
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats: Weapon & Merits */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Weapon Tag if holding */}
                        {p.weapon && (
                          <div
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-bold font-mono text-xs"
                            title="Đang cầm hung khí (nhặt bị trừ công đức)"
                          >
                            <span>
                              {p.weapon === 'gun' ? '🔫 Súng' : p.weapon === 'hammer' ? '🔨 Búa' : '🔪 Dao'}
                            </span>
                          </div>
                        )}

                        {/* Merits Value */}
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold font-mono text-xs"
                          title="Điểm Công Đức tích lũy"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{p.merits ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Incoming Challenge Confirmation Modal (Mutual Acceptance) */}
      {incomingInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md zen-glass p-6 rounded-3xl border-2 border-amber-500/70 shadow-2xl shadow-amber-500/20 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Swords className="w-7 h-7 text-amber-400 animate-bounce" />
              </div>
              <h3 className="font-serif font-bold text-base text-amber-200 uppercase tracking-wider">
                Lời Thách Đấu So Kèo Công Đức!
              </h3>
              <p className="text-xs text-stone-300">
                Đạo hữu <b className="text-amber-400">{incomingInvite.challengerName}</b> muốn so tài gõ mõ 1v1 với bạn!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-amber-500/30 space-y-1.5 text-xs text-stone-300">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Luật Thi Đấu Gõ Mõ 1v1:</span>
              </div>
              <ul className="space-y-1 text-[11px] list-disc list-inside text-stone-300/90 pl-1">
                <li>Thi đấu gõ mõ tốc độ trong <b>6 giây</b> (Nhấp chuột hoặc phím <b>L</b> / <b>Space</b>).</li>
                <li>🏆 <b>Người thắng:</b> Nhận <b>+10</b> Công Đức vào Bảng Xếp Hạng.</li>
                <li>🤝 <b>Hòa nhau:</b> Cả 2 cùng nhận <b>+2</b> Công Đức giao duyên!</li>
                <li>💀 <b>Người thua:</b> Bị trừ <b>-5 Công Đức</b> và nhận bong bóng bại trận <b>1 phút không thể đè</b>!</li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleDeclineInvite}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-all"
              >
                Từ Chối
              </button>
              <button
                onClick={handleAcceptInvite}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
              >
                🔥 Chấp Nhận Chiến
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Interactive 1v1 Wooden Fish Tapping Arena (Võ Đài Gõ Mõ - chỉ hiển thị cho 2 người solo) */}
      {activeDuel && (profile.id === activeDuel.playerAId || profile.id === activeDuel.playerBId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="w-full max-w-lg zen-glass p-6 rounded-3xl border-2 border-amber-500/80 shadow-2xl shadow-amber-500/30 space-y-5 text-center">
            {/* Arena Header */}
            <div>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Swords className="w-5 h-5" />
                <h3 className="font-serif font-bold text-lg text-amber-200 uppercase tracking-widest">
                  Võ Đài So Kèo Gõ Mõ 1v1
                </h3>
                <Swords className="w-5 h-5 scale-x-[-1]" />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Gõ liên hồi phím <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">L</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono">Space</kbd> hoặc nhấp vào Mõ!
              </p>
            </div>

            {/* Countdown or Timer Banner */}
            <div className="py-2 px-4 rounded-2xl bg-stone-900/90 border border-amber-500/40 inline-flex items-center gap-2 mx-auto">
              {duelCountdown > 0 ? (
                <span className="text-sm font-bold text-amber-300 animate-pulse">
                  ⏳ Chuẩn bị thi đấu: <span className="font-mono text-lg text-amber-400">{duelCountdown}</span>s
                </span>
              ) : duelResult ? (
                duelResult.isDraw ? (
                  <span className="text-sm font-bold text-cyan-300">
                    🤝 KẾT QUẢ: HÒA NHAU! (+2 CÔNG ĐỨC GIAO DUYÊN)
                  </span>
                ) : (
                  <span className={`text-sm font-bold ${duelResult.isWinner ? 'text-amber-300' : 'text-red-400'}`}>
                    {duelResult.isWinner
                      ? '🎉 THẮNG CUỘC (+10 CÔNG ĐỨC)!'
                      : '💀 BẠI TRẬN (-5 CÔNG ĐỨC, KHÓA 1 PHÚT)!'}
                  </span>
                )
              ) : (
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>THI ĐẤU! Còn lại:</span>
                  <span className="font-mono text-xl text-amber-300">{duelTimeLeft}s</span>
                </span>
              )}
            </div>

            {/* Score Comparison Display */}
            <div className="grid grid-cols-2 gap-4 items-center bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
              {/* Left: You */}
              <div className="text-left space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold truncate">
                  <span>⭐ Bạn ({profile.name})</span>
                </div>
                <div className="font-mono text-3xl font-extrabold text-amber-400">
                  {myDuelTaps} <span className="text-xs font-normal text-stone-400">tiếng mõ</span>
                </div>
              </div>

              {/* Right: Opponent */}
              <div className="text-right space-y-1">
                <div className="flex items-center justify-end gap-1.5 text-xs text-stone-300 font-bold truncate">
                  <span>
                    {profile.id === activeDuel.playerAId ? activeDuel.playerBName : activeDuel.playerAName}
                  </span>
                </div>
                <div className="font-mono text-3xl font-extrabold text-cyan-400">
                  {oppDuelTaps} <span className="text-xs font-normal text-stone-400">tiếng mõ</span>
                </div>
              </div>
            </div>

            {/* Dynamic Tug-of-war Progress Bar */}
            <div className="w-full h-3 bg-stone-900 rounded-full overflow-hidden flex border border-stone-800">
              <div
                className="bg-amber-400 transition-all duration-100"
                style={{
                  width: `${
                    myDuelTaps + oppDuelTaps === 0
                      ? 50
                      : Math.max(5, Math.min(95, (myDuelTaps / (myDuelTaps + oppDuelTaps)) * 100))
                  }%`,
                }}
              />
              <div
                className="bg-cyan-500 transition-all duration-100 flex-1"
              />
            </div>

            {/* Big Interactive Wooden Fish Button */}
            <div className="py-2">
              <button
                onClick={handleDuelTap}
                disabled={duelCountdown > 0 || Boolean(duelResult)}
                className={`w-36 h-36 mx-auto rounded-full flex flex-col items-center justify-center shadow-2xl transition-all select-none ${
                  duelCountdown > 0 || Boolean(duelResult)
                    ? 'bg-stone-900 text-stone-600 border-2 border-stone-800 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 active:scale-90 text-stone-950 border-4 border-amber-300 shadow-amber-500/40 cursor-pointer animate-pulse'
                }`}
                title="Nhấp liên tục hoặc bấm phím L / Space!"
              >
                <span className="text-4xl drop-shadow-md">🪵</span>
                <span className="text-xs font-black uppercase tracking-wider mt-1">
                  {duelCountdown > 0 ? 'Chờ...' : duelResult ? 'Kết Thúc' : 'GÕ MÕ (L / Space)'}
                </span>
              </button>
            </div>

            {/* Rule Footer */}
            <div className="text-[11px] text-stone-400">
              Thắng: <b>+10 Công Đức</b> • Hòa: <b>+2 Công Đức</b> • Thua: <b>-5 Công Đức</b> & nhận bong bóng bại trận <b>1 phút</b>
            </div>
          </div>
        </div>
      )}

      {/* 8. Fish Release Modal (Nghi Thức Phóng Sinh Cá) */}
      {showFishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg zen-glass p-6 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Fish className="w-5 h-5" />
                <h3 className="font-serif font-bold text-base text-cyan-200">
                  Nghi Thức Phóng Sinh Cá — {nearbyLake?.name || 'Hồ Nước'}
                </h3>
              </div>
              <button
                onClick={() => setShowFishModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Merits Banner */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                localMerits < 0
                  ? 'bg-red-950/40 border-red-500/50 text-red-300'
                  : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
              }`}
            >
              <span>Công Đức Hiện Có:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  localMerits < 0 ? 'text-red-400' : 'text-amber-300'
                }`}
              >
                {localMerits} Điểm {localMerits < 0 && '(Đang Bị Âm ⚠️)'}
              </span>
            </div>

            {localMerits < 0 && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/40 text-[11px] text-red-300 leading-relaxed">
                ⚠️ <strong>Nợ nghiệp quấn thân:</strong> Điểm công đức của bạn đang bị âm! Không thể chuộc cá để phóng sinh. Hãy vào Chánh Điện gõ mõ hoặc lạy Phật sám hối để trả nợ trước.
              </div>
            )}

            {/* Fish Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FISH_CATALOG.map((fish) => {
                const canAfford = localMerits >= fish.cost && localMerits > 0;
                return (
                  <div
                    key={fish.id}
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                      canAfford
                        ? 'bg-stone-900/80 border-cyan-500/30 hover:border-cyan-400/60 shadow-md'
                        : 'bg-stone-900/40 border-stone-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{fish.icon}</span>
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                            canAfford ? 'bg-cyan-500/20 text-cyan-300' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {fish.cost} Công Đức
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-xs text-stone-200 mt-1">{fish.name}</h4>
                      <p className="text-[10px] text-stone-400 mt-0.5 italic">{fish.blessing}</p>
                    </div>

                    <button
                      onClick={() => handleReleaseFish(fish)}
                      disabled={!canAfford}
                      className={`mt-2.5 w-full py-1.5 rounded-xl font-bold text-xs transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-stone-950 shadow-md shadow-cyan-500/20 active:scale-95'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Phóng Sinh 🌊' : `Cần ${fish.cost} Điểm`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 10. Bodhi Tree Quick Interaction Button */}
      {isNearBodhi && currentScene === 'plaza' && (
        <button
          onClick={() => setShowBodhiModal(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-bold shadow-xl border border-amber-300/40 animate-bounce flex items-center gap-2 hover:brightness-110 transition cursor-pointer"
        >
          <span>🌳 Gốc Bồ Đề - Treo Lời Nguyện / Chiêm Ngưỡng (Phím B)</span>
        </button>
      )}

      {/* Bodhi Tree Wish Modal */}
      <BodhiTreeModal
        isOpen={showBodhiModal}
        onClose={() => setShowBodhiModal(false)}
        userMerits={localMerits}
      />

      {/* 11. Direct Player Interaction Menu */}
      {selectedSocialPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedSocialPlayer.avatar || '🪷'}</span>
                <div>
                  <h3 className="font-serif font-bold text-sm text-amber-200">
                    {selectedSocialPlayer.name}
                  </h3>
                  <p className="text-[10px] text-amber-400 font-mono">
                    Công Đức: {selectedSocialPlayer.merits}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSocialPlayer(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Chọn nghi thức tương tác cùng đạo hữu:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Dâng Trà Sen */}
              <button
                onClick={() => {
                  plazaService.sendSocialInteraction(selectedSocialPlayer.id, 'offer_tea');
                  setSelectedSocialPlayer(null);
                }}
                className="w-full p-2.5 rounded-xl bg-stone-800/60 hover:bg-emerald-950/40 border border-stone-700/60 hover:border-emerald-500/50 flex items-center gap-3 transition text-left group"
              >
                <span className="text-xl group-hover:scale-110 transition">🍵</span>
                <div>
                  <div className="text-xs font-bold text-stone-200 group-hover:text-emerald-300">
                    Dâng Chén Trà Sen
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Nâng chén trà thơm, tâm thanh tịnh vô ưu
                  </div>
                </div>
              </button>

              {/* Option 2: Tặng Hoa Sen */}
              <button
                onClick={() => {
                  if (localMerits < 2) {
                    alert('Bạn cần tối thiểu 2 Công Đức để tặng hoa sen!');
                    return;
                  }
                  plazaService.sendSocialInteraction(selectedSocialPlayer.id, 'gift_lotus');
                  setSelectedSocialPlayer(null);
                }}
                disabled={localMerits < 2}
                className={`w-full p-2.5 rounded-xl border flex items-center gap-3 transition text-left group ${
                  localMerits >= 2
                    ? 'bg-stone-800/60 hover:bg-amber-950/40 border-stone-700/60 hover:border-amber-400/50'
                    : 'bg-stone-900/40 border-stone-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="text-xl group-hover:scale-110 transition">🪷</span>
                <div>
                  <div className="text-xs font-bold text-stone-200 group-hover:text-amber-300">
                    Tặng Đóa Sen Phước Lành (-2 Công Đức)
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Tặng +2 phước lành cho bạn hữu, sen nở trên đầu
                  </div>
                </div>
              </button>

              {/* Option 3: Cung Kính Bái Kiến */}
              <button
                onClick={() => {
                  triggerAction('bow');
                  plazaService.sendSocialInteraction(selectedSocialPlayer.id, 'mutual_bow');
                  setSelectedSocialPlayer(null);
                }}
                className="w-full p-2.5 rounded-xl bg-stone-800/60 hover:bg-amber-950/40 border border-stone-700/60 hover:border-amber-400/50 flex items-center gap-3 transition text-left group"
              >
                <span className="text-xl group-hover:scale-110 transition">🙏</span>
                <div>
                  <div className="text-xs font-bold text-stone-200 group-hover:text-amber-300">
                    Cung Kính Bái Kiến
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Hai bên cùng xá chào trang nghiêm, kết duyên lành
                  </div>
                </div>
              </button>

              {/* Option 4: Luận Võ Gõ Mõ */}
              <button
                onClick={() => {
                  handleInitiateCombat(selectedSocialPlayer.id);
                  setSelectedSocialPlayer(null);
                }}
                className="w-full p-2.5 rounded-xl bg-stone-800/60 hover:bg-rose-950/40 border border-stone-700/60 hover:border-rose-400/50 flex items-center gap-3 transition text-left group"
              >
                <span className="text-xl group-hover:scale-110 transition">⚔️</span>
                <div>
                  <div className="text-xs font-bold text-stone-200 group-hover:text-rose-300">
                    Luận Võ Gõ Mõ So Tài
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Đấu gõ mõ 6 giây, thắng +10, thua -5 công đức
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
