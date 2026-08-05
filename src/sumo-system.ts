import {
  createSystem,
  InputComponent,
} from '@iwsdk/core';
import {
  Vector3,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
  Group,
  PointLight,
  Color,
  PlaneGeometry,
  AmbientLight,
  DirectionalLight,
  TorusGeometry,
} from 'three';

export type GameState = 'menu' | 'playing' | 'paused' | 'results' | 'settings' | 'stats';

const RANKS = ['Jonokuchi', 'Jonidan', 'Sandanme', 'Makushita', 'Juryo', 'Maegashira', 'Komusubi', 'Sekiwake', 'Ozeki', 'Yokozuna'];

interface OpponentDef {
  name: string;
  weight: number;
  speed: number;
  aggression: number;
  technique: number;
  color: number;
}

const OPPONENT_POOL: OpponentDef[] = [
  { name: 'TARO', weight: 0.7, speed: 1.2, aggression: 0.3, technique: 0.2, color: 0x44aaff },
  { name: 'KENJI', weight: 1.0, speed: 1.0, aggression: 0.5, technique: 0.3, color: 0xff6644 },
  { name: 'HIRO', weight: 1.3, speed: 0.8, aggression: 0.6, technique: 0.4, color: 0x44ff88 },
  { name: 'DAICHI', weight: 1.5, speed: 0.7, aggression: 0.7, technique: 0.5, color: 0xffaa22 },
  { name: 'RYU', weight: 0.8, speed: 1.3, aggression: 0.4, technique: 0.6, color: 0xaa44ff },
  { name: 'TAKESHI', weight: 1.8, speed: 0.6, aggression: 0.8, technique: 0.3, color: 0xff4444 },
  { name: 'YOSHI', weight: 0.6, speed: 1.4, aggression: 0.2, technique: 0.7, color: 0x44ffff },
  { name: 'MASA', weight: 1.1, speed: 0.9, aggression: 0.6, technique: 0.5, color: 0xffff44 },
  { name: 'GORO', weight: 2.0, speed: 0.5, aggression: 0.9, technique: 0.2, color: 0xff2222 },
  { name: 'SHIN', weight: 0.9, speed: 1.1, aggression: 0.5, technique: 0.8, color: 0x88ff44 },
  { name: 'KENZO', weight: 1.4, speed: 0.8, aggression: 0.7, technique: 0.6, color: 0xff8844 },
  { name: 'RAIDEN', weight: 1.6, speed: 0.9, aggression: 0.8, technique: 0.7, color: 0xff00ff },
];

interface Wrestler {
  group: Group;
  body: Mesh;
  head: Mesh;
  belt: Mesh;
  arms: Group;
  leftArm: Mesh;
  rightArm: Mesh;
  pos: Vector3;
  vel: Vector3;
  facing: number;
  pushCooldown: number;
  grabCooldown: number;
  dodgeCooldown: number;
  chargeCooldown: number;
  isCharging: boolean;
  chargeTime: number;
  stagger: number;
  weightVal: number;
  speedVal: number;
  isPlayerW: boolean;
  pushAnim: number;
  grabAnim: number;
  dodgeDir: Vector3;
  dodgeTime: number;
  heightScale: number;
}

interface Particle {
  mesh: Mesh;
  vel: Vector3;
  life: number;
  maxLife: number;
}

export interface GameData {
  state: GameState;
  score: number;
  wins: number;
  losses: number;
  currentRank: number;
  matchWins: number;
  totalPushes: number;
  totalDodges: number;
  totalGrabs: number;
  totalRingOuts: number;
  bestWinStreak: number;
  currentStreak: number;
  currentOpponent: OpponentDef | null;
  matchNumber: number;
  roundTime: number;
  difficulty: number;
  colorScheme: number;
  sfxOn: boolean;
  musicOn: boolean;
  matchResult: 'win' | 'loss' | 'timeout' | null;
  countdownTime: number;
  isCountdown: boolean;
  lastAction: string;
  winTechnique: string;
  playerPushCD: number;
  playerGrabCD: number;
  playerDodgeCD: number;
  playerChargeCD: number;
}

const COLOR_SCHEMES = [
  { name: 'Dohyo Classic', accent: 0xffdd66, ring: 0xcc9944, platform: 0x886633, pillar: 0xcc2222, lantern: 0xff6600, ambient: 0x404060, ground: 0x1a1a2e, rope: 0xffcc00 },
  { name: 'Neon Arena', accent: 0x00ccff, ring: 0x224466, platform: 0x112244, pillar: 0x0066cc, lantern: 0x00aaff, ambient: 0x101040, ground: 0x080820, rope: 0x00ddff },
  { name: 'Cherry Blossom', accent: 0xff99cc, ring: 0xccaa88, platform: 0x997755, pillar: 0xcc6688, lantern: 0xff88aa, ambient: 0x503050, ground: 0x1a1020, rope: 0xffaacc },
  { name: 'Thunder', accent: 0xffcc44, ring: 0x665522, platform: 0x443311, pillar: 0x886600, lantern: 0xffaa00, ambient: 0x302010, ground: 0x151008, rope: 0xffdd00 },
];

const RING_RADIUS = 3.5;
const PUSH_FORCE = 6.0;
const CHARGE_FORCE = 10.0;
const DODGE_SPEED = 8.0;
const DODGE_DURATION = 0.25;
const FRICTION = 4.0;
const MATCH_TIME = 60;

