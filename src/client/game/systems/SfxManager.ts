import Phaser from 'phaser';
import { AUDIO_CONFIG } from '../config/AudioConfig.ts';
import type { WeaponId } from '../config/WeaponTable.ts';
import {gamePersistence} from '../platform/reddit/RedditPersistence.ts';
import {
  getOneShotSoundKey,
  SOUND_KEYS,
  type OneShotSoundKey,
} from '../assets/SoundAssets.ts';

const WEAPON_ONE_SHOT_MAP: Partial<Record<WeaponId, OneShotSoundKey>> = {
  REVOLVER: 'revolver',
  SHOTGUN: 'shotgun',
  BEAM_GUN: 'beamGun',
  RAILGUN: 'railGun',
};

class SfxManagerImpl {
  private scene: Phaser.Scene | null = null;
  private sfxVolumePct: number = AUDIO_CONFIG.defaultSfxVolume;
  private unlockBound = false;

  private minigunDurationSec = 0;
  private minigunLoop: Phaser.Sound.WebAudioSound | null = null;
  private minigunLoopTimer: Phaser.Time.TimerEvent | null = null;
  private minigunTail: Phaser.Sound.WebAudioSound | null = null;
  private minigunLoopPlaying = false;

  private missileFirePool: Phaser.Sound.WebAudioSound[] = [];
  private missileExplodePool: Phaser.Sound.WebAudioSound[] = [];
  private missileFireTimers = new Map<Phaser.Sound.WebAudioSound, Phaser.Time.TimerEvent>();

  private bossSuccessSound: Phaser.Sound.WebAudioSound | null = null;
  private gameOverSound: Phaser.Sound.WebAudioSound | null = null;
  private gameOverCompleteHandler: (() => void) | null = null;

  private coinGetPool: Phaser.Sound.WebAudioSound[] = [];
  private coinGetLastPlayAtMs = 0;
  private platformMuted = false;

  hydrate(): void {
    this.sfxVolumePct = this.readStoredVolume();
  }

  setPlatformMuted(muted: boolean): void {
    if (this.platformMuted === muted) return;
    this.platformMuted = muted;
    if (muted) {
      this.stopMinigunLoop();
      this.stopBossSuccess();
    }
    this.applyVolumeToActiveSounds();
  }

  init(scene: Phaser.Scene): void {
    this.stopAll();
    this.scene = scene;
    this.sfxVolumePct = this.readStoredVolume();
    this.warmMissilePools();
    this.warmCoinGetPool();
    this.bindUnlockOnce();
  }

  getSfxVolume(): number {
    return this.sfxVolumePct;
  }

  isMinigunLoopPlaying(): boolean {
    return this.minigunLoopPlaying;
  }

  setSfxVolume(pct: number): void {
    this.sfxVolumePct = Math.max(0, Math.min(100, Math.round(pct)));
    this.persistVolume();
    this.applyVolumeToActiveSounds();
  }

  stopAll(): void {
    this.stopMinigunLoop();
    this.stopBossSuccess();
    this.stopGameOver();
    this.clearMissileFireTimers();
    for (const sound of this.missileFirePool) {
      sound.stop();
    }
    for (const sound of this.missileExplodePool) {
      sound.stop();
    }
    this.missileFirePool = [];
    this.missileExplodePool = [];
    for (const sound of this.coinGetPool) {
      sound.stop();
    }
    this.coinGetPool = [];
    this.coinGetLastPlayAtMs = 0;
    this.scene = null;
    this.unlockBound = false;
    this.minigunDurationSec = 0;
  }

  playPistolFire(): void {
    const key = Math.random() < 0.5 ? SOUND_KEYS.pistol1 : SOUND_KEYS.pistol2;
    this.playOneShot(key, AUDIO_CONFIG.weaponSfxVolumeMult.pistol);
  }

  playDiceRoll(): void {
    this.playDiceRollBurst();
  }

  /** 주사위 굴림 — 3회 엇박 겹침 재생 (팝업 첫 굴림·리롤 공통) */
  playDiceRollBurst(): void {
    const scene = this.scene;
    if (!scene) return;

    const vol = this.volumeScalar() * AUDIO_CONFIG.diceRollVolumeMult;
    const delays = AUDIO_CONFIG.diceRollBurstDelaysMs;

    for (let i = 0; i < delays.length && i < AUDIO_CONFIG.diceRollBurstCount; i++) {
      const baseDelay = delays[i] ?? 0;
      const jitter =
        i === 0 ? 0 : Math.floor(Math.random() * 36) - 10;
      const delayMs = Math.max(0, baseDelay + jitter);

      scene.time.delayedCall(delayMs, () => {
        if (!this.scene) return;
        this.scene.sound.play(SOUND_KEYS.diceRoll, { volume: vol });
      });
    }
  }

