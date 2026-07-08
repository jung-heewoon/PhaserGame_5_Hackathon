import Phaser from 'phaser';
import { SOUND_KEYS } from '../assets/SoundAssets.ts';
import { AUDIO_CONFIG, type BossBgmSegment } from '../config/AudioConfig.ts';
import type { BossType } from '../config/BossConfig.ts';
import {gamePersistence} from '../platform/reddit/RedditPersistence.ts';
import type { RunFreezeReason } from './RunSession.ts';

type BgmMode = 'combat' | 'boss' | 'gameOverSting' | 'postGameOver' | 'stopped';

const BOSS_SOUND_KEYS: Record<BossType, string> = {
  demon: SOUND_KEYS.bgmBossDemon,
  bringer: SOUND_KEYS.bgmBossBringer,
  guardian: SOUND_KEYS.bgmBossGuardian,
};

class BgmManagerImpl {
  private scene: Phaser.Scene | null = null;
  private bgmVolumePct: number = AUDIO_CONFIG.defaultBgmVolume;
  private unlockBound = false;
  private mode: BgmMode = 'stopped';
  private activeBossType: BossType | null = null;
  private bossFirstPlay = true;
  private duckReason: RunFreezeReason | null = null;

  private combatSound: Phaser.Sound.WebAudioSound | null = null;
  private combatLoopTimer: Phaser.Time.TimerEvent | null = null;
  private combatDurationSec = 0;

  private bossSound: Phaser.Sound.WebAudioSound | null = null;
  private bossSegmentTimer: Phaser.Time.TimerEvent | null = null;
  private outroCompleteHandler: (() => void) | null = null;
  private platformMuted = false;
  private visibilityPaused = false;

  hydrate(): void {
    this.bgmVolumePct = this.readStoredVolume();
  }

  setPlatformMuted(muted: boolean): void {
    if (this.platformMuted === muted) return;
    this.platformMuted = muted;
    this.applyVolumes();
  }

  pauseForVisibility(): void {
    if (this.visibilityPaused) return;
    this.visibilityPaused = true;
    // sound.pause()는 탭 복귀 후 resume()/isPlaying 상태가 꼬여 BGM만 영구 무음이 될 수 있음.
    // loop.sleep() + 브라우저 AudioContext suspend로 충분히 멈춤 — SFX는 pause하지 않음.
  }

  resumeFromVisibility(): void {
    if (!this.visibilityPaused) return;
    this.visibilityPaused = false;
    this.restartBgmAfterForeground();
  }

  /** visibilitychange/pagehide를 놓친 iframe 복귀 시 포인터·포커스 fallback */
  tryRestartBgmAfterForeground(): void {
    if (!this.visibilityPaused) return;
    this.resumeFromVisibility();
  }

  init(scene: Phaser.Scene): void {
    this.visibilityPaused = false;
    this.stopAll();
    this.scene = scene;
    this.bgmVolumePct = this.readStoredVolume();
    this.bindUnlockOnce();
    this.startCombatLoop();
  }

  getBgmVolume(): number {
    return this.bgmVolumePct;
  }

  setBgmVolume(pct: number): void {
    this.bgmVolumePct = Math.max(0, Math.min(100, Math.round(pct)));
    this.persistVolume();
    this.applyVolumes();
  }

  syncDuck(freezeReason: RunFreezeReason | null): void {
    const shouldDuck = freezeReason === 'yatzy' || freezeReason === 'settings' || freezeReason === 'tutorial';
    const nextReason = shouldDuck ? freezeReason : null;
    if (this.duckReason === nextReason) return;
    this.duckReason = nextReason;
    this.applyVolumes();
  }

  startBoss(bossType: BossType): void {
    const scene = this.scene;
    if (!scene || this.mode === 'stopped') return;

    this.mode = 'boss';
    this.activeBossType = bossType;
    this.bossFirstPlay = true;
    this.clearBossSegmentTimer();
    this.destroyBossSound();

    this.applyVolumes();
    this.bossSound = scene.sound.add(BOSS_SOUND_KEYS[bossType], {
      volume: this.bossVolumeScalar(),
    }) as Phaser.Sound.WebAudioSound;
    this.playBossSegment();
  }

