import { createSystem, UIKitMLAsset } from '@iwsdk/core';
import { SumoSystem } from './sumo-system.js';
import type { GameState } from './sumo-system.js';

export class UISystem extends createSystem({}) {
  private sumo!: SumoSystem;
  private menuPanel: UIKitMLAsset | null = null;
  private hudPanel: UIKitMLAsset | null = null;
  private pausePanel: UIKitMLAsset | null = null;
  private resultsPanel: UIKitMLAsset | null = null;
  private settingsPanel: UIKitMLAsset | null = null;
  private statsPanel: UIKitMLAsset | null = null;
  private ready = false;
  private lastState: GameState = 'menu';
  private hudTimer = 0;

  init() {
    this.sumo = this.world.getSystem(SumoSystem)!;
    this.menuPanel = this.world.getSceneObject<UIKitMLAsset>('menu-panel') ?? null;
    this.hudPanel = this.world.getSceneObject<UIKitMLAsset>('hud-panel') ?? null;
    this.pausePanel = this.world.getSceneObject<UIKitMLAsset>('pause-panel') ?? null;
    this.resultsPanel = this.world.getSceneObject<UIKitMLAsset>('results-panel') ?? null;
    this.settingsPanel = this.world.getSceneObject<UIKitMLAsset>('settings-panel') ?? null;
    this.statsPanel = this.world.getSceneObject<UIKitMLAsset>('stats-panel') ?? null;
    this.wire();
    this.ready = true;
    this.showOnly('menu');
  }

