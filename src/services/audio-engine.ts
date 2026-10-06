// Web Audio API Zero-Latency Sound Synthesis & Mixing Engine for Zen Sanctuary

export type WoodenFishSoundType = 'classic' | 'deep' | 'crisp' | 'bonk';
export type TempleBellSoundType = 'gia-tri' | 'dai-hong-chung' | 'crystal';

class ZenAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private chantGain: GainNode | null = null;

  // Active ambient nodes
  private activeAmbientNodes: { stop: () => void } | null = null;

  // Active chant nodes
  private activeChantNodes: { stop: () => void } | null = null;

  // Pre-decoded AudioBuffer for the real Bonk meme sound
  private bonkAudioBuffer: AudioBuffer | null = null;
  private isBonkLoading: boolean = false;

  // Custom audio element for user MP3 files
  private customAudio: HTMLAudioElement | null = null;
  private customAudioSrc: MediaElementAudioSourceNode | null = null;

  private isMuted: boolean = false;
  private masterVol: number = 0.8;
  private sfxVol: number = 0.9;
  private ambientVol: number = 0.5;
  private chantVol: number = 0.65;

  private currentFishSound: WoodenFishSoundType = 'classic';
  private currentBellSound: TempleBellSoundType = 'gia-tri';

  constructor() {
    try {
      const savedFish = localStorage.getItem('zen_fish_sound_type') as WoodenFishSoundType;
      if (savedFish) this.currentFishSound = savedFish;

      const savedBell = localStorage.getItem('zen_bell_sound_type') as TempleBellSoundType;
      if (savedBell) this.currentBellSound = savedBell;
    } catch {
      // ignore
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Ambient bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVol, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // Chant bus
      this.chantGain = this.ctx.createGain();
      this.chantGain.gain.setValueAtTime(this.chantVol, this.ctx.currentTime);
      this.chantGain.connect(this.masterGain);

      // Pre-load bonk.mp3 into memory
      this.loadBonkBuffer();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private async loadBonkBuffer() {
    if (this.bonkAudioBuffer || this.isBonkLoading || !this.ctx) return;
    this.isBonkLoading = true;
    try {
      const response = await fetch('/audio/bonk.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this.bonkAudioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn('Could not pre-decode /audio/bonk.mp3, will use acoustic fallback', e);
    } finally {
      this.isBonkLoading = false;
    }
  }

  public resume() {
    this.initContext();
  }

  public setFishSoundType(type: WoodenFishSoundType) {
    this.currentFishSound = type;
    try {
      localStorage.setItem('zen_fish_sound_type', type);
    } catch {
      // ignore
    }
  }

  public getFishSoundType(): WoodenFishSoundType {
    return this.currentFishSound;
  }

  public setBellSoundType(type: TempleBellSoundType) {
    this.currentBellSound = type;
    try {
      localStorage.setItem('zen_bell_sound_type', type);
    } catch {
      // ignore
    }
  }

  public getBellSoundType(): TempleBellSoundType {
    return this.currentBellSound;
  }

  public setMasterVolume(val: number) {
    this.masterVol = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(val: number) {
    this.sfxVol = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.05);
    }
  }

  public setAmbientVolume(val: number) {
    this.ambientVol = Math.max(0, Math.min(1, val));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.ambientVol, this.ctx.currentTime, 0.05);
    }
  }

  public setChantVolume(val: number) {
    this.chantVol = Math.max(0, Math.min(1, val));
    if (this.chantGain && this.ctx) {
      this.chantGain.gain.setTargetAtTime(this.chantVol, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play Wooden Fish (Mõ Gỗ)
   * 100% authentic physical acoustic modeling for wood, and exact Pixabay audio for Meme Bonk!
   */
  public playWoodenFish(pitchVariance: boolean = true) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const soundType = this.currentFishSound;

    // 1. EXACT REAL MEME BONK SOUND
    if (soundType === 'bonk') {
      if (this.bonkAudioBuffer) {
        // Play pre-decoded buffer with 0ms latency polyphony
        const source = this.ctx.createBufferSource();
        source.buffer = this.bonkAudioBuffer;
        if (pitchVariance) {
          source.playbackRate.value = 0.96 + Math.random() * 0.08;
        }
        source.connect(this.sfxGain);
        source.start(t);
        return;
      } else {
        // If buffer not yet decoded, trigger fetch and play synthetic fallback
        this.loadBonkBuffer();
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, t);
        osc.frequency.exponentialRampToValueAtTime(170, t + 0.14);
        oscGain.gain.setValueAtTime(0.95, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.18);
        return;
      }
    }

    // 2. REAL AUTHENTIC WOOD ACOUSTIC PHYSICS (All based on the proven 3-layer model that the user praised!)
    let baseFreq = 620; // Default: 'classic' Gỗ Mít Cổ
    let subFreq = 140;
    let subEnd = 90;
    let decayTime = 0.12;

    if (soundType === 'deep') {
      // Mõ Trầm Hương Cổ (Slightly larger hollow chamber, deeper resonance)
      baseFreq = 510;
      subFreq = 115;
      subEnd = 75;
      decayTime = 0.15;
    } else if (soundType === 'crisp') {
      // Mõ Gỗ Mun Giòn (Harder denser wood, crisp bright wood strike)
      baseFreq = 730;
      subFreq = 160;
      subEnd = 110;
      decayTime = 0.10;
    }

    if (pitchVariance) {
      baseFreq += (Math.random() - 0.5) * 35;
    }

    // Layer 1: Resonant Cavity Body (Sine with micro pitch ramp)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.35, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.015);
    oscGain.gain.setValueAtTime(0.85, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + decayTime);

    // Layer 2: High Wood Crack (Bandpassed physical impulse for mallet-to-wood contact)
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.006));
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(baseFreq * 2.2, t);
    noiseFilter.Q.setValueAtTime(4.5, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // Layer 3: Low Hollow Thump (Acoustic body knock)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(subFreq, t);
    subOsc.frequency.exponentialRampToValueAtTime(subEnd, t + 0.06);
    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(oscGain);
    subOsc.connect(subGain);
    oscGain.connect(this.sfxGain);
    noiseGain.connect(this.sfxGain);
    subGain.connect(this.sfxGain);

    osc.start(t);
    noiseSrc.start(t);
    subOsc.start(t);
    osc.stop(t + decayTime + 0.03);
    noiseSrc.stop(t + 0.05);
    subOsc.stop(t + 0.1);
  }

  /**
   * Temple Bell with genuinely distinct acoustic profiles
   */
  public playTempleBell(customFreq?: number) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const soundType = this.currentBellSound;

    if (soundType === 'dai-hong-chung') {
      // Đại Hồng Chung: Deep Temple Giant Bell (108Hz, rich sub-harmonics, 8.5s decay)
      const freq = customFreq || 108;
      const harmonics = [
        { ratio: 0.5, gain: 0.75, decay: 9.0 },
        { ratio: 1.0, gain: 0.9, decay: 8.0 },
        { ratio: 2.02, gain: 0.5, decay: 6.0 },
        { ratio: 2.76, gain: 0.35, decay: 4.5 },
        { ratio: 4.12, gain: 0.2, decay: 3.2 },
      ];

      harmonics.forEach(({ ratio, gain, decay }) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * ratio, t);
        oscGain.gain.setValueAtTime(gain, t);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + decay + 0.1);
      });
      return;
    }

    if (soundType === 'crystal') {
      // Khánh Đồng: Crystal clear bell (880Hz, pristine bright chime)
      const freq = customFreq || 880;
      const harmonics = [
        { ratio: 1.0, gain: 0.7, decay: 4.0 },
        { ratio: 2.0, gain: 0.45, decay: 3.2 },
        { ratio: 3.01, gain: 0.25, decay: 2.0 },
      ];

      harmonics.forEach(({ ratio, gain, decay }) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * ratio, t);
        oscGain.gain.setValueAtTime(gain, t);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + decay + 0.1);
      });
      return;
    }

    // Default: 'gia-tri' (Chuông Gia Trì / Bát Nhã 216Hz)
    const frequency = customFreq || 216;
    const harmonics = [
      { ratio: 1.0, gain: 0.8, decay: 4.8 },
      { ratio: 2.756, gain: 0.45, decay: 3.5 },
      { ratio: 5.404, gain: 0.25, decay: 2.2 },
      { ratio: 8.93, gain: 0.12, decay: 1.4 },
      { ratio: 0.5, gain: 0.35, decay: 5.2 },
    ];

    harmonics.forEach(({ ratio, gain, decay }) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * ratio, t);
      oscGain.gain.setValueAtTime(gain, t);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + decay + 0.1);
    });

    const strike = this.ctx.createOscillator();
    const strikeGain = this.ctx.createGain();
    strike.type = 'triangle';
    strike.frequency.setValueAtTime(800, t);
    strike.frequency.exponentialRampToValueAtTime(150, t + 0.05);
    strikeGain.gain.setValueAtTime(0.3, t);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    strike.connect(strikeGain);
    strikeGain.connect(this.sfxGain);
    strike.start(t);
    strike.stop(t + 0.08);
  }

  public playBeadClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const freq = 1400 + (Math.random() - 0.5) * 200;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.025);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  public playIncenseLight() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const dur = 0.5;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / buffer.length) * Math.PI);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(1.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(t);
    src.stop(t + dur);
  }

  public playWishChime() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  public startAmbient(type: 'rain' | 'stream' | 'wind-chimes' | 'singing-bowl') {
    this.stopAmbient();
    this.initContext();
    if (!this.ctx || !this.ambientGain) return;

    if (type === 'rain') {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.11;
        b2 = 0.86 * b2 + white * 0.25;
        output[i] = (b0 + b1 + b2) * 0.18;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);
      whiteNoise.start();

      this.activeAmbientNodes = {
        stop: () => {
          try {
            whiteNoise.stop();
            whiteNoise.disconnect();
          } catch {
            // ignore
          }
        },
      };
    } else if (type === 'stream') {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.3;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.7, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      noise.start();
      lfo.start();

      this.activeAmbientNodes = {
        stop: () => {
          try {
            noise.stop();
            lfo.stop();
            noise.disconnect();
          } catch {
            // ignore
          }
        },
      };
    } else if (type === 'singing-bowl') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(432, this.ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(432 * 1.5, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ambientGain);

      osc1.start();
      osc2.start();

      this.activeAmbientNodes = {
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
            osc1.disconnect();
            osc2.disconnect();
          } catch {
            // ignore
          }
        },
      };
    } else if (type === 'wind-chimes') {
      let isRunning = true;
      const chimeFrequencies = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

      const triggerChime = () => {
        if (!isRunning || !this.ctx || !this.ambientGain) return;
        const freq = chimeFrequencies[Math.floor(Math.random() * chimeFrequencies.length)];
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

        osc.connect(g);
        g.connect(this.ambientGain);
        osc.start(t);
        osc.stop(t + 3.0);

        const nextDelay = 1200 + Math.random() * 2500;
        setTimeout(triggerChime, nextDelay);
      };

      triggerChime();

      this.activeAmbientNodes = {
        stop: () => {
          isRunning = false;
        },
      };
    }
  }

  public stopAmbient() {
    if (this.activeAmbientNodes) {
      this.activeAmbientNodes.stop();
      this.activeAmbientNodes = null;
    }
  }

  /**
   * Melodic Buddhist Chanting Recitation System
   */
  public startChant(type: 'chu-dai-bi' | 'a-di-da-phat' | 'tam-kinh' | 'om-mani') {
    this.stopChant();
    this.initContext();
    if (!this.ctx || !this.chantGain) return;

    let isRunning = true;

    let melodyNotes: { note: number; dur: number; vowel: number }[] = [];

    if (type === 'a-di-da-phat') {
      melodyNotes = [
        { note: 174.61, dur: 1.2, vowel: 450 },
        { note: 196.00, dur: 1.2, vowel: 350 },
        { note: 220.00, dur: 1.8, vowel: 550 },
        { note: 196.00, dur: 0.8, vowel: 280 },
        { note: 174.61, dur: 1.4, vowel: 450 },
        { note: 130.81, dur: 2.8, vowel: 380 },
      ];
    } else if (type === 'om-mani') {
      melodyNotes = [
        { note: 136.10, dur: 2.0, vowel: 360 },
        { note: 163.32, dur: 1.2, vowel: 550 },
        { note: 182.00, dur: 1.2, vowel: 280 },
        { note: 204.15, dur: 1.4, vowel: 480 },
        { note: 182.00, dur: 1.2, vowel: 380 },
        { note: 136.10, dur: 3.0, vowel: 320 },
      ];
    } else if (type === 'chu-dai-bi') {
      melodyNotes = [
        { note: 146.83, dur: 1.0, vowel: 500 },
        { note: 174.61, dur: 1.0, vowel: 380 },
        { note: 220.00, dur: 1.6, vowel: 450 },
        { note: 196.00, dur: 1.0, vowel: 320 },
        { note: 174.61, dur: 1.2, vowel: 520 },
        { note: 146.83, dur: 1.4, vowel: 450 },
        { note: 130.81, dur: 2.4, vowel: 380 },
      ];
    } else {
      melodyNotes = [
        { note: 174.61, dur: 1.2, vowel: 480 },
        { note: 196.00, dur: 1.2, vowel: 350 },
        { note: 220.00, dur: 1.4, vowel: 420 },
        { note: 196.00, dur: 1.2, vowel: 320 },
        { note: 174.61, dur: 2.2, vowel: 450 },
      ];
    }

    let noteIdx = 0;
    let nextTimeout: ReturnType<typeof setTimeout> | null = null;

    const playNextNote = () => {
      if (!isRunning || !this.ctx || !this.chantGain) return;

      const item = melodyNotes[noteIdx];
      const t = this.ctx.currentTime;
      const dur = item.dur;

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.note, t);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(item.note * 1.5, t);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(item.note * 0.5, t);

      const formant = this.ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(item.vowel, t);
      formant.Q.setValueAtTime(4.5, t);

      const noteGain = this.ctx.createGain();
      noteGain.gain.setValueAtTime(0.01, t);
      noteGain.gain.linearRampToValueAtTime(0.4, t + 0.25);
      noteGain.gain.setValueAtTime(0.4, t + dur - 0.2);
      noteGain.gain.linearRampToValueAtTime(0.01, t + dur);

      osc.connect(formant);
      osc2.connect(formant);
      formant.connect(noteGain);
      sub.connect(noteGain);

      noteGain.connect(this.chantGain);

      osc.start(t);
      osc2.start(t);
      sub.start(t);

      osc.stop(t + dur);
      osc2.stop(t + dur);
      sub.stop(t + dur);

      this.playWoodenFish(false);

      if (noteIdx === melodyNotes.length - 1) {
        setTimeout(() => {
          if (isRunning) this.playTempleBell(216);
        }, (dur - 0.6) * 1000);
      }

      noteIdx = (noteIdx + 1) % melodyNotes.length;
      nextTimeout = setTimeout(playNextNote, (dur - 0.05) * 1000);
    };

    playNextNote();

    this.activeChantNodes = {
      stop: () => {
        isRunning = false;
        if (nextTimeout) clearTimeout(nextTimeout);
      },
    };
  }

  public stopChant() {
    if (this.activeChantNodes) {
      this.activeChantNodes.stop();
      this.activeChantNodes = null;
    }
    if (this.customAudio) {
      this.customAudio.pause();
    }
  }

  public playCustomAudio(url: string) {
    this.stopChant();
    this.initContext();
    if (!this.ctx || !this.chantGain) return;

    if (!this.customAudio) {
      this.customAudio = new Audio();
      this.customAudio.crossOrigin = 'anonymous';
      this.customAudioSrc = this.ctx.createMediaElementSource(this.customAudio);
      this.customAudioSrc.connect(this.chantGain);
    }

    this.customAudio.src = url;
    this.customAudio.loop = true;
    this.customAudio.play().catch(() => {});

    this.activeChantNodes = {
      stop: () => {
        if (this.customAudio) {
          this.customAudio.pause();
        }
      },
    };
  }
}

export const audioEngine = new ZenAudioEngine();