  playWeaponFire(weaponId: WeaponId): void {
    const mapped = WEAPON_ONE_SHOT_MAP[weaponId];
    if (!mapped) return;
    const mult =
      weaponId === 'REVOLVER'
        ? AUDIO_CONFIG.weaponSfxVolumeMult.revolver
        : weaponId === 'SHOTGUN'
          ? AUDIO_CONFIG.weaponSfxVolumeMult.shotgun
          : weaponId === 'BEAM_GUN'
            ? AUDIO_CONFIG.weaponSfxVolumeMult.beamGun
            : 1;
    this.playOneShot(getOneShotSoundKey(mapped), mult);
  }

  startMinigunLoop(): void {
    if (this.minigunLoopPlaying) return;
    const scene = this.scene;
    if (!scene) return;

    this.stopMinigunTail();

    this.minigunLoop = scene.sound.add(SOUND_KEYS.minigun, {
      volume: this.volumeScalar(),
    }) as Phaser.Sound.WebAudioSound;
    this.minigunLoopPlaying = true;
    this.playMinigunLoopSegment();
  }

  /** 발사 키/터치를 뗄 때 — loop 중단 후 tail(끝 0.2s) 재생 */
  releaseMinigunLoop(): void {
    if (!this.minigunLoopPlaying) return;
    this.clearMinigunLoop(false);
    this.playMinigunTail();
  }

  /** freeze/무기 교체/사망 등 — tail 없이 즉시 중단 */
  stopMinigunLoop(): void {
    this.clearMinigunLoop(true);
    this.stopMinigunTail();
  }

  playMissileFire(): void {
    const scene = this.scene;
    if (!scene) return;

    const sound = this.acquireMissileSound(this.missileFirePool);
    if (!sound) return;

    sound.stop();
    sound.setVolume(this.missileVolumeScalar());
    sound.play({ seek: 0 });

    const existing = this.missileFireTimers.get(sound);
    if (existing) existing.remove(false);

    const timer = scene.time.delayedCall(AUDIO_CONFIG.missileLauncherFireSec * 1000, () => {
      this.missileFireTimers.delete(sound);
      sound.stop();
    });
    this.missileFireTimers.set(sound, timer);
  }

  playMissileExplode(): void {
    const sound = this.acquireMissileSound(this.missileExplodePool);
    if (!sound) return;

    sound.stop();
    sound.setVolume(this.missileVolumeScalar());
    sound.play({ seek: AUDIO_CONFIG.missileLauncherExplodeStartSec });
  }

  playNuclearExplode(): void {
    this.playOneShot(SOUND_KEYS.nuclearLauncher);
  }

  playBossSuccess(): void {
    const scene = this.scene;
    if (!scene) return;

    this.stopBossSuccess();
    const sound = scene.sound.add(SOUND_KEYS.bossSuccess, {
      volume: this.volumeScalar() * AUDIO_CONFIG.bossSuccessVolumeMult,
    }) as Phaser.Sound.WebAudioSound;
    this.bossSuccessSound = sound;
    sound.play();
  }

  stopBossSuccess(): void {
    if (!this.bossSuccessSound) return;
    this.bossSuccessSound.stop();
    this.bossSuccessSound.destroy();
    this.bossSuccessSound = null;
  }

  playBossDie(): void {
    this.playOneShot(SOUND_KEYS.bossDie, AUDIO_CONFIG.bossDieVolumeMult);
  }

  /** 보스 경고 스프라이트 표시 시 — 알람 2회 */
  playBossWarning(): void {
    const scene = this.scene;
    if (!scene) return;

    const vol = this.volumeScalar() * AUDIO_CONFIG.bossWarningVolumeMult;
    for (const delayMs of AUDIO_CONFIG.bossWarningBurstDelaysMs) {
      scene.time.delayedCall(delayMs, () => {
        if (!this.scene) return;
        this.scene.sound.play(SOUND_KEYS.bossWarning, { volume: vol });
      });
    }
  }

  playMonsterDie(): void {
    this.playOneShot(SOUND_KEYS.monsterDie);
  }

