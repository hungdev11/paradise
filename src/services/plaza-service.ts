import {
  PlazaPlayer,
  StickmanAction,
  MeritOrb,
  CombatResult,
  CombatInvite,
  ActiveCombatSession,
  FishTypeId,
  WishRibbonColor,
  BodhiWishRibbon,
  SocialActionType,
  PlayerSocialStatus,
} from '../types/zen';

const PROFILE_KEY = 'zen_plaza_profile_v1';

export interface LocalProfile {
  id: string;
  name: string;
  avatar: string; // Base64 data URL or emoji
  color: string;
  hat: 'none' | 'non_la' | 'halo' | 'lotus';
  merits: number;
  weapon?: 'gun' | 'hammer' | 'knife' | null; // Cầm súng, búa, dao (bị trừ công đức)
  defeatUntil?: number;
}

const DEFAULT_COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#f1f5f9'];
const DEFAULT_EMOJIS = ['🪷', '🧘', '🕊️', '☀️', '🕯️', '🔔', '🐕', '🌿'];

export interface ReleasedFishEvent {
  id: string;
  fishType: FishTypeId;
  lakeId: 'lotus_pond' | 'liberation_pond';
  x: number;
  y: number;
  releasedBy: string;
}

type MoveListener = (id: string, x: number, y: number, vx: number, vy: number, facing: 1 | -1, isMoving: boolean) => void;
type ActionListener = (id: string, action: StickmanAction) => void;
type ChatListener = (id: string, name: string, text: string) => void;
type ListListener = (players: PlazaPlayer[]) => void;
type OrbsListener = (orbs: MeritOrb[]) => void;
type OrbLootedListener = (orbId: string, playerId: string, value: number, totalMerits: number) => void;
type CombatResultListener = (result: CombatResult) => void;
type CombatInviteListener = (invite: CombatInvite) => void;
type CombatStartListener = (session: ActiveCombatSession) => void;
type CombatTapListener = (duelId: string, playerId: string, playerATaps: number, playerBTaps: number) => void;
type CombatDeclinedListener = (inviteId: string, targetName: string) => void;
type FishReleasedListener = (event: ReleasedFishEvent) => void;
type BodhiWishCreatedListener = (ribbon: BodhiWishRibbon, newMerits: number) => void;
type BodhiWishRejoicedListener = (ribbonId: string, rejoiceCount: number, rejoicedBy: string, newMerits?: number) => void;
type SocialEventListener = (
  senderId: string,
  senderName: string,
  targetId: string,
  targetName: string,
  action: SocialActionType,
  senderMerits?: number,
  targetMerits?: number
) => void;
type MeditationRewardListener = (playerIds: string[], bonus: number) => void;

export class PlazaService {
  private localProfile: LocalProfile;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private players: Map<string, PlazaPlayer> = new Map();
  private activeOrbs: Map<string, MeritOrb> = new Map();
  private activeWishes: Map<string, BodhiWishRibbon> = new Map();

  // Event Listeners
  private moveListeners: Set<MoveListener> = new Set();
  private actionListeners: Set<ActionListener> = new Set();
  private chatListeners: Set<ChatListener> = new Set();
  private listListeners: Set<ListListener> = new Set();
  private orbsListeners: Set<OrbsListener> = new Set();
  private orbLootedListeners: Set<OrbLootedListener> = new Set();
  private combatListeners: Set<CombatResultListener> = new Set();
  private inviteListeners: Set<CombatInviteListener> = new Set();
  private startListeners: Set<CombatStartListener> = new Set();
  private duelTapListeners: Set<CombatTapListener> = new Set();
  private declineListeners: Set<CombatDeclinedListener> = new Set();
  private fishReleasedListeners: Set<FishReleasedListener> = new Set();
  private wishCreatedListeners: Set<BodhiWishCreatedListener> = new Set();
  private wishRejoicedListeners: Set<BodhiWishRejoicedListener> = new Set();
  private socialEventListeners: Set<SocialEventListener> = new Set();
  private meditationRewardListeners: Set<MeditationRewardListener> = new Set();

  private isConnected: boolean = false;
  private reconnectTimer: number | null = null;