const WINNING_TECHNIQUES = [
  'Oshidashi', 'Yorikiri', 'Hatakikomi', 'Uwatenage',
  'Okuridashi', 'Tsukiotoshi', 'Kotenage', 'Sukuinage',
  'Shitatenage', 'Oshitaoshi', 'Hikiotoshi', 'Tsukidashi',
];

function getWinningTechnique(lastAction: string): string {
  if (lastAction === 'push') return WINNING_TECHNIQUES[Math.random() < 0.5 ? 0 : 11];
  if (lastAction === 'grab') return WINNING_TECHNIQUES[Math.random() < 0.5 ? 1 : 3];
  if (lastAction === 'charge') return WINNING_TECHNIQUES[Math.random() < 0.5 ? 5 : 9];
  return WINNING_TECHNIQUES[Math.floor(Math.random() * WINNING_TECHNIQUES.length)];
}

export class SumoSystem extends createSystem({}) {
  private playerW!: Wrestler;
  private opponentW!: Wrestler;
  private arenaGroup!: Group;
  private particles: Particle[] = [];
  private gameData!: GameData;
  private ringEdgeGlow!: Mesh;
  private crowdLights: PointLight[] = [];
  private shakeIntensity = 0;
  private shakeDecay = 0;
  private cameraOffset = new Vector3();
  private dustParticles: Mesh[] = [];
  private fallGroup: Group | null = null;
  private fallAnim = 0;
  audioSystemRef: { playSFX: (t: string) => void } | null = null;
  private groundMesh!: Mesh;
  private platformMesh!: Mesh;
  private ringSurface!: Mesh;
  private pillarMeshes: Mesh[] = [];
  private lanternMeshes: Mesh[] = [];
  private ropeMeshes: Mesh[] = [];
  private wallMeshes: Mesh[] = [];
  private ceilingGroup!: Group;
  private footstepTimer = 0;
  private crowdExcitement = 0;
  private lastScheme = 0;
  private ambientLight!: AmbientLight;

  init() {
    this.gameData = {
      state: 'menu', score: 0, wins: 0, losses: 0, currentRank: 0, matchWins: 0,
      totalPushes: 0, totalDodges: 0, totalGrabs: 0, totalRingOuts: 0,
      bestWinStreak: 0, currentStreak: 0, currentOpponent: null, matchNumber: 0,
      roundTime: MATCH_TIME, difficulty: 1, colorScheme: 0,
      sfxOn: true, musicOn: true, matchResult: null, countdownTime: 3, isCountdown: false,
      lastAction: '', winTechnique: '', playerPushCD: 0, playerGrabCD: 0, playerDodgeCD: 0, playerChargeCD: 0,
    };
    this.loadStats();
    this.buildArena();
    this.playerW = this.createWrestler(true, 0x00aaff, 1.0, 1.0);
    this.opponentW = this.createWrestler(false, 0xff4422, 1.0, 1.0);
    this.resetPositions();
  }

  private loadStats() {
    try {
      const saved = localStorage.getItem('neon-sumo-stats');
      if (saved) {
        const s = JSON.parse(saved);
        this.gameData.wins = s.wins ?? 0;
        this.gameData.losses = s.losses ?? 0;
        this.gameData.currentRank = s.currentRank ?? 0;
        this.gameData.totalPushes = s.totalPushes ?? 0;
        this.gameData.totalDodges = s.totalDodges ?? 0;
        this.gameData.totalGrabs = s.totalGrabs ?? 0;
        this.gameData.totalRingOuts = s.totalRingOuts ?? 0;
        this.gameData.bestWinStreak = s.bestWinStreak ?? 0;
      }
    } catch { /* ignore */ }
  }

  private saveStats() {
    try {
      localStorage.setItem('neon-sumo-stats', JSON.stringify({
        wins: this.gameData.wins, losses: this.gameData.losses,
        currentRank: this.gameData.currentRank, totalPushes: this.gameData.totalPushes,
        totalDodges: this.gameData.totalDodges, totalGrabs: this.gameData.totalGrabs,
        totalRingOuts: this.gameData.totalRingOuts, bestWinStreak: this.gameData.bestWinStreak,
      }));
    } catch { /* ignore */ }
  }

  private buildArena() {
    this.arenaGroup = new Group();
    this.scene.add(this.arenaGroup);
    this.ambientLight = new AmbientLight(0x404060, 0.6);
    this.scene.add(this.ambientLight);
    const dl = new DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 10, 5);
    this.scene.add(dl);

