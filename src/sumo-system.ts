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
  ConeGeometry,
} from 'three';

export type GameState = 'menu' | 'playing' | 'paused' | 'results' | 'settings' | 'stats' | 'training' | 'survival' | 'scouting';

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
  henkaCooldown: number;
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
  stamina: number;
  crouchAnim: number;
  damageFlash: number;
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
  totalHenkas: number;
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
  playerHenkaCD: number;
  playerStamina: number;
  inTournament: boolean;
  tournamentRound: number;
  tournamentBracket: OpponentDef[];
  tournamentWins: number;
  tachiai: boolean;
  tachiaiTimer: number;
  isTraining: boolean;
  slowMo: number;
  slowMoTimer: number;
  comboCount: number;
  comboTimer: number;
  lastComboText: string;
  inSurvival: boolean;
  survivalWave: number;
  survivalKills: number;
  survivalBestWave: number;
  hariteCooldown: number;
  isUpsetWin: boolean;
  zabutonActive: boolean;
  rankUpPending: boolean;
  rankUpFrom: number;
  rankUpTo: number;
  rankUpTimer: number;
  matchHistory: { opponent: string; result: string; technique: string; score: number }[];
  chargeDisplayPower: number;
  playerBeltColor: number;
  matchPushes: number;
  matchGrabs: number;
  matchDodges: number;
  matchHenkas: number;
  matchCharges: number;
  matchMaxCombo: number;
  edgeDanger: number;
  yokozunaEntrance: boolean;
  yokozunaEntranceTimer: number;
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
const MAX_STAMINA = 100;
const STAMINA_REGEN = 12;
const PUSH_STAMINA = 15;
const GRAB_STAMINA = 25;
const DODGE_STAMINA = 20;
const CHARGE_STAMINA = 30;
const HENKA_STAMINA = 18;
const LOW_STAMINA_THRESHOLD = 30;
const TACHIAI_DURATION = 2.0;
const HENKA_FORCE = 5.0;
const SLOWMO_DURATION = 0.6;
const COMBO_WINDOW = 2.0;
const HARITE_FORCE = 8.0;
const HARITE_STAMINA = 35;
const HARITE_STUN = 0.6;

const WINNING_TECHNIQUES = [
  'Oshidashi', 'Yorikiri', 'Hatakikomi', 'Uwatenage',
  'Okuridashi', 'Tsukiotoshi', 'Kotenage', 'Sukuinage',
  'Shitatenage', 'Oshitaoshi', 'Hikiotoshi', 'Tsukidashi',
];


const BELT_COLORS = [
  { name: 'Blue', color: 0x00aaff },
  { name: 'Red', color: 0xff2244 },
  { name: 'Gold', color: 0xffcc00 },
  { name: 'Purple', color: 0xaa44ff },
  { name: 'Green', color: 0x44cc44 },
  { name: 'White', color: 0xeeeeff },
  { name: 'Black', color: 0x222222 },
  { name: 'Pink', color: 0xff66aa },
];

