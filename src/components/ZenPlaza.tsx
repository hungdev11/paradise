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
  TempleDoorTrigger
} from '../types/zen';
import { plazaService, LocalProfile } from '../services/plaza-service';
import { audioEngine } from '../services/audio-engine';
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

  // Canvas & Game Loop Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  // Camera tracking in world coordinates
  const cameraRef = useRef<{ x: number; y: number }>({ x: 500, y: 350 });

  // Visual Players Map (Decoupled from React render loop for 60fps silky smooth movement)
  const visualPlayersRef = useRef<Map<string, VisualEntity>>(new Map());
  const visualOrbsRef = useRef<Map<string, MeritOrb>>(new Map());
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const clashEffectsRef = useRef<CombatClashEffect[]>([]);

  const localPosRef = useRef<{ x: number; y: number; vx: number; vy: number; facing: 1 | -1 }>({
    x: 1000,
    y: 680,
    vx: 0,
    vy: 0,
    facing: 1,
  });

  const targetClickRef = useRef<{ x: number; y: number } | null>(null);
  const clickRipplesRef = useRef<{ x: number; y: number; radius: number; alpha: number }[]>([]);
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

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
    plazaService.connect(1000, 680);

    // Initial setup for local visual player
    const myProfile = plazaService.getProfile();
    setLocalMerits(myProfile.merits ?? 5);
    visualPlayersRef.current.set(myProfile.id, {
      id: myProfile.id,
      name: myProfile.name,
      avatar: myProfile.avatar,
      color: myProfile.color,
      hat: myProfile.hat,
      weapon: myProfile.weapon || null,
      currentX: 1000,
      currentY: 680,
      targetX: 1000,
      targetY: 680,
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

    // Load initial orbs from service
    const currentOrbs = plazaService.getOrbs();
    visualOrbsRef.current.clear();
    for (const orb of currentOrbs) {
      visualOrbsRef.current.set(orb.id, orb);
    }

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
      // Play authentic Bonk wooden fish sound
      audioEngine.playWoodenFish(true);

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
        setCombatAlert(alertMsg);
        setTimeout(() => setCombatAlert(null), 5000);

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
      setCombatAlert(alertMsg);
      setTimeout(() => setCombatAlert(null), 5000);

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

    // 10. Combat Duel Started: Both players enter 1v1 Tapping Arena
    const unsubStarted = plazaService.onCombatStarted((duel) => {
      setActiveDuel(duel);
      setPendingInviteTarget(null);
      setIncomingInvite(null);
      setMyDuelTaps(0);
      setOppDuelTaps(0);
      setDuelResult(null);
      audioEngine.playWoodenFish(true);
    });

    // 11. Combat Tap Event: Sync real-time taps
    const unsubTapped = plazaService.onCombatTapped((duelId, _playerId, aTaps, bTaps) => {
      setActiveDuel((curr) => {
        if (!curr || curr.duelId !== duelId) return curr;
        const myP = plazaService.getProfile();
        const isPlayerA = myP.id === curr.playerAId;
        setMyDuelTaps(isPlayerA ? aTaps : bTaps);
        setOppDuelTaps(isPlayerA ? bTaps : aTaps);
        return { ...curr, playerATaps: aTaps, playerBTaps: bTaps };
      });
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
        setActiveAction('idle');
        plazaService.sendLocalAction('idle');
        if (myVp) myVp.action = 'idle';
      }, 3400);
    }
  }, []);

  // Tap Wooden Fish during 1v1 Combat Duel
  const handleDuelTap = useCallback(() => {
    if (!activeDuel || duelResult) return;
    const now = Date.now();
    if (now < activeDuel.startTime || now > activeDuel.startTime + activeDuel.duration) return;

    setMyDuelTaps((prev) => prev + 1);
    audioEngine.playWoodenFish(false);
    plazaService.sendCombatTap(activeDuel.duelId);
  }, [activeDuel, duelResult]);

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

  // Keyboard navigation listeners (Supports Key L for combat and duel tapping)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      keysDownRef.current[e.code] = true;

      // During active duel: Tap wooden fish with L or Space!
      if (activeDuel && !duelResult) {
        if (e.code === 'KeyL' || e.code === 'Space' || e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          handleDuelTap();
          return;
        }
      }

      if (e.key === '1') triggerAction('pray');
      if (e.key === '2') triggerAction('bow');
      if (e.key === '3') triggerAction('tap_fish');
      if (e.key === '4') triggerAction(activeAction === 'sit' ? 'idle' : 'sit');

      // Key L: Trigger 1v1 Combat Invite with nearby opponent (switched from F to L)
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
  }, [triggerAction, activeAction, nearbyOpponent, activeDuel, duelResult, handleDuelTap, pendingInviteTarget]);

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

    // Convert Screen Coords -> World Coords using Camera offset!
    const worldX = screenX + cameraRef.current.x;
    const worldY = screenY + cameraRef.current.y;

    // 1. Check if clicked directly on a nearby remote player to challenge them!
    const localX = localPosRef.current.x;
    const localY = localPosRef.current.y;
    for (const [id, vp] of visualPlayersRef.current.entries()) {
      if (!vp.isLocal) {
        const clickDistToPlayer = Math.hypot(vp.currentX - worldX, vp.currentY - worldY);
        const playerDistToPlayer = Math.hypot(vp.currentX - localX, vp.currentY - localY);
        if (clickDistToPlayer < 40 && playerDistToPlayer < 150) {
          handleInitiateCombat(id);
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

      // Check nearby opponents for 1v1 combat prompt (throttled every 200ms)
      if (time - lastOpponentCheck > 200) {
        lastOpponentCheck = time;
        let foundOpponent: { id: string; name: string; merits: number; weapon?: string | null; isDefeated: boolean } | null = null;
        let closestDist = 140;

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
      const myProfile = plazaService.getProfile();
      const myVp = visualPlayersRef.current.get(myProfile.id);
      if (myVp) {
        myVp.currentX = localPosRef.current.x;
        myVp.currentY = localPosRef.current.y;
        myVp.facing = localPosRef.current.facing;
        myVp.isMoving = isMoving;
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

      // --- WORLD MAP BACKGROUND ---
      // Ground Tile / Stone Floor with Organic Paving
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Natural Grass Field Carpets in Courtyard
      const grassGrad = ctx.createRadialGradient(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 200, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 1100);
      grassGrad.addColorStop(0, '#292524');
      grassGrad.addColorStop(0.5, '#1e2820');
      grassGrad.addColorStop(1, '#171e18');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Paved Stone Pathways connecting the 5 Zones
      ctx.strokeStyle = 'rgba(214, 211, 209, 0.15)';
      ctx.lineWidth = 42;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Path: Central Courtyard <-> Grand Pagoda
      ctx.beginPath();
      ctx.moveTo(1000, 680);
      ctx.lineTo(1000, 240);
      ctx.stroke();

      // Path: Central Courtyard <-> Buddha Statue (Left)
      ctx.beginPath();
      ctx.moveTo(1000, 680);
      ctx.bezierCurveTo(750, 660, 550, 560, 420, 530);
      ctx.stroke();

      // Path: Central Courtyard <-> Bell & Mokugyo Pavilion (Right)
      ctx.beginPath();
      ctx.moveTo(1000, 680);
      ctx.bezierCurveTo(1250, 660, 1450, 560, 1600, 530);
      ctx.stroke();

      // Path: Central Courtyard <-> Lotus Pond & Bridge (Bottom-Left)
      ctx.beginPath();
      ctx.moveTo(1000, 680);
      ctx.bezierCurveTo(800, 850, 650, 950, 480, 1050);
      ctx.stroke();

      // Path: Central Courtyard <-> Bodhi Tree & Ancient Stupa (Bottom-Right)
      ctx.beginPath();
      ctx.moveTo(1000, 680);
      ctx.bezierCurveTo(1200, 850, 1400, 950, 1580, 1050);
      ctx.stroke();

      // Stone Path borders
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // --- ZONE 1: ĐẠI HÙNG BẢO ĐIỆN (Grand Pagoda Temple - Top-Center) ---
      const templeX = 1000;
      const templeY = 160;

      // Temple Base Terrace
      ctx.fillStyle = '#292524';
      ctx.fillRect(templeX - 220, templeY - 60, 440, 130);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(templeX - 220, templeY - 60, 440, 130);

      // Entrance Stairs
      ctx.fillStyle = '#44403c';
      ctx.fillRect(templeX - 70, templeY + 70, 140, 35);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(templeX - 70, templeY + 70, 140, 35);

      // Main Pagoda Wall & Red Pillars
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(templeX - 190, templeY - 50, 380, 110);
      // Pillars
      ctx.fillStyle = '#991b1b';
      for (let px = -170; px <= 170; px += 85) {
        ctx.fillRect(templeX + px - 7, templeY - 50, 14, 110);
      }

      // Curved Pagoda Roof (Mái chùa cong rồng uốn lượn)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(templeX - 260, templeY - 45);
      ctx.quadraticCurveTo(templeX - 190, templeY - 80, templeX - 120, templeY - 95);
      ctx.lineTo(templeX, templeY - 110);
      ctx.lineTo(templeX + 120, templeY - 95);
      ctx.quadraticCurveTo(templeX + 190, templeY - 80, templeX + 260, templeY - 45);
      ctx.quadraticCurveTo(templeX, templeY - 70, templeX - 260, templeY - 45);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Top Pagoda Spire Finial
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(templeX, templeY - 135);
      ctx.lineTo(templeX - 12, templeY - 105);
      ctx.lineTo(templeX + 12, templeY - 105);
      ctx.closePath();
      ctx.fill();

      // Temple Plaque (Đại Hùng Bảo Điện)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(templeX - 85, templeY - 30, 170, 24);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(templeX - 85, templeY - 30, 170, 24);
      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText('ĐẠI HÙNG BẢO ĐIỆN', templeX, templeY - 14);

      // Giant Bronze Incense Cauldron in front of temple
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(templeX, templeY + 115, 26, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Incense Smoke curls
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(templeX - 4, templeY + 105);
      ctx.bezierCurveTo(templeX - 15, templeY + 80, templeX + 10, templeY + 65, templeX - 2, templeY + 40);
      ctx.stroke();

      // --- ZONE 2: TƯỢNG PHẬT A DI ĐÀ (Center-Left: 400, 530) ---
      const buddhaX = 400;
      const buddhaY = 530;

      // Golden Halo Radiance
      const haloGrad = ctx.createRadialGradient(buddhaX, buddhaY - 40, 15, buddhaX, buddhaY - 40, 110);
      haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      haloGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
      haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(buddhaX, buddhaY - 40, 110, 0, Math.PI * 2);
      ctx.fill();

      // Multi-layer Marble Lotus Throne Pedestal
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.ellipse(buddhaX, buddhaY + 45, 80, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Lotus Petals Base
      ctx.fillStyle = '#f59e0b';
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const px = buddhaX + Math.cos(angle) * 58;
        const py = buddhaY + 30 + Math.sin(angle) * 24;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden Buddha Statue Body (Tượng Phật A Di Đà ngồi thiền)
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(buddhaX, buddhaY + 12, 42, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      // Robe torso
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(buddhaX - 24, buddhaY + 15);
      ctx.lineTo(buddhaX - 16, buddhaY - 30);
      ctx.lineTo(buddhaX + 16, buddhaY - 30);
      ctx.lineTo(buddhaX + 24, buddhaY + 15);
      ctx.closePath();
      ctx.fill();
      // Head
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(buddhaX, buddhaY - 42, 19, 0, Math.PI * 2);
      ctx.fill();
      // Ushnisha Topknot (Nhục kế trên đầu Phật)
      ctx.beginPath();
      ctx.arc(buddhaX, buddhaY - 63, 7, 0, Math.PI * 2);
      ctx.fill();

      // Plaque Calligraphy
      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('NAM MÔ A DI ĐÀ PHẬT', buddhaX, buddhaY + 74);

      // Offering cushions around Buddha for players to bow
      const buddhaCushions = [
        { x: buddhaX - 45, y: buddhaY + 80 },
        { x: buddhaX, y: buddhaY + 88 },
        { x: buddhaX + 45, y: buddhaY + 80 },
      ];
      for (const c of buddhaCushions) {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // --- ZONE 3: LẦU CHUÔNG & MÕ KHỔNG LỒ (Center-Right: 1600, 530) ---
      const bellX = 1600;
      const bellY = 530;

      // Octagonal Bell Gazebo Pavilion Base
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(bellX, bellY + 30, 85, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pillars
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(bellX - 65, bellY - 50, 10, 80);
      ctx.fillRect(bellX + 55, bellY - 50, 10, 80);
      ctx.fillRect(bellX - 25, bellY - 60, 10, 90);
      ctx.fillRect(bellX + 15, bellY - 60, 10, 90);

      // Gazebo Roof
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(bellX - 95, bellY - 50);
      ctx.lineTo(bellX, bellY - 100);
      ctx.lineTo(bellX + 95, bellY - 50);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Giant Bronze Temple Bell (Đại Hồng Chung) hanging in pavilion
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(bellX - 26, bellY - 10);
      ctx.bezierCurveTo(bellX - 30, bellY + 25, bellX - 20, bellY + 35, bellX - 26, bellY + 40);
      ctx.lineTo(bellX + 26, bellY + 40);
      ctx.bezierCurveTo(bellX + 20, bellY + 35, bellX + 30, bellY + 25, bellX + 26, bellY - 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#fef3c7';
      ctx.fillText('ĐẠI HỒNG CHUNG', bellX, bellY + 68);

      // --- ZONE 4: HỒ SEN TỊNH TÂM & CẦU GỖ ĐỎ (Bottom-Left: 460, 1060) ---
      const pondX = 460;
      const pondY = 1060;

      // Natural Winding Lake
      ctx.fillStyle = 'rgba(12, 74, 110, 0.7)';
      ctx.beginPath();
      ctx.ellipse(pondX, pondY, 180, 120, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Swimming Koi Fish in Pond
      const koiPositions = [
        { x: pondX - 70, y: pondY - 30, color: '#f97316' },
        { x: pondX + 50, y: pondY + 25, color: '#ef4444' },
        { x: pondX - 20, y: pondY + 50, color: '#f59e0b' },
      ];
      for (const koi of koiPositions) {
        ctx.fillStyle = koi.color;
        ctx.beginPath();
        ctx.ellipse(koi.x, koi.y, 8, 4, time * 0.002, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floating Lotus Pads & Flowers
      const lotuses = [
        { x: pondX - 110, y: pondY - 10 },
        { x: pondX - 40, y: pondY - 60 },
        { x: pondX + 90, y: pondY - 20 },
        { x: pondX + 60, y: pondY + 60 },
      ];
      for (const l of lotuses) {
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 16, 0, Math.PI * 1.8);
        ctx.fill();
        ctx.font = '16px serif';
        ctx.fillText('🪷', l.x - 7, l.y + 6);
      }

      // Traditional Red Wooden Arched Bridge (Cầu Gỗ Đỏ bắc qua hồ sen)
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(pondX - 80, pondY + 80);
      ctx.quadraticCurveTo(pondX, pondY - 20, pondX + 80, pondY - 70);
      ctx.stroke();

      // Bridge Railings
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pondX - 80, pondY + 68);
      ctx.quadraticCurveTo(pondX, pondY - 32, pondX + 80, pondY - 82);
      ctx.stroke();

      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('HỒ SEN TỊNH TÂM', pondX, pondY + 140);

      // --- ZONE 5: VƯỜN BỒ ĐỀ CỔ THỤ & BẢO THÁP (Bottom-Right: 1600, 1050) ---
      const treeX = 1520;
      const treeY = 1060;
      const stupaX = 1720;
      const stupaY = 1040;

      // Ancient Sacred Bodhi Tree Canopy
      ctx.fillStyle = 'rgba(20, 83, 45, 0.85)';
      ctx.beginPath();
      ctx.arc(treeX, treeY - 60, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(22, 101, 52, 0.9)';
      ctx.beginPath();
      ctx.arc(treeX - 40, treeY - 80, 65, 0, Math.PI * 2);
      ctx.arc(treeX + 40, treeY - 80, 65, 0, Math.PI * 2);
      ctx.fill();

      // Bodhi Tree Gnarled Trunk
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(treeX - 25, treeY + 35);
      ctx.quadraticCurveTo(treeX - 35, treeY - 30, treeX, treeY - 50);
      ctx.quadraticCurveTo(treeX + 35, treeY - 30, treeX + 25, treeY + 35);
      ctx.closePath();
      ctx.fill();

      // Hanging Prayer Ribbons (Dải lụa cầu an bay phất phơ)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(treeX - 35, treeY - 45);
      ctx.lineTo(treeX - 30, treeY - 5);
      ctx.stroke();
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(treeX + 30, treeY - 50);
      ctx.lineTo(treeX + 25, treeY - 10);
      ctx.stroke();

      // 7-Tier Ancient Stone Stupa Pagoda (Bảo Tháp Xá Lợi)
      ctx.fillStyle = '#44403c';
      for (let tier = 0; tier < 6; tier++) {
        const ty = stupaY + 20 - tier * 16;
        const tw = 48 - tier * 7;
        ctx.fillRect(stupaX - tw / 2, ty, tw, 12);
        // Roof eave
        ctx.fillStyle = '#78350f';
        ctx.fillRect(stupaX - (tw + 10) / 2, ty - 3, tw + 10, 4);
        ctx.fillStyle = '#44403c';
      }
      // Stupa Spire
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(stupaX, stupaY - 95);
      ctx.lineTo(stupaX - 5, stupaY - 76);
      ctx.lineTo(stupaX + 5, stupaY - 76);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 11px serif';
      ctx.fillStyle = '#86efac';
      ctx.fillText('CÂY BỒ ĐỀ & BẢO THÁP', treeX + 80, treeY + 68);

      // --- ZONE 6: CENTRAL COURTYARD LOTUS ALTAR (Center: 1000, 680) ---
      const centerX = 1000;
      const centerY = 680;

      ctx.fillStyle = 'rgba(120, 53, 15, 0.28)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 150, 85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Grand Golden Singing Bowl
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 10, 44, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 16, 38, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪷', centerX, centerY - 28);

      // 4 Meditation Cushions around central altar
      const centralCushions = [
        { x: centerX - 100, y: centerY },
        { x: centerX + 100, y: centerY },
        { x: centerX, y: centerY - 62 },
        { x: centerX, y: centerY + 58 },
      ];
      for (const c of centralCushions) {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 20, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // --- NATURE ELEMENTS: BUSHES, FLOWER CLUSTERS, STONE LANTERNS ---
      // Lush Bushes (Bụi cỏ / Cây cảnh)
      const bushes = [
        { x: 780, y: 380, r: 24 },
        { x: 1220, y: 380, r: 24 },
        { x: 620, y: 720, r: 28 },
        { x: 1380, y: 720, r: 28 },
        { x: 820, y: 980, r: 22 },
        { x: 1180, y: 980, r: 22 },
        { x: 260, y: 820, r: 32 },
        { x: 1880, y: 820, r: 32 },
      ];
      for (const b of bushes) {
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.arc(b.x - 12, b.y + 4, b.r * 0.75, 0, Math.PI * 2);
        ctx.arc(b.x + 12, b.y + 4, b.r * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Wildflower spots on bush
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(b.x - 6, b.y - 6, 2.5, 0, Math.PI * 2);
        ctx.arc(b.x + 8, b.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stone Lanterns (Đèn đá thắp nến ấm áp) along pathways
      const lanterns = [
        { x: 880, y: 440 },
        { x: 1120, y: 440 },
        { x: 760, y: 640 },
        { x: 1240, y: 640 },
        { x: 820, y: 850 },
        { x: 1180, y: 850 },
      ];
      for (const lt of lanterns) {
        // Pedestal
        ctx.fillStyle = '#44403c';
        ctx.fillRect(lt.x - 6, lt.y - 12, 12, 16);
        // Lantern chamber
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(lt.x - 5, lt.y - 20, 10, 8);
        // Roof cap
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(lt.x - 10, lt.y - 20);
        ctx.lineTo(lt.x, lt.y - 26);
        ctx.lineTo(lt.x + 10, lt.y - 20);
        ctx.closePath();
        ctx.fill();

        // Candlelight soft glow
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

      // --- 5. DRAW ALL STICKMEN IN WORLD COORDINATES ---
      const renderList = Array.from(visualPlayersRef.current.values());
      renderList.sort((a, b) => a.currentY - b.currentY);

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

        // Nametag Badge
        const tagY = currentHeadY - headRadius - (p.hat !== 'none' ? 14 : 8);
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tagText = p.isLocal ? `⭐ Bạn (${p.name})` : p.name;
        const textMetrics = ctx.measureText(tagText);
        const tagW = textMetrics.width + 14;
        const tagH = 18;

        ctx.fillStyle = p.isLocal ? 'rgba(245, 158, 11, 0.95)' : 'rgba(28, 25, 23, 0.85)';
        ctx.beginPath();
        ctx.roundRect(px - tagW / 2, tagY - tagH / 2, tagW, tagH, 9);
        ctx.fill();
        ctx.strokeStyle = p.isLocal ? '#fbbf24' : 'rgba(120, 113, 108, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = p.isLocal ? '#1c1917' : '#f5f5f4';
        ctx.fillText(tagText, px, tagY);

        // MERIT BADGE & WEAPON STATUS DISPLAYED RIGHT NEXT TO PLAYER:
        const meritVal = p.merits ?? 0;
        const weaponIcon = p.weapon === 'gun' ? ' 🔫' : p.weapon === 'hammer' ? ' 🔨' : p.weapon === 'knife' ? ' 🔪' : '';
        const statStr = `✨${meritVal}${weaponIcon}`;
        ctx.font = 'bold 10px monospace';
        const mMetrics = ctx.measureText(statStr);
        const mW = mMetrics.width + 12;
        const mH = 16;
        const mX = px + tagW / 2 + mW / 2 + 3;

        ctx.fillStyle = 'rgba(15, 12, 10, 0.88)';
        ctx.beginPath();
        ctx.roundRect(mX - mW / 2, tagY - mH / 2, mW, mH, 7);
        ctx.fill();
        ctx.strokeStyle = p.weapon ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = p.weapon ? '#fca5a5' : '#fef08a';
        ctx.fillText(statStr, mX, tagY);

        // RESULT SPEECH BUBBLE FOR DEFEATED PLAYER:
        const isDefeated = p.defeatUntil && p.defeatUntil > Date.now();
        if (isDefeated) {
          const remainSec = Math.max(1, Math.ceil((p.defeatUntil! - Date.now()) / 1000));
          const defeatText = `💀 BẠI TRẬN (-5) [${remainSec}s]`;

          ctx.font = 'bold 11px system-ui, sans-serif';
          const dtMetrics = ctx.measureText(defeatText);
          const bubbleW = dtMetrics.width + 20;
          const bubbleH = 26;
          const bubbleY = tagY - 25;

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

      // --- 6. DRAW HUD: MINIMAP RADAR IN TOP-LEFT CORNER ---
      const mapW = 140;
      const mapH = 90;
      const mapX = 14;
      const mapY = 14;

      // Minimap background
      ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(mapX, mapY, mapW, mapH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const scaleMiniX = mapW / WORLD_WIDTH;
      const scaleMiniY = mapH / WORLD_HEIGHT;

      // Minimap landmarks
      // Temple
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(mapX + (templeX - 80) * scaleMiniX, mapY + (templeY - 40) * scaleMiniY, 160 * scaleMiniX, 80 * scaleMiniY);
      // Buddha
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mapX + buddhaX * scaleMiniX, mapY + buddhaY * scaleMiniY, 4, 0, Math.PI * 2);
      ctx.fill();
      // Pond
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(mapX + pondX * scaleMiniX, mapY + pondY * scaleMiniY, 180 * scaleMiniX, 120 * scaleMiniY, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bodhi
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(mapX + treeX * scaleMiniX, mapY + treeY * scaleMiniY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Viewport Camera Rect on minimap
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mapX + camX * scaleMiniX, mapY + camY * scaleMiniY, canvas.width * scaleMiniX, canvas.height * scaleMiniY);

      // Draw Merit Orbs as tiny gold specks & Weapons as red specks on minimap
      for (const orb of visualOrbsRef.current.values()) {
        const isWeapon = orb.type === 'gun' || orb.type === 'hammer' || orb.type === 'knife';
        ctx.fillStyle = isWeapon ? '#ef4444' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(mapX + orb.x * scaleMiniX, mapY + orb.y * scaleMiniY, isWeapon ? 2 : 1.4, 0, Math.PI * 2);
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
      ctx.fillText('Bản Đồ Tu Viện', mapX + 6, mapY + mapH - 5);

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
                Bản đồ mở rộng 2200x1400
              </span>
            </h2>
            <p className="text-[10px] text-stone-400">
              Nhặt Công Đức (🪷 ✨ 🌟) • Cẩn Thận Hung Khí (🔫 Súng, 🔨 Búa, 🔪 Dao Bị Trừ Điểm) • So Kèo 1v1
            </p>
          </div>
        </div>

        {/* Right: Live Peers Count, Merits Counter, Weapon Badge & Profile Button */}
        <div className="flex items-center gap-2">
          {/* Total Looted Merits Counter */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs shadow-inner"
            title="Số công đức bạn đã nhặt được trên toàn bản đồ"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-300/80 hidden sm:inline">Công Đức:</span>
            <span className="font-mono text-amber-300 font-bold text-sm">{localMerits}</span>
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
          title="Nhấp chuột trên đất để di chuyển. Nhấp vào người chơi khác hoặc bấm phím L để Thách Đấu So Kèo Công Đức!"
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

      {/* 7. Interactive 1v1 Wooden Fish Tapping Arena (Võ Đài Gõ Mõ) */}
      {activeDuel && (
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
    </div>
  );
};