  /** 코인 fly가 HUD 아이콘에 도착할 때 — 연속 도착은 간격·풀로 완화 */
  playCoinGet(): void {
    const scene = this.scene;
    if (!scene) return;

    const now = scene.time.now;
    if (now - this.coinGetLastPlayAtMs < AUDIO_CONFIG.coinGetMinIntervalMs) return;

    const sound = this.acquireCoinGetSound();
    if (!sound) return;

    this.coinGetLastPlayAtMs = now;
    sound.stop();
    sound.setVolume(this.volumeScalar() * AUDIO_CONFIG.coinGetVolumeMult);
    sound.play({ seek: 0 });
  }

  playGameOver(onComplete?: () => void): void {
    const scene = this.scene;
    if (!scene) {
      onComplete?.();
      return;
    }

    this.stopGameOver();
    const sound = scene.sound.add(SOUND_KEYS.gameOver, {
      volume: this.volumeScalar() * AUDIO_CONFIG.gameOverVolumeMult,
    }) as Phaser.Sound.WebAudioSound;
    this.gameOverSound = sound;
    this.gameOverCompleteHandler = onComplete ?? null;

    const finish = (): void => {
      if (this.gameOverSound !== sound) return;
      sound.off(Phaser.Sound.Events.COMPLETE, finish);
      const handler = this.gameOverCompleteHandler;
      this.gameOverCompleteHandler = null;
      this.gameOverSound = null;
      sound.destroy();
      handler?.();
    };

    sound.once(Phaser.Sound.Events.COMPLETE, finish);
    sound.play();
  }

  stopGameOver(): void {
    this.gameOverCompleteHandler = null;
    if (!this.gameOverSound) return;
    this.gameOverSound.stop();
    this.gameOverSound.destroy();
    this.gameOverSound = null;
  }

  private playMinigunLoopSegment(): void {
    const scene = this.scene;
    const sound = this.minigunLoop;
    if (!scene || !sound || !this.minigunLoopPlaying) return;

    this.clearMinigunLoopTimer();
    sound.stop();
    sound.setVolume(this.volumeScalar());
    sound.play({ seek: 0 });

    const loopMs = this.getMinigunLoopEndSec() * 1000;
    this.minigunLoopTimer = scene.time.delayedCall(loopMs, () => {
      this.minigunLoopTimer = null;
      if (this.minigunLoopPlaying && this.minigunLoop === sound) {
        this.playMinigunLoopSegment();
      }
    });
  }

  private playMinigunTail(): void {
    const scene = this.scene;
    if (!scene) return;

    this.stopMinigunTail();

    const tailSec = AUDIO_CONFIG.minigunLoopTailSec;
    const tailStart = this.getMinigunTailStartSec();
    const tail = scene.sound.add(SOUND_KEYS.minigun, {
      volume: this.volumeScalar(),
    }) as Phaser.Sound.WebAudioSound;

    this.minigunTail = tail;
    tail.play({ seek: tailStart });
    tail.once(Phaser.Sound.Events.COMPLETE, () => {
      if (this.minigunTail === tail) {
        tail.destroy();
        this.minigunTail = null;
      }
    });

    scene.time.delayedCall(tailSec * 1000, () => {
      if (this.minigunTail !== tail) return;
      tail.stop();
      tail.destroy();
      this.minigunTail = null;
    });
  }

  private clearMinigunLoop(stopTail: boolean): void {
    this.minigunLoopPlaying = false;
    this.clearMinigunLoopTimer();

    if (this.minigunLoop) {
      this.minigunLoop.stop();
      this.minigunLoop.destroy();
      this.minigunLoop = null;
    }

    if (stopTail) {
      this.stopMinigunTail();
    }
  }

  private clearMinigunLoopTimer(): void {
    if (this.minigunLoopTimer) {
      this.minigunLoopTimer.remove(false);
      this.minigunLoopTimer = null;
    }
  }

  private stopMinigunTail(): void {
    if (!this.minigunTail) return;
    this.minigunTail.stop();
    this.minigunTail.destroy();
    this.minigunTail = null;
  }

  private getMinigunDurationSec(): number {
    if (this.minigunDurationSec > 0) return this.minigunDurationSec;

    const scene = this.scene;
    if (!scene) return 1;

    const cached = scene.cache.audio.get(SOUND_KEYS.minigun);
    if (cached && typeof cached.duration === 'number' && cached.duration > 0) {
      this.minigunDurationSec = cached.duration;
      return this.minigunDurationSec;
    }

    const probe = scene.sound.add(SOUND_KEYS.minigun) as Phaser.Sound.WebAudioSound;
    this.minigunDurationSec = probe.duration > 0 ? probe.duration : 1;
    probe.destroy();
    return this.minigunDurationSec;
  }

