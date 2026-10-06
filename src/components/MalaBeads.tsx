import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { 
  MalaWoodType, 
  MALA_STYLES, 
  generateMalaTextures, 
  generateTasselTexture 
} from '../services/mala-textures';
import { audioEngine } from '../services/audio-engine';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  Sparkles, 
  Volume2,
} from 'lucide-react';

interface MalaBeadsProps {
  onBeadAdvance: (count: number, roundCompleted: boolean) => void;
  lifetimeBeads?: number;
  lifetimeRounds?: number;
}

const TOTAL_BEADS = 108;
const MIN_BEAD_DELAY_MS = 250; // Rate limit delay for mindful rhythm

const MANTRAS = [
  'Nam Mô A Di Đà Phật',
  'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
  'Nam Mô Đại Bi Quán Thế Âm Bồ Tát',
  'Án Ma Ni Bát Mê Hồng (Om Mani Padme Hum)',
  'Nam Mô Địa Tạng Vương Bồ Tát',
];

export const MalaBeads: React.FC<MalaBeadsProps> = ({
  onBeadAdvance,
  lifetimeRounds = 0,
}) => {
  // State
  const [currentBead, setCurrentBead] = useState(1); // 1 to 108
  const [currentRound, setCurrentRound] = useState(lifetimeRounds);
  const [woodType, setWoodType] = useState<MalaWoodType>('agarwood');
  const [selectedMantra, setSelectedMantra] = useState(MANTRAS[0]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [mantraPulse, setMantraPulse] = useState(false);

  // Refs for 3D & Animation
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Timing & Interaction refs
  const lastAdvanceTimeRef = useRef<number>(0);
  const wheelAccumulatorRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0); // 0 to 1
  const targetOffsetRef = useRef<number>(0);  // 0 to 1
  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const autoPlayTimerRef = useRef<number | null>(null);

  // Three.js References
  const threeRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    curve: THREE.CatmullRomCurve3;
    beadMeshes: THREE.Mesh[];
    guruMesh: THREE.Mesh;
    stupaGroup: THREE.Group;
    tasselGroup: THREE.Group;
    activeGlowLight: THREE.PointLight;
    standardMaterial: THREE.MeshStandardMaterial;
    activeMaterial: THREE.MeshStandardMaterial;
    guruMaterial: THREE.MeshStandardMaterial;
    spacerMaterial: THREE.MeshStandardMaterial;
    goldMaterial: THREE.MeshStandardMaterial;
    tasselMaterial: THREE.MeshStandardMaterial;
    animationFrameId: number;
    mouseTarget: { x: number; y: number };
  } | null>(null);

  // Active style configuration
  const activeStyle = useMemo(
    () => MALA_STYLES.find((s) => s.id === woodType) || MALA_STYLES[0],
    [woodType]
  );

  // Advance single bead
  const advanceOneBead = useCallback(
    (direction: 1 | -1 = 1) => {
      const now = Date.now();
      if (now - lastAdvanceTimeRef.current < MIN_BEAD_DELAY_MS) {
        return false;
      }
      lastAdvanceTimeRef.current = now;

      // Play crisp bead wood click
      audioEngine.playBeadClick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }

      // Trigger mantra visual glow pulse
      setMantraPulse(true);
      setTimeout(() => setMantraPulse(false), 280);

      // Smooth 3D animation target advance: 1/108 of the loop
      targetOffsetRef.current += direction * (1 / TOTAL_BEADS);

      let nextBead = currentBead + direction;
      let completedRound = false;

      if (nextBead > TOTAL_BEADS) {
        nextBead = 1;
        completedRound = true;
        // Ring temple bell on round completion
        audioEngine.playTempleBell();
        setCurrentRound((r) => r + 1);

        // Golden merit confetti celebration
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#fbbf24', '#fef08a', '#d97706'],
          });
        } catch {
          // ignore
        }
      } else if (nextBead < 1) {
        nextBead = TOTAL_BEADS;
      }

      setCurrentBead(nextBead);
      onBeadAdvance(1, completedRound);
      return true;
    },
    [currentBead, onBeadAdvance]
  );

  // Toggle Auto-recitation
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayTimerRef.current = window.setInterval(() => {
        advanceOneBead(1);
      }, 1600);
    } else {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlaying, advanceOneBead]);

  // Keyboard shortcut: 'B' key or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'b' || e.key === 'B' || e.key === ' ') {
        e.preventDefault();
        advanceOneBead(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceOneBead]);

  // Non-passive wheel event on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccumulatorRef.current += e.deltaY;

      if (Math.abs(wheelAccumulatorRef.current) >= 30) {
        const dir = wheelAccumulatorRef.current > 0 ? 1 : -1;
        const advanced = advanceOneBead(dir);
        if (advanced) {
          wheelAccumulatorRef.current = 0;
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [advanceOneBead]);

  // Initialize Three.js 3D Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 560;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    // Adjusted camera distance for prominent, tangible beads
    camera.position.set(0, -0.3, 14.2);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // 3. Lighting Setup - Warm Temple Illumination
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
    scene.add(ambientLight);

    // Key warm directional light from top right
    const keyLight = new THREE.DirectionalLight(0xffedd5, 3.4);
    keyLight.position.set(5, 10, 8);
    scene.add(keyLight);

    // Golden rim light from bottom left to carve out silhouettes
    const rimLight = new THREE.DirectionalLight(0xf59e0b, 2.2);
    rimLight.position.set(-6, -4, 4);
    scene.add(rimLight);

    // Front soft candle bounce light
    const candleLight = new THREE.PointLight(0xfef3c7, 2.4, 20);
    candleLight.position.set(0, -2.5, 6);
    scene.add(candleLight);

    // Golden active bead aura light
    const activeGlowLight = new THREE.PointLight(0xfbbf24, 3.5, 8);
    activeGlowLight.position.set(0, -4.8, 2.8);
    scene.add(activeGlowLight);

    // 4. Closed 3D Curve for the 108 Mala Beads Loop
    // Elegant organic draped loop: bottom comes forward towards camera, top curves back
    const curvePoints: THREE.Vector3[] = [];
    const NUM_CURVE_SAMPLES = 80;
    const rx = 3.9; // Horizontal width radius
    const ry = 4.6; // Vertical height radius

    for (let i = 0; i < NUM_CURVE_SAMPLES; i++) {
      const theta = (i / NUM_CURVE_SAMPLES) * Math.PI * 2;
      const x = rx * Math.sin(theta);
      // Gentle natural drape sag at bottom
      const y = -ry * Math.cos(theta) - 0.3 * Math.pow(Math.cos(theta / 2), 2);
      // 3D perspective depth: bottom is close (+Z), top is further (-Z)
      const z = 1.4 * Math.cos(theta);
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal');

    // 5. Mala Silk Cord / Thread passing through center of all beads
    const cordGeometry = new THREE.TubeGeometry(curve, 260, 0.048, 8, true);
    const cordMaterial = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.5,
      metalness: 0.15,
    });
    const cordMesh = new THREE.Mesh(cordGeometry, cordMaterial);
    scene.add(cordMesh);

    // 6. Materials
    const textures = generateMalaTextures(woodType);
    const tasselTex = generateTasselTexture();

    const standardMaterial = new THREE.MeshStandardMaterial({
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: activeStyle.bumpScale,
      roughnessMap: textures.roughnessMap,
      roughness: activeStyle.roughness,
      metalness: activeStyle.metalness,
      color: new THREE.Color(activeStyle.color),
    });

    const activeMaterial = new THREE.MeshStandardMaterial({
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: activeStyle.bumpScale * 1.5,
      roughness: 0.12,
      metalness: 0.3,
      color: new THREE.Color(activeStyle.color),
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0.45,
    });

    const guruMaterial = new THREE.MeshStandardMaterial({
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: activeStyle.bumpScale * 1.4,
      roughness: activeStyle.roughness * 0.85,
      metalness: 0.22,
      color: new THREE.Color(activeStyle.color),
    });

    // Antique Brass / Gold for stupa tower & spacer rings
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.9,
    });

    // Spacer beads (Sacred Tibetan Turquoise)
    const spacerMaterial = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.25,
      emissive: new THREE.Color(0x0369a1),
      emissiveIntensity: 0.2,
    });

    // Silk Tassel Material
    const tasselMaterial = new THREE.MeshStandardMaterial({
      map: tasselTex,
      roughness: 0.65,
      metalness: 0.08,
    });

    // 7. Bead Geometries - Enlarged for rich tactile presence
    const beadRadius = 0.22;
    const beadGeometry = new THREE.SphereGeometry(beadRadius, 24, 24);
    const guruGeometry = new THREE.SphereGeometry(beadRadius * 1.45, 28, 28);
    const ringGeometry = new THREE.TorusGeometry(0.16, 0.03, 8, 16);

    // 8. Create 108 Beads
    const beadMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < TOTAL_BEADS; i++) {
      let mesh: THREE.Mesh;
      const isSpacer = i === 27 || i === 54 || i === 81;

      if (i === 0) {
        // Guru Bead (Hạt Mẹ / Hồ Lô)
        mesh = new THREE.Mesh(guruGeometry, guruMaterial);
      } else if (isSpacer) {
        // Spacer Marker Bead (Hạt Phân Cách Tứ Thiên Vương)
        mesh = new THREE.Mesh(beadGeometry, spacerMaterial);
        // Add decorative gold rings on both sides
        const ring1 = new THREE.Mesh(ringGeometry, goldMaterial);
        ring1.scale.set(1.1, 1.1, 1.1);
        mesh.add(ring1);
      } else {
        // Standard Wooden Bead
        mesh = new THREE.Mesh(beadGeometry, standardMaterial);
      }

      scene.add(mesh);
      beadMeshes.push(mesh);
    }

    // 9. Guru Stupa Tower Cap & Silk Tassel (attached to beadMeshes[0])
    const guruMesh = beadMeshes[0];

    // Stupa Top Cap (Tháp Phật Hồ Lô)
    const stupaGroup = new THREE.Group();
    const coneGeom = new THREE.ConeGeometry(0.18, 0.42, 16);
    const stupaCone = new THREE.Mesh(coneGeom, goldMaterial);
    stupaCone.position.set(0, -0.36, 0);
    stupaCone.rotation.x = Math.PI;
    stupaGroup.add(stupaCone);

    // Top bead spacer
    const topBeadGeom = new THREE.SphereGeometry(0.1, 16, 16);
    const topBead = new THREE.Mesh(topBeadGeom, goldMaterial);
    topBead.position.set(0, -0.58, 0);
    stupaGroup.add(topBead);
    guruMesh.add(stupaGroup);

    // Hanging Red Silk Tassel Group
    const tasselGroup = new THREE.Group();
    tasselGroup.position.set(0, -0.66, 0);

    // Tassel knot in gold
    const knotGeom = new THREE.CylinderGeometry(0.11, 0.1, 0.15, 16);
    const knot = new THREE.Mesh(knotGeom, goldMaterial);
    tasselGroup.add(knot);

    // Tassel silk flowing body
    const tasselBodyGeom = new THREE.CylinderGeometry(0.1, 0.22, 1.35, 20);
    const tasselBody = new THREE.Mesh(tasselBodyGeom, tasselMaterial);
    tasselBody.position.set(0, -0.74, 0);
    tasselGroup.add(tasselBody);

    guruMesh.add(tasselGroup);

    // Mouse movement parallax target
    const mouseTarget = { x: 0, y: 0 };

    threeRefs.current = {
      scene,
      camera,
      renderer,
      curve,
      beadMeshes,
      guruMesh,
      stupaGroup,
      tasselGroup,
      activeGlowLight,
      standardMaterial,
      activeMaterial,
      guruMaterial,
      spacerMaterial,
      goldMaterial,
      tasselMaterial,
      animationFrameId: 0,
      mouseTarget,
    };

    // 10. Animation Loop
    let lastTime = performance.now();
    let swingAngle = 0;

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smoothly interpolate loop rotation offset
      const diff = targetOffsetRef.current - currentOffsetRef.current;
      currentOffsetRef.current += diff * Math.min(10 * dt, 1);

      // Tassel swing momentum based on bead roll velocity + idle oscillation
      const rollVelocity = diff * 4.5;
      swingAngle += (rollVelocity - swingAngle) * 0.15;
      const idleSway = Math.sin(currentTime * 0.002) * 0.05;
      tasselGroup.rotation.z = swingAngle * 0.8 + idleSway;

      // Update positions of all 108 beads along 3D curve
      for (let i = 0; i < TOTAL_BEADS; i++) {
        // Parametric t around the closed curve [0, 1)
        let t = ((i / TOTAL_BEADS) + currentOffsetRef.current) % 1;
        if (t < 0) t += 1;

        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);

        const bead = beadMeshes[i];
        bead.position.copy(pos);

        // Align bead orientation along cord tangent
        bead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

        // Highlight active bead (the one currently closest to bottom front, t ~ 0)
        const isNearActive = Math.abs(t) < 0.015 || Math.abs(t - 1) < 0.015;
        if (isNearActive && i !== 0 && i !== 27 && i !== 54 && i !== 81) {
          bead.material = activeMaterial;
          bead.scale.set(1.22, 1.22, 1.22);
          activeGlowLight.position.set(pos.x, pos.y, pos.z + 0.6);
        } else if (i === 0) {
          bead.material = guruMaterial;
          bead.scale.set(1.4, 1.4, 1.4);
        } else if (i === 27 || i === 54 || i === 81) {
          bead.material = spacerMaterial;
          bead.scale.set(1.15, 1.15, 1.15);
        } else {
          bead.material = standardMaterial;
          bead.scale.set(1.0, 1.0, 1.0);
        }
      }

      // Smooth camera parallax from mouse
      camera.position.x += (mouseTarget.x * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (mouseTarget.y * 1.2 - camera.position.y) * 0.04;
      camera.lookAt(0, -0.4, 0);

      renderer.render(scene, camera);
      threeRefs.current!.animationFrameId = requestAnimationFrame(animate);
    };

    threeRefs.current.animationFrameId = requestAnimationFrame(animate);

    // Mouse Move handler for 3D parallax
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseTarget.x = x;
      mouseTarget.y = y;
    };
    container.addEventListener('mousemove', onMouseMove);

    // Resize handler with ResizeObserver to prevent any stretching/distortion
    const updateSize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, true);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', updateSize);

    return () => {
      if (threeRefs.current?.animationFrameId) {
        cancelAnimationFrame(threeRefs.current.animationFrameId);
      }
      container.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [woodType, activeStyle]);

  // Pointer drag events for smooth 3D tactile interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dy = e.clientY - dragStartYRef.current;

    if (Math.abs(dy) >= 28) {
      const dir = dy > 0 ? 1 : -1;
      const advanced = advanceOneBead(dir);
      if (advanced) {
        dragStartYRef.current = e.clientY;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Reset beads round counter
  const handleReset = () => {
    setCurrentBead(1);
    audioEngine.playTempleBell();
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-4xl mx-auto select-none animate-in fade-in zoom-in-95 duration-300">
      {/* 1. Header Stat Bar & Wood Style Picker */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-stone-900/80 border border-amber-500/30 backdrop-blur-md shadow-2xl mb-2">
        {/* Count & Round Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Hạt Số:</span>
            <span className="font-mono text-lg font-bold text-amber-200">
              {currentBead}
              <span className="text-xs text-stone-400 font-normal"> / 108</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-800/60 border border-stone-700/60 text-stone-300">
            <span className="text-xs">Vòng Đã Lần:</span>
            <span className="font-mono text-base font-bold text-amber-400">{currentRound}</span>
          </div>
        </div>

        {/* 4 Direct Wood Style Switchers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {MALA_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setWoodType(style.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-serif transition-all ${
                woodType === style.id
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/30 scale-105'
                  : 'bg-stone-800/70 hover:bg-stone-700/70 text-stone-300 border border-stone-700/60'
              }`}
              title={style.desc}
            >
              <div
                className="w-2.5 h-2.5 rounded-full border border-stone-900/40"
                style={{ backgroundColor: style.color }}
              />
              <span>{style.name.split(' ')[0]}</span>
            </button>
          ))}

          {/* Auto-Mala Play/Pause Button */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`ml-1 flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shadow-md ${
              isAutoPlaying
                ? 'bg-emerald-500 text-stone-950 shadow-emerald-500/20'
                : 'bg-stone-800/80 hover:bg-stone-700/80 text-stone-300 border border-stone-700'
            }`}
            title={isAutoPlaying ? 'Tạm dừng tự động lần chuỗi' : 'Bật tự động lần chuỗi'}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAutoPlaying ? 'Đang Lần...' : 'Tự Động'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main 3D Three.js Interactive Mala Canvas Stage */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-[480px] sm:h-[520px] lg:h-[560px] flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-3xl overflow-hidden border border-amber-500/20 bg-gradient-to-b from-stone-950/40 via-stone-900/20 to-stone-950/50 backdrop-blur-md shadow-2xl"
        title="Cuộn chuột hoặc kéo vuốt để lần chuỗi 108 hạt 3D"
      >
        {/* Soft Ambient Golden Ring Glow Backdrop */}
        <div className="absolute inset-12 rounded-full border border-amber-500/10 bg-amber-500/5 blur-2xl pointer-events-none" />

        {/* Three.js Canvas Element */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block touch-none"
        />

        {/* Center Zen Focus Lotus Badge - Refined & Translucent */}
        <div className="absolute z-10 flex flex-col items-center justify-center p-3 rounded-full w-36 h-36 sm:w-40 sm:h-40 bg-stone-950/60 border border-amber-500/25 backdrop-blur-sm shadow-xl pointer-events-none text-center">
          <div className="text-2xl sm:text-3xl mb-0.5 filter drop-shadow">🪷</div>
          <span className="font-serif text-sm sm:text-base font-bold text-amber-200 tracking-wide">
            Hạt Thứ {currentBead}
          </span>
          <span className="text-[10px] text-stone-300 mt-0.5">
            {currentRound > 0 ? `Đã xong ${currentRound} vòng` : 'Khởi tâm chánh niệm'}
          </span>
          <span className="text-[10px] text-amber-400 font-mono mt-0.5">
            {currentBead} / 108
          </span>
        </div>
      </div>

      {/* 3. Sacred Mantra Calligraphy Banner - Fixed Height h-14 to completely prevent layout jumping */}
      <div className="w-full h-14 mt-3 flex items-center justify-between gap-3 px-5 rounded-2xl bg-stone-900/80 border border-amber-500/30 backdrop-blur-md shadow-xl flex-shrink-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Volume2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-stone-400 hidden sm:inline">Khẩu Niệm:</span>
        </div>

        {/* Glowing Animated Mantra Text - Strictly single-line with ellipsis to preserve exact dimensions */}
        <div
          className={`flex-1 min-w-0 text-center font-serif text-sm sm:text-base md:text-lg font-bold truncate transition-all duration-200 ${
            mantraPulse
              ? 'text-amber-300 scale-105 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]'
              : 'text-amber-100/90'
          }`}
          title={selectedMantra}
        >
          {selectedMantra}
        </div>

        {/* Mantra Switcher Selector */}
        <select
          value={selectedMantra}
          onChange={(e) => setSelectedMantra(e.target.value)}
          className="bg-stone-800/80 text-stone-200 border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-amber-400 cursor-pointer flex-shrink-0 max-w-[150px] sm:max-w-[210px]"
        >
          {MANTRAS.map((m, idx) => (
            <option key={idx} value={m} className="bg-stone-900 text-stone-200">
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Action Controls Bar: Lần Một Hạt & Reset */}
      <div className="mt-4 flex items-center gap-4">
        {/* Main "Lần Một Hạt" Action Button */}
        <button
          onClick={() => advanceOneBead(1)}
          className="group relative flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-serif font-bold text-base shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
        >
          <Sparkles className="w-4 h-4 text-stone-950 group-hover:rotate-12 transition-transform" />
          <span>Lần Một Hạt</span>
          <span className="text-xs bg-stone-950/20 px-2 py-0.5 rounded-full font-sans font-medium text-stone-900">
            Phím B / Phím Cách
          </span>
        </button>

        {/* Reset Counter Button */}
        <button
          onClick={handleReset}
          className="p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-stone-700/80 text-stone-400 hover:text-amber-300 transition-all shadow-lg active:scale-90"
          title="Đặt lại hạt về số 1"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Helpful Hint */}
      <p className="mt-2.5 text-[11px] text-stone-400 text-center">
        Cuộn chuột • Vuốt kéo trên vòng chuỗi • Hoặc bấm phím <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono">B</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono">Space</kbd> (Giới hạn nhịp chánh niệm 250ms)
      </p>
    </div>
  );
};