    // Ground
    this.groundMesh = new Mesh(new PlaneGeometry(30, 30), new MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 }));
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.05;
    this.arenaGroup.add(this.groundMesh);

    // Platform
    this.platformMesh = new Mesh(new CylinderGeometry(RING_RADIUS + 0.8, RING_RADIUS + 1.2, 0.4, 48), new MeshStandardMaterial({ color: 0x886633, roughness: 0.7 }));
    this.platformMesh.position.y = 0.15;
    this.arenaGroup.add(this.platformMesh);

    // Ring surface
    this.ringSurface = new Mesh(new CylinderGeometry(RING_RADIUS + 0.3, RING_RADIUS + 0.3, 0.05, 48), new MeshStandardMaterial({ color: 0xcc9944, roughness: 0.5 }));
    this.ringSurface.position.y = 0.36;
    this.arenaGroup.add(this.ringSurface);

    // Ring boundary
    this.ringEdgeGlow = new Mesh(new TorusGeometry(RING_RADIUS, 0.08, 8, 64), new MeshStandardMaterial({ color: 0xffdd66, emissive: 0xffdd66, emissiveIntensity: 0.5 }));
    this.ringEdgeGlow.rotation.x = -Math.PI / 2;
    this.ringEdgeGlow.position.y = 0.4;
    this.arenaGroup.add(this.ringEdgeGlow);

    // Center salt circle marking
    const centerMark = new Mesh(new TorusGeometry(0.5, 0.03, 6, 32), new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2, transparent: true, opacity: 0.4 }));
    centerMark.rotation.x = -Math.PI / 2;
    centerMark.position.y = 0.37;
    this.arenaGroup.add(centerMark);

    // Starting lines (shikiri-sen)
    for (const z of [-0.6, 0.6]) {
      const line = new Mesh(new BoxGeometry(0.6, 0.02, 0.06), new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15, transparent: true, opacity: 0.5 }));
      line.position.set(0, 0.37, z);
      this.arenaGroup.add(line);
    }

    // 4 corner pillars + lanterns
    this.pillarMeshes = [];
    this.lanternMeshes = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(a) * (RING_RADIUS + 1.5), pz = Math.sin(a) * (RING_RADIUS + 1.5);
      const pillar = new Mesh(new CylinderGeometry(0.12, 0.15, 2.5, 8), new MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 0.3 }));
      pillar.position.set(px, 1.25, pz);
      this.arenaGroup.add(pillar);
      this.pillarMeshes.push(pillar);
      const lantern = new Mesh(new BoxGeometry(0.3, 0.4, 0.3), new MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.6 }));
      lantern.position.set(px, 2.6, pz);
      this.arenaGroup.add(lantern);
      this.lanternMeshes.push(lantern);
      const lt = new PointLight(0xff8844, 1.0, 8);
      lt.position.set(px, 2.8, pz);
      this.arenaGroup.add(lt);
      this.crowdLights.push(lt);
    }

    // Ropes between pillars
    this.ropeMeshes = [];
    for (let i = 0; i < 4; i++) {
      const a1 = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const a2 = ((i + 1) / 4) * Math.PI * 2 + Math.PI / 4;
      const r = RING_RADIUS + 1.5;
      const x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
      const x2 = Math.cos(a2) * r, z2 = Math.sin(a2) * r;
      const rl = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const rope = new Mesh(new CylinderGeometry(0.04, 0.04, rl, 6), new MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.2 }));
      rope.position.set((x1 + x2) / 2, 2.5, (z1 + z2) / 2);
      rope.lookAt(x2, 2.5, z2);
      rope.rotateZ(Math.PI / 2);
      this.arenaGroup.add(rope);
      this.ropeMeshes.push(rope);
    }

    // Dojo walls
    this.wallMeshes = [];
    const wallR = 12;
    const wallSegs = 16;
    for (let i = 0; i < wallSegs; i++) {
      const a = (i / wallSegs) * Math.PI * 2;
      const wx = Math.cos(a) * wallR, wz = Math.sin(a) * wallR;
      const wall = new Mesh(new BoxGeometry(4.8, 5, 0.2), new MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
      wall.position.set(wx, 2.5, wz);
      wall.lookAt(0, 2.5, 0);
      this.arenaGroup.add(wall);
      this.wallMeshes.push(wall);
    }

    // Roof beams
    this.ceilingGroup = new Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const beam = new Mesh(new BoxGeometry(0.15, 0.1, wallR * 0.9), new MeshStandardMaterial({ color: 0x3a2010, roughness: 0.8 }));
      beam.position.set(0, 5.2, 0);
      beam.rotation.y = a;
      this.ceilingGroup.add(beam);
    }
    // Ceiling disc
    const ceil = new Mesh(new CylinderGeometry(wallR * 0.95, wallR * 0.95, 0.1, 32), new MeshStandardMaterial({ color: 0x1a0e05, roughness: 0.9 }));
    ceil.position.y = 5.3;
    this.ceilingGroup.add(ceil);
    this.arenaGroup.add(this.ceilingGroup);

    // Decorative banners on walls
    const bannerColors = [0xcc0000, 0x0044aa, 0xcc8800, 0x006633];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const bx = Math.cos(a) * (wallR - 0.3), bz = Math.sin(a) * (wallR - 0.3);
      const banner = new Mesh(new PlaneGeometry(1.2, 2.5), new MeshStandardMaterial({ color: bannerColors[i], emissive: bannerColors[i], emissiveIntensity: 0.1, side: 2 }));
      banner.position.set(bx, 3, bz);
      banner.lookAt(0, 3, 0);
      this.arenaGroup.add(banner);
    }

    // Spectators
    for (let row = 0; row < 3; row++) {
      const r = RING_RADIUS + 3 + row * 1.5;
      const count = 16 + row * 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const seat = new Mesh(new BoxGeometry(0.4, 0.3 + row * 0.3, 0.4), new MeshStandardMaterial({ color: new Color().setHSL(Math.random() * 0.1 + 0.55, 0.3, 0.15), roughness: 0.8 }));
        seat.position.set(x, 0.15 + row * 0.15, z);
        this.arenaGroup.add(seat);
        if (Math.random() > 0.2) {
          const hd = new Mesh(new SphereGeometry(0.12, 6, 4), new MeshStandardMaterial({ color: new Color().setHSL(Math.random(), 0.5, 0.4) }));
          hd.position.set(x, 0.45 + row * 0.3, z);
          this.arenaGroup.add(hd);
        }
      }
    }

    // Dust
    for (let i = 0; i < 20; i++) {
      const d = new Mesh(new SphereGeometry(0.02, 4, 3), new MeshStandardMaterial({ color: 0xccaa77, emissive: 0xccaa77, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 }));
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * RING_RADIUS;
      d.position.set(Math.cos(a) * rr, 0.4 + Math.random() * 0.3, Math.sin(a) * rr);
      this.arenaGroup.add(d);
      this.dustParticles.push(d);
    }
  }

  private createWrestler(isPlayer: boolean, color: number, weight: number, speed: number): Wrestler {
    const group = new Group();
    const sc = 0.8 + weight * 0.3;
    const skinColor = isPlayer ? 0xeebb88 : 0xddaa77;
    const skinMat = new MeshStandardMaterial({ color: skinColor, roughness: 0.6 });

    const bodyGeo = new SphereGeometry(0.35 * sc, 12, 10);
    bodyGeo.scale(1, 1.1, 0.9);
    const body = new Mesh(bodyGeo, skinMat.clone());
    body.position.y = 0.5 * sc + 0.4;
    group.add(body);

    const head = new Mesh(new SphereGeometry(0.18 * sc, 10, 8), skinMat.clone());
    head.position.y = 0.9 * sc + 0.4;
    group.add(head);

    const bun = new Mesh(new SphereGeometry(0.08 * sc, 8, 6), new MeshStandardMaterial({ color: 0x222222 }));
    bun.position.set(0, 1.05 * sc + 0.4, -0.05);
    group.add(bun);

    const beltMat = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
    const belt = new Mesh(new TorusGeometry(0.36 * sc, 0.06, 8, 16), beltMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.45 * sc + 0.4;
    group.add(belt);

    const arms = new Group();
    arms.position.y = 0.6 * sc + 0.4;
    group.add(arms);

    const armGeo = new CylinderGeometry(0.08 * sc, 0.06 * sc, 0.35 * sc, 6);
    const leftArm = new Mesh(armGeo, skinMat.clone());
    leftArm.position.set(-0.35 * sc, 0, 0);
    leftArm.rotation.z = Math.PI / 4;
    arms.add(leftArm);

    const rightArm = new Mesh(armGeo.clone(), skinMat.clone());
    rightArm.position.set(0.35 * sc, 0, 0);
    rightArm.rotation.z = -Math.PI / 4;
    arms.add(rightArm);

    const legGeo = new CylinderGeometry(0.12 * sc, 0.1 * sc, 0.3, 8);
    const ll = new Mesh(legGeo, skinMat.clone());
    ll.position.set(-0.15 * sc, 0.15 + 0.4, 0);
    group.add(ll);
    const rl = new Mesh(legGeo.clone(), skinMat.clone());
    rl.position.set(0.15 * sc, 0.15 + 0.4, 0);
    group.add(rl);

    this.scene.add(group);

    return {
      group, body, head, belt, arms, leftArm, rightArm,
      pos: new Vector3(), vel: new Vector3(), facing: isPlayer ? 0 : Math.PI,
      pushCooldown: 0, grabCooldown: 0, dodgeCooldown: 0, chargeCooldown: 0,
      isCharging: false, chargeTime: 0, stagger: 0,
      weightVal: weight, speedVal: speed, isPlayerW: isPlayer,
      pushAnim: 0, grabAnim: 0,
      dodgeDir: new Vector3(), dodgeTime: 0, heightScale: sc,
    };
  }

  private resetPositions() {
    const reset = (w: Wrestler, px: number, pz: number, f: number) => {
      w.pos.set(px, 0, pz);
      w.vel.set(0, 0, 0);
      w.facing = f;
      w.stagger = 0;
      w.isCharging = false;
      w.chargeTime = 0;
      w.pushCooldown = 0;
      w.grabCooldown = 0;
      w.dodgeCooldown = 0;
      w.chargeCooldown = 0;
      w.dodgeTime = 0;
    };
    reset(this.playerW, 0, 1.5, Math.PI);
    reset(this.opponentW, 0, -1.5, 0);
  }

  private configureOpponent(def: OpponentDef) {
    const dm = [0.7, 1.0, 1.4][this.gameData.difficulty];
    const rm = 1 + this.gameData.currentRank * 0.08;
    this.opponentW.weightVal = def.weight * rm;
    this.opponentW.speedVal = def.speed * dm;
    const c = new Color(def.color);
    (this.opponentW.belt.material as MeshStandardMaterial).color.copy(c);
    (this.opponentW.belt.material as MeshStandardMaterial).emissive.copy(c);
  }

  startMatch() {
    const idx = Math.min(this.gameData.currentRank + Math.floor(Math.random() * 3), OPPONENT_POOL.length - 1);
    const oppDef = OPPONENT_POOL[idx];
    this.gameData.currentOpponent = oppDef;
    this.gameData.matchNumber++;
    this.gameData.roundTime = MATCH_TIME;
    this.gameData.matchResult = null;
    this.gameData.countdownTime = 3;
    this.gameData.isCountdown = true;
    this.configureOpponent(oppDef);
    this.resetPositions();
    this.clearFall();
    this.gameData.state = 'playing';
  }

  private clearFall() {
    if (this.fallGroup) { this.scene.remove(this.fallGroup); this.fallGroup = null; }
    this.fallAnim = 0;
    this.playerW.group.visible = true;
    this.opponentW.group.visible = true;
  }

  update(delta: number, time: number) {
    const dt = Math.min(delta, 0.05);
    if (this.gameData.state === 'playing') {
      if (this.gameData.isCountdown) {
        this.gameData.countdownTime -= dt;
        if (this.gameData.countdownTime <= 0) this.gameData.isCountdown = false;
      } else {
        this.updatePlayerInput(dt);
        this.updateAI(dt);
        this.updatePhysics(dt);
        this.checkRingOut();
        this.gameData.roundTime -= dt;
        if (this.gameData.roundTime <= 0) this.endMatch('timeout');
        this.updateFootsteps(dt);
        this.updateCrowdExcitement(dt);
      }
      // Expose cooldowns to HUD
      this.gameData.playerPushCD = this.playerW.pushCooldown;
      this.gameData.playerGrabCD = this.playerW.grabCooldown;
      this.gameData.playerDodgeCD = this.playerW.dodgeCooldown;
      this.gameData.playerChargeCD = this.playerW.chargeCooldown;
    }
    if (this.fallGroup) {
      this.fallAnim += dt;
      this.fallGroup.position.y -= dt * 3;
      this.fallGroup.rotation.x += dt * 4;
      this.fallGroup.rotation.z += dt * 2;
      if (this.fallAnim > 1.5) this.clearFall();
    }
    this.updateVisuals(dt, time);
    this.updateParticles(dt);
    this.updateCam(dt);
  }

  private updateFootsteps(dt: number) {
    this.footstepTimer += dt;
    if (this.footstepTimer < 0.15) return;
    this.footstepTimer = 0;
    for (const w of [this.playerW, this.opponentW]) {
      if (w.vel.length() > 0.5) {
        this.spawn(w.pos.clone().setY(0.4), 0xccaa77, 2);
      }
    }
  }

  private updateCrowdExcitement(dt: number) {
    const pd = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
    const od = Math.sqrt(this.opponentW.pos.x ** 2 + this.opponentW.pos.z ** 2);
    const edgeFactor = Math.max(pd / RING_RADIUS, od / RING_RADIUS);
    const targetExcitement = Math.min(1, edgeFactor * 1.2);
    this.crowdExcitement += (targetExcitement - this.crowdExcitement) * dt * 3;
  }

  private updatePlayerInput(dt: number) {
    const kb = this.input.keyboard;
    const p = this.playerW;
    if (p.stagger > 0) { p.stagger -= dt; return; }
    if (p.dodgeTime > 0) return;

    let mx = 0, mz = 0;
    if (kb.getKeyPressed('KeyW') || kb.getKeyPressed('ArrowUp')) mz = -1;
    if (kb.getKeyPressed('KeyS') || kb.getKeyPressed('ArrowDown')) mz = 1;
    if (kb.getKeyPressed('KeyA') || kb.getKeyPressed('ArrowLeft')) mx = -1;
    if (kb.getKeyPressed('KeyD') || kb.getKeyPressed('ArrowRight')) mx = 1;

    const xrGP = this.input.xr.gamepads;
    const lGP = xrGP?.left;
    const rGP = xrGP?.right;
    if (lGP) { const a = lGP.getAxesValues(InputComponent.Thumbstick); if (a) { mx += a.x; mz += a.y; } }
    if (rGP) { const a = rGP.getAxesValues(InputComponent.Thumbstick); if (a) { mx += a.x; mz += a.y; } }

    const ml = Math.sqrt(mx * mx + mz * mz);
    if (ml > 0.1) {
      const sp = 3.5 * p.speedVal;
      p.vel.x += (mx / ml) * sp * dt;
      p.vel.z += (mz / ml) * sp * dt;
      p.facing = Math.atan2(this.opponentW.pos.x - p.pos.x, this.opponentW.pos.z - p.pos.z);
    }

    // Push
    const rTrig = rGP ? rGP.getButtonDown(InputComponent.Trigger) : false;
    if ((kb.getKeyDown('Space') || rTrig) && p.pushCooldown <= 0) {
      this.doPush(p, this.opponentW);
      p.pushCooldown = 0.5;
      this.gameData.totalPushes++;
      this.gameData.lastAction = 'push';
    }

    // Grab
    const rGrip = rGP ? rGP.getButtonDown(InputComponent.Squeeze) : false;
    if ((kb.getKeyDown('KeyE') || rGrip) && p.grabCooldown <= 0) {
      this.doGrab(p, this.opponentW);
      p.grabCooldown = 1.5;
      this.gameData.totalGrabs++;
      this.gameData.lastAction = 'grab';
    }

    // Dodge
    const lTrig = lGP ? lGP.getButtonDown(InputComponent.Trigger) : false;
    if ((kb.getKeyDown('ShiftLeft') || kb.getKeyDown('ShiftRight') || lTrig) && p.dodgeCooldown <= 0) {
      this.doDodge(p, mx, mz);
      p.dodgeCooldown = 1.0;
      this.gameData.totalDodges++;
    }

    // Charge
    if (kb.getKeyPressed('KeyQ') && p.chargeCooldown <= 0) {
      p.isCharging = true;
      p.chargeTime += dt;
    } else if (p.isCharging) {
      if (p.chargeTime > 0.3) { this.doCharge(p, this.opponentW); this.gameData.lastAction = 'charge'; }
      p.isCharging = false;
      p.chargeTime = 0;
      p.chargeCooldown = 2.0;
    }

    p.pushCooldown = Math.max(0, p.pushCooldown - dt);
    p.grabCooldown = Math.max(0, p.grabCooldown - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
    p.chargeCooldown = Math.max(0, p.chargeCooldown - dt);
    p.pushAnim = Math.max(0, p.pushAnim - dt * 4);
    p.grabAnim = Math.max(0, p.grabAnim - dt * 3);
  }

  private sfx(t: string) { if (this.gameData.sfxOn && this.audioSystemRef) this.audioSystemRef.playSFX(t); }

  private doPush(a: Wrestler, t: Wrestler) {
    const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
    const dist = a.pos.distanceTo(t.pos);
    if (dist < 1.2) {
      if (!t.isPlayerW && t.dodgeTime <= 0) {
        const opp = this.gameData.currentOpponent;
        if (opp && Math.random() < opp.technique * 0.3) {
          t.vel.add(new Vector3(-dir.z, 0, dir.x).multiplyScalar(DODGE_SPEED * 0.5));
          this.spawn(t.pos, 0x44ff44, 4);
          return;
        }
      }
      t.vel.add(dir.multiplyScalar(PUSH_FORCE / Math.max(0.5, t.weightVal)));
      t.stagger = 0.2;
      a.pushAnim = 1;
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xffaa44, 8);
      this.shakeIntensity = 0.05;
      this.shakeDecay = 3;
      this.sfx('push');
    }
  }

  private doGrab(a: Wrestler, t: Wrestler) {
    if (a.pos.distanceTo(t.pos) < 1.0) {
      const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
      const ta = (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.4;
      const c = Math.cos(ta), s = Math.sin(ta);
      const td = new Vector3(dir.x * c - dir.z * s, 0, dir.x * s + dir.z * c);
      t.vel.add(td.multiplyScalar((PUSH_FORCE * 1.5) / Math.max(0.5, t.weightVal)));
      t.stagger = 0.4;
      a.grabAnim = 1;
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xff44ff, 10);
      this.shakeIntensity = 0.08;
      this.shakeDecay = 3;
      this.sfx('grab');
    }
  }

  private doDodge(w: Wrestler, mx: number, mz: number) {
    let dx = mx, dz = mz;
    if (Math.abs(dx) < 0.1 && Math.abs(dz) < 0.1) {
      const aw = new Vector3().subVectors(w.pos, this.opponentW.pos).normalize();
      dx = aw.x; dz = aw.z;
    }
    const l = Math.sqrt(dx * dx + dz * dz);
    w.dodgeDir.set(l > 0 ? dx / l : 0, 0, l > 0 ? dz / l : -1);
    w.dodgeTime = DODGE_DURATION;
    this.spawn(w.pos.clone().setY(0.5), 0x44ccff, 6);
    this.sfx('dodge');
  }

  private doCharge(a: Wrestler, t: Wrestler) {
    const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
    const cm = Math.min(a.chargeTime * 2, 3);
    a.vel.add(dir.clone().multiplyScalar(5));
    if (a.pos.distanceTo(t.pos) < 2.0) {
      t.vel.add(dir.multiplyScalar(CHARGE_FORCE * cm / Math.max(0.5, t.weightVal)));
      t.stagger = 0.5;
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xff8800, 15);
      this.shakeIntensity = 0.15;
      this.shakeDecay = 4;
      this.sfx('charge');
    }
  }

  private updateAI(dt: number) {
    const o = this.opponentW;
    const od = this.gameData.currentOpponent;
    if (!od || o.stagger > 0 || o.dodgeTime > 0) {
      o.pushCooldown = Math.max(0, o.pushCooldown - dt);
      o.grabCooldown = Math.max(0, o.grabCooldown - dt);
      o.dodgeCooldown = Math.max(0, o.dodgeCooldown - dt);
      o.chargeCooldown = Math.max(0, o.chargeCooldown - dt);
      return;
    }
    const tp = new Vector3().subVectors(this.playerW.pos, o.pos);
    const dist = tp.length();
    tp.normalize();
    o.facing = Math.atan2(this.playerW.pos.x - o.pos.x, this.playerW.pos.z - o.pos.z);
    const odc = Math.sqrt(o.pos.x ** 2 + o.pos.z ** 2);
    const pdc = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
    const ms = 2.5 * o.speedVal;

    if (odc > RING_RADIUS * 0.7) {
      o.vel.add(new Vector3(-o.pos.x, 0, -o.pos.z).normalize().multiplyScalar(ms * dt * 2));
    } else if (dist > 2.0) {
      if (Math.random() < od.aggression) o.vel.add(tp.clone().multiplyScalar(ms * dt));
    } else if (dist > 1.0) {
      if (Math.random() < od.technique * 0.5) {
        o.vel.add(new Vector3(-tp.z, 0, tp.x).multiplyScalar(ms * dt * 0.7));
      } else {
        o.vel.add(tp.clone().multiplyScalar(ms * dt * 0.8));
      }
    }

    if (dist < 1.2 && o.pushCooldown <= 0 && Math.random() < od.aggression * 0.8 * dt * 3) {
      this.doAIPush(o, this.playerW);
      o.pushCooldown = 0.6 / o.speedVal;
    }
    if (dist < 1.0 && o.grabCooldown <= 0 && Math.random() < od.technique * 0.5 * dt * 2) {
      this.doAIGrab(o, this.playerW);
      o.grabCooldown = 2.0 / o.speedVal;
    }
    if (pdc > RING_RADIUS * 0.6 && dist < 2.5 && o.chargeCooldown <= 0 && Math.random() < od.aggression * dt) {
      this.doCharge(o, this.playerW);
      o.chargeCooldown = 3.0;
    }
    if (this.playerW.isCharging && dist < 2.0 && o.dodgeCooldown <= 0 && Math.random() < od.technique * 0.6) {
      o.vel.add(new Vector3(-tp.z, 0, tp.x).multiplyScalar(DODGE_SPEED * 0.4));
      o.dodgeCooldown = 1.5;
      this.spawn(o.pos.clone().setY(0.5), 0x44ff44, 4);
    }

    o.pushCooldown = Math.max(0, o.pushCooldown - dt);
    o.grabCooldown = Math.max(0, o.grabCooldown - dt);
    o.dodgeCooldown = Math.max(0, o.dodgeCooldown - dt);
    o.chargeCooldown = Math.max(0, o.chargeCooldown - dt);
    o.pushAnim = Math.max(0, o.pushAnim - dt * 4);
    o.grabAnim = Math.max(0, o.grabAnim - dt * 3);
  }

  private doAIPush(a: Wrestler, t: Wrestler) {
    const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
    t.vel.add(dir.multiplyScalar(PUSH_FORCE * 0.8 / Math.max(0.5, t.weightVal)));
    t.stagger = 0.15;
    a.pushAnim = 1;
    this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xffaa44, 6);
    this.shakeIntensity = 0.04;
    this.shakeDecay = 3;
    this.sfx('push');
  }

  private doAIGrab(a: Wrestler, t: Wrestler) {
    const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
    const ta = (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.3;
    const c = Math.cos(ta), s = Math.sin(ta);
    const td = new Vector3(dir.x * c - dir.z * s, 0, dir.x * s + dir.z * c);
    t.vel.add(td.multiplyScalar((PUSH_FORCE * 1.2) / Math.max(0.5, t.weightVal)));
    t.stagger = 0.3;
    a.grabAnim = 1;
    this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xff44ff, 8);
    this.shakeIntensity = 0.06;
    this.shakeDecay = 3;
    this.sfx('grab');
  }

  private updatePhysics(dt: number) {
    for (const w of [this.playerW, this.opponentW]) {
      if (w.dodgeTime > 0) {
        w.pos.add(w.dodgeDir.clone().multiplyScalar(DODGE_SPEED * dt));
        w.dodgeTime -= dt;
        if (w.dodgeTime <= 0) w.dodgeTime = 0;
        continue;
      }
      w.pos.add(w.vel.clone().multiplyScalar(dt));
      w.vel.multiplyScalar(Math.max(0, 1 - FRICTION * dt));
      if (w.vel.length() < 0.01) w.vel.set(0, 0, 0);
    }
    const diff = new Vector3().subVectors(this.playerW.pos, this.opponentW.pos);
    const d = diff.length();
    if (d < 0.7 && d > 0.01) {
      diff.normalize();
      const ov = (0.7 - d) * 0.5;
      this.playerW.pos.add(diff.clone().multiplyScalar(ov));
      this.opponentW.pos.add(diff.clone().multiplyScalar(-ov));
    }
  }

  private checkRingOut() {
    const pd = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
    const od = Math.sqrt(this.opponentW.pos.x ** 2 + this.opponentW.pos.z ** 2);
    if (pd > RING_RADIUS) { this.startFall('player'); this.endMatch('loss'); }
    else if (od > RING_RADIUS) { this.startFall('opponent'); this.endMatch('win'); }
  }

  private startFall(who: 'player' | 'opponent') {
    const w = who === 'player' ? this.playerW : this.opponentW;
    this.fallAnim = 0;
    this.fallGroup = new Group();
    this.fallGroup.add(new Mesh(new SphereGeometry(0.35 * w.heightScale, 8, 6), new MeshStandardMaterial({ color: 0xddaa77 })));
    this.fallGroup.position.copy(w.group.position);
    this.scene.add(this.fallGroup);
    w.group.visible = false;
    this.spawn(w.pos.clone().setY(0.5), 0xff8800, 20);
    this.shakeIntensity = 0.2;
    this.shakeDecay = 5;
    this.sfx('ringout');
  }

  private endMatch(result: 'win' | 'loss' | 'timeout') {
    this.gameData.matchResult = result;
    if (result === 'win') {
      this.gameData.wins++;
      this.gameData.matchWins++;
      this.gameData.currentStreak++;
      this.gameData.totalRingOuts++;
      if (this.gameData.currentStreak > this.gameData.bestWinStreak) this.gameData.bestWinStreak = this.gameData.currentStreak;
      this.gameData.score += 500 + Math.floor(this.gameData.roundTime * 10) + (this.gameData.currentRank + 1) * 100;
      if (this.gameData.matchWins % 3 === 0 && this.gameData.currentRank < RANKS.length - 1) this.gameData.currentRank++;
      this.gameData.winTechnique = getWinningTechnique(this.gameData.lastAction);
    } else if (result === 'loss') {
      this.gameData.losses++;
      this.gameData.currentStreak = 0;
      this.gameData.winTechnique = '';
    } else {
      const pd = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
      const od = Math.sqrt(this.opponentW.pos.x ** 2 + this.opponentW.pos.z ** 2);
      if (pd < od) { this.gameData.matchResult = 'win'; this.gameData.wins++; this.gameData.matchWins++; this.gameData.score += 300; this.gameData.winTechnique = 'Yorikiri'; }
      else { this.gameData.matchResult = 'loss'; this.gameData.losses++; this.gameData.currentStreak = 0; this.gameData.winTechnique = ''; }
    }
    this.saveStats();
    this.gameData.state = 'results';
  }

  private updateVisuals(dt: number, time: number) {
    for (const w of [this.playerW, this.opponentW]) {
      w.group.position.set(w.pos.x, 0, w.pos.z);
      w.group.rotation.y = w.facing;
      if (w.pushAnim > 0) w.arms.rotation.x = -w.pushAnim * 0.8;
      else if (w.grabAnim > 0) { w.arms.rotation.x = -w.grabAnim * 0.5; w.leftArm.rotation.z = Math.PI / 4 - w.grabAnim * 0.4; w.rightArm.rotation.z = -Math.PI / 4 + w.grabAnim * 0.4; }
      else { w.arms.rotation.x = 0; w.leftArm.rotation.z = Math.PI / 4; w.rightArm.rotation.z = -Math.PI / 4; }
      w.group.rotation.z = w.stagger > 0 ? Math.sin(time * 20) * 0.1 * w.stagger : 0;
      if (w.isCharging) {
        const i = Math.min(w.chargeTime * 2, 1);
        (w.belt.material as MeshStandardMaterial).emissiveIntensity = 0.4 + i * 1.5;
        w.group.scale.set(1 + i * 0.1, 1, 1 + i * 0.1);
      } else {
        (w.belt.material as MeshStandardMaterial).emissiveIntensity = 0.4;
        w.group.scale.set(1, 1, 1);
      }
      w.body.position.y = 0.5 * w.heightScale + 0.4 + Math.sin(time * 3 + (w.isPlayerW ? 0 : 1)) * 0.02;
    }

    // Apply full color scheme
    const scheme = COLOR_SCHEMES[this.gameData.colorScheme];
    if (this.gameData.colorScheme !== this.lastScheme) {
      this.lastScheme = this.gameData.colorScheme;
      (this.groundMesh.material as MeshStandardMaterial).color.set(scheme.ground);
      (this.platformMesh.material as MeshStandardMaterial).color.set(scheme.platform);
      (this.ringSurface.material as MeshStandardMaterial).color.set(scheme.ring);
      this.ambientLight.color.set(scheme.ambient);
      for (const p of this.pillarMeshes) { (p.material as MeshStandardMaterial).color.set(scheme.pillar); (p.material as MeshStandardMaterial).emissive.set(scheme.pillar); }
      for (const l of this.lanternMeshes) { (l.material as MeshStandardMaterial).color.set(scheme.lantern); (l.material as MeshStandardMaterial).emissive.set(scheme.lantern); }
      for (const r of this.ropeMeshes) { (r.material as MeshStandardMaterial).color.set(scheme.rope); (r.material as MeshStandardMaterial).emissive.set(scheme.rope); }
    }

    const em = this.ringEdgeGlow.material as MeshStandardMaterial;
    em.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.15;
    em.color.set(scheme.accent); em.emissive.set(scheme.accent);

    // Crowd excitement affects lantern flicker intensity
    const exciteMult = 1 + this.crowdExcitement * 1.5;
    for (const l of this.crowdLights) l.intensity = (0.8 + Math.sin(time * 5 + l.position.x) * 0.2) * exciteMult;
    for (const d of this.dustParticles) { d.position.y = 0.4 + Math.sin(time * 1.5 + d.position.x * 3) * 0.15; d.position.x += Math.sin(time * 0.5 + d.position.z) * dt * 0.1; }
  }

  private spawn(pos: Vector3, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const m = new Mesh(new SphereGeometry(0.04 + Math.random() * 0.04, 4, 3), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, transparent: true, opacity: 1 }));
      m.position.copy(pos);
      this.scene.add(m);
      this.particles.push({ mesh: m, vel: new Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4), life: 0.5 + Math.random() * 0.5, maxLife: 0.5 + Math.random() * 0.5 });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vel.y -= 8 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.life -= dt;
      const t = p.life / p.maxLife;
      (p.mesh.material as MeshStandardMaterial).opacity = t;
      p.mesh.scale.setScalar(t);
      if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as MeshStandardMaterial).dispose(); this.particles.splice(i, 1); }
    }
  }

  private updateCam(dt: number) {
    const c = this.camera;
    // Dynamic camera zoom based on wrestler distance
    const dist = this.playerW.pos.distanceTo(this.opponentW.pos);
    const targetY = dist < 1.5 ? 4.5 : 6;
    const targetZ = dist < 1.5 ? 5.5 : 7;
    c.position.lerp(new Vector3(0, targetY, targetZ), dt * 2);
    if (this.shakeIntensity > 0) {
      this.cameraOffset.set((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
      c.position.add(this.cameraOffset);
      this.shakeIntensity *= Math.exp(-this.shakeDecay * dt);
      if (this.shakeIntensity < 0.001) this.shakeIntensity = 0;
    }
    c.lookAt(0, 0.5, 0);
  }

  getGameData(): GameData { return this.gameData; }
  getRankName(): string { return RANKS[Math.min(this.gameData.currentRank, RANKS.length - 1)]; }
  getOpponentName(): string { return this.gameData.currentOpponent?.name ?? 'UNKNOWN'; }
  getWinTechnique(): string { return this.gameData.winTechnique; }
  setDifficulty(d: number) { this.gameData.difficulty = d; }
  setColorScheme(c: number) { this.gameData.colorScheme = c; }
  setSfx(on: boolean) { this.gameData.sfxOn = on; }
  setMusic(on: boolean) { this.gameData.musicOn = on; }
  setState(s: GameState) { this.gameData.state = s; }
  resetCareer() {
    Object.assign(this.gameData, { score: 0, wins: 0, losses: 0, currentRank: 0, matchWins: 0, matchNumber: 0, currentStreak: 0, totalPushes: 0, totalDodges: 0, totalGrabs: 0, totalRingOuts: 0, bestWinStreak: 0 });
    this.saveStats();
  }
}