  private getMinigunLoopEndSec(): number {
    const duration = this.getMinigunDurationSec();
    const tail = AUDIO_CONFIG.minigunLoopTailSec;
    return Math.max(0.05, duration - tail);
  }

  private getMinigunTailStartSec(): number {
    return this.getMinigunLoopEndSec();
  }

  private playOneShot(key: string, volumeMult = 1): void {
    const scene = this.scene;
    if (!scene) return;
    scene.sound.play(key, { volume: this.volumeScalar() * volumeMult });
  }

  private volumeScalar(): number {
    if (this.platformMuted) return 0;
    return this.sfxVolumePct / 100;
  }

  private missileVolumeScalar(): number {
    return this.volumeScalar() * AUDIO_CONFIG.weaponSfxVolumeMult.missileLauncher;
  }

  private applyVolumeToActiveSounds(): void {
    const vol = this.volumeScalar();
    this.minigunLoop?.setVolume(vol);
    this.minigunTail?.setVolume(vol);
    this.bossSuccessSound?.setVolume(vol * AUDIO_CONFIG.bossSuccessVolumeMult);
    this.gameOverSound?.setVolume(vol * AUDIO_CONFIG.gameOverVolumeMult);
    for (const sound of this.missileFirePool) {
      if (sound.isPlaying) sound.setVolume(this.missileVolumeScalar());
    }
    for (const sound of this.missileExplodePool) {
      if (sound.isPlaying) sound.setVolume(this.missileVolumeScalar());
    }
    for (const sound of this.coinGetPool) {
      if (sound.isPlaying) sound.setVolume(vol * AUDIO_CONFIG.coinGetVolumeMult);
    }
  }

  private warmCoinGetPool(): void {
    const scene = this.scene;
    if (!scene) return;

    this.coinGetPool = [];
    for (let i = 0; i < AUDIO_CONFIG.coinGetSoundPoolSize; i++) {
      this.coinGetPool.push(
        scene.sound.add(SOUND_KEYS.coinGet, {
          volume: this.volumeScalar() * AUDIO_CONFIG.coinGetVolumeMult,
        }) as Phaser.Sound.WebAudioSound,
      );
    }
  }

  private acquireCoinGetSound(): Phaser.Sound.WebAudioSound | null {
    const idle = this.coinGetPool.find((sound) => !sound.isPlaying);
    if (idle) return idle;
    return this.coinGetPool[0] ?? null;
  }

  private warmMissilePools(): void {
    const scene = this.scene;
    if (!scene) return;

    this.missileFirePool = this.createMissilePool(scene);
    this.missileExplodePool = this.createMissilePool(scene);
  }

  private createMissilePool(scene: Phaser.Scene): Phaser.Sound.WebAudioSound[] {
    const pool: Phaser.Sound.WebAudioSound[] = [];
    for (let i = 0; i < AUDIO_CONFIG.missileSoundPoolSize; i++) {
      pool.push(
        scene.sound.add(SOUND_KEYS.missileLauncher, {
          volume: this.missileVolumeScalar(),
        }) as Phaser.Sound.WebAudioSound,
      );
    }
    return pool;
  }

  private acquireMissileSound(
    pool: Phaser.Sound.WebAudioSound[],
  ): Phaser.Sound.WebAudioSound | null {
    const idle = pool.find((sound) => !sound.isPlaying);
    if (idle) return idle;
    return pool[0] ?? null;
  }

  private clearMissileFireTimers(): void {
    for (const timer of this.missileFireTimers.values()) {
      timer.remove(false);
    }
    this.missileFireTimers.clear();
  }

  private bindUnlockOnce(): void {
    const scene = this.scene;
    if (!scene || this.unlockBound) return;
    this.unlockBound = true;

    const unlock = (): void => {
      scene.sound.unlock();
    };
    scene.input.once('pointerdown', unlock);
    scene.input.keyboard?.once('keydown', unlock);
  }

  private readStoredVolume(): number {
    try {
      const raw = gamePersistence.getItem(AUDIO_CONFIG.sfxVolumeStorageKey);
      if (raw == null) return AUDIO_CONFIG.defaultSfxVolume;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return AUDIO_CONFIG.defaultSfxVolume;
      return Math.max(0, Math.min(100, parsed));
    } catch {
      return AUDIO_CONFIG.defaultSfxVolume;
    }
  }

  private persistVolume(): void {
    gamePersistence.setItem(AUDIO_CONFIG.sfxVolumeStorageKey, String(this.sfxVolumePct));
  }
}

export const sfxManager = new SfxManagerImpl();