  constructor() {
    this.localProfile = this.loadOrCreateProfile();

    // BroadcastChannel for instant local cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('zen_plaza_local_channel');
        this.broadcastChannel.onmessage = (e) => this.handlePeerMessage(e.data);
      } catch {
        // ignore
      }
    }
  }

  // Load or generate default player profile (No login / No auth)
  private loadOrCreateProfile(): LocalProfile {
    if (typeof window === 'undefined') {
      return {
        id: 'server_player',
        name: 'Đạo Hữu',
        avatar: '🪷',
        color: '#f59e0b',
        hat: 'non_la',
        merits: 5,
        weapon: null,
        defeatUntil: 0,
      };
    }

    // 1. Session-unique ID: guarantees separate tabs in the same browser are distinct players!
    let sessionId = '';
    try {
      sessionId = sessionStorage.getItem('zen_plaza_session_id') || '';
      if (!sessionId) {
        sessionId = `zen_p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('zen_plaza_session_id', sessionId);
      }
    } catch {
      sessionId = `zen_p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // 2. Load saved customization (name, avatar, color, hat, merits) from localStorage
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          id: sessionId, // Always use session-unique ID per browser tab!
          merits: typeof parsed.merits === 'number' ? parsed.merits : 20,
          weapon: parsed.weapon || null,
          defeatUntil: parsed.defeatUntil || 0,
        };
      }
    } catch {
      // ignore
    }

    // Generate random default profile for any visiting IP / machine
    const randomNum = Math.floor(100 + Math.random() * 900);
    const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    const randomAvatar = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];

    const newProfile: LocalProfile = {
      id: sessionId,
      name: `Đạo Hữu #${randomNum}`,
      avatar: randomAvatar,
      color: randomColor,
      hat: 'non_la',
      merits: 20,
      weapon: null,
      defeatUntil: 0,
    };

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    } catch {
      // ignore
    }

    return newProfile;
  }

  public getProfile(): LocalProfile {
    return { ...this.localProfile };
  }

  public getPlayersMap(): Map<string, PlazaPlayer> {
    return this.players;
  }

  public getOrbs(): MeritOrb[] {
    return Array.from(this.activeOrbs.values());
  }

  public getBodhiWishes(): BodhiWishRibbon[] {
    return Array.from(this.activeWishes.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public createBodhiWish(wishText: string, color: WishRibbonColor): boolean {
    if (this.localProfile.merits < 5) return false;
    this.sendNetworkMessage({
      type: 'create_bodhi_wish',
      wishText,
      color,
    });
    return true;
  }

  public rejoiceBodhiWish(ribbonId: string): void {
    this.sendNetworkMessage({
      type: 'rejoice_bodhi_wish',
      ribbonId,
    });
  }

  public sendSocialInteraction(targetId: string, action: SocialActionType): boolean {
    if (action === 'gift_lotus' && this.localProfile.merits < 2) return false;
    this.sendNetworkMessage({
      type: 'social_interact',
      targetId,
      action,
    });
    return true;
  }

  public onBodhiWishCreated(listener: BodhiWishCreatedListener): () => void {
    this.wishCreatedListeners.add(listener);
    return () => this.wishCreatedListeners.delete(listener);
  }

  public onBodhiWishRejoiced(listener: BodhiWishRejoicedListener): () => void {
    this.wishRejoicedListeners.add(listener);
    return () => this.wishRejoicedListeners.delete(listener);
  }

  public onSocialEvent(listener: SocialEventListener): () => void {
    this.socialEventListeners.add(listener);
    return () => this.socialEventListeners.delete(listener);
  }

  public onMeditationReward(listener: MeditationRewardListener): () => void {
    this.meditationRewardListeners.add(listener);
    return () => this.meditationRewardListeners.delete(listener);
  }

  public updateProfile(updates: Partial<Omit<LocalProfile, 'id'>>) {
    this.localProfile = { ...this.localProfile, ...updates };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile));
    } catch {
      // ignore
    }

    // Update local player in map
    const local = this.players.get(this.localProfile.id);
    if (local) {
      Object.assign(local, {
        name: this.localProfile.name,
        avatar: this.localProfile.avatar,
        color: this.localProfile.color,
        hat: this.localProfile.hat,
        merits: this.localProfile.merits,
        weapon: this.localProfile.weapon,
      });
      this.notifyListListeners();
    }

    // Broadcast profile update
    const payload = {
      type: 'update_profile',
      id: this.localProfile.id,
      name: this.localProfile.name,
      avatar: this.localProfile.avatar,
      color: this.localProfile.color,
      hat: this.localProfile.hat,
      merits: this.localProfile.merits,
      weapon: this.localProfile.weapon,
    };
    this.sendNetworkMessage(payload);
  }

  public connect(initialX: number = 1000, initialY: number = 680) {
    const spawnX = initialX + Math.floor((Math.random() - 0.5) * 90);
    const spawnY = initialY + Math.floor((Math.random() - 0.5) * 60);

    // Add local player immediately
    const localPlayer: PlazaPlayer = {
      id: this.localProfile.id,
      name: this.localProfile.name,
      avatar: this.localProfile.avatar,
      color: this.localProfile.color,
      hat: this.localProfile.hat,
      merits: this.localProfile.merits,
      weapon: this.localProfile.weapon,
      defeatUntil: this.localProfile.defeatUntil,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      facing: 1,
      isMoving: false,
      action: 'idle',
      lastActionTime: Date.now(),
      isLocal: true,
    };
    this.players.set(this.localProfile.id, localPlayer);
    this.notifyListListeners();

    // Generate local fallback orbs in case offline/initial
    if (this.activeOrbs.size === 0) {
      const initialOrbs = this.generateLocalOrbs();
      for (const orb of initialOrbs) {
        this.activeOrbs.set(orb.id, orb);
      }
      this.notifyOrbsListeners();
    }

    // Start WebSocket
    this.initWebSocket();
  }

  private generateLocalOrbs(): MeritOrb[] {
    const list: MeritOrb[] = [];
    // Blessing items (+merits) vs Weapon items (-merits: gun, hammer, knife)
    const types: ('lotus' | 'sparkle' | 'orb' | 'gun' | 'hammer' | 'knife')[] = [
      'lotus', 'lotus', 'sparkle', 'sparkle', 'orb', 'orb',
      'gun', 'hammer', 'knife'
    ];
    for (let i = 0; i < 45; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      let val = 1;
      if (t === 'lotus') val = 2;
      else if (t === 'gun') val = -10; // Súng: -10 Công Đức
      else if (t === 'hammer') val = -5; // Búa: -5 Công Đức
      else if (t === 'knife') val = -3; // Dao: -3 Công Đức

      list.push({
        id: `local_orb_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        x: Math.floor(200 + Math.random() * 3200),
        y: Math.floor(250 + Math.random() * 1750),
        value: val,
        type: t,
        created: Date.now(),
      });
    }
    return list;
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        const socket = this.ws;
        this.ws = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      } catch {
        // ignore
      }
    }
    this.isConnected = false;
  }

  private initWebSocket() {
    if (typeof window === 'undefined') return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/plaza-ws`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.isConnected = true;
        const local = this.players.get(this.localProfile.id);
        if (local) {
          socket.send(
            JSON.stringify({
              type: 'join',
              player: {
                id: local.id,
                name: local.name,
                avatar: local.avatar,
                color: local.color,
                hat: local.hat,
                merits: local.merits,
                defeatUntil: local.defeatUntil,
                x: local.x,
                y: local.y,
                vx: local.vx,
                vy: local.vy,
                facing: local.facing,
                isMoving: local.isMoving,
                action: local.action,
              },
            })
          );
        }
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const msg = JSON.parse(event.data);
          this.handlePeerMessage(msg);
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        if (this.ws === socket) {
          this.ws = null;
          this.isConnected = false;
          // Auto-reconnect after 2.5s
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = window.setTimeout(() => {
            this.initWebSocket();
          }, 2500);
        }
      };

      socket.onerror = () => {
        if (this.ws === socket) {
          this.isConnected = false;
        }
      };
    } catch (e) {
      console.warn('Could not establish WebSocket, running in local channel mode:', e);
    }
  }

  private sendNetworkMessage(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch {
        // ignore
      }
    }

    // Also broadcast on local channel for instant cross-tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {
        // ignore
      }
    }
  }

  private handlePeerMessage(msg: any) {
    if (!msg || !msg.type) return;

    if (msg.type === 'welcome') {
      if (Array.isArray(msg.players)) {
        for (const p of msg.players) {
          if (p.id !== this.localProfile.id) {
            this.players.set(p.id, {
              ...p,
              merits: typeof p.merits === 'number' ? p.merits : 5,
              weapon: p.weapon || null,
              defeatUntil: p.defeatUntil || 0,
              isLocal: false,
              lastActionTime: Date.now(),
            });
          }
        }
        this.notifyListListeners();
      }

      if (Array.isArray(msg.orbs) && msg.orbs.length > 0) {
        this.activeOrbs.clear();
        for (const orb of msg.orbs) {
          this.activeOrbs.set(orb.id, orb);
        }
        this.notifyOrbsListeners();
      }

      if (Array.isArray(msg.wishes) && msg.wishes.length > 0) {
        this.activeWishes.clear();
        for (const w of msg.wishes) {
          this.activeWishes.set(w.id, w);
        }
      }
    } else if (msg.type === 'player_joined') {
      if (msg.player && msg.player.id !== this.localProfile.id) {
        this.players.set(msg.player.id, {
          ...msg.player,
          merits: typeof msg.player.merits === 'number' ? msg.player.merits : 5,
          weapon: msg.player.weapon || null,
          defeatUntil: msg.player.defeatUntil || 0,
          isLocal: false,
          lastActionTime: Date.now(),
        });
        this.notifyListListeners();
      }
    } else if (msg.type === 'player_left') {
      if (msg.id && msg.id !== this.localProfile.id) {
        this.players.delete(msg.id);
        this.notifyListListeners();
      }
    } else if (msg.type === 'player_moved') {
      if (msg.id && msg.id !== this.localProfile.id) {
        const p = this.players.get(msg.id);
        if (p) {
          p.x = msg.x;
          p.y = msg.y;
          p.vx = msg.vx;
          p.vy = msg.vy;
          p.facing = msg.facing;
          p.isMoving = msg.isMoving;
        }
        // Direct move notification to canvas without full React re-render!
        for (const cb of this.moveListeners) {
          cb(msg.id, msg.x, msg.y, msg.vx, msg.vy, msg.facing, msg.isMoving);
        }
      }
    } else if (msg.type === 'player_action') {
      if (msg.id) {
        const p = this.players.get(msg.id);
        if (p) {
          p.action = msg.action;
          p.lastActionTime = Date.now();
        }
        for (const cb of this.actionListeners) {
          cb(msg.id, msg.action);
        }
      }
    } else if (msg.type === 'player_chat') {
      if (msg.id) {
        const p = this.players.get(msg.id);
        // If under defeat lockout ("1 phút không thể đè"), ignore normal chat
        if (p && p.defeatUntil && p.defeatUntil > Date.now()) {
          return;
        }

        const senderName = msg.name || (p ? p.name : 'Đạo Hữu');
        if (p) {
          p.chatText = msg.text;
          p.chatTime = Date.now();
        }
        for (const cb of this.chatListeners) {
          cb(msg.id, senderName, msg.text);
        }
      }
    } else if (msg.type === 'orb_looted') {
      const { orbId, playerId, value, totalMerits, weapon } = msg;
      this.activeOrbs.delete(orbId);
      this.notifyOrbsListeners();

      const p = this.players.get(playerId);
      if (p) {
        p.merits = totalMerits;
        if (weapon !== undefined) {
          p.weapon = weapon;
        }
        if (p.id === this.localProfile.id) {
          this.localProfile.merits = totalMerits;
          if (weapon !== undefined) this.localProfile.weapon = weapon;
          try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
        }
        this.notifyListListeners();
      }

      for (const cb of this.orbLootedListeners) {
        cb(orbId, playerId, value, totalMerits);
      }
    } else if (msg.type === 'orb_spawned') {
      if (msg.orb && msg.orb.id) {
        this.activeOrbs.set(msg.orb.id, msg.orb);
        this.notifyOrbsListeners();
      }
    } else if (msg.type === 'combat_invite_received') {
      if (msg.invite && msg.invite.targetId === this.localProfile.id) {
        for (const cb of this.inviteListeners) {
          cb(msg.invite);
        }
      }
    } else if (msg.type === 'combat_invite') {
      // Peer-to-peer / BroadcastChannel fallback
      if (msg.targetId === this.localProfile.id) {
        const challenger = this.players.get(msg.challengerId);
        const invite: CombatInvite = {
          id: msg.inviteId || `inv_${Date.now()}`,
          challengerId: msg.challengerId,
          challengerName: challenger?.name || msg.challengerName || 'Đạo Hữu',
          challengerAvatar: challenger?.avatar || msg.challengerAvatar || '🪷',
          targetId: this.localProfile.id,
          targetName: this.localProfile.name,
          timestamp: Date.now(),
        };
        for (const cb of this.inviteListeners) {
          cb(invite);
        }
      }
    } else if (msg.type === 'combat_accept') {
      // BroadcastChannel peer-to-peer fallback for duel start
      if (msg.challengerId === this.localProfile.id) {
        const pA = this.players.get(this.localProfile.id);
        const pB = this.players.get(msg.targetId);
        if (pA && pB) {
          const duel: ActiveCombatSession = {
            duelId: `duel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            playerAId: pA.id,
            playerBId: pB.id,
            playerAName: pA.name,
            playerBName: pB.name,
            playerAAvatar: pA.avatar,
            playerBAvatar: pB.avatar,
            playerATaps: 0,
            playerBTaps: 0,
            startTime: Date.now() + 1500,
            duration: 6000,
          };
          this.sendNetworkMessage({ type: 'combat_started', duel });
          for (const cb of this.startListeners) {
            cb(duel);
          }
        }
      }
    } else if (msg.type === 'combat_started') {
      if (msg.duel) {
        // Only trigger duel start for participating players (Player A or Player B)
        const myId = this.localProfile.id;
        if (msg.duel.playerAId === myId || msg.duel.playerBId === myId) {
          for (const cb of this.startListeners) {
            cb(msg.duel);
          }
        }
      }
    } else if (msg.type === 'combat_tapped') {
      for (const cb of this.duelTapListeners) {
        cb(msg.duelId, msg.playerId, msg.playerATaps || 0, msg.playerBTaps || 0);
      }
    } else if (msg.type === 'combat_declined') {
      for (const cb of this.declineListeners) {
        cb(msg.inviteId, msg.targetName || 'Đạo Hữu');
      }
    } else if (msg.type === 'combat_result' || msg.type === 'combat_finish' || msg.type === 'combat_clash') {
      this.handleCombatResult(msg);
    } else if (msg.type === 'player_updated') {
      if (msg.id && msg.id !== this.localProfile.id) {
        const p = this.players.get(msg.id);
        if (p) {
          if (msg.name) p.name = msg.name;
          if (msg.avatar !== undefined) p.avatar = msg.avatar;
          if (msg.color) p.color = msg.color;
          if (msg.hat) p.hat = msg.hat;
          if (typeof msg.merits === 'number') p.merits = msg.merits;
          if (msg.weapon !== undefined) p.weapon = msg.weapon;
          this.notifyListListeners();
        }
      }
    } else if (msg.type === 'fish_released') {
      const fishEvent: ReleasedFishEvent = {
        id: msg.id,
        fishType: msg.fishType,
        lakeId: msg.lakeId,
        x: msg.x,
        y: msg.y,
        releasedBy: msg.releasedBy,
      };
      for (const cb of this.fishReleasedListeners) {
        cb(fishEvent);
      }
    } else if (msg.type === 'bodhi_wish_created') {
      if (msg.ribbon) {
        this.activeWishes.set(msg.ribbon.id, msg.ribbon);
        if (msg.authorId === this.localProfile.id && typeof msg.newMerits === 'number') {
          this.localProfile.merits = msg.newMerits;
          const local = this.players.get(this.localProfile.id);
          if (local) local.merits = msg.newMerits;
          try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
          this.notifyListListeners();
        }
        for (const cb of this.wishCreatedListeners) {
          cb(msg.ribbon, msg.newMerits);
        }
      }
    } else if (msg.type === 'bodhi_wish_rejoiced') {
      const ribbon = this.activeWishes.get(msg.ribbonId);
      if (ribbon) {
        ribbon.rejoiceCount = msg.rejoiceCount;
        if (msg.rejoicedBy && !ribbon.rejoicedBy.includes(msg.rejoicedBy)) {
          ribbon.rejoicedBy.push(msg.rejoicedBy);
        }
      }
      if (msg.rejoicedBy === this.localProfile.id && typeof msg.readerMerits === 'number') {
        this.localProfile.merits = msg.readerMerits;
        const local = this.players.get(this.localProfile.id);
        if (local) local.merits = msg.readerMerits;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
        this.notifyListListeners();
      } else if (msg.authorId === this.localProfile.id && typeof msg.authorMerits === 'number') {
        this.localProfile.merits = msg.authorMerits;
        const local = this.players.get(this.localProfile.id);
        if (local) local.merits = msg.authorMerits;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
        this.notifyListListeners();
      }
      for (const cb of this.wishRejoicedListeners) {
        cb(msg.ribbonId, msg.rejoiceCount, msg.rejoicedBy, msg.readerMerits);
      }
    } else if (msg.type === 'social_event_broadcast') {
      const { senderId, senderName, targetId, targetName, action, senderMerits, targetMerits } = msg;
      if (senderId === this.localProfile.id && typeof senderMerits === 'number') {
        this.localProfile.merits = senderMerits;
        const local = this.players.get(this.localProfile.id);
        if (local) local.merits = senderMerits;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
      }
      if (targetId === this.localProfile.id && typeof targetMerits === 'number') {
        this.localProfile.merits = targetMerits;
        const local = this.players.get(this.localProfile.id);
        if (local) local.merits = targetMerits;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
      }

      const sPlayer = this.players.get(senderId);
      if (sPlayer && typeof senderMerits === 'number') sPlayer.merits = senderMerits;
      const tPlayer = this.players.get(targetId);
      if (tPlayer && typeof targetMerits === 'number') tPlayer.merits = targetMerits;
      this.notifyListListeners();

      for (const cb of this.socialEventListeners) {
        cb(senderId, senderName, targetId, targetName, action, senderMerits, targetMerits);
      }
    } else if (msg.type === 'meditation_reward_broadcast') {
      const { playerIds, bonus } = msg;
      if (Array.isArray(playerIds)) {
        for (const pid of playerIds) {
          const p = this.players.get(pid);
          if (p) p.merits = (p.merits || 0) + bonus;
          if (pid === this.localProfile.id) {
            this.localProfile.merits = (this.localProfile.merits || 0) + bonus;
            try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
          }
        }
        this.notifyListListeners();
        for (const cb of this.meditationRewardListeners) {
          cb(playerIds, bonus);
        }
      }
    }
  }

  // Loot a Merit Orb / Item on Map
  public lootOrb(orbId: string) {
    const orb = this.activeOrbs.get(orbId);
    if (!orb) return;

    // Remove locally
    this.activeOrbs.delete(orbId);
    this.notifyOrbsListeners();

    const local = this.players.get(this.localProfile.id);
    const addedVal = orb.value ?? 1;

    if (local) {
      if (orb.type === 'gun' || orb.type === 'hammer' || orb.type === 'knife') {
        // Nhặt vũ khí (súng, búa, dao) bị trừ công đức (cho phép âm công đức)!
        const penalty = Math.abs(addedVal);
        local.merits = (local.merits || 0) - penalty;
        local.weapon = orb.type;
        this.localProfile.weapon = orb.type;
      } else {
        local.merits = (local.merits || 0) + addedVal;
        // Nhặt hoa sen thanh tịnh hóa giải hung khí đang cầm
        if (orb.type === 'lotus' && local.weapon) {
          local.weapon = null;
          this.localProfile.weapon = null;
        }
      }
      this.localProfile.merits = local.merits;
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
      this.notifyListListeners();
    }

    // Send loot event to server & broadcast
    this.sendNetworkMessage({
      type: 'loot_orb',
      orbId,
      playerId: this.localProfile.id,
      value: addedVal,
      itemType: orb.type,
      weapon: local?.weapon ?? null,
    });

    for (const cb of this.orbLootedListeners) {
      cb(orbId, this.localProfile.id, addedVal, this.localProfile.merits);
    }
  }

  // 1v1 Combat Challenge Invite (Handshake: requires mutual acceptance)
  public sendCombatInvite(targetId: string): boolean {
    const local = this.players.get(this.localProfile.id);
    const target = this.players.get(targetId);
    if (!local || !target) return false;

    const now = Date.now();
    // Cannot challenge if either player is in 1-minute defeat lockout
    if (local.defeatUntil && local.defeatUntil > now) {
      return false;
    }
    if (target.defeatUntil && target.defeatUntil > now) {
      return false;
    }

    // Proximity check (within ~180px)
    const dist = Math.hypot(local.x - target.x, local.y - target.y);
    if (dist > 220) return false;

    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.sendNetworkMessage({
      type: 'combat_invite',
      inviteId,
      targetId,
      challengerId: this.localProfile.id,
      challengerName: this.localProfile.name,
      challengerAvatar: this.localProfile.avatar,
    });
    return true;
  }

  // Backward compatibility alias for initiateCombat
  public initiateCombat(targetId: string): boolean {
    return this.sendCombatInvite(targetId);
  }

  // Accept incoming combat invitation
  public acceptCombatInvite(inviteId: string, challengerId?: string) {
    this.sendNetworkMessage({
      type: 'combat_accept',
      inviteId,
      challengerId,
      targetId: this.localProfile.id,
    });
  }

  // Decline incoming combat invitation
  public declineCombatInvite(inviteId: string) {
    this.sendNetworkMessage({
      type: 'combat_decline',
      inviteId,
      targetId: this.localProfile.id,
    });
  }

  // Send a tap during an active 1v1 duel
  public sendCombatTap(duelId: string) {
    this.sendNetworkMessage({
      type: 'combat_tap',
      duelId,
      playerId: this.localProfile.id,
    });
  }

  // Finish 1v1 Combat Duel (Winner +10 Merits, Loser -5 Merits, 60s defeat bubble; Or Draw: +2 Merits both)
  public finishCombatDuel(
    duelId: string,
    winnerId: string | null,
    loserId: string | null,
    winnerTaps: number,
    loserTaps: number,
    isDraw?: boolean,
    challengerId?: string,
    targetId?: string
  ) {
    if (isDraw) {
      const pAId = challengerId || winnerId || this.localProfile.id;
      const pBId = targetId || loserId || '';
      const pA = this.players.get(pAId);
      const pB = this.players.get(pBId);
      const drawBonus = 2;

      const result: CombatResult = {
        duelId,
        challengerId: pAId,
        challengerName: pA?.name || 'Đạo Hữu',
        targetId: pBId,
        targetName: pB?.name || 'Đạo Hữu',
        winnerId: null,
        loserId: null,
        isDraw: true,
        drawTaps: winnerTaps,
        drawMeritsBonus: drawBonus,
        meritsTransferred: 0,
        winnerMeritsGain: 0,
        loserMeritsLoss: 0,
        defeatUntil: 0,
      };

      this.sendNetworkMessage({
        type: 'combat_finish',
        ...result,
      });

      this.handleCombatResult(result);
      return;
    }

    const winner = winnerId ? this.players.get(winnerId) : null;
    const loser = loserId ? this.players.get(loserId) : null;
    const defeatExpiry = Date.now() + 60000;
    const winnerMeritsGain = 10;
    const loserMeritsLoss = 5;

    const result: CombatResult = {
      duelId,
      challengerId: challengerId || winnerId || this.localProfile.id,
      challengerName: winner?.name || 'Đạo Hữu',
      targetId: targetId || loserId || '',
      targetName: loser?.name || 'Đạo Hữu',
      winnerId: winnerId || null,
      loserId: loserId || null,
      winnerTaps,
      loserTaps,
      isDraw: false,
      meritsTransferred: 0,
      winnerMeritsGain,
      loserMeritsLoss, // Người thua bị trừ 5 Công Đức
      defeatUntil: defeatExpiry,
    };

    this.sendNetworkMessage({
      type: 'combat_finish',
      ...result,
    });

    this.handleCombatResult(result);
  }

  // Process combat result on any client
  private handleCombatResult(result: any) {
    if (result.isDraw) {
      // RULE: Khi Hòa, cả 2 cùng nhận +2 Công Đức giao duyên, không ai bị khóa defeat
      const bonus = result.drawMeritsBonus ?? 2;
      const pAId = result.challengerId;
      const pBId = result.targetId;

      const pA = pAId ? this.players.get(pAId) : null;
      const pB = pBId ? this.players.get(pBId) : null;

      if (pA) {
        pA.merits = typeof result.playerAMerits === 'number' ? result.playerAMerits : (pA.merits || 0) + bonus;
        if (pA.id === this.localProfile.id) {
          this.localProfile.merits = pA.merits;
          try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
        }
      }

      if (pB) {
        pB.merits = typeof result.playerBMerits === 'number' ? result.playerBMerits : (pB.merits || 0) + bonus;
        if (pB.id === this.localProfile.id) {
          this.localProfile.merits = pB.merits;
          try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
        }
      }

      this.notifyListListeners();

      for (const cb of this.combatListeners) {
        cb(result);
      }
      return;
    }

    // Win / Loss resolution:
    const winner = result.winnerId ? this.players.get(result.winnerId) : null;
    const loser = result.loserId ? this.players.get(result.loserId) : null;

    const gain = result.winnerMeritsGain ?? 10;
    const loss = result.loserMeritsLoss ?? 5;

    if (winner) {
      winner.merits = typeof result.winnerMerits === 'number' ? result.winnerMerits : (winner.merits || 0) + gain;
      if (winner.id === this.localProfile.id) {
        this.localProfile.merits = winner.merits;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
      }
    }

    if (loser) {
      // RULE: Loser bị trừ công đức (cho phép âm)!
      loser.merits = typeof result.loserMerits === 'number'
        ? result.loserMerits
        : (loser.merits || 0) - loss;
      loser.defeatUntil = result.defeatUntil;
      // Loser cannot overwrite speech bubble ("1 phút không thể đè")
      loser.chatText = undefined;

      if (loser.id === this.localProfile.id) {
        this.localProfile.merits = loser.merits;
        this.localProfile.defeatUntil = result.defeatUntil;
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
      }
    }

    this.notifyListListeners();

    for (const cb of this.combatListeners) {
      cb(result);
    }
  }

  // Update local player position & broadcast
  public sendLocalMove(x: number, y: number, vx: number, vy: number, facing: 1 | -1, isMoving: boolean) {
    const local = this.players.get(this.localProfile.id);
    if (!local) return;

    local.x = x;
    local.y = y;
    local.vx = vx;
    local.vy = vy;
    local.facing = facing;
    local.isMoving = isMoving;

    this.sendNetworkMessage({
      type: 'move',
      id: local.id,
      x,
      y,
      vx,
      vy,
      facing,
      isMoving,
    });
  }

  // Perform interactive action
  public sendLocalAction(action: StickmanAction) {
    const local = this.players.get(this.localProfile.id);
    if (!local) return;

    local.action = action;
    local.lastActionTime = Date.now();

    this.sendNetworkMessage({
      type: 'action',
      id: local.id,
      action,
    });
  }

  // Send speech bubble chat (returns false if locked under 1-minute defeat)
  public sendChat(text: string): boolean {
    const now = Date.now();
    // Cannot send normal chat while under 1-minute defeat lockout ("không thể đè")
    if (this.localProfile.defeatUntil && this.localProfile.defeatUntil > now) {
      return false;
    }

    const trimmed = text.trim().substring(0, 50);
    if (!trimmed) return false;

    const local = this.players.get(this.localProfile.id);
    if (local) {
      local.chatText = trimmed;
      local.chatTime = Date.now();
    }

    this.sendNetworkMessage({
      type: 'chat',
      id: this.localProfile.id,
      name: this.localProfile.name,
      avatar: this.localProfile.avatar,
      text: trimmed,
    });

    // Notify local chat listener too
    for (const cb of this.chatListeners) {
      cb(this.localProfile.id, this.localProfile.name, trimmed);
    }
    return true;
  }

  public onPlayerMove(cb: MoveListener): () => void {
    this.moveListeners.add(cb);
    return () => this.moveListeners.delete(cb);
  }

  public onPlayerAction(cb: ActionListener): () => void {
    this.actionListeners.add(cb);
    return () => this.actionListeners.delete(cb);
  }

  public onPlayerChat(cb: ChatListener): () => void {
    this.chatListeners.add(cb);
    return () => this.chatListeners.delete(cb);
  }

  public onPlayersListChange(cb: ListListener): () => void {
    this.listListeners.add(cb);
    cb(Array.from(this.players.values()));
    return () => this.listListeners.delete(cb);
  }

  public onOrbsChange(cb: OrbsListener): () => void {
    this.orbsListeners.add(cb);
    cb(Array.from(this.activeOrbs.values()));
    return () => this.orbsListeners.delete(cb);
  }

  public onOrbLooted(cb: OrbLootedListener): () => void {
    this.orbLootedListeners.add(cb);
    return () => this.orbLootedListeners.delete(cb);
  }

  public onCombatResult(cb: CombatResultListener): () => void {
    this.combatListeners.add(cb);
    return () => this.combatListeners.delete(cb);
  }

  public onCombatInviteReceived(cb: CombatInviteListener): () => void {
    this.inviteListeners.add(cb);
    return () => this.inviteListeners.delete(cb);
  }

  public onCombatStarted(cb: CombatStartListener): () => void {
    this.startListeners.add(cb);
    return () => this.startListeners.delete(cb);
  }

  public onCombatTapped(cb: CombatTapListener): () => void {
    this.duelTapListeners.add(cb);
    return () => this.duelTapListeners.delete(cb);
  }

  public onCombatDeclined(cb: CombatDeclinedListener): () => void {
    this.declineListeners.add(cb);
    return () => this.declineListeners.delete(cb);
  }

  // Release Fish (Phóng Sinh Cá)
  public releaseFish(fishType: FishTypeId, cost: number, lakeId: 'lotus_pond' | 'liberation_pond', x: number, y: number): boolean {
    const local = this.players.get(this.localProfile.id);
    const currentMerits = Math.max(local?.merits ?? 0, this.localProfile.merits ?? 0);

    const newMerits = currentMerits - cost;
    if (local) {
      local.merits = newMerits;
    }
    this.localProfile.merits = newMerits;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(this.localProfile)); } catch {}
    this.notifyListListeners();

    const fishEvent: ReleasedFishEvent = {
      id: `fish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fishType,
      lakeId,
      x,
      y,
      releasedBy: this.localProfile.name,
    };

    // Notify local listeners
    for (const cb of this.fishReleasedListeners) {
      cb(fishEvent);
    }

    // Send across network
    this.sendNetworkMessage({
      type: 'release_fish',
      fishType,
      cost,
      lakeId,
      x,
      y,
      releasedBy: this.localProfile.name,
    });

    return true;
  }

  public onFishReleased(cb: FishReleasedListener): () => void {
    this.fishReleasedListeners.add(cb);
    return () => this.fishReleasedListeners.delete(cb);
  }

  private notifyListListeners() {
    const list = Array.from(this.players.values());
    for (const cb of this.listListeners) {
      cb(list);
    }
  }

  private notifyOrbsListeners() {
    const list = Array.from(this.activeOrbs.values());
    for (const cb of this.orbsListeners) {
      cb(list);
    }
  }

  public getOnlineCount(): number {
    return this.players.size;
  }
}

export const plazaService = new PlazaService();