  playBossOutro(onComplete: () => void): void {
    const scene = this.scene;
    const bossType = this.activeBossType;
    if (!scene || !bossType || this.mode !== 'boss') {
      onComplete();
      return;
    }

    this.clearBossSegmentTimer();
    this.bossFirstPlay = false;

    const segments = AUDIO_CONFIG.bossSegments[bossType];
    const tailCut =
      'outroTailCutSec' in segments && segments.outroTailCutSec != null
        ? segments.outroTailCutSec
        : 0;
    const outroEnd = Math.max(segments.outroStart + 0.05, segments.outroEnd - tailCut);
    const outroDurationMs = Math.max(50, (outroEnd - segments.outroStart) * 1000);

    if (!this.bossSound) {
      this.bossSound = scene.sound.add(BOSS_SOUND_KEYS[bossType], {
        volume: this.bossVolumeScalar(),
      }) as Phaser.Sound.WebAudioSound;
    }

    const sound = this.bossSound;
    sound.stop();
    sound.setVolume(this.bossVolumeScalar());
    sound.play({ seek: segments.outroStart });

    this.outroCompleteHandler = onComplete;
    let finished = false;
    const finish = (): void => {
      if (finished || this.outroCompleteHandler !== onComplete) return;
      finished = true;
      this.outroCompleteHandler = null;
      sound.off(Phaser.Sound.Events.COMPLETE, finish);
      this.clearBossSegmentTimer();
      this.destroyBossSound();
      onComplete();
    };

    sound.once(Phaser.Sound.Events.COMPLETE, finish);
    this.bossSegmentTimer = scene.time.delayedCall(outroDurationMs, finish);
  }

  resumeCombatLoop(): void {
    if (this.mode === 'stopped' || this.mode === 'gameOverSting' || this.mode === 'postGameOver') return;

    this.mode = 'combat';
    this.activeBossType = null;
    this.bossFirstPlay = true;
    this.clearBossSegmentTimer();
    this.destroyBossSound();
    this.applyVolumes();

    if (!this.combatSound?.isPlaying) {
      this.playCombatLoopSegment();
    }
  }

  /** 게임오버 스팅 재생 전 — 전투·보스 BGM 정지 */
  enterGameOverSting(): void {
    this.mode = 'gameOverSting';
    this.activeBossType = null;
    this.duckReason = null;
    this.outroCompleteHandler = null;
    this.clearCombatLoopTimer();
    this.clearBossSegmentTimer();
    this.destroyCombatSound();
    this.destroyBossSound();
  }

  /** GameOver.mp3 종료 후 — 기본 BGM을 낮은 볼륨으로 루프 */
  startPostGameOverLoop(): void {
    const scene = this.scene;
    if (!scene || this.mode === 'stopped') return;

    this.mode = 'postGameOver';
    this.destroyCombatSound();
    this.combatSound = scene.sound.add(SOUND_KEYS.bgmCombat, {
      volume: this.combatVolumeScalar(),
      loop: false,
    }) as Phaser.Sound.WebAudioSound;
    this.playCombatLoopSegment();
  }

  stopForGameOver(): void {
    this.mode = 'stopped';
    this.activeBossType = null;
    this.duckReason = null;
    this.outroCompleteHandler = null;
    this.clearCombatLoopTimer();
    this.clearBossSegmentTimer();
    this.destroyCombatSound();
    this.destroyBossSound();
  }

  stopAll(): void {
    this.stopForGameOver();
    this.scene = null;
    this.unlockBound = false;
    this.combatDurationSec = 0;
  }

  private startCombatLoop(): void {
    const scene = this.scene;
    if (!scene) return;

    this.mode = 'combat';
    this.destroyCombatSound();
    this.combatSound = scene.sound.add(SOUND_KEYS.bgmCombat, {
      volume: this.combatVolumeScalar(),
      loop: false,
    }) as Phaser.Sound.WebAudioSound;
    this.playCombatLoopSegment();
  }

  private playCombatLoopSegment(): void {
    const scene = this.scene;
    const sound = this.combatSound;
    if (!scene || !sound || this.mode === 'stopped') return;

    this.clearCombatLoopTimer();
    sound.stop();
    sound.setVolume(this.combatVolumeScalar());
    sound.play({ seek: 0 });

    const loopMs = this.getCombatDurationSec() * 1000;
    this.combatLoopTimer = scene.time.delayedCall(loopMs, () => {
      this.combatLoopTimer = null;
      if (this.mode !== 'stopped' && this.combatSound === sound) {
        this.playCombatLoopSegment();
      }
    });
  }

  private playBossSegment(): void {
    const scene = this.scene;
    const bossType = this.activeBossType;
    const sound = this.bossSound;
    if (!scene || !bossType || !sound || this.mode !== 'boss') return;

    this.clearBossSegmentTimer();
    const segments = AUDIO_CONFIG.bossSegments[bossType];

    if (this.bossFirstPlay) {
      this.bossFirstPlay = false;
      sound.stop();
      sound.setVolume(this.bossVolumeScalar());
      sound.play({ seek: 0 });

      const firstPlayMs = Math.max(50, segments.loopEnd * 1000);
      this.bossSegmentTimer = scene.time.delayedCall(firstPlayMs, () => {
        this.bossSegmentTimer = null;
        if (this.mode === 'boss' && this.bossSound === sound) {
          this.playBossLoopSegment(segments);
        }
      });
      return;
    }

    this.playBossLoopSegment(segments);
  }

