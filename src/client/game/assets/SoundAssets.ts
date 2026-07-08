import type Phaser from 'phaser';
import pistol1Url from '../Sound/Pistol_1.mp3?url';
import pistol2Url from '../Sound/Pistol_2.mp3?url';
import revolverUrl from '../Sound/Revolver.mp3?url';
import shotgunUrl from '../Sound/ShotGun.mp3?url';
import minigunUrl from '../Sound/Minigun.mp3?url';
import missileLauncherUrl from '../Sound/MissileLauncher.wav?url';
import beamGunUrl from '../Sound/BeamGun.wav?url';
import railGunUrl from '../Sound/RailGun.mp3?url';
import nuclearLauncherUrl from '../Sound/NuclearLauncher.mp3?url';
import diceRollUrl from '../Sound/DiceRoll.mp3?url';
import bossClearUrl from '../Sound/BossClear.wav?url';
import bossDieUrl from '../Sound/BossDie.wav?url';
import bossWarningUrl from '../Sound/BossWarnig.wav?url';
import gameOverUrl from '../Sound/GameOver.mp3?url';
import monsterDieUrl from '../Sound/MonsterDie.mp3?url';
import coinGetUrl from '../Sound/CoinGet.mp3?url';
import bgmCombatUrl from '../Sound/BGM/BGM.mp3?url';
import bgmBoss1Url from '../Sound/BGM/Boss_1.mp3?url';
import bgmBoss2Url from '../Sound/BGM/Boss_2.mp3?url';
import bgmBoss3Url from '../Sound/BGM/Boss_3.mp3?url';

export const SOUND_KEYS = {
  pistol1: 'sfx-pistol-1',
  pistol2: 'sfx-pistol-2',
  revolver: 'sfx-revolver',
  shotgun: 'sfx-shotgun',
  minigun: 'sfx-minigun',
  missileLauncher: 'sfx-missile-launcher',
  beamGun: 'sfx-beam-gun',
  railGun: 'sfx-rail-gun',
  nuclearLauncher: 'sfx-nuclear-launcher',
  diceRoll: 'sfx-dice-roll',
  bossSuccess: 'sfx-boss-success',
  bossDie: 'sfx-boss-die',
  bossWarning: 'sfx-boss-warning',
  gameOver: 'sfx-game-over',
  monsterDie: 'sfx-monster-die',
  coinGet: 'sfx-coin-get',
  bgmCombat: 'bgm-combat',
  bgmBossDemon: 'bgm-boss-demon',
  bgmBossBringer: 'bgm-boss-bringer',
  bgmBossGuardian: 'bgm-boss-guardian',
} as const;

export type OneShotSoundKey =
  | 'revolver'
  | 'shotgun'
  | 'beamGun'
  | 'railGun'
  | 'nuclearLauncher';

const ONE_SHOT_KEY_MAP: Record<OneShotSoundKey, string> = {
  revolver: SOUND_KEYS.revolver,
  shotgun: SOUND_KEYS.shotgun,
  beamGun: SOUND_KEYS.beamGun,
  railGun: SOUND_KEYS.railGun,
  nuclearLauncher: SOUND_KEYS.nuclearLauncher,
};

export function getOneShotSoundKey(key: OneShotSoundKey): string {
  return ONE_SHOT_KEY_MAP[key];
}

export function preloadGameSounds(scene: Phaser.Scene): void {
  scene.load.audio(SOUND_KEYS.pistol1, pistol1Url);
  scene.load.audio(SOUND_KEYS.pistol2, pistol2Url);
  scene.load.audio(SOUND_KEYS.revolver, revolverUrl);
  scene.load.audio(SOUND_KEYS.shotgun, shotgunUrl);
  scene.load.audio(SOUND_KEYS.minigun, minigunUrl);
  scene.load.audio(SOUND_KEYS.missileLauncher, missileLauncherUrl);
  scene.load.audio(SOUND_KEYS.beamGun, beamGunUrl);
  scene.load.audio(SOUND_KEYS.railGun, railGunUrl);
  scene.load.audio(SOUND_KEYS.nuclearLauncher, nuclearLauncherUrl);
  scene.load.audio(SOUND_KEYS.diceRoll, diceRollUrl);
  scene.load.audio(SOUND_KEYS.bossSuccess, bossClearUrl);
  scene.load.audio(SOUND_KEYS.bossDie, bossDieUrl);
  scene.load.audio(SOUND_KEYS.bossWarning, bossWarningUrl);
  scene.load.audio(SOUND_KEYS.gameOver, gameOverUrl);
  scene.load.audio(SOUND_KEYS.monsterDie, monsterDieUrl);
  scene.load.audio(SOUND_KEYS.coinGet, coinGetUrl);
  scene.load.audio(SOUND_KEYS.bgmCombat, bgmCombatUrl);
  scene.load.audio(SOUND_KEYS.bgmBossDemon, bgmBoss1Url);
  scene.load.audio(SOUND_KEYS.bgmBossBringer, bgmBoss2Url);
  scene.load.audio(SOUND_KEYS.bgmBossGuardian, bgmBoss3Url);
}