function getWinningTechnique(lastAction: string): string {
  if (lastAction === 'push') return WINNING_TECHNIQUES[Math.random() < 0.5 ? 0 : 11];
  if (lastAction === 'grab') return WINNING_TECHNIQUES[Math.random() < 0.5 ? 1 : 3];
  if (lastAction === 'charge') return WINNING_TECHNIQUES[Math.random() < 0.5 ? 5 : 9];
  if (lastAction === 'henka') return WINNING_TECHNIQUES[2]; // Hatakikomi
  if (lastAction === 'harite') return 'Harite'; // Palm strike — not in standard list
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
  private gyojiGroup!: Group;
  private gyojiFan!: Mesh;
  private gyojiAngle = 0;
  private spectatorHeads: Mesh[] = [];
  private spectatorBounce: number[] = [];
  private celebrationActive = false;
  private celebrationTimer = 0;
  private celebrationParticles: Particle[] = [];
  private zabutonParticles: Particle[] = [];
  private zabutonTimer = 0;
  private chargeMeterGroup!: Group;
  private chargeMeterBar!: Mesh;
  private chargeMeterBg!: Mesh;
  private rankUpParticles: Particle[] = [];
  private rankUpActive = false;
  private rankUpEffectTimer = 0;
  private sandSprayTimer = 0;
  private edgeDangerRing!: Mesh;
  private edgeDangerPulse = 0;
  private yokozunaParticles: Particle[] = [];
  private yokozunaRopeLeft!: Group;
  private yokozunaRopeRight!: Group;

  init() {
    this.gameData = {
      state: 'menu', score: 0, wins: 0, losses: 0, currentRank: 0, matchWins: 0,
      totalPushes: 0, totalDodges: 0, totalGrabs: 0, totalRingOuts: 0, totalHenkas: 0,
      bestWinStreak: 0, currentStreak: 0, currentOpponent: null, matchNumber: 0,
      roundTime: MATCH_TIME, difficulty: 1, colorScheme: 0,
      sfxOn: true, musicOn: true, matchResult: null, countdownTime: 3, isCountdown: false,
      lastAction: '', winTechnique: '', playerPushCD: 0, playerGrabCD: 0, playerDodgeCD: 0,
      playerChargeCD: 0, playerHenkaCD: 0,
      playerStamina: MAX_STAMINA, inTournament: false, tournamentRound: 0,
      tournamentBracket: [], tournamentWins: 0, tachiai: false, tachiaiTimer: 0,
      isTraining: false, slowMo: 1, slowMoTimer: 0,
      comboCount: 0, comboTimer: 0, lastComboText: '',
      inSurvival: false, survivalWave: 0, survivalKills: 0, survivalBestWave: 0,
      hariteCooldown: 0, isUpsetWin: false, zabutonActive: false,
      rankUpPending: false, rankUpFrom: 0, rankUpTo: 0, rankUpTimer: 0,
      matchHistory: [], chargeDisplayPower: 0,
      playerBeltColor: 0, matchPushes: 0, matchGrabs: 0, matchDodges: 0,
      matchHenkas: 0, matchCharges: 0, matchMaxCombo: 0, edgeDanger: 0,
      yokozunaEntrance: false, yokozunaEntranceTimer: 0,
    };
    this.loadStats();
    this.buildArena();
    this.buildGyoji();
    this.buildChargeMeter();
    this.buildYokozunaRope();
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
        this.gameData.totalHenkas = s.totalHenkas ?? 0;
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
        totalRingOuts: this.gameData.totalRingOuts, totalHenkas: this.gameData.totalHenkas,
        bestWinStreak: this.gameData.bestWinStreak,
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

    // Edge danger ring (warning ring that glows when player is near edge)
    this.edgeDangerRing = new Mesh(
      new TorusGeometry(RING_RADIUS - 0.5, 0.06, 8, 64),
      new MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0, transparent: true, opacity: 0 })
    );
    this.edgeDangerRing.rotation.x = -Math.PI / 2;
    this.edgeDangerRing.position.y = 0.41;
    this.arenaGroup.add(this.edgeDangerRing);

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

    // Spectators with bounce tracking
    this.spectatorHeads = [];
    this.spectatorBounce = [];
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
          this.spectatorHeads.push(hd);
          this.spectatorBounce.push(0);
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

  private buildGyoji() {
    this.gyojiGroup = new Group();
    // Gyoji body — wearing traditional robes
    const robeBody = new Mesh(
      new CylinderGeometry(0.18, 0.25, 0.8, 8),
      new MeshStandardMaterial({ color: 0x220066, roughness: 0.6 })
    );
    robeBody.position.y = 0.8;
    this.gyojiGroup.add(robeBody);

    // Gyoji head
    const head = new Mesh(
      new SphereGeometry(0.12, 8, 6),
      new MeshStandardMaterial({ color: 0xeebb88, roughness: 0.5 })
    );
    head.position.y = 1.3;
    this.gyojiGroup.add(head);

    // Eboshi (tall hat)
    const hat = new Mesh(
      new ConeGeometry(0.08, 0.25, 6),
      new MeshStandardMaterial({ color: 0x111111 })
    );
    hat.position.y = 1.5;
    this.gyojiGroup.add(hat);

    // Gunbai (war fan) — the referee's fan
    const fanHandle = new Mesh(
      new CylinderGeometry(0.015, 0.015, 0.3, 6),
      new MeshStandardMaterial({ color: 0x553300 })
    );
    fanHandle.position.set(0.25, 1.0, 0);
    fanHandle.rotation.z = -Math.PI / 4;
    this.gyojiGroup.add(fanHandle);

    this.gyojiFan = new Mesh(
      new CylinderGeometry(0.12, 0.12, 0.02, 8),
      new MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.3 })
    );
    this.gyojiFan.position.set(0.35, 1.15, 0);
    this.gyojiFan.rotation.x = Math.PI / 2;
    this.gyojiGroup.add(this.gyojiFan);

    // Robe sash
    const sash = new Mesh(
      new BoxGeometry(0.4, 0.08, 0.3),
      new MeshStandardMaterial({ color: 0xcc8800, emissive: 0xcc8800, emissiveIntensity: 0.15 })
    );
    sash.position.y = 0.7;
    this.gyojiGroup.add(sash);

    // Position gyoji to the side of the ring
    this.gyojiGroup.position.set(RING_RADIUS + 0.5, 0.0, 0);
    this.scene.add(this.gyojiGroup);
  }

  private buildChargeMeter() {
    this.chargeMeterGroup = new Group();
    // Background bar
    this.chargeMeterBg = new Mesh(
      new BoxGeometry(0.6, 0.08, 0.02),
      new MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.6 })
    );
    this.chargeMeterGroup.add(this.chargeMeterBg);
    // Fill bar
    this.chargeMeterBar = new Mesh(
      new BoxGeometry(0.6, 0.06, 0.025),
      new MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 })
    );
    this.chargeMeterBar.position.z = 0.005;
    this.chargeMeterGroup.add(this.chargeMeterBar);
    this.chargeMeterGroup.visible = false;
    this.scene.add(this.chargeMeterGroup);
  }

  private buildYokozunaRope() {
    // Yokozuna entrance rope (tsuna) — shown during yokozuna entrance ceremony
    const createRope = () => {
      const g = new Group();
      // Main rope
      const rope = new Mesh(
        new TorusGeometry(0.4, 0.04, 8, 32, Math.PI),
        new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffdd, emissiveIntensity: 0.3 })
      );
      rope.position.y = 0.5;
      g.add(rope);
      // Shide (zigzag paper)
      for (let i = 0; i < 3; i++) {
        const shide = new Mesh(
          new BoxGeometry(0.06, 0.2, 0.01),
          new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 })
        );
        shide.position.set(-0.2 + i * 0.2, 0.25, 0);
        shide.rotation.z = (i - 1) * 0.2;
        g.add(shide);
      }
      g.visible = false;
      return g;
    };
    this.yokozunaRopeLeft = createRope();
    this.yokozunaRopeLeft.position.set(-0.6, 0.6, 0);
    this.playerW.group.add(this.yokozunaRopeLeft);
    this.yokozunaRopeRight = createRope();
    this.yokozunaRopeRight.position.set(0.6, 0.6, 0);
    this.yokozunaRopeRight.scale.x = -1;
    this.playerW.group.add(this.yokozunaRopeRight);
  }

  private spawnSandSpray(pos: Vector3, intensity: number) {
    const count = Math.floor(4 + intensity * 10);
    for (let i = 0; i < count; i++) {
      const m = new Mesh(
        new SphereGeometry(0.02 + Math.random() * 0.02, 4, 3),
        new MeshStandardMaterial({ color: 0xccaa66, emissive: 0xaa8844, emissiveIntensity: 0.2, transparent: true, opacity: 0.7 })
      );
      m.position.copy(pos).setY(0.38);
      this.scene.add(m);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2 * intensity;
      this.particles.push({
        mesh: m,
        vel: new Vector3(Math.cos(angle) * speed, Math.random() * 1.5 + 0.5, Math.sin(angle) * speed),
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6,
      });
    }
  }

  private triggerRankUpEffect() {
    this.rankUpActive = true;
    this.rankUpEffectTimer = 3.5;
    // Golden ascending particles around the player
    const colors = [0xffdd44, 0xffcc00, 0xffaa00, 0xffffff, 0xffee88];
    for (let i = 0; i < 40; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      const m = new Mesh(
        new BoxGeometry(0.04, 0.04, 0.04),
        new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.0, transparent: true, opacity: 1 })
      );
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.8;
      m.position.set(
        this.playerW.pos.x + Math.cos(angle) * r,
        0.5 + Math.random() * 0.5,
        this.playerW.pos.z + Math.sin(angle) * r
      );
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(m);
      this.rankUpParticles.push({
        mesh: m,
        vel: new Vector3((Math.random() - 0.5) * 0.5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 0.5),
        life: 2.5 + Math.random() * 1.0,
        maxLife: 3.5,
      });
    }
  }

  private updateRankUpEffect(dt: number) {
    if (!this.rankUpActive) return;
    this.rankUpEffectTimer -= dt;
    for (let i = this.rankUpParticles.length - 1; i >= 0; i--) {
      const p = this.rankUpParticles[i];
      p.vel.y -= 0.3 * dt; // Slow gravity for floaty feel
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.mesh.rotation.x += dt * 2;
      p.mesh.rotation.y += dt * 3;
      p.life -= dt;
      const t = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as MeshStandardMaterial).opacity = t;
      (p.mesh.material as MeshStandardMaterial).emissiveIntensity = t * 1.5;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as MeshStandardMaterial).dispose();
        this.rankUpParticles.splice(i, 1);
      }
    }
    if (this.rankUpEffectTimer <= 0) this.rankUpActive = false;
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
      pushCooldown: 0, grabCooldown: 0, dodgeCooldown: 0, chargeCooldown: 0, henkaCooldown: 0,
      isCharging: false, chargeTime: 0, stagger: 0,
      weightVal: weight, speedVal: speed, isPlayerW: isPlayer,
      pushAnim: 0, grabAnim: 0,
      dodgeDir: new Vector3(), dodgeTime: 0, heightScale: sc,
      stamina: MAX_STAMINA, crouchAnim: 0, damageFlash: 0,
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
      w.henkaCooldown = 0;
      w.dodgeTime = 0;
      w.stamina = MAX_STAMINA;
      w.crouchAnim = 0;
      w.damageFlash = 0;
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
    const wScale = 0.85 + def.weight * 0.2;
    const hScale = 1.0 + (def.speed - 1.0) * 0.1;
    this.opponentW.group.scale.set(wScale, hScale, wScale);
    const skinHue = (OPPONENT_POOL.indexOf(def) * 0.025) % 0.1;
    const skin = new Color().setHSL(0.08 + skinHue, 0.45, 0.55);
    (this.opponentW.body.material as MeshStandardMaterial).color.copy(skin);
    (this.opponentW.head.material as MeshStandardMaterial).color.copy(skin);
  }

  startMatch() {
    let oppDef: OpponentDef;
    if (this.gameData.inTournament) {
      oppDef = this.gameData.tournamentBracket[this.gameData.tournamentRound];
    } else {
      const idx = Math.min(this.gameData.currentRank + Math.floor(Math.random() * 3), OPPONENT_POOL.length - 1);
      oppDef = OPPONENT_POOL[idx];
    }
    this.gameData.currentOpponent = oppDef;
    this.gameData.matchNumber++;
    this.gameData.roundTime = MATCH_TIME;
    this.gameData.matchResult = null;
    this.gameData.countdownTime = 3;
    this.gameData.isCountdown = true;
    this.gameData.tachiai = true;
    this.gameData.tachiaiTimer = TACHIAI_DURATION;
    this.gameData.playerStamina = MAX_STAMINA;
    this.gameData.isTraining = false;
    this.gameData.slowMo = 1;
    this.gameData.slowMoTimer = 0;
    this.gameData.comboCount = 0;
    this.gameData.comboTimer = 0;
    this.gameData.lastComboText = '';
    this.gameData.hariteCooldown = 0;
    this.gameData.isUpsetWin = false;
    this.gameData.zabutonActive = false;
    this.configureOpponent(oppDef);
    this.resetPositions();
    this.clearFall();
    this.celebrationActive = false;
    this.spawnSalt(this.playerW.pos);
    this.spawnSalt(this.opponentW.pos);
    this.gameData.matchPushes = 0;
    this.gameData.matchGrabs = 0;
    this.gameData.matchDodges = 0;
    this.gameData.matchHenkas = 0;
    this.gameData.matchCharges = 0;
    this.gameData.matchMaxCombo = 0;
    this.gameData.edgeDanger = 0;
    // Check for Yokozuna entrance
    if (this.gameData.currentRank >= RANKS.length - 1) {
      this.gameData.yokozunaEntrance = true;
      this.gameData.yokozunaEntranceTimer = 3.0;
      this.yokozunaRopeLeft.visible = true;
      this.yokozunaRopeRight.visible = true;
      this.spawnYokozunaParticles();
    } else {
      this.gameData.yokozunaEntrance = false;
      this.yokozunaRopeLeft.visible = false;
      this.yokozunaRopeRight.visible = false;
    }
    this.gameData.state = 'playing';
  }

  startTraining() {
    this.gameData.currentOpponent = { name: 'DUMMY', weight: 1.2, speed: 0, aggression: 0, technique: 0, color: 0x888888 };
    this.gameData.matchNumber++;
    this.gameData.roundTime = 999;
    this.gameData.matchResult = null;
    this.gameData.countdownTime = 3;
    this.gameData.isCountdown = true;
    this.gameData.tachiai = false;
    this.gameData.tachiaiTimer = 0;
    this.gameData.playerStamina = MAX_STAMINA;
    this.gameData.isTraining = true;
    this.gameData.slowMo = 1;
    this.gameData.slowMoTimer = 0;
    this.gameData.comboCount = 0;
    this.gameData.comboTimer = 0;
    this.gameData.lastComboText = '';
    this.configureOpponent(this.gameData.currentOpponent);
    this.resetPositions();
    this.clearFall();
    this.celebrationActive = false;
    this.gameData.state = 'training';
  }

  startTournament() {
    const shuffled = [...OPPONENT_POOL].sort(() => Math.random() - 0.5);
    this.gameData.tournamentBracket = shuffled.slice(0, 8);
    this.gameData.inTournament = true;
    this.gameData.tournamentRound = 0;
    this.gameData.tournamentWins = 0;
    this.startMatch();
  }

  startSurvival() {
    this.gameData.inSurvival = true;
    this.gameData.survivalWave = 1;
    this.gameData.survivalKills = 0;
    this.gameData.inTournament = false;
    const idx = Math.min(this.gameData.survivalWave - 1, OPPONENT_POOL.length - 1);
    this.gameData.currentOpponent = OPPONENT_POOL[idx];
    this.gameData.matchNumber++;
    this.gameData.roundTime = 45;
    this.gameData.matchResult = null;
    this.gameData.countdownTime = 3;
    this.gameData.isCountdown = true;
    this.gameData.tachiai = true;
    this.gameData.tachiaiTimer = TACHIAI_DURATION;
    this.gameData.playerStamina = MAX_STAMINA;
    this.gameData.isTraining = false;
    this.gameData.slowMo = 1;
    this.gameData.slowMoTimer = 0;
    this.gameData.comboCount = 0;
    this.gameData.comboTimer = 0;
    this.gameData.lastComboText = '';
    this.gameData.hariteCooldown = 0;
    this.gameData.isUpsetWin = false;
    this.gameData.zabutonActive = false;
    this.configureOpponent(this.gameData.currentOpponent);
    // Survival: scale difficulty per wave
    this.opponentW.speedVal *= (1 + this.gameData.survivalWave * 0.08);
    this.resetPositions();
    this.clearFall();
    this.celebrationActive = false;
    this.spawnSalt(this.playerW.pos);
    this.spawnSalt(this.opponentW.pos);
    this.gameData.state = 'survival';
  }

  private nextSurvivalWave() {
    this.gameData.survivalWave++;
    this.gameData.survivalKills++;
    // Restore some stamina between waves
    this.playerW.stamina = Math.min(MAX_STAMINA, this.playerW.stamina + 40);
    const idx = Math.min((this.gameData.survivalWave - 1) % OPPONENT_POOL.length, OPPONENT_POOL.length - 1);
    const oppDef = OPPONENT_POOL[idx];
    this.gameData.currentOpponent = oppDef;
    this.gameData.roundTime = Math.max(30, 45 - this.gameData.survivalWave * 1.5);
    this.gameData.matchResult = null;
    this.gameData.countdownTime = 2;
    this.gameData.isCountdown = true;
    this.gameData.tachiai = false;
    this.gameData.isUpsetWin = false;
    this.gameData.zabutonActive = false;
    this.configureOpponent(oppDef);
    this.opponentW.speedVal *= (1 + this.gameData.survivalWave * 0.08);
    this.opponentW.weightVal *= (1 + this.gameData.survivalWave * 0.03);
    this.resetPositions();
    this.clearFall();
    this.spawnSalt(this.playerW.pos);
    this.spawnSalt(this.opponentW.pos);
  }

  private doHarite(a: Wrestler, t: Wrestler) {
    const dist = a.pos.distanceTo(t.pos);
    if (dist < 1.0) {
      const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
      t.vel.add(dir.multiplyScalar(HARITE_FORCE / Math.max(0.5, t.weightVal)));
      t.stagger = HARITE_STUN;
      t.damageFlash = 1;
      a.pushAnim = 1;
      // Golden impact particles
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.4).setY(1.0), 0xffdd00, 18);
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.6).setY(0.7), 0xffaa00, 10);
      this.shakeIntensity = 0.18;
      this.shakeDecay = 4;
      this.sfx('charge');
      this.triggerSlowMo();
      this.triggerCrowdBounce();
      // Full crowd eruption on harite
      for (let i = 0; i < this.spectatorHeads.length; i++) {
        this.spectatorBounce[i] = 2.0 + Math.random() * 0.5;
      }
      this.gameData.lastAction = 'harite';
      this.addCombo('harite');
    }
  }

  private spawnZabuton() {
    this.gameData.zabutonActive = true;
    this.zabutonTimer = 2.5;
    const colors = [0xcc2222, 0x2244aa, 0x228822, 0xaa6622, 0x662288, 0xcc8800];
    for (let i = 0; i < 25; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      const m = new Mesh(
        new BoxGeometry(0.25, 0.05, 0.2),
        new MeshStandardMaterial({ color: c, roughness: 0.7, transparent: true, opacity: 1 })
      );
      // Thrown from spectator area toward the ring
      const angle = Math.random() * Math.PI * 2;
      const throwR = RING_RADIUS + 3 + Math.random() * 3;
      m.position.set(Math.cos(angle) * throwR, 0.6 + Math.random() * 0.5, Math.sin(angle) * throwR);
      m.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      this.scene.add(m);
      const toCenter = new Vector3(-m.position.x, 0, -m.position.z).normalize();
      this.zabutonParticles.push({
        mesh: m,
        vel: new Vector3(
          toCenter.x * (2 + Math.random() * 3),
          2 + Math.random() * 3,
          toCenter.z * (2 + Math.random() * 3)
        ),
        life: 2.0 + Math.random() * 0.5,
        maxLife: 2.5,
      });
    }
  }

  private spawnSalt(pos: Vector3) {
    for (let i = 0; i < 12; i++) {
      const m = new Mesh(new SphereGeometry(0.015, 4, 3), new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 }));
      m.position.copy(pos).setY(0.8);
      this.scene.add(m);
      this.particles.push({ mesh: m, vel: new Vector3((Math.random() - 0.5) * 3, Math.random() * 4 + 2, (Math.random() - 0.5) * 3), life: 0.8 + Math.random() * 0.4, maxLife: 1.0 });
    }
  }

  private clearFall() {
    if (this.fallGroup) { this.scene.remove(this.fallGroup); this.fallGroup = null; }
    this.fallAnim = 0;
    this.playerW.group.visible = true;
    this.opponentW.group.visible = true;
  }

  private triggerSlowMo() {
    this.gameData.slowMo = 0.3;
    this.gameData.slowMoTimer = SLOWMO_DURATION;
  }

  private addCombo(actionName: string) {
    if (this.gameData.comboTimer > 0) {
      this.gameData.comboCount++;
    } else {
      this.gameData.comboCount = 1;
    }
    this.gameData.comboTimer = COMBO_WINDOW;
    if (this.gameData.comboCount >= 2) {
      this.gameData.lastComboText = `${this.gameData.comboCount}x COMBO!`;
      if (this.gameData.comboCount > this.gameData.matchMaxCombo) this.gameData.matchMaxCombo = this.gameData.comboCount;
      this.gameData.score += this.gameData.comboCount * 50;
    }
  }

  private spawnCelebration() {
    this.celebrationActive = true;
    this.celebrationTimer = 3.0;
    const colors = [0xffcc44, 0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0xffff44, 0xff8844];
    for (let i = 0; i < 60; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      const m = new Mesh(new BoxGeometry(0.06, 0.06, 0.01), new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 1 }));
      m.position.set((Math.random() - 0.5) * 4, 3 + Math.random() * 2, (Math.random() - 0.5) * 4);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(m);
      this.celebrationParticles.push({
        mesh: m,
        vel: new Vector3((Math.random() - 0.5) * 2, Math.random() * 1 - 0.5, (Math.random() - 0.5) * 2),
        life: 2.5 + Math.random() * 0.5,
        maxLife: 3.0,
      });
    }
  }

  update(delta: number, time: number) {
    // Apply slow motion
    if (this.gameData.slowMoTimer > 0) {
      this.gameData.slowMoTimer -= delta;
      if (this.gameData.slowMoTimer <= 0) {
        this.gameData.slowMo = 1;
      }
    }
    const dt = Math.min(delta * this.gameData.slowMo, 0.05);

    // Combo timer decay
    if (this.gameData.comboTimer > 0) {
      this.gameData.comboTimer -= delta;
      if (this.gameData.comboTimer <= 0) {
        this.gameData.comboCount = 0;
        this.gameData.lastComboText = '';
      }
    }

    const isPlayState = this.gameData.state === 'playing' || this.gameData.state === 'training' || this.gameData.state === 'survival';

    if (isPlayState) {
      if (this.gameData.tachiai) {
        this.gameData.tachiaiTimer -= dt;
        this.playerW.crouchAnim = Math.min(1, this.playerW.crouchAnim + dt * 3);
        this.opponentW.crouchAnim = Math.min(1, this.opponentW.crouchAnim + dt * 3);
        if (this.gameData.tachiaiTimer <= 0) {
          this.gameData.tachiai = false;
          this.gameData.isCountdown = true;
          this.gameData.countdownTime = 3;
          this.playerW.crouchAnim = 0;
          this.opponentW.crouchAnim = 0;
        }
      } else if (this.gameData.isCountdown) {
        this.gameData.countdownTime -= dt;
        if (this.gameData.countdownTime <= 0) {
          this.gameData.isCountdown = false;
          if (!this.gameData.isTraining) {
            this.playerW.vel.z = -2.5;
            this.opponentW.vel.z = 2.5;
            this.sfx('charge');
          }
        }
      } else {
        this.updatePlayerInput(dt);
        if (!this.gameData.isTraining) {
          this.updateAI(dt);
        } else {
          // Training: reset opponent to center slowly
          const o = this.opponentW;
          if (o.stagger <= 0 && o.dodgeTime <= 0) {
            const d2c = o.pos.length();
            if (d2c > 0.3) {
              o.vel.add(o.pos.clone().negate().normalize().multiplyScalar(dt * 1.5));
            }
          }
          o.pushCooldown = Math.max(0, o.pushCooldown - dt);
          o.stagger = Math.max(0, o.stagger - dt);
          // Reset opponent if they fall out of ring in training
          const od = Math.sqrt(o.pos.x ** 2 + o.pos.z ** 2);
          if (od > RING_RADIUS) {
            o.pos.set(0, 0, -1.5);
            o.vel.set(0, 0, 0);
            o.stagger = 0;
          }
        }
        this.updatePhysics(dt);
        if (!this.gameData.isTraining) {
          this.checkRingOut();
          this.gameData.roundTime -= dt;
          if (this.gameData.roundTime <= 0) this.endMatch('timeout');
        }
        this.updateFootsteps(dt);
        this.updateCrowdExcitement(dt);
        this.playerW.stamina = Math.min(MAX_STAMINA, this.playerW.stamina + STAMINA_REGEN * dt);
        this.opponentW.stamina = Math.min(MAX_STAMINA, this.opponentW.stamina + STAMINA_REGEN * dt);
      }
      // Edge danger tracking
      const playerDist = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
      this.gameData.edgeDanger = Math.max(0, (playerDist / RING_RADIUS - 0.6) / 0.4); // 0-1 danger scale

      // Yokozuna entrance
      if (this.gameData.yokozunaEntrance) {
        this.gameData.yokozunaEntranceTimer -= dt;
        if (this.gameData.yokozunaEntranceTimer <= 0) {
          this.gameData.yokozunaEntrance = false;
          this.yokozunaRopeLeft.visible = false;
          this.yokozunaRopeRight.visible = false;
        }
      }

      this.gameData.playerPushCD = this.playerW.pushCooldown;
      this.gameData.playerGrabCD = this.playerW.grabCooldown;
      this.gameData.playerDodgeCD = this.playerW.dodgeCooldown;
      this.gameData.playerChargeCD = this.playerW.chargeCooldown;
      this.gameData.playerHenkaCD = this.playerW.henkaCooldown;
      this.gameData.playerStamina = this.playerW.stamina;
    }

    if (this.fallGroup) {
      this.fallAnim += delta;
      this.fallGroup.position.y -= delta * 3;
      this.fallGroup.rotation.x += delta * 4;
      this.fallGroup.rotation.z += delta * 2;
      if (this.fallAnim > 1.5) this.clearFall();
    }

    this.updateVisuals(dt, time);
    this.updateParticles(delta);
    this.updateCam(dt);
    this.updateGyoji(dt, time);
    this.updateSpectators(dt, time);
    this.updateCelebration(delta);
    this.updateZabuton(delta);
    this.updateChargeMeter(dt);
    this.updateRankUpEffect(delta);
  }

  private updateChargeMeter(dt: number) {
    const p = this.playerW;
    if (p.isCharging && (this.gameData.state === 'playing' || this.gameData.state === 'survival')) {
      const power = Math.min(p.chargeTime / 1.5, 1.0); // Normalized 0-1
      this.gameData.chargeDisplayPower = power;
      this.chargeMeterGroup.visible = true;
      // Position above player
      this.chargeMeterGroup.position.set(p.pos.x, 1.8 * p.heightScale + 0.4, p.pos.z);
      this.chargeMeterGroup.lookAt(this.camera.position);
      // Scale the fill bar
      this.chargeMeterBar.scale.x = Math.max(0.01, power);
      this.chargeMeterBar.position.x = -(1 - power) * 0.3;
      // Color transition: orange → red as it charges
      const barMat = this.chargeMeterBar.material as MeshStandardMaterial;
      const r = 1.0;
      const g = Math.max(0, 0.53 - power * 0.4);
      const b = 0;
      barMat.color.setRGB(r, g, b);
      barMat.emissive.setRGB(r * 0.8, g * 0.6, 0);
      barMat.emissiveIntensity = 0.6 + power * 0.8;
    } else {
      this.chargeMeterGroup.visible = false;
      this.gameData.chargeDisplayPower = 0;
    }
  }

  private updateGyoji(dt: number, time: number) {
    // Gyoji rotates to face the action during matches
    const isPlayState = this.gameData.state === 'playing' || this.gameData.state === 'training' || this.gameData.state === 'survival';
    if (isPlayState && !this.gameData.isCountdown && !this.gameData.tachiai) {
      const mid = new Vector3().addVectors(this.playerW.pos, this.opponentW.pos).multiplyScalar(0.5);
      const targetAngle = Math.atan2(mid.x - this.gyojiGroup.position.x, mid.z - this.gyojiGroup.position.z);
      this.gyojiAngle += (targetAngle - this.gyojiAngle) * dt * 3;
      this.gyojiGroup.rotation.y = this.gyojiAngle;
      // Fan wave animation
      this.gyojiFan.rotation.z = Math.sin(time * 4) * 0.3;
    }
    // Gyoji raises fan during countdown
    if (this.gameData.isCountdown) {
      this.gyojiFan.position.y = 1.15 + Math.sin(time * 6) * 0.05;
    }
  }

  private updateSpectators(dt: number, time: number) {
    // Spectator bounce on excitement
    for (let i = 0; i < this.spectatorHeads.length; i++) {
      const baseY = this.spectatorHeads[i].userData.baseY ?? this.spectatorHeads[i].position.y;
      if (!this.spectatorHeads[i].userData.baseY) this.spectatorHeads[i].userData.baseY = baseY;
      if (this.spectatorBounce[i] > 0) {
        this.spectatorBounce[i] -= dt * 2;
        this.spectatorHeads[i].position.y = baseY + Math.abs(Math.sin(this.spectatorBounce[i] * 8)) * 0.15;
      } else {
        this.spectatorHeads[i].position.y = baseY;
      }
    }
  }

  private triggerCrowdBounce() {
    const count = Math.min(this.spectatorHeads.length, 20);
    const indices = [];
    for (let i = 0; i < this.spectatorHeads.length; i++) indices.push(i);
    indices.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      this.spectatorBounce[indices[i]] = 1.0 + Math.random() * 0.5;
    }
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
      const sp = 3.5 * p.speedVal * (p.stamina < LOW_STAMINA_THRESHOLD ? 0.6 : 1.0);
      p.vel.x += (mx / ml) * sp * dt;
      p.vel.z += (mz / ml) * sp * dt;
      p.facing = Math.atan2(this.opponentW.pos.x - p.pos.x, this.opponentW.pos.z - p.pos.z);
    }

    // Push
    const rTrig = rGP ? rGP.getButtonDown(InputComponent.Trigger) : false;
    if ((kb.getKeyDown('Space') || rTrig) && p.pushCooldown <= 0 && p.stamina >= PUSH_STAMINA) {
      this.doPush(p, this.opponentW);
      p.pushCooldown = 0.5;
      p.stamina -= PUSH_STAMINA;
      this.gameData.totalPushes++;
      this.gameData.matchPushes++;
      this.gameData.lastAction = 'push';
      this.addCombo('push');
    }

    // Grab
    const rGrip = rGP ? rGP.getButtonDown(InputComponent.Squeeze) : false;
    if ((kb.getKeyDown('KeyE') || rGrip) && p.grabCooldown <= 0 && p.stamina >= GRAB_STAMINA) {
      this.doGrab(p, this.opponentW);
      p.grabCooldown = 1.5;
      p.stamina -= GRAB_STAMINA;
      this.gameData.totalGrabs++;
      this.gameData.matchGrabs++;
      this.gameData.lastAction = 'grab';
      this.addCombo('grab');
    }

    // Dodge
    const lTrig = lGP ? lGP.getButtonDown(InputComponent.Trigger) : false;
    if ((kb.getKeyDown('ShiftLeft') || kb.getKeyDown('ShiftRight') || lTrig) && p.dodgeCooldown <= 0 && p.stamina >= DODGE_STAMINA) {
      this.doDodge(p, mx, mz);
      p.dodgeCooldown = 1.0;
      p.stamina -= DODGE_STAMINA;
      this.gameData.totalDodges++;
      this.gameData.matchDodges++;
    }

    // Charge
    if (kb.getKeyPressed('KeyQ') && p.chargeCooldown <= 0) {
      p.isCharging = true;
      p.chargeTime += dt;
    } else if (p.isCharging) {
      if (p.chargeTime > 0.3 && p.stamina >= CHARGE_STAMINA) {
        this.doCharge(p, this.opponentW);
        p.stamina -= CHARGE_STAMINA;
        this.gameData.lastAction = 'charge';
        this.gameData.matchCharges++;
        this.addCombo('charge');
      }
      p.isCharging = false;
      p.chargeTime = 0;
      p.chargeCooldown = 2.0;
    }

    // Henka (sidestep attack) — F key or left grip in XR
    const lGrip = lGP ? lGP.getButtonDown(InputComponent.Squeeze) : false;
    if ((kb.getKeyDown('KeyF') || lGrip) && p.henkaCooldown <= 0 && p.stamina >= HENKA_STAMINA) {
      this.doHenka(p, this.opponentW, mx);
      p.henkaCooldown = 2.0;
      p.stamina -= HENKA_STAMINA;
      this.gameData.totalHenkas++;
      this.gameData.matchHenkas++;
      this.gameData.lastAction = 'henka';
      this.addCombo('henka');
    }

    // Harite (palm strike) — R key, available at Komusubi rank (5) and above
    if (kb.getKeyDown('KeyR') && this.gameData.hariteCooldown <= 0 && p.stamina >= HARITE_STAMINA && this.gameData.currentRank >= 5) {
      this.doHarite(p, this.opponentW);
      this.gameData.hariteCooldown = 3.0;
      p.stamina -= HARITE_STAMINA;
    }

    p.pushCooldown = Math.max(0, p.pushCooldown - dt);
    p.grabCooldown = Math.max(0, p.grabCooldown - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
    p.chargeCooldown = Math.max(0, p.chargeCooldown - dt);
    p.henkaCooldown = Math.max(0, p.henkaCooldown - dt);
    this.gameData.hariteCooldown = Math.max(0, this.gameData.hariteCooldown - dt);
    p.pushAnim = Math.max(0, p.pushAnim - dt * 4);
    p.grabAnim = Math.max(0, p.grabAnim - dt * 3);
    p.damageFlash = Math.max(0, p.damageFlash - dt * 3);
  }

  private sfx(t: string) { if (this.gameData.sfxOn && this.audioSystemRef) this.audioSystemRef.playSFX(t); }

  private doHenka(a: Wrestler, t: Wrestler, moveX: number) {
    const dist = a.pos.distanceTo(t.pos);
    if (dist < 2.0) {
      // Sidestep direction: use player's lateral input or default right
      const sideDir = moveX !== 0 ? moveX : (Math.random() > 0.5 ? 1 : -1);
      const toward = new Vector3().subVectors(t.pos, a.pos).normalize();
      const sideVec = new Vector3(-toward.z * sideDir, 0, toward.x * sideDir);

      // Player sidesteps quickly
      a.vel.add(sideVec.clone().multiplyScalar(DODGE_SPEED * 0.6));

      // If close enough, redirect opponent's momentum
      if (dist < 1.5) {
        t.vel.add(toward.clone().multiplyScalar(HENKA_FORCE / Math.max(0.5, t.weightVal)));
        t.stagger = 0.3;
        t.damageFlash = 1;
        this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xffff44, 10);
        this.shakeIntensity = 0.06;
        this.shakeDecay = 3;
        this.triggerCrowdBounce();
      }
      this.spawn(a.pos.clone().setY(0.6), 0x88ff88, 6);
      this.sfx('dodge');
    }
  }

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
      t.damageFlash = 1;
      a.pushAnim = 1;
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xffaa44, 8);
      this.spawnSandSpray(new Vector3().lerpVectors(a.pos, t.pos, 0.6), 0.5);
      this.shakeIntensity = 0.05;
      this.shakeDecay = 3;
      this.sfx('push');
      this.triggerCrowdBounce();
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
      t.damageFlash = 1;
      a.grabAnim = 1;
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xff44ff, 10);
      this.spawnSandSpray(new Vector3().lerpVectors(a.pos, t.pos, 0.5), 0.7);
      this.shakeIntensity = 0.08;
      this.shakeDecay = 3;
      this.sfx('grab');
      this.triggerCrowdBounce();
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
      t.damageFlash = 1;
      this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xff8800, 15);
      this.spawnSandSpray(new Vector3().lerpVectors(a.pos, t.pos, 0.5), 1.0);
      this.shakeIntensity = 0.15;
      this.shakeDecay = 4;
      this.sfx('charge');
      this.triggerCrowdBounce();
      // Big hit triggers slow-mo
      if (cm > 1.5) this.triggerSlowMo();
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
      o.henkaCooldown = Math.max(0, o.henkaCooldown - dt);
      o.damageFlash = Math.max(0, o.damageFlash - dt * 3);
      return;
    }
    const tp = new Vector3().subVectors(this.playerW.pos, o.pos);
    const dist = tp.length();
    tp.normalize();
    o.facing = Math.atan2(this.playerW.pos.x - o.pos.x, this.playerW.pos.z - o.pos.z);
    const odc = Math.sqrt(o.pos.x ** 2 + o.pos.z ** 2);
    const pdc = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
    const ms = 2.5 * o.speedVal * (o.stamina < LOW_STAMINA_THRESHOLD ? 0.6 : 1.0);

    if (odc > RING_RADIUS * 0.7) {
      o.vel.add(new Vector3(-o.pos.x, 0, -o.pos.z).normalize().multiplyScalar(ms * dt * 2));
    } else if (dist > 2.0) {
      if (Math.random() < od.aggression) o.vel.add(tp.clone().multiplyScalar(ms * dt));
    } else if (dist > 1.0) {
      if (Math.random() < od.technique * 0.6) {
        const side = Math.random() > 0.5 ? 1 : -1;
        o.vel.add(new Vector3(-tp.z * side, 0, tp.x * side).multiplyScalar(ms * dt * 0.9));
      } else {
        o.vel.add(tp.clone().multiplyScalar(ms * dt * 0.8));
      }
    }

    // AI feint
    if (dist < 1.5 && dist > 1.0 && od.technique > 0.5 && Math.random() < od.technique * 0.2 * dt) {
      o.vel.add(new Vector3(-tp.z, 0, tp.x).multiplyScalar(ms * 1.5));
      this.spawn(o.pos.clone().setY(0.6), 0xffff44, 3);
    }

    // Defensive near edge
    if (odc > RING_RADIUS * 0.6 && od.technique > 0.4) {
      o.vel.add(new Vector3(-o.pos.x, 0, -o.pos.z).normalize().multiplyScalar(ms * dt * 1.5));
    }

    // AI Henka — high-technique opponents can sidestep
    if (dist < 1.5 && o.henkaCooldown <= 0 && o.stamina >= HENKA_STAMINA && od.technique > 0.6 && Math.random() < od.technique * 0.15 * dt) {
      const sideDir = Math.random() > 0.5 ? 1 : -1;
      const sideVec = new Vector3(-tp.z * sideDir, 0, tp.x * sideDir);
      o.vel.add(sideVec.multiplyScalar(DODGE_SPEED * 0.5));
      if (dist < 1.2) {
        this.playerW.vel.add(tp.clone().negate().multiplyScalar(HENKA_FORCE * 0.6 / Math.max(0.5, this.playerW.weightVal)));
        this.playerW.stagger = 0.2;
        this.playerW.damageFlash = 1;
        this.spawn(o.pos.clone().setY(0.8), 0xffff44, 8);
      }
      o.henkaCooldown = 3.0;
      o.stamina -= HENKA_STAMINA;
      this.sfx('dodge');
    }

    if (dist < 1.2 && o.pushCooldown <= 0 && o.stamina >= PUSH_STAMINA && Math.random() < od.aggression * 0.8 * dt * 3) {
      this.doAIPush(o, this.playerW);
      o.pushCooldown = 0.6 / o.speedVal;
      o.stamina -= PUSH_STAMINA;
    }
    if (dist < 1.0 && o.grabCooldown <= 0 && o.stamina >= GRAB_STAMINA && Math.random() < od.technique * 0.5 * dt * 2) {
      this.doAIGrab(o, this.playerW);
      o.grabCooldown = 2.0 / o.speedVal;
      o.stamina -= GRAB_STAMINA;
    }
    if (pdc > RING_RADIUS * 0.6 && dist < 2.5 && o.chargeCooldown <= 0 && o.stamina >= CHARGE_STAMINA && Math.random() < od.aggression * dt) {
      this.doCharge(o, this.playerW);
      o.chargeCooldown = 3.0;
      o.stamina -= CHARGE_STAMINA;
    }
    if (this.playerW.isCharging && dist < 2.0 && o.dodgeCooldown <= 0 && o.stamina >= DODGE_STAMINA && Math.random() < od.technique * 0.6) {
      o.vel.add(new Vector3(-tp.z, 0, tp.x).multiplyScalar(DODGE_SPEED * 0.4));
      o.dodgeCooldown = 1.5;
      o.stamina -= DODGE_STAMINA;
      this.spawn(o.pos.clone().setY(0.5), 0x44ff44, 4);
    }

    o.pushCooldown = Math.max(0, o.pushCooldown - dt);
    o.grabCooldown = Math.max(0, o.grabCooldown - dt);
    o.dodgeCooldown = Math.max(0, o.dodgeCooldown - dt);
    o.chargeCooldown = Math.max(0, o.chargeCooldown - dt);
    o.henkaCooldown = Math.max(0, o.henkaCooldown - dt);
    o.pushAnim = Math.max(0, o.pushAnim - dt * 4);
    o.grabAnim = Math.max(0, o.grabAnim - dt * 3);
    o.damageFlash = Math.max(0, o.damageFlash - dt * 3);
  }

  private doAIPush(a: Wrestler, t: Wrestler) {
    const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
    t.vel.add(dir.multiplyScalar(PUSH_FORCE * 0.8 / Math.max(0.5, t.weightVal)));
    t.stagger = 0.15;
    t.damageFlash = 1;
    a.pushAnim = 1;
    this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xffaa44, 6);
    this.shakeIntensity = 0.04;
    this.shakeDecay = 3;
    this.sfx('push');
    this.triggerCrowdBounce();
  }

  private doAIGrab(a: Wrestler, t: Wrestler) {
    const dir = new Vector3().subVectors(t.pos, a.pos).normalize();
    const ta = (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.3;
    const c = Math.cos(ta), s = Math.sin(ta);
    const td = new Vector3(dir.x * c - dir.z * s, 0, dir.x * s + dir.z * c);
    t.vel.add(td.multiplyScalar((PUSH_FORCE * 1.2) / Math.max(0.5, t.weightVal)));
    t.stagger = 0.3;
    t.damageFlash = 1;
    a.grabAnim = 1;
    this.spawn(new Vector3().lerpVectors(a.pos, t.pos, 0.5).setY(0.8), 0xff44ff, 8);
    this.shakeIntensity = 0.06;
    this.shakeDecay = 3;
    this.sfx('grab');
    this.triggerCrowdBounce();
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
    this.spawnSandSpray(w.pos.clone(), 1.5);
    this.shakeIntensity = 0.2;
    this.shakeDecay = 5;
    this.sfx('ringout');
    this.triggerSlowMo();
    // Big crowd reaction on ring-out
    for (let i = 0; i < this.spectatorHeads.length; i++) {
      this.spectatorBounce[i] = 1.5 + Math.random() * 0.5;
    }
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
      // Combo bonus
      if (this.gameData.comboCount >= 2) this.gameData.score += this.gameData.comboCount * 100;
      const prevRank = this.gameData.currentRank;
      if (this.gameData.matchWins % 3 === 0 && this.gameData.currentRank < RANKS.length - 1) this.gameData.currentRank++;
      // Rank-up celebration
      if (this.gameData.currentRank > prevRank) {
        this.gameData.rankUpPending = true;
        this.gameData.rankUpFrom = prevRank;
        this.gameData.rankUpTo = this.gameData.currentRank;
        this.gameData.rankUpTimer = 3.0;
        this.triggerRankUpEffect();
      }
      this.gameData.winTechnique = getWinningTechnique(this.gameData.lastAction);
      this.spawnCelebration();
      // Check for upset win: beating an opponent with much higher weight
      const opp = this.gameData.currentOpponent;
      if (opp && opp.weight >= 1.5) {
        this.gameData.isUpsetWin = true;
        this.spawnZabuton();
      }
      if (this.gameData.inTournament) {
        this.gameData.tournamentWins++;
        this.gameData.tournamentRound++;
        if (this.gameData.tournamentRound >= this.gameData.tournamentBracket.length) {
          this.gameData.score += 5000;
        }
      }
      if (this.gameData.inSurvival) {
        this.gameData.score += this.gameData.survivalWave * 200;
        if (this.gameData.survivalWave > this.gameData.survivalBestWave) {
          this.gameData.survivalBestWave = this.gameData.survivalWave;
        }
      }
    } else if (result === 'loss') {
      this.gameData.losses++;
      this.gameData.currentStreak = 0;
      this.gameData.winTechnique = '';
      if (this.gameData.inTournament) {
        this.gameData.inTournament = false;
      }
      if (this.gameData.inSurvival) {
        if (this.gameData.survivalWave > this.gameData.survivalBestWave) {
          this.gameData.survivalBestWave = this.gameData.survivalWave;
        }
      }
    } else {
      const pd = Math.sqrt(this.playerW.pos.x ** 2 + this.playerW.pos.z ** 2);
      const od = Math.sqrt(this.opponentW.pos.x ** 2 + this.opponentW.pos.z ** 2);
      if (pd < od) {
        this.gameData.matchResult = 'win';
        this.gameData.wins++;
        this.gameData.matchWins++;
        this.gameData.score += 300;
        this.gameData.winTechnique = 'Yorikiri';
        this.spawnCelebration();
        if (this.gameData.inTournament) {
          this.gameData.tournamentWins++;
          this.gameData.tournamentRound++;
        }
        if (this.gameData.inSurvival) {
          this.gameData.score += this.gameData.survivalWave * 200;
        }
      } else {
        this.gameData.matchResult = 'loss';
        this.gameData.losses++;
        this.gameData.currentStreak = 0;
        this.gameData.winTechnique = '';
        if (this.gameData.inTournament) this.gameData.inTournament = false;
      }
    }
    // Track match history
    this.gameData.matchHistory.unshift({
      opponent: this.gameData.currentOpponent?.name ?? 'UNKNOWN',
      result: this.gameData.matchResult ?? 'loss',
      technique: this.gameData.winTechnique,
      score: this.gameData.score,
    });
    if (this.gameData.matchHistory.length > 10) this.gameData.matchHistory.pop();
    this.saveStats();
    this.gameData.state = 'results';
  }

  private updateCelebration(dt: number) {
    if (!this.celebrationActive) return;
    this.celebrationTimer -= dt;
    for (let i = this.celebrationParticles.length - 1; i >= 0; i--) {
      const p = this.celebrationParticles[i];
      p.vel.y -= 1.5 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.mesh.rotation.x += dt * 3;
      p.mesh.rotation.y += dt * 2;
      p.life -= dt;
      const t = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as MeshStandardMaterial).opacity = t;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as MeshStandardMaterial).dispose();
        this.celebrationParticles.splice(i, 1);
      }
    }
    if (this.celebrationTimer <= 0) this.celebrationActive = false;
  }

  private updateZabuton(dt: number) {
    if (this.zabutonParticles.length === 0) return;
    this.zabutonTimer -= dt;
    for (let i = this.zabutonParticles.length - 1; i >= 0; i--) {
      const p = this.zabutonParticles[i];
      p.vel.y -= 4 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.mesh.rotation.x += dt * 2;
      p.mesh.rotation.z += dt * 1.5;
      p.life -= dt;
      // Bounce off ground
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.y = Math.abs(p.vel.y) * 0.3;
        p.vel.x *= 0.5;
        p.vel.z *= 0.5;
      }
      const t = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as MeshStandardMaterial).opacity = t;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as MeshStandardMaterial).dispose();
        this.zabutonParticles.splice(i, 1);
      }
    }
    if (this.zabutonTimer <= 0) this.gameData.zabutonActive = false;
  }

  private updateVisuals(dt: number, time: number) {
    for (const w of [this.playerW, this.opponentW]) {
      w.group.position.set(w.pos.x, 0, w.pos.z);
      w.group.rotation.y = w.facing;
      // Crouch animation for tachiai
      if (w.crouchAnim > 0) {
        w.body.position.y = (0.5 * w.heightScale + 0.4) - w.crouchAnim * 0.15;
        w.head.position.y = (0.9 * w.heightScale + 0.4) - w.crouchAnim * 0.12;
        w.arms.position.y = (0.6 * w.heightScale + 0.4) - w.crouchAnim * 0.1;
        w.arms.rotation.x = -w.crouchAnim * 0.4;
      } else if (w.pushAnim > 0) w.arms.rotation.x = -w.pushAnim * 0.8;
      else if (w.grabAnim > 0) { w.arms.rotation.x = -w.grabAnim * 0.5; w.leftArm.rotation.z = Math.PI / 4 - w.grabAnim * 0.4; w.rightArm.rotation.z = -Math.PI / 4 + w.grabAnim * 0.4; }
      else { w.arms.rotation.x = 0; w.leftArm.rotation.z = Math.PI / 4; w.rightArm.rotation.z = -Math.PI / 4; }
      w.group.rotation.z = w.stagger > 0 ? Math.sin(time * 20) * 0.1 * w.stagger : 0;
      if (w.isCharging) {
        const i = Math.min(w.chargeTime * 2, 1);
        (w.belt.material as MeshStandardMaterial).emissiveIntensity = 0.4 + i * 1.5;
        if (w.crouchAnim <= 0) w.group.scale.set(1 + i * 0.1, 1, 1 + i * 0.1);
      } else {
        (w.belt.material as MeshStandardMaterial).emissiveIntensity = 0.4;
        if (w.crouchAnim <= 0 && w.isPlayerW) w.group.scale.set(1, 1, 1);
      }
      if (w.crouchAnim <= 0) {
        w.body.position.y = 0.5 * w.heightScale + 0.4 + Math.sin(time * 3 + (w.isPlayerW ? 0 : 1)) * 0.02;
      }
      // Low stamina belt flicker
      if (w.stamina < LOW_STAMINA_THRESHOLD) {
        (w.belt.material as MeshStandardMaterial).emissiveIntensity = 0.2 + Math.sin(time * 8) * 0.15;
      }
      // Damage flash — tint body red briefly
      if (w.damageFlash > 0) {
        const flashColor = new Color().lerpColors(
          (w.body.material as MeshStandardMaterial).color.clone(),
          new Color(0xff2222),
          w.damageFlash * 0.6
        );
        (w.body.material as MeshStandardMaterial).emissive.copy(flashColor);
        (w.body.material as MeshStandardMaterial).emissiveIntensity = w.damageFlash * 0.5;
      } else {
        (w.body.material as MeshStandardMaterial).emissiveIntensity = 0;
      }
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

    const exciteMult = 1 + this.crowdExcitement * 1.5;
    for (const l of this.crowdLights) l.intensity = (0.8 + Math.sin(time * 5 + l.position.x) * 0.2) * exciteMult;
    // Edge danger ring visual
    const dangerMat = this.edgeDangerRing.material as MeshStandardMaterial;
    if (this.gameData.edgeDanger > 0 && (this.gameData.state === 'playing' || this.gameData.state === 'survival')) {
      this.edgeDangerPulse += dt * 6;
      const dangerAlpha = this.gameData.edgeDanger * (0.4 + Math.sin(this.edgeDangerPulse) * 0.2);
      dangerMat.opacity = dangerAlpha;
      dangerMat.emissiveIntensity = this.gameData.edgeDanger * (0.8 + Math.sin(this.edgeDangerPulse) * 0.4);
    } else {
      dangerMat.opacity = 0;
      dangerMat.emissiveIntensity = 0;
      this.edgeDangerPulse = 0;
    }

    // Yokozuna entrance effects
    if (this.gameData.yokozunaEntrance) {
      const yTimer = this.gameData.yokozunaEntranceTimer;
      const yScale = Math.sin(yTimer * 2) * 0.05;
      this.yokozunaRopeLeft.rotation.z = Math.sin(yTimer * 3) * 0.1;
      this.yokozunaRopeRight.rotation.z = -Math.sin(yTimer * 3) * 0.1;
      this.playerW.group.scale.setScalar(1 + yScale);
      // Update yokozuna particles
      for (let i = this.yokozunaParticles.length - 1; i >= 0; i--) {
        const p = this.yokozunaParticles[i];
        p.mesh.position.y += dt * 0.8;
        p.mesh.rotation.y += dt * 2;
        p.life -= dt;
        const t = Math.max(0, p.life / p.maxLife);
        (p.mesh.material as MeshStandardMaterial).opacity = t * 0.8;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as MeshStandardMaterial).dispose();
          this.yokozunaParticles.splice(i, 1);
        }
      }
    }

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

  private spawnYokozunaParticles() {
    const colors = [0xffffff, 0xffeecc, 0xffdd88, 0xffffee];
    for (let i = 0; i < 30; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      const m = new Mesh(
        new BoxGeometry(0.03, 0.15, 0.01),
        new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 })
      );
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 1.5;
      m.position.set(
        this.playerW.pos.x + Math.cos(angle) * r,
        0.4 + Math.random() * 0.3,
        this.playerW.pos.z + Math.sin(angle) * r
      );
      m.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
      this.scene.add(m);
      this.yokozunaParticles.push({
        mesh: m,
        vel: new Vector3(0, 0.5, 0),
        life: 2.5 + Math.random() * 0.5,
        maxLife: 3.0,
      });
    }
  }

  setPlayerBeltColor(idx: number) {
    if (idx >= 0 && idx < BELT_COLORS.length) {
      this.gameData.playerBeltColor = idx;
      const c = new Color(BELT_COLORS[idx].color);
      (this.playerW.belt.material as MeshStandardMaterial).color.copy(c);
      (this.playerW.belt.material as MeshStandardMaterial).emissive.copy(c);
    }
  }
  getPlayerBeltColor(): number { return this.gameData.playerBeltColor; }
  getBeltColorName(): string { return BELT_COLORS[this.gameData.playerBeltColor]?.name ?? 'Blue'; }
  getMatchStats() {
    return {
      pushes: this.gameData.matchPushes,
      grabs: this.gameData.matchGrabs,
      dodges: this.gameData.matchDodges,
      henkas: this.gameData.matchHenkas,
      charges: this.gameData.matchCharges,
      maxCombo: this.gameData.matchMaxCombo,
      timeUsed: MATCH_TIME - Math.max(0, this.gameData.roundTime),
    };
  }

  getGameData(): GameData { return this.gameData; }
  getRankName(): string { return RANKS[Math.min(this.gameData.currentRank, RANKS.length - 1)]; }
  getOpponentName(): string { return this.gameData.currentOpponent?.name ?? 'UNKNOWN'; }
  getWinTechnique(): string { return this.gameData.winTechnique; }
  getComboText(): string { return this.gameData.lastComboText; }
  getTournamentInfo(): string {
    if (!this.gameData.inTournament) return '';
    const round = this.gameData.tournamentRound;
    const total = this.gameData.tournamentBracket.length;
    if (round >= total) return 'TOURNAMENT CHAMPION!';
    const names = ['Quarterfinal', 'Semifinal', 'Final'];
    const roundName = total <= 4 ? names[round] ?? `Round ${round + 1}` : round < total - 3 ? `Round ${round + 1}` : names[3 - (total - round)] ?? `Round ${round + 1}`;
    return `Tournament: ${roundName} (${round}/${total})`;
  }
  isTournamentChampion(): boolean { return this.gameData.inTournament && this.gameData.tournamentRound >= this.gameData.tournamentBracket.length; }
  isSurvival(): boolean { return this.gameData.inSurvival; }
  getSurvivalWave(): number { return this.gameData.survivalWave; }
  getSurvivalKills(): number { return this.gameData.survivalKills; }
  getSurvivalBestWave(): number { return this.gameData.survivalBestWave; }
  isHariteAvailable(): boolean { return this.gameData.currentRank >= 5; }
  getHariteCD(): number { return this.gameData.hariteCooldown; }
  isUpsetWin(): boolean { return this.gameData.isUpsetWin; }
  getMatchHistory() { return this.gameData.matchHistory; }
  getRankUpInfo() { return { pending: this.gameData.rankUpPending, from: this.gameData.rankUpFrom, to: this.gameData.rankUpTo, timer: this.gameData.rankUpTimer, fromName: RANKS[this.gameData.rankUpFrom], toName: RANKS[this.gameData.rankUpTo] }; }
  clearRankUp() { this.gameData.rankUpPending = false; }

  prepareScout() {
    // Prepare the next opponent for scouting display
    const idx = Math.min(this.gameData.currentRank + Math.floor(Math.random() * 3), OPPONENT_POOL.length - 1);
    this.gameData.currentOpponent = OPPONENT_POOL[idx];
    this.gameData.state = 'scouting';
  }

  getScoutOpponent() {
    return this.gameData.currentOpponent;
  }

  getScoutWarning(): string {
    const opp = this.gameData.currentOpponent;
    if (!opp) return '';
    const warnings: string[] = [];
    if (opp.weight >= 1.5) warnings.push('Heavy — hard to push!');
    if (opp.speed >= 1.2) warnings.push('Fast — watch for sidesteps!');
    if (opp.technique >= 0.7) warnings.push('Technical — expect henka and grabs!');
    if (opp.aggression >= 0.8) warnings.push('Aggressive — relentless attacker!');
    return warnings.join(' ');
  }
  continueAfterSurvivalWin() {
    if (this.gameData.inSurvival && this.gameData.matchResult === 'win') {
      this.nextSurvivalWave();
    }
  }
  setDifficulty(d: number) { this.gameData.difficulty = d; }
  setColorScheme(c: number) { this.gameData.colorScheme = c; }
  setSfx(on: boolean) { this.gameData.sfxOn = on; }
  setMusic(on: boolean) { this.gameData.musicOn = on; }
  setState(s: GameState) { this.gameData.state = s; }
  resetCareer() {
    Object.assign(this.gameData, { score: 0, wins: 0, losses: 0, currentRank: 0, matchWins: 0, matchNumber: 0, currentStreak: 0, totalPushes: 0, totalDodges: 0, totalGrabs: 0, totalRingOuts: 0, totalHenkas: 0, bestWinStreak: 0 });
    this.saveStats();
  }
}
