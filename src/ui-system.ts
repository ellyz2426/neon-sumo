import { createSystem, UIKitMLAsset } from '@iwsdk/core';
import { SumoSystem } from './sumo-system.js';
import type { GameState } from './sumo-system.js';

const HARITE_STAMINA = 35;

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
    this.menuPanel?.getElementById('btn-tournament')?.addEventListener('click', () => { this.sumo.startTournament(); this.showOnly('hud'); });
    this.menuPanel?.getElementById('btn-training')?.addEventListener('click', () => { this.sumo.startTraining(); this.showOnly('hud'); });
    this.menuPanel?.getElementById('btn-survival')?.addEventListener('click', () => { this.sumo.startSurvival(); this.showOnly('hud'); });
    this.menuPanel?.getElementById('btn-settings')?.addEventListener('click', () => { this.sumo.setState('settings'); this.showOnly('settings'); });
    this.menuPanel?.getElementById('btn-stats')?.addEventListener('click', () => { this.sumo.setState('stats'); this.updateStats(); this.showOnly('stats'); });

    this.hudPanel?.getElementById('btn-pause')?.addEventListener('click', () => { this.sumo.setState('paused'); this.showOnly('pause'); });

    this.pausePanel?.getElementById('btn-resume')?.addEventListener('click', () => {
      const d = this.sumo.getGameData();
      this.sumo.setState(d.isTraining ? 'training' : (d.inSurvival ? 'survival' : 'playing'));
      this.showOnly('hud');
    });
    this.pausePanel?.getElementById('btn-quit')?.addEventListener('click', () => { this.sumo.setState('menu'); this.showOnly('menu'); });

    this.resultsPanel?.getElementById('btn-next')?.addEventListener('click', () => {
      const d = this.sumo.getGameData();
      if (d.inSurvival && d.matchResult === 'win') {
        this.sumo.continueAfterSurvivalWin();
        this.showOnly('hud');
      } else if (d.inSurvival) {
        this.sumo.setState('menu');
        this.showOnly('menu');
      } else if (d.inTournament && d.matchResult === 'win' && d.tournamentRound < d.tournamentBracket.length) {
        this.sumo.startMatch();
        this.showOnly('hud');
      } else if (d.inTournament) {
        this.sumo.setState('menu');
        this.showOnly('menu');
      } else {
        this.sumo.startMatch();
        this.showOnly('hud');
      }
    });
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
      if (d.state === 'playing' || d.state === 'training' || d.state === 'survival') { this.sumo.setState('paused'); this.showOnly('pause'); }
      else if (d.state === 'paused') {
        this.sumo.setState(d.isTraining ? 'training' : (d.inSurvival ? 'survival' : 'playing'));
        this.showOnly('hud');
      }
    }

    if (d.state !== this.lastState) {
      this.lastState = d.state;
      if (d.state === 'menu') this.showOnly('menu');
      else if (d.state === 'playing' || d.state === 'training' || d.state === 'survival') this.showOnly('hud');
      else if (d.state === 'paused') this.showOnly('pause');
      else if (d.state === 'results') { this.updateResults(); this.showOnly('results'); }
      else if (d.state === 'settings') { this.updateSettings(); this.showOnly('settings'); }
      else if (d.state === 'stats') { this.updateStats(); this.showOnly('stats'); }
    }

    this.hudTimer += delta;
    if ((d.state === 'playing' || d.state === 'training' || d.state === 'survival') && this.hudTimer > 0.1) {
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

    if (d.isTraining) {
      h.getElementById('countdown')?.setProperties({ text: '' });
      h.getElementById('tachiai-text')?.setProperties({ text: '' });
      h.getElementById('time')?.setProperties({ text: 'TRAINING' });
      h.getElementById('opponent-name')?.setProperties({ text: 'PRACTICE DUMMY' });
      h.getElementById('tourney-info')?.setProperties({ text: 'F = Henka (sidestep)' });
    } else if (d.inSurvival) {
      if (d.tachiai) {
        h.getElementById('countdown')?.setProperties({ text: '' });
        h.getElementById('tachiai-text')?.setProperties({ text: '⚡ TACHIAI ⚡' });
      } else if (d.isCountdown) {
        const ct = Math.ceil(d.countdownTime);
        h.getElementById('countdown')?.setProperties({ text: ct > 0 ? String(ct) : 'FIGHT!' });
        h.getElementById('tachiai-text')?.setProperties({ text: '' });
      } else {
        h.getElementById('countdown')?.setProperties({ text: '' });
        h.getElementById('tachiai-text')?.setProperties({ text: '' });
      }
      h.getElementById('time')?.setProperties({ text: `Time: ${Math.ceil(d.roundTime)}s` });
      h.getElementById('opponent-name')?.setProperties({ text: `VS ${this.sumo.getOpponentName()}` });
      h.getElementById('tourney-info')?.setProperties({ text: `SURVIVAL Wave ${d.survivalWave} | Kills: ${d.survivalKills}` });
    } else {
      if (d.tachiai) {
        h.getElementById('countdown')?.setProperties({ text: '' });
        h.getElementById('tachiai-text')?.setProperties({ text: '⚡ TACHIAI ⚡' });
      } else if (d.isCountdown) {
        const ct = Math.ceil(d.countdownTime);
        h.getElementById('countdown')?.setProperties({ text: ct > 0 ? String(ct) : 'FIGHT!' });
        h.getElementById('tachiai-text')?.setProperties({ text: '' });
      } else {
        h.getElementById('countdown')?.setProperties({ text: '' });
        h.getElementById('tachiai-text')?.setProperties({ text: '' });
      }
      h.getElementById('time')?.setProperties({ text: `Time: ${Math.ceil(d.roundTime)}s` });
      h.getElementById('opponent-name')?.setProperties({ text: `VS ${this.sumo.getOpponentName()}` });
      h.getElementById('tourney-info')?.setProperties({ text: this.sumo.getTournamentInfo() });
    }

    h.getElementById('score')?.setProperties({ text: `Score: ${d.score}` });
    h.getElementById('rank')?.setProperties({ text: `Rank: ${this.sumo.getRankName()}` });
    h.getElementById('match-num')?.setProperties({ text: d.isTraining ? '' : `Match ${d.matchNumber}` });
    h.getElementById('streak')?.setProperties({ text: d.currentStreak > 1 ? `${d.currentStreak} Win Streak!` : '' });

    // Combo text
    const comboText = this.sumo.getComboText();
    h.getElementById('combo-text')?.setProperties({ text: comboText });

    // Stamina
    const stPct = Math.round(d.playerStamina);
    h.getElementById('stamina-label')?.setProperties({ text: `Stamina: ${stPct}%` });
    h.getElementById('stamina-bar')?.setProperties({ width: `${Math.round(d.playerStamina * 2.8)}` });

    // Slow-mo indicator
    h.getElementById('slowmo-text')?.setProperties({ text: d.slowMo < 1 ? '● SLOW MOTION ●' : '' });

    // Cooldown indicators (now with henka)
    h.getElementById('push-cd')?.setProperties({ text: d.playerPushCD > 0 ? `Push: ${d.playerPushCD.toFixed(1)}s` : (d.playerStamina < 15 ? 'Push: LOW' : 'Push: READY') });
    h.getElementById('grab-cd')?.setProperties({ text: d.playerGrabCD > 0 ? `Grab: ${d.playerGrabCD.toFixed(1)}s` : (d.playerStamina < 25 ? 'Grab: LOW' : 'Grab: READY') });
    h.getElementById('dodge-cd')?.setProperties({ text: d.playerDodgeCD > 0 ? `Dodge: ${d.playerDodgeCD.toFixed(1)}s` : (d.playerStamina < 20 ? 'Dodge: LOW' : 'Dodge: READY') });
    h.getElementById('charge-cd')?.setProperties({ text: d.playerChargeCD > 0 ? `Charge: ${d.playerChargeCD.toFixed(1)}s` : (d.playerStamina < 30 ? 'Charge: LOW' : 'Charge: READY') });
    h.getElementById('henka-cd')?.setProperties({ text: d.playerHenkaCD > 0 ? `Henka: ${d.playerHenkaCD.toFixed(1)}s` : (d.playerStamina < 18 ? 'Henka: LOW' : 'Henka: READY') });
    // Harite unlocks at Komusubi rank (5)
    const hariteText = this.sumo.isHariteAvailable()
      ? (d.hariteCooldown > 0 ? `Harite: ${d.hariteCooldown.toFixed(1)}s` : (d.playerStamina < HARITE_STAMINA ? 'Harite: LOW' : 'Harite: READY'))
      : '';
    h.getElementById('harite-cd')?.setProperties({ text: hariteText });
  }

  private updateResults() {
    const r = this.resultsPanel;
    if (!r) return;
    const d = this.sumo.getGameData();
    const technique = this.sumo.getWinTechnique();
    if (d.matchResult === 'win') {
      r.getElementById('result-title')?.setProperties({ text: 'VICTORY!' });
      r.getElementById('result-technique')?.setProperties({ text: technique ? `Kimarite: ${technique}` : '' });
    } else {
      r.getElementById('result-title')?.setProperties({ text: d.matchResult === 'loss' ? 'DEFEAT!' : 'TIME OUT' });
      r.getElementById('result-technique')?.setProperties({ text: '' });
    }
    r.getElementById('result-score')?.setProperties({ text: `Score: ${d.score}` });
    r.getElementById('result-rank')?.setProperties({ text: `Rank: ${this.sumo.getRankName()}` });
    r.getElementById('result-record')?.setProperties({ text: `Record: ${d.wins}W - ${d.losses}L` });
    r.getElementById('result-streak')?.setProperties({ text: `Win Streak: ${d.currentStreak}` });
    r.getElementById('result-opponent')?.setProperties({ text: `Opponent: ${this.sumo.getOpponentName()}` });
    // Combo bonus display
    const comboBonus = d.comboCount >= 2 ? `Combo Bonus: +${d.comboCount * 100}` : '';
    r.getElementById('result-combo')?.setProperties({ text: comboBonus });
    // Upset win / zabuton
    r.getElementById('upset-text')?.setProperties({ text: this.sumo.isUpsetWin() ? '座布団 ZABUTON THROW!' : '' });
    if (this.sumo.isTournamentChampion()) {
      r.getElementById('tourney-result')?.setProperties({ text: `Tournament complete! ${d.tournamentWins} wins` });
      r.getElementById('champion-text')?.setProperties({ text: '🏆 CHAMPION 🏆' });
      r.getElementById('btn-next')?.setProperties({ text: 'MENU' });
    } else if (d.inTournament) {
      r.getElementById('tourney-result')?.setProperties({ text: this.sumo.getTournamentInfo() });
      r.getElementById('champion-text')?.setProperties({ text: '' });
    } else if (d.inSurvival) {
      if (d.matchResult === 'win') {
        r.getElementById('tourney-result')?.setProperties({ text: `Survival Wave ${d.survivalWave} cleared!` });
        r.getElementById('champion-text')?.setProperties({ text: '' });
        r.getElementById('btn-next')?.setProperties({ text: 'NEXT WAVE' });
      } else {
        r.getElementById('tourney-result')?.setProperties({ text: `Survived ${d.survivalKills} waves! Best: ${d.survivalBestWave}` });
        r.getElementById('champion-text')?.setProperties({ text: '' });
        r.getElementById('btn-next')?.setProperties({ text: 'MENU' });
      }
    } else if (d.matchResult === 'loss' && d.tournamentWins > 0) {
      r.getElementById('tourney-result')?.setProperties({ text: `Eliminated! Wins: ${d.tournamentWins}` });
      r.getElementById('champion-text')?.setProperties({ text: '' });
    } else {
      r.getElementById('tourney-result')?.setProperties({ text: '' });
      r.getElementById('champion-text')?.setProperties({ text: '' });
    }
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
    sp.getElementById('stat-henkas')?.setProperties({ text: `Total Henkas: ${d.totalHenkas}` });
    sp.getElementById('stat-ringouts')?.setProperties({ text: `Ring Outs: ${d.totalRingOuts}` });
    sp.getElementById('stat-streak')?.setProperties({ text: `Best Streak: ${d.bestWinStreak}` });
    sp.getElementById('stat-score')?.setProperties({ text: `Total Score: ${d.score}` });
    sp.getElementById('stat-ratio')?.setProperties({ text: `Win Rate: ${d.wins + d.losses > 0 ? Math.round(d.wins / (d.wins + d.losses) * 100) : 0}%` });
    sp.getElementById('stat-survival')?.setProperties({ text: `Survival Best: Wave ${d.survivalBestWave}` });
  }
}
