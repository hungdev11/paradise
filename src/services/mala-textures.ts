import * as THREE from 'three';

export type MalaWoodType = 'agarwood' | 'bodhi' | 'sandalwood' | 'jade';

export interface MalaStyleConfig {
  id: MalaWoodType;
  name: string;
  tag: string;
  desc: string;
  color: string;
  roughness: number;
  metalness: number;
  bumpScale: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export const MALA_STYLES: MalaStyleConfig[] = [
  {
    id: 'agarwood',
    name: 'Trầm Hương Thủy Tùng',
    tag: 'Đại Trí',
    desc: 'Gỗ trầm ngàn năm đẫm tinh dầu thơm nồng, bóng bẩy vân gỗ chìm trầm mặc.',
    color: '#6e3c1b',
    roughness: 0.22,
    metalness: 0.12,
    bumpScale: 0.05,
  },
  {
    id: 'bodhi',
    name: 'Bồ Đề Kim Cang',
    tag: 'Giác Ngộ',
    desc: 'Hạt bồ đề tự nhiên màu hổ phách vàng óng, vân hạt cổ kính thiêng liêng.',
    color: '#b45309',
    roughness: 0.45,
    metalness: 0.08,
    bumpScale: 0.09,
  },
  {
    id: 'sandalwood',
    name: 'Tử Đàn Hoàng Gia',
    tag: 'Uy Nghi',
    desc: 'Huyết long tử đàn đỏ thẫm ruby, bề mặt mịn màng ánh kim sa quyền quý.',
    color: '#991b1b',
    roughness: 0.20,
    metalness: 0.16,
    bumpScale: 0.04,
  },
  {
    id: 'jade',
    name: 'Bạch Ngọc Thanh Tịnh',
    tag: 'Thanh Tịnh',
    desc: 'Ngọc thạch trắng ngà thuần khiết, bề mặt bóng láng thấu quang thanh thoát.',
    color: '#f1f5f9',
    roughness: 0.12,
    metalness: 0.25,
    bumpScale: 0.02,
  },
];

/**
 * Generate high-resolution procedural textures for wooden beads
 */
export function generateMalaTextures(style: MalaWoodType): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;

  // 1. Diffuse / Color Map
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  // 2. Bump Map (Grayscale height)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  // 3. Roughness Map
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;

  if (style === 'agarwood') {
    // Agarwood: Warm glowing golden amber wood with deep resin veins
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#5a2d12');
    grad.addColorStop(0.3, '#783d19');
    grad.addColorStop(0.7, '#633315');
    grad.addColorStop(1, '#431f0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, size, size);

    roughCtx.fillStyle = '#404040'; // High polished lacquer sheen
    roughCtx.fillRect(0, 0, size, size);

    // Natural wood annual rings & oil streaks
    for (let i = 0; i < 45; i++) {
      const y = (i * size) / 45;
      const alpha = 0.2 + Math.random() * 0.35;
      ctx.strokeStyle = Math.random() > 0.4 ? `rgba(35, 14, 4, ${alpha})` : `rgba(180, 100, 45, ${alpha * 0.8})`;
      ctx.lineWidth = 1.5 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        size * 0.3,
        y + (Math.random() - 0.5) * 35,
        size * 0.7,
        y + (Math.random() - 0.5) * 35,
        size,
        y
      );
      ctx.stroke();

      // Bump
      bumpCtx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
      bumpCtx.lineWidth = ctx.lineWidth;
      bumpCtx.stroke();
    }
  } else if (style === 'bodhi') {
    // Bodhi Seed: Rich honey-amber with natural pore clefts
    const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(0.6, '#b45309');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, size, size);

    roughCtx.fillStyle = '#707070';
    roughCtx.fillRect(0, 0, size, size);

    // Natural seed pores and organic texture
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 3.5;
      ctx.fillStyle = 'rgba(67, 20, 5, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      bumpCtx.fillStyle = 'rgba(20, 10, 5, 0.7)';
      bumpCtx.beginPath();
      bumpCtx.arc(x, y, r, 0, Math.PI * 2);
      bumpCtx.fill();
    }
  } else if (style === 'sandalwood') {
    // Red Sandalwood: Regal ruby crimson mahogany with gold dust
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#7f1d1d');
    grad.addColorStop(0.4, '#991b1b');
    grad.addColorStop(0.8, '#5c0f0f');
    grad.addColorStop(1, '#450a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, size, size);

    roughCtx.fillStyle = '#383838';
    roughCtx.fillRect(0, 0, size, size);

    // Fine wood grain lines
    for (let i = 0; i < 65; i++) {
      const y = (i * size) / 65;
      ctx.strokeStyle = `rgba(50, 8, 8, 0.35)`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();

      // Golden micro dust specks (kim tinh)
      const x = Math.random() * size;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  } else {
    // White Jade: Translucent ivory marble with gentle emerald sheen
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#f8fafc');
    grad.addColorStop(0.7, '#e2e8f0');
    grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, size, size);

    roughCtx.fillStyle = '#222222'; // Glassy polish
    roughCtx.fillRect(0, 0, size, size);

    // Soft jade veins
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 50 + Math.random() * 90;
      const veinGrad = ctx.createRadialGradient(x, y, 5, x, y, r);
      veinGrad.addColorStop(0, 'rgba(110, 231, 183, 0.25)');
      veinGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = veinGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap, roughnessMap };
}

/**
 * Generate tassel thread texture
 */
export function generateTasselTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Crimson red gradient
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(0.5, '#ef4444');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  // Vertical silk threads with golden highlights
  for (let x = 0; x < 128; x += 2) {
    const isGold = Math.random() > 0.85;
    ctx.strokeStyle = isGold
      ? 'rgba(251, 191, 36, 0.6)'
      : Math.random() > 0.5
      ? 'rgba(254, 202, 202, 0.4)'
      : 'rgba(69, 10, 10, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
