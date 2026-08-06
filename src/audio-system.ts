import { createSystem } from '@iwsdk/core';
import { SumoSystem } from './sumo-system.js';

export class AudioSystem extends createSystem({}) {
  private sumo!: SumoSystem;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicPlaying = false;
  private musicBeat = 0;
  private beatTimer = 0;
  private bpm = 80;
  private chantTimer = 0;
  private chantBeat = 0;

  init() {
    this.sumo = this.world.getSystem(SumoSystem)!;
    this.sumo.audioSystemRef = this;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.master);
    } catch { /* no audio */ }
  }

  private resume() { if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {}); }

  playSFX(type: string, weight = 1.0) {
    if (!this.ctx || !this.master) return;
    this.resume();
    const c = this.ctx;
    const now = c.currentTime;
    const g = c.createGain();
    g.connect(this.master);
    // Weight affects pitch: heavier = deeper, lighter = sharper
    const pitchMod = 1.0 / Math.max(0.5, weight * 0.8);
    const volMod = 0.7 + Math.min(weight, 2.0) * 0.15;

    if (type === 'push') {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(120 * pitchMod, now); o.frequency.exponentialRampToValueAtTime(40 * pitchMod, now + 0.15);
      g.gain.setValueAtTime(0.5 * volMod, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      o.connect(g); o.start(now); o.stop(now + 0.2);
      const bs = Math.floor(c.sampleRate * 0.1);
      const buf = c.createBuffer(1, bs, c.sampleRate);
      const bd = buf.getChannelData(0);
      for (let i = 0; i < bs; i++) bd[i] = (Math.random() * 2 - 1) * (1 - i / bs);
      const n = c.createBufferSource(); n.buffer = buf;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.3 * volMod, now); ng.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      n.connect(ng); ng.connect(this.master); n.start(now); n.stop(now + 0.1);
    } else if (type === 'grab') {
      const o = c.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(200 * pitchMod, now); o.frequency.exponentialRampToValueAtTime(100 * pitchMod, now + 0.3);
      g.gain.setValueAtTime(0.3 * volMod, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      o.connect(g); o.start(now); o.stop(now + 0.35);
      const o2 = c.createOscillator(); o2.type = 'triangle';
      o2.frequency.setValueAtTime(300 * pitchMod, now + 0.05); o2.frequency.exponentialRampToValueAtTime(150 * pitchMod, now + 0.25);
      const g2 = c.createGain(); g2.gain.setValueAtTime(0.2 * volMod, now + 0.05); g2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o2.connect(g2); g2.connect(this.master); o2.start(now + 0.05); o2.stop(now + 0.3);
    } else if (type === 'dodge') {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      o.connect(g); o.start(now); o.stop(now + 0.15);
    } else if (type === 'charge') {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, now); o.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      g.gain.setValueAtTime(0.6, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      o.connect(g); o.start(now); o.stop(now + 0.4);
      const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 50;
      const sg = c.createGain(); sg.gain.setValueAtTime(0.4, now); sg.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      sub.connect(sg); sg.connect(this.master); sub.start(now); sub.stop(now + 0.5);
    } else if (type === 'ringout') {
      for (let i = 0; i < 4; i++) {
        const o = c.createOscillator(); o.type = i % 2 === 0 ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(200 - i * 30, now + i * 0.1); o.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        const og = c.createGain(); og.gain.setValueAtTime(0.3, now + i * 0.1); og.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        o.connect(og); og.connect(this.master); o.start(now + i * 0.1); o.stop(now + 0.8);
      }
      const bs = Math.floor(c.sampleRate * 0.8);
      const buf = c.createBuffer(1, bs, c.sampleRate);
      const bd = buf.getChannelData(0);
      for (let i = 0; i < bs; i++) bd[i] = (Math.random() * 2 - 1) * 0.5;
      const crowd = c.createBufferSource(); crowd.buffer = buf;
      const cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 800; cf.Q.value = 1;
      const cg = c.createGain(); cg.gain.setValueAtTime(0.01, now + 0.3); cg.gain.linearRampToValueAtTime(0.25, now + 0.6); cg.gain.linearRampToValueAtTime(0.05, now + 1.5);
      crowd.connect(cf); cf.connect(cg); cg.connect(this.master); crowd.start(now + 0.3); crowd.stop(now + 1.5);
    }
  }

  update(delta: number) {
    if (!this.ctx || !this.musicGain) return;
    const d = this.sumo.getGameData();
    if ((d.state === 'playing' || d.state === 'survival') && d.musicOn && !d.isCountdown) {
      if (!this.musicPlaying) { this.musicPlaying = true; this.musicBeat = 0; this.beatTimer = 0; }
      // Dynamic tempo: base 80 BPM, scales up near ring edge and during combos
      const pd = Math.sqrt(d.playerStamina); // Lower stamina → more tension
      const edgeTension = Math.max(0, 1 - pd / 10); // 0..1 scale
      const comboBoost = Math.min(d.comboCount * 5, 20);
      this.bpm = 80 + Math.floor(edgeTension * 30) + comboBoost;
      this.tickMusic(delta);
    } else if (this.musicPlaying) {
      this.musicPlaying = false;
      this.bpm = 80;
    }
    if (this.master) this.master.gain.value = d.sfxOn ? 0.3 : 0;
    // Crowd chanting during active play
    if ((d.state === 'playing' || d.state === 'survival') && d.sfxOn && !d.isCountdown && !d.tachiai) {
      this.tickChanting(delta, d);
    } else {
      this.chantTimer = 0;
      this.chantBeat = 0;
    }
  }

  private tickChanting(delta: number, d: ReturnType<SumoSystem['getGameData']>) {
    if (!this.ctx || !this.master) return;
    // Chant every ~2 seconds, more frequent as tension rises
    const tensionFactor = Math.max(0.5, 1 - d.playerStamina / 100);
    const chantInterval = 2.0 - tensionFactor * 0.8;
    this.chantTimer += delta;
    if (this.chantTimer < chantInterval) return;
    this.chantTimer -= chantInterval;
    this.chantBeat++;

    const c = this.ctx;
    const now = c.currentTime;

    // Crowd "hoh" / "yoi" rhythmic chant using filtered noise + tone
    const bs = Math.floor(c.sampleRate * 0.25);
    const buf = c.createBuffer(1, bs, c.sampleRate);
    const bd = buf.getChannelData(0);
    // Shape as a vowel-like burst
    for (let i = 0; i < bs; i++) {
      const env = Math.sin(Math.PI * i / bs); // bell envelope
      bd[i] = (Math.random() * 2 - 1) * env * 0.3;
    }
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass';
    // Alternate between two vowel formants for variety
    bp.frequency.value = this.chantBeat % 2 === 0 ? 400 : 550;
    bp.Q.value = 2.5;
    const chantGain = c.createGain();
    const vol = 0.04 + tensionFactor * 0.06; // Louder when tense
    chantGain.gain.setValueAtTime(vol, now);
    chantGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    src.connect(bp); bp.connect(chantGain); chantGain.connect(this.master);
    src.start(now); src.stop(now + 0.3);

    // Add a subtle tonal component for the "oh" sound
    const tone = c.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = this.chantBeat % 2 === 0 ? 180 : 220;
    const tg = c.createGain();
    tg.gain.setValueAtTime(vol * 0.3, now);
    tg.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    tone.connect(tg); tg.connect(this.master);
    tone.start(now); tone.stop(now + 0.2);
  }

  private tickMusic(delta: number) {
    if (!this.ctx || !this.musicGain) return;
    const c = this.ctx;
    const now = c.currentTime;
    const bi = 60 / this.bpm;
    this.beatTimer += delta;
    if (this.beatTimer < bi) return;
    this.beatTimer -= bi;
    this.musicBeat++;
    const pat = this.musicBeat % 8;

    // Taiko big drum
    if (pat === 0 || pat === 4) {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(80, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      const g = c.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + 0.3);
      const cl = c.createOscillator(); cl.type = 'square'; cl.frequency.value = 200;
      const cg = c.createGain(); cg.gain.setValueAtTime(0.2, now); cg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      cl.connect(cg); cg.connect(this.musicGain); cl.start(now); cl.stop(now + 0.05);
    }

    // Small drum
    if (pat === 2 || pat === 6) {
      const o = c.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      const g = c.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + 0.12);
    }

    // Rim
    if (pat % 2 === 1) {
      const bs = Math.floor(c.sampleRate * 0.05);
      const buf = c.createBuffer(1, bs, c.sampleRate);
      const bd = buf.getChannelData(0);
      for (let i = 0; i < bs; i++) bd[i] = (Math.random() * 2 - 1) * (1 - i / bs) * 0.5;
      const n = c.createBufferSource(); n.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
      const g = c.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      n.connect(f); f.connect(g); g.connect(this.musicGain); n.start(now); n.stop(now + 0.05);
    }

    // Shamisen melody
    if (this.musicBeat % 32 < 8) {
      const sc = [220, 246.94, 293.66, 329.63, 440, 493.88, 587.33];
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = sc[pat % sc.length];
      const g = c.createGain(); g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.01, now + bi * 0.8);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + bi * 0.8);
    }

    // Bass drone
    if (pat === 0) {
      const bn = [55, 55, 65.41, 55];
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = bn[Math.floor(this.musicBeat / 8) % bn.length];
      const g = c.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.linearRampToValueAtTime(0.12, now + bi * 4); g.gain.exponentialRampToValueAtTime(0.01, now + bi * 7);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + bi * 7);
    }
  }
}