  private wire() {
    this.menuPanel?.getElementById('btn-play')?.addEventListener('click', () => { this.sumo.startMatch(); this.showOnly('hud'); });
    this.menuPanel?.getElementById('btn-settings')?.addEventListener('click', () => { this.sumo.setState('settings'); this.showOnly('settings'); });
    this.menuPanel?.getElementById('btn-stats')?.addEventListener('click', () => { this.sumo.setState('stats'); this.updateStats(); this.showOnly('stats'); });

    this.hudPanel?.getElementById('btn-pause')?.addEventListener('click', () => { this.sumo.setState('paused'); this.showOnly('pause'); });

    this.pausePanel?.getElementById('btn-resume')?.addEventListener('click', () => { this.sumo.setState('playing'); this.showOnly('hud'); });
    this.pausePanel?.getElementById('btn-quit')?.addEventListener('click', () => { this.sumo.setState('menu'); this.showOnly('menu'); });

    this.resultsPanel?.getElementById('btn-next')?.addEventListener('click', () => { this.sumo.startMatch(); this.showOnly('hud'); });
    this.resultsPanel?.getElementById('btn-menu')?.addEventListener('click', () => { this.sumo.setState('menu'); this.showOnly('menu'); });

    this.settingsPanel?.getElementById('btn-easy')?.addEventListener('click', () => { this.sumo.setDifficulty(0); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-normal')?.addEventListener('click', () => { this.sumo.setDifficulty(1); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-hard')?.addEventListener('click', () => { this.sumo.setDifficulty(2); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-scheme0')?.addEventListener('click', () => { this.sumo.setColorScheme(0); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-scheme1')?.addEventListener('click', () => { this.sumo.setColorScheme(1); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-scheme2')?.addEventListener('click', () => { this.sumo.setColorScheme(2); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-scheme3')?.addEventListener('click', () => { this.sumo.setColorScheme(3); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-sfx')?.addEventListener('click', () => { const d = this.sumo.getGameData(); this.sumo.setSfx(!d.sfxOn); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-music')?.addEventListener('click', () => { const d = this.sumo.getGameData(); this.sumo.setMusic(!d.musicOn); this.updateSettings(); });
    this.settingsPanel?.getElementById('btn-back')?.addEventListener('click', () => { this.sumo.setState('menu'); this.showOnly('menu'); });

    this.statsPanel?.getElementById('btn-back')?.addEventListener('click', () => { this.sumo.setState('menu'); this.showOnly('menu'); });
    this.statsPanel?.getElementById('btn-reset')?.addEventListener('click', () => { this.sumo.resetCareer(); this.updateStats(); });
  }

  update(delta: number) {
    if (!this.ready) return;
    const d = this.sumo.getGameData();
    const kb = this.input.keyboard;

    if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
      if (d.state === 'playing') { this.sumo.setState('paused'); this.showOnly('pause'); }
      else if (d.state === 'paused') { this.sumo.setState('playing'); this.showOnly('hud'); }
    }

    if (d.state !== this.lastState) {
      this.lastState = d.state;
      if (d.state === 'menu') this.showOnly('menu');
      else if (d.state === 'playing') this.showOnly('hud');
      else if (d.state === 'paused') this.showOnly('pause');
      else if (d.state === 'results') { this.updateResults(); this.showOnly('results'); }
      else if (d.state === 'settings') { this.updateSettings(); this.showOnly('settings'); }
      else if (d.state === 'stats') { this.updateStats(); this.showOnly('stats'); }
    }

    this.hudTimer += delta;
    if (d.state === 'playing' && this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.updateHUD(d);
    }
  }

  private showOnly(name: string) {
    const map: Record<string, UIKitMLAsset | null> = { menu: this.menuPanel, hud: this.hudPanel, pause: this.pausePanel, results: this.resultsPanel, settings: this.settingsPanel, stats: this.statsPanel };
    for (const [k, v] of Object.entries(map)) { if (v) v.visible = (k === name); }
  }

  private updateHUD(d: ReturnType<SumoSystem['getGameData']>) {
    const h = this.hudPanel;
    if (!h) return;
    if (d.isCountdown) {
      const ct = Math.ceil(d.countdownTime);
      h.getElementById('countdown')?.setProperties({ text: ct > 0 ? String(ct) : 'FIGHT!' });
    } else {
      h.getElementById('countdown')?.setProperties({ text: '' });
    }
    h.getElementById('score')?.setProperties({ text: `Score: ${d.score}` });
    h.getElementById('time')?.setProperties({ text: `Time: ${Math.ceil(d.roundTime)}s` });
    h.getElementById('rank')?.setProperties({ text: `Rank: ${this.sumo.getRankName()}` });
    h.getElementById('opponent-name')?.setProperties({ text: `VS ${this.sumo.getOpponentName()}` });
    h.getElementById('match-num')?.setProperties({ text: `Match ${d.matchNumber}` });
    h.getElementById('streak')?.setProperties({ text: d.currentStreak > 1 ? `${d.currentStreak} Win Streak!` : '' });
  }

  private updateResults() {
    const r = this.resultsPanel;
    if (!r) return;
    const d = this.sumo.getGameData();
    r.getElementById('result-title')?.setProperties({ text: d.matchResult === 'win' ? 'VICTORY!' : d.matchResult === 'loss' ? 'DEFEAT!' : 'TIME OUT' });
    r.getElementById('result-score')?.setProperties({ text: `Score: ${d.score}` });
    r.getElementById('result-rank')?.setProperties({ text: `Rank: ${this.sumo.getRankName()}` });
    r.getElementById('result-record')?.setProperties({ text: `Record: ${d.wins}W - ${d.losses}L` });
    r.getElementById('result-streak')?.setProperties({ text: `Win Streak: ${d.currentStreak}` });
    r.getElementById('result-opponent')?.setProperties({ text: `Opponent: ${this.sumo.getOpponentName()}` });
  }

  private updateSettings() {
    const s = this.settingsPanel;
    if (!s) return;
    const d = this.sumo.getGameData();
    s.getElementById('diff-label')?.setProperties({ text: `Difficulty: ${['Easy', 'Normal', 'Hard'][d.difficulty]}` });
    s.getElementById('sfx-label')?.setProperties({ text: `SFX: ${d.sfxOn ? 'ON' : 'OFF'}` });
    s.getElementById('music-label')?.setProperties({ text: `Music: ${d.musicOn ? 'ON' : 'OFF'}` });
    s.getElementById('scheme-label')?.setProperties({ text: `Theme: ${['Dohyo Classic', 'Neon Arena', 'Cherry Blossom', 'Thunder'][d.colorScheme]}` });
  }

  private updateStats() {
    const sp = this.statsPanel;
    if (!sp) return;
    const d = this.sumo.getGameData();
    sp.getElementById('stat-wins')?.setProperties({ text: `Wins: ${d.wins}` });
    sp.getElementById('stat-losses')?.setProperties({ text: `Losses: ${d.losses}` });
    sp.getElementById('stat-rank')?.setProperties({ text: `Current Rank: ${this.sumo.getRankName()}` });
    sp.getElementById('stat-pushes')?.setProperties({ text: `Total Pushes: ${d.totalPushes}` });
    sp.getElementById('stat-grabs')?.setProperties({ text: `Total Grabs: ${d.totalGrabs}` });
    sp.getElementById('stat-dodges')?.setProperties({ text: `Total Dodges: ${d.totalDodges}` });
    sp.getElementById('stat-ringouts')?.setProperties({ text: `Ring Outs: ${d.totalRingOuts}` });
    sp.getElementById('stat-streak')?.setProperties({ text: `Best Streak: ${d.bestWinStreak}` });
    sp.getElementById('stat-score')?.setProperties({ text: `Total Score: ${d.score}` });
    sp.getElementById('stat-ratio')?.setProperties({ text: `Win Rate: ${d.wins + d.losses > 0 ? Math.round(d.wins / (d.wins + d.losses) * 100) : 0}%` });
  }
}