  private playBossLoopSegment(segments: BossBgmSegment): void {
    const scene = this.scene;
    const sound = this.bossSound;
    if (!scene || !sound || this.mode !== 'boss') return;

    this.clearBossSegmentTimer();
    sound.stop();
    sound.setVolume(this.bossVolumeScalar());
    sound.play({ seek: segments.loopStart });

    const loopMs = Math.max(50, (segments.loopEnd - segments.loopStart) * 1000);
    this.bossSegmentTimer = scene.time.delayedCall(loopMs, () => {
      this.bossSegmentTimer = null;
      if (this.mode === 'boss' && this.bossSound === sound) {
        this.playBossLoopSegment(segments);
      }
    });
  }

  private getCombatDurationSec(): number {
    if (this.combatDurationSec > 0) return this.combatDurationSec;

    const scene = this.scene;
    if (!scene) return 1;

    const cached = scene.cache.audio.get(SOUND_KEYS.bgmCombat);
    if (cached && typeof cached.duration === 'number' && cached.duration > 0) {
      this.combatDurationSec = cached.duration;
      return this.combatDurationSec;
    }

    const probe = scene.sound.add(SOUND_KEYS.bgmCombat) as Phaser.Sound.WebAudioSound;
    this.combatDurationSec = probe.duration > 0 ? probe.duration : 1;
    probe.destroy();
    return this.combatDurationSec;
  }

  private combatVolumeScalar(): number {
    if (this.mode === 'boss' || this.mode === 'gameOverSting') return 0;
    const base = this.bgmVolumePct / 100;
    if (this.mode === 'postGameOver') {
      return base * AUDIO_CONFIG.postGameOverBgmVolumeMult;
    }
    return this.audibleVolumeScalar();
  }

  private bossVolumeScalar(): number {
    return this.audibleVolumeScalar();
  }

  private audibleVolumeScalar(): number {
    if (this.platformMuted) return 0;
    const base = this.bgmVolumePct / 100;
    if (this.duckReason) return base * AUDIO_CONFIG.modalDuckVolumeMult;
    return base;
  }

  private applyVolumes(): void {
    this.combatSound?.setVolume(this.combatVolumeScalar());
    if (this.mode === 'boss' && this.bossSound) {
      this.bossSound.setVolume(this.bossVolumeScalar());
    }
  }

  private clearCombatLoopTimer(): void {
    if (this.combatLoopTimer) {
      this.combatLoopTimer.remove(false);
      this.combatLoopTimer = null;
    }
  }

  private clearBossSegmentTimer(): void {
    if (this.bossSegmentTimer) {
      this.bossSegmentTimer.remove(false);
      this.bossSegmentTimer = null;
    }
  }

  private destroyCombatSound(): void {
    this.clearCombatLoopTimer();
    if (this.combatSound) {
      this.combatSound.stop();
      this.combatSound.destroy();
      this.combatSound = null;
    }
  }

  private destroyBossSound(): void {
    this.clearBossSegmentTimer();
    if (this.bossSound) {
      this.bossSound.stop();
      this.bossSound.destroy();
      this.bossSound = null;
    }
  }

  private restartBgmAfterForeground(): void {
    if (this.platformMuted) return;
    if (this.mode === 'stopped' || this.mode === 'gameOverSting') return;

    this.scene?.sound.unlock();
    this.applyVolumes();

    // init()/startCombatLoop()와 동일하게 세그먼트를 처음부터 다시 재생
    if (this.mode === 'combat' || this.mode === 'postGameOver') {
      this.playCombatLoopSegment();
    } else if (this.mode === 'boss' && this.activeBossType) {
      this.bossFirstPlay = false;
      this.playBossLoopSegment(AUDIO_CONFIG.bossSegments[this.activeBossType]);
    }
  }

  private bindUnlockOnce(): void {
    const scene = this.scene;
    if (!scene || this.unlockBound) return;
    this.unlockBound = true;

    const unlock = (): void => {
      scene.sound.unlock();
      bgmManager.tryRestartBgmAfterForeground();
    };
    scene.input.once('pointerdown', unlock);
    scene.input.keyboard?.once('keydown', unlock);
  }

  private readStoredVolume(): number {
    try {
      const raw = gamePersistence.getItem(AUDIO_CONFIG.bgmVolumeStorageKey);
      if (raw == null) return AUDIO_CONFIG.defaultBgmVolume;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return AUDIO_CONFIG.defaultBgmVolume;
      return Math.max(0, Math.min(100, parsed));
    } catch {
      return AUDIO_CONFIG.defaultBgmVolume;
    }
  }

  private persistVolume(): void {
    gamePersistence.setItem(AUDIO_CONFIG.bgmVolumeStorageKey, String(this.bgmVolumePct));
  }
}

export const bgmManager = new BgmManagerImpl();
