import type { Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import type { BodhiWishRibbon, WishRibbonColor, SocialActionType } from '../types/zen';

export interface PlazaPlayerState {
  id: string;
  name: string;
  avatar: string;
  color: string;
  hat: string;
  weapon?: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  isMoving: boolean;
  action: string;
  chatText?: string;
  chatTime?: number;
  lastSeen: number;
  merits: number;
  defeatUntil?: number;
}

export interface ServerMeritOrb {
  id: string;
  x: number;
  y: number;
  value: number;
  type: 'lotus' | 'sparkle' | 'orb' | 'gun' | 'hammer' | 'knife';
  created: number;
}

function generateRandomOrb(): ServerMeritOrb {
  const types: ('lotus' | 'sparkle' | 'orb' | 'gun' | 'hammer' | 'knife')[] = [
    'lotus', 'lotus', 'sparkle', 'sparkle', 'orb', 'orb',
    'gun', 'hammer', 'knife'
  ];
  const t = types[Math.floor(Math.random() * types.length)];
  let value = 1;
  if (t === 'lotus') value = 2;
  else if (t === 'gun') value = -10; // Súng: -10 Công Đức
  else if (t === 'hammer') value = -5; // Búa: -5 Công Đức
  else if (t === 'knife') value = -3; // Dao: -3 Công Đức

  return {
    id: `orb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    x: Math.floor(200 + Math.random() * 3200),
    y: Math.floor(250 + Math.random() * 1750),
    value,
    type: t,
    created: Date.now(),
  };
}

export function zenPlazaWsPlugin(): Plugin {
  return {
    name: 'zen-plaza-ws-plugin',
    configureServer(server) {
      if (!server.httpServer) return;

      const wss = new WebSocketServer({ noServer: true });
      const players = new Map<string, { ws: WebSocket; state: PlazaPlayerState }>();
      const activeOrbs = new Map<string, ServerMeritOrb>();
      const activeInvites = new Map<string, any>();
      const activeDuels = new Map<string, any>();
      const activeWishes = new Map<string, BodhiWishRibbon>();

      // Initialize default sacred ribbons on the ancient Bodhi tree
      const DEFAULT_WISHES: BodhiWishRibbon[] = [
        {
          id: 'wish_init_1',
          senderId: 'abbot_zen',
          senderName: 'Sư Phụ Tu Viện',
          color: 'yellow',
          wishText: 'Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sinh, đều trọn thành Phật đạo 🙏',
          createdAt: Date.now() - 3600000 * 5,
          rejoiceCount: 18,
          rejoicedBy: [],
          branchIndex: 2,
        },
        {
          id: 'wish_init_2',
          senderId: 'abbot_zen',
          senderName: 'Tịnh Tâm Cư Sĩ',
          color: 'red',
          wishText: 'Cầu quốc thái dân an, mưa thuận gió hòa, bách gia trăm họ an khang thịnh vượng ✨',
          createdAt: Date.now() - 3600000 * 3,
          rejoiceCount: 12,
          rejoicedBy: [],
          branchIndex: 7,
        },
        {
          id: 'wish_init_3',
          senderId: 'abbot_zen',
          senderName: 'Liên Hoa Đạo Hữu',
          color: 'blue',
          wishText: 'Tâm an vạn sự an. Nguyện cho gia đình luôn khỏe mạnh, bình an và yêu thương nhau 🪷',
          createdAt: Date.now() - 3600000 * 2,
          rejoiceCount: 9,
          rejoicedBy: [],
          branchIndex: 11,
        },
      ];
      for (const w of DEFAULT_WISHES) {
        activeWishes.set(w.id, w);
      }

      // Initialize 45 scattered merit orbs across the grand monastery
      for (let i = 0; i < 45; i++) {
        const orb = generateRandomOrb();
        activeOrbs.set(orb.id, orb);
      }

      server.httpServer.on('upgrade', (req, socket, head) => {
        const url = req.url || '';
        if (url.startsWith('/plaza-ws')) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        }
      });

      wss.on('connection', (ws: WebSocket) => {
        let currentId: string | null = null;

        // Periodic ping
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        }, 15000);

        ws.on('message', (raw: Buffer | string) => {
          try {
            const msg = JSON.parse(raw.toString());

            if (msg.type === 'join') {
              const pid = String(msg.player?.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
              currentId = pid;
              let initialMerits = typeof msg.player?.merits === 'number' ? msg.player.merits : 5;
              // Chống sửa điểm F12: Giới hạn điểm khởi tạo hợp lý, không cho phép client tự buff hàng triệu điểm
              if (initialMerits > 150 || initialMerits < -100) {
                initialMerits = 20;
              }
              const playerState: PlazaPlayerState = {
                ...msg.player,
                id: pid,
                merits: initialMerits,
                weapon: msg.player?.weapon || null,
                defeatUntil: msg.player?.defeatUntil || 0,
                lastSeen: Date.now(),
              };
              players.set(pid, { ws, state: playerState });

              // Send list of all existing players, active merit orbs, and Bodhi wishes to newcomer
              const all = Array.from(players.values()).map((p) => p.state);
              const allOrbs = Array.from(activeOrbs.values());
              const allWishes = Array.from(activeWishes.values());
              ws.send(JSON.stringify({
                type: 'welcome',
                yourId: pid,
                players: all,
                orbs: allOrbs,
                wishes: allWishes
              }));
              }));

              // Broadcast new player to all other connected peers
              const joinPayload = JSON.stringify({ type: 'player_joined', player: playerState });
              for (const [id, client] of players.entries()) {
                if (id !== pid && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(joinPayload);
                }
              }
            } else if (msg.type === 'move') {
              if (currentId) {
                let p = players.get(currentId);
                if (!p) {
                  // Auto-recover player state on server if temporarily evicted
                  const recoveredState: PlazaPlayerState = {
                    id: currentId,
                    name: 'Đạo Hữu',
                    avatar: '🪷',
                    color: '#f59e0b',
                    hat: 'non_la',
                    weapon: null,
                    x: msg.x,
                    y: msg.y,
                    vx: msg.vx,
                    vy: msg.vy,
                    facing: msg.facing,
                    isMoving: msg.isMoving,
                    action: 'idle',
                    lastSeen: Date.now(),
                    merits: 5,
                  };
                  p = { ws, state: recoveredState };
                  players.set(currentId, p);

                  const joinPayload = JSON.stringify({ type: 'player_joined', player: recoveredState });
                  for (const [id, client] of players.entries()) {
                    if (id !== currentId && client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(joinPayload);
                    }
                  }
                }

                p.ws = ws;
                p.state.x = msg.x;
                p.state.y = msg.y;
                p.state.vx = msg.vx;
                p.state.vy = msg.vy;
                p.state.facing = msg.facing;
                p.state.isMoving = msg.isMoving;
                p.state.lastSeen = Date.now();

                const movePayload = JSON.stringify({
                  type: 'player_moved',
                  id: currentId,
                  x: msg.x,
                  y: msg.y,
                  vx: msg.vx,
                  vy: msg.vy,
                  facing: msg.facing,
                  isMoving: msg.isMoving,
                });
                for (const [id, client] of players.entries()) {
                  if (id !== currentId && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(movePayload);
                  }
                }
              }
            } else if (msg.type === 'action') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                p.state.action = msg.action;
                p.state.lastSeen = Date.now();

                const actPayload = JSON.stringify({
                  type: 'player_action',
                  id: currentId,
                  action: msg.action,
                });
                for (const [id, client] of players.entries()) {
                  if (id !== currentId && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(actPayload);
                  }
                }
              }
            } else if (msg.type === 'chat') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                // Check if currently under 1-minute defeat lockout ("không thể đè")
                if (p.state.defeatUntil && p.state.defeatUntil > Date.now()) {
                  // Cannot overwrite defeat bubble during the 1 minute penalty!
                  return;
                }

                p.state.chatText = msg.text;
                p.state.chatTime = Date.now();
                p.state.lastSeen = Date.now();

                const chatPayload = JSON.stringify({
                  type: 'player_chat',
                  id: currentId,
                  name: p.state.name,
                  avatar: p.state.avatar,
                  text: msg.text,
                });
                for (const client of players.values()) {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(chatPayload);
                  }
                }
              }
            } else if (msg.type === 'loot_orb') {
              if (currentId && players.has(currentId)) {
                const orbId = msg.orbId;
                const orb = activeOrbs.get(orbId);
                if (orb) {
                  activeOrbs.delete(orbId);
                  const p = players.get(currentId)!;
                  const addedVal = orb.value ?? 1;
                  const isWeapon = orb.type === 'gun' || orb.type === 'hammer' || orb.type === 'knife';

                  if (isWeapon) {
                    // Nhặt vũ khí bị trừ công đức (cho phép âm công đức)!
                    const penalty = Math.abs(addedVal);
                    p.state.merits = (p.state.merits || 0) - penalty;
                    p.state.weapon = orb.type;
                  } else {
                    p.state.merits = (p.state.merits || 0) + addedVal;
                    // Nhặt hoa sen thanh tịnh hóa giải hung khí đang cầm
                    if (orb.type === 'lotus' && p.state.weapon) {
                      p.state.weapon = null;
                    }
                  }
                  p.state.lastSeen = Date.now();

                  // Broadcast orb looted event
                  const lootPayload = JSON.stringify({
                    type: 'orb_looted',
                    orbId,
                    playerId: currentId,
                    value: addedVal,
                    totalMerits: p.state.merits,
                    itemType: orb.type,
                    weapon: p.state.weapon || null,
                  });
                  for (const client of players.values()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(lootPayload);
                    }
                  }

                  // Spawn replacement orb after 7 seconds
                  setTimeout(() => {
                    const newOrb = generateRandomOrb();
                    activeOrbs.set(newOrb.id, newOrb);
                    const spawnPayload = JSON.stringify({
                      type: 'orb_spawned',
                      orb: newOrb,
                    });
                    for (const c of players.values()) {
                      if (c.ws.readyState === WebSocket.OPEN) {
                        c.ws.send(spawnPayload);
                      }
                    }
                  }, 7000);
                }
              }
            } else if (msg.type === 'combat_invite') {
              // 1. Challenger sends invite to target
              if (!currentId) return;
              const targetId = msg.targetId;
              const challenger = players.get(currentId);
              const target = targetId ? players.get(targetId) : undefined;

              if (challenger && target) {
                const now = Date.now();
                if ((challenger.state.defeatUntil && challenger.state.defeatUntil > now) ||
                    (target.state.defeatUntil && target.state.defeatUntil > now)) {
                  // Cannot challenge if either is defeated
                  return;
                }

                const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const invite = {
                  id: inviteId,
                  challengerId: challenger.state.id,
                  challengerName: challenger.state.name,
                  challengerAvatar: challenger.state.avatar,
                  targetId: target.state.id,
                  targetName: target.state.name,
                  timestamp: now,
                };
                activeInvites.set(inviteId, invite);

                // Send to target
                if (target.ws.readyState === WebSocket.OPEN) {
                  target.ws.send(JSON.stringify({
                    type: 'combat_invite_received',
                    invite,
                  }));
                }

                // Confirm to challenger
                if (challenger.ws.readyState === WebSocket.OPEN) {
                  challenger.ws.send(JSON.stringify({
                    type: 'combat_invite_sent',
                    invite,
                  }));
                }

                // Auto-expire invite after 12s
                setTimeout(() => {
                  if (activeInvites.has(inviteId)) {
                    activeInvites.delete(inviteId);
                    if (challenger.ws.readyState === WebSocket.OPEN) {
                      challenger.ws.send(JSON.stringify({
                        type: 'combat_invite_expired',
                        inviteId,
                      }));
                    }
                  }
                }, 12000);
              }
            } else if (msg.type === 'combat_accept') {
              // 2. Target accepts invite -> Start 1v1 Tapping Arena Duel!
              const invite = activeInvites.get(msg.inviteId);
              if (invite) {
                activeInvites.delete(msg.inviteId);
                const pA = players.get(invite.challengerId);
                const pB = players.get(invite.targetId);

                if (pA && pB) {
                  const duelId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  const duelSession = {
                    duelId,
                    playerAId: pA.state.id,
                    playerBId: pB.state.id,
                    playerAName: pA.state.name,
                    playerBName: pB.state.name,
                    playerAAvatar: pA.state.avatar,
                    playerBAvatar: pB.state.avatar,
                    playerATaps: 0,
                    playerBTaps: 0,
                    startTime: Date.now() + 1500, // 1.5s countdown
                    duration: 6000, // 6 seconds tapping arena
                  };
                  activeDuels.set(duelId, duelSession);

                  const startPayload = JSON.stringify({
                    type: 'combat_started',
                    duel: duelSession,
                  });
                  // Only send combat_started to the two duel participants!
                  if (pA.ws.readyState === WebSocket.OPEN) {
                    pA.ws.send(startPayload);
                  }
                  if (pB.ws.readyState === WebSocket.OPEN) {
                    pB.ws.send(startPayload);
                  }
                }
              }
            } else if (msg.type === 'combat_decline') {
              // Target declines
              const invite = activeInvites.get(msg.inviteId);
              if (invite) {
                activeInvites.delete(msg.inviteId);
                const challenger = players.get(invite.challengerId);
                if (challenger && challenger.ws.readyState === WebSocket.OPEN) {
                  challenger.ws.send(JSON.stringify({
                    type: 'combat_declined',
                    inviteId: msg.inviteId,
                    targetName: invite.targetName,
                  }));
                }
              }
            } else if (msg.type === 'combat_tap') {
              // Tap during active duel
              const duel = activeDuels.get(msg.duelId);
              if (duel) {
                if (currentId === duel.playerAId) {
                  duel.playerATaps = (duel.playerATaps || 0) + 1;
                } else if (currentId === duel.playerBId) {
                  duel.playerBTaps = (duel.playerBTaps || 0) + 1;
                }

                const tapPayload = JSON.stringify({
                  type: 'combat_tapped',
                  duelId: duel.duelId,
                  playerId: currentId,
                  playerATaps: duel.playerATaps,
                  playerBTaps: duel.playerBTaps,
                });
                // Only send taps to the two duel participants!
                const pA = players.get(duel.playerAId);
                const pB = players.get(duel.playerBId);
                if (pA && pA.ws.readyState === WebSocket.OPEN) {
                  pA.ws.send(tapPayload);
                }
                if (pB && pB.ws.readyState === WebSocket.OPEN) {
                  pB.ws.send(tapPayload);
                }
              }
            } else if (msg.type === 'combat_finish' || msg.type === 'combat_clash') {
              // 1v1 Combat Resolution
              const duelId = msg.duelId;
              let winnerId = msg.winnerId;
              let loserId = msg.loserId;
              let winnerTaps = msg.winnerTaps || 0;
              let loserTaps = msg.loserTaps || 0;

              const duel = duelId ? activeDuels.get(duelId) : null;
              if (duel) {
                activeDuels.delete(duelId);
              }

              const isDraw = Boolean(
                msg.isDraw ||
                (duel && duel.playerATaps === duel.playerBTaps) ||
                (!winnerId && !loserId)
              );

              if (isDraw) {
                const drawTaps = duel ? duel.playerATaps : (msg.drawTaps ?? winnerTaps ?? 0);
                const pAId = duel?.playerAId || msg.challengerId || currentId;
                const pBId = duel?.playerBId || msg.targetId;

                const pAClient = pAId ? players.get(pAId) : undefined;
                const pBClient = pBId ? players.get(pBId) : undefined;

                // RULE: Hòa nhau -> Thưởng nhẹ +2 công đức giao duyên
                const drawBonus = 2;
                if (pAClient) pAClient.state.merits = (pAClient.state.merits || 0) + drawBonus;
                if (pBClient) pBClient.state.merits = (pBClient.state.merits || 0) + drawBonus;

                const resultPayload = JSON.stringify({
                  type: 'combat_result',
                  duelId,
                  isDraw: true,
                  drawTaps,
                  challengerId: pAId,
                  challengerName: duel?.playerAName || pAClient?.state.name || 'Đạo Hữu',
                  targetId: pBId,
                  targetName: duel?.playerBName || pBClient?.state.name || 'Đạo Hữu',
                  winnerId: null,
                  loserId: null,
                  drawMeritsBonus: drawBonus,
                  meritsTransferred: 0,
                  defeatUntil: 0,
                  winnerMeritsGain: 0,
                  loserMeritsLoss: 0,
                  playerAMerits: pAClient?.state.merits,
                  playerBMerits: pBClient?.state.merits,
                });

                for (const client of players.values()) {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(resultPayload);
                  }
                }
              } else {
                if (duel && (!winnerId || !loserId)) {
                  if (duel.playerATaps > duel.playerBTaps) {
                    winnerId = duel.playerAId;
                    loserId = duel.playerBId;
                    winnerTaps = duel.playerATaps;
                    loserTaps = duel.playerBTaps;
                  } else {
                    winnerId = duel.playerBId;
                    loserId = duel.playerAId;
                    winnerTaps = duel.playerBTaps;
                    loserTaps = duel.playerATaps;
                  }
                }

                // RULE:
                // Winner: +10 Công Đức
                // Loser: -5 Công Đức. Khóa bong bóng thất bại 1 phút không thể đè.
                const winnerMeritsGain = 10;
                const loserMeritsLoss = 5;
                const defeatExpiry = Date.now() + 60000; // 1 minute lockout

                const winnerClient = winnerId ? players.get(winnerId) : undefined;
                const loserClient = loserId ? players.get(loserId) : undefined;

                if (winnerClient) {
                  winnerClient.state.merits = (winnerClient.state.merits || 0) + winnerMeritsGain;
                }
                if (loserClient) {
                  loserClient.state.merits = (loserClient.state.merits || 0) - loserMeritsLoss;
                  loserClient.state.defeatUntil = defeatExpiry;
                  loserClient.state.chatText = undefined;
                }

                const resultPayload = JSON.stringify({
                  type: 'combat_result',
                  duelId,
                  isDraw: false,
                  challengerId: duel?.playerAId || msg.challengerId || winnerId,
                  challengerName: duel?.playerAName || winnerClient?.state.name || 'Đạo Hữu',
                  targetId: duel?.playerBId || msg.targetId || loserId,
                  targetName: duel?.playerBName || loserClient?.state.name || 'Đạo Hữu',
                  winnerId,
                  loserId,
                  winnerTaps,
                  loserTaps,
                  meritsTransferred: 0,
                  winnerMeritsGain,
                  loserMeritsLoss,
                  defeatUntil: defeatExpiry,
                  winnerMerits: winnerClient?.state.merits,
                  loserMerits: loserClient?.state.merits,
                });

                for (const client of players.values()) {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(resultPayload);
                  }
                }
              }
            } else if (msg.type === 'update_profile') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                if (msg.name) p.state.name = msg.name;
                if (msg.avatar !== undefined) p.state.avatar = msg.avatar;
                if (msg.color) p.state.color = msg.color;
                if (msg.hat) p.state.hat = msg.hat;
                // Chống sửa điểm F12: Server giữ quyền thẩm định duy nhất, không cho phép client tùy tiện ghi đè p.state.merits qua update_profile
                if (msg.weapon !== undefined) p.state.weapon = msg.weapon;

                const updPayload = JSON.stringify({
                  type: 'player_updated',
                  id: currentId,
                  name: p.state.name,
                  avatar: p.state.avatar,
                  color: p.state.color,
                  hat: p.state.hat,
                  merits: p.state.merits,
                  weapon: p.state.weapon || null,
                });
                for (const [id, client] of players.entries()) {
                  if (id !== currentId && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(updPayload);
                  }
                }
              }
            } else if (msg.type === 'release_fish') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                const fishType = msg.fishType as string;
                const cost = Number(msg.cost) || 0;
                const lakeId = msg.lakeId;

                if (p.state.merits >= cost && cost > 0) {
                  p.state.merits -= cost;
                  p.state.lastSeen = Date.now();

                  // 1. Broadcast fish spawned in pond to all players
                  const fishPayload = JSON.stringify({
                    type: 'fish_released',
                    id: `fish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    fishType,
                    lakeId,
                    x: msg.x,
                    y: msg.y,
                    releasedBy: p.state.name,
                  });
                  for (const client of players.values()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(fishPayload);
                    }
                  }

                  // 2. Broadcast updated merits
                  const updPayload = JSON.stringify({
                    type: 'player_updated',
                    id: currentId,
                    name: p.state.name,
                    avatar: p.state.avatar,
                    color: p.state.color,
                    hat: p.state.hat,
                    merits: p.state.merits,
                    weapon: p.state.weapon || null,
                  });
                  for (const client of players.values()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(updPayload);
                    }
                  }
                }
              }
            } else if (msg.type === 'create_bodhi_wish') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                if (p.state.merits >= 5) {
                  p.state.merits -= 5;
                  p.state.lastSeen = Date.now();

                  const ribbon: BodhiWishRibbon = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    senderId: currentId,
                    senderName: p.state.name,
                    color: (msg.color as WishRibbonColor) || 'yellow',
                    wishText: String(msg.wishText || '').slice(0, 120),
                    createdAt: Date.now(),
                    rejoiceCount: 0,
                    rejoicedBy: [],
                    branchIndex: Math.floor(Math.random() * 16),
                  };
                  activeWishes.set(ribbon.id, ribbon);

                  const wishPayload = JSON.stringify({
                    type: 'bodhi_wish_created',
                    ribbon,
                    newMerits: p.state.merits,
                    authorId: currentId,
                  });
                  for (const client of players.values()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(wishPayload);
                    }
                  }
                }
              }
            } else if (msg.type === 'rejoice_bodhi_wish') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                const ribbonId = String(msg.ribbonId);
                const ribbon = activeWishes.get(ribbonId);
                if (ribbon && !ribbon.rejoicedBy.includes(currentId)) {
                  ribbon.rejoicedBy.push(currentId);
                  ribbon.rejoiceCount += 1;
                  p.state.merits = (p.state.merits || 0) + 1;
                  p.state.lastSeen = Date.now();

                  const author = players.get(ribbon.senderId);
                  if (author) {
                    author.state.merits = (author.state.merits || 0) + 1;
                  }

                  const rejoicePayload = JSON.stringify({
                    type: 'bodhi_wish_rejoiced',
                    ribbonId: ribbon.id,
                    rejoiceCount: ribbon.rejoiceCount,
                    rejoicedBy: currentId,
                    authorId: ribbon.senderId,
                    readerMerits: p.state.merits,
                    authorMerits: author ? author.state.merits : undefined,
                  });
                  for (const client of players.values()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(rejoicePayload);
                    }
                  }
                }
              }
            } else if (msg.type === 'social_interact') {
              if (currentId && players.has(currentId)) {
                const p = players.get(currentId)!;
                const targetId = String(msg.targetId);
                const action = msg.action as SocialActionType;
                const target = players.get(targetId);

                if (target) {
                  p.state.lastSeen = Date.now();
                  if (action === 'gift_lotus') {
                    if (p.state.merits >= 2) {
                      p.state.merits -= 2;
                      target.state.merits = (target.state.merits || 0) + 2;
                    } else {
                      return; // Không đủ công đức tặng hoa
                    }
                  }

                  const socialPayload = JSON.stringify({
                    type: 'social_event_broadcast',
                    senderId: currentId,
                    senderName: p.state.name,
                    targetId,
                    targetName: target.state.name,
                    action,
                    timestamp: Date.now(),
                    senderMerits: p.state.merits,
                    targetMerits: target.state.merits,
                  });
                  for (const client of players.values()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(socialPayload);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error handling WebSocket message in Zen Plaza:', e);
          }
        });


        ws.on('close', () => {
          clearInterval(pingInterval);
          if (currentId && players.has(currentId)) {
            const entry = players.get(currentId);
            // Only remove from players map if the closing socket matches the stored active socket
            if (entry && entry.ws === ws) {
              players.delete(currentId);
              const leavePayload = JSON.stringify({ type: 'player_left', id: currentId });
              for (const client of players.values()) {
                if (client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(leavePayload);
                }
              }
            }
          }
        });
      });

      // Cleanup inactive ghost players every 25s
      setInterval(() => {
        const now = Date.now();
        for (const [id, client] of players.entries()) {
          if (now - client.state.lastSeen > 45000) {
            players.delete(id);
            const leavePayload = JSON.stringify({ type: 'player_left', id });
            for (const c of players.values()) {
              if (c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(leavePayload);
              }
            }
          }
        }
      }, 25000);

      // Periodic Group Meditation Check (Every 15s: 2+ players sitting/praying within 160px get +2 merits)
      setInterval(() => {
        const sittingPlayers: { id: string; x: number; y: number; ws: WebSocket; state: PlazaPlayerState }[] = [];
        for (const p of players.values()) {
          if (p.ws.readyState === WebSocket.OPEN && (p.state.action === 'sit' || p.state.action === 'pray')) {
            sittingPlayers.push(p);
          }
        }

        const rewardedIds = new Set<string>();
        for (let i = 0; i < sittingPlayers.length; i++) {
          for (let j = i + 1; j < sittingPlayers.length; j++) {
            const pA = sittingPlayers[i];
            const pB = sittingPlayers[j];
            const dist = Math.hypot(pA.state.x - pB.state.x, pA.state.y - pB.state.y);
            if (dist <= 160) {
              rewardedIds.add(pA.state.id);
              rewardedIds.add(pB.state.id);
            }
          }
        }

        if (rewardedIds.size >= 2) {
          const list = Array.from(rewardedIds);
          for (const pid of list) {
            const pl = players.get(pid);
            if (pl) {
              pl.state.merits = (pl.state.merits || 0) + 2;
            }
          }

          const rewardPayload = JSON.stringify({
            type: 'meditation_reward_broadcast',
            playerIds: list,
            bonus: 2,
          });
          for (const client of players.values()) {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(rewardPayload);
            }
          }
        }
      }, 15000);
    },
  };
}
