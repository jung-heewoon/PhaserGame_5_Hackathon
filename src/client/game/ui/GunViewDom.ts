import type { WeaponId } from '../config/WeaponTable.ts';
import {
  GUN_IMAGE_URLS,
  getGunImageUrl,
  isDualPistol,
  isNuclearLauncher,
} from '../assets/GunAssets.ts';
import {
  GUN_FIRE_FRAME_COUNT,
  GUN_FIRE_FRAME_PX,
  GUN_FIRE_SHEET_URL,
  GUN_FIRE_SHEET_WIDTH,
  hasGunMuzzleFlash,
  preloadGunFireSheet,
} from '../assets/GunFireAssets.ts';
import { GUN_VIEW_CONFIG, GUN_RECOIL_KICK, GUN_RECOIL_MS, GUN_RECOIL_STYLE } from '../config/GunViewConfig.ts';

export type DualFireSide = 'left' | 'right';

export interface GunMotionInput {
  /** -1=좌, 0=없음, 1=우 */
  strafeDir: -1 | 0 | 1;
  /** 전진 달리기 bob */
  walking: boolean;
}

type NuclearPhase = 'idle' | 'arming' | 'launching' | 'reloading';

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GunViewDom {
  private layer: HTMLElement | null = null;
  private singleEl: HTMLImageElement | null = null;
  private dualLEl: HTMLImageElement | null = null;
  private dualREl: HTMLImageElement | null = null;
  private nuclearHandEl: HTMLImageElement | null = null;
  private nuclearMissileEl: HTMLImageElement | null = null;
  private muzzleSingleEl: HTMLElement | null = null;
  private muzzleDualLEl: HTMLElement | null = null;
  private muzzleDualREl: HTMLElement | null = null;

  private currentWeapon: WeaponId | null = null;
  private swapping = false;
  private nuclearPhase: NuclearPhase = 'idle';
  private dualRecoilTimer: ReturnType<typeof setTimeout> | null = null;
  private singleRecoilTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly muzzleAnimVersion = new Map<HTMLElement, number>();
  private minigunMuzzleEl: HTMLElement | null = null;
  private minigunMuzzleLoopVersion = 0;
  private minigunMuzzleHoldUntil = 0;
  private motionTiltDeg = 0;
  private motionBobY = 0;
  private bobPhaseRad = 0;
  private lastTiltStr = '';
  private lastBobStr = '';
  private readonly singleRecoilClasses = [
    'gun-view__single--recoil-pistol',
    'gun-view__single--recoil-revolver',
    'gun-view__single--recoil-shotgun',
    'gun-view__single--recoil-minigun',
    'gun-view__single--recoil-missile',
    'gun-view__single--recoil-beam',
    'gun-view__single--recoil-railgun',
  ] as const;

  init(): void {
    this.reset();
    this.layer = document.getElementById('gun-view-layer');
    this.singleEl = document.getElementById('gun-view-single') as HTMLImageElement | null;
    this.dualLEl = document.getElementById('gun-view-dual-l') as HTMLImageElement | null;
    this.dualREl = document.getElementById('gun-view-dual-r') as HTMLImageElement | null;
    this.nuclearHandEl = document.getElementById('gun-view-nuclear-hand') as HTMLImageElement | null;
    this.nuclearMissileEl = document.getElementById('gun-view-nuclear-missile') as HTMLImageElement | null;
    this.muzzleSingleEl = document.getElementById('gun-muzzle-single');
    this.muzzleDualLEl = document.getElementById('gun-muzzle-dual-l');
    this.muzzleDualREl = document.getElementById('gun-muzzle-dual-r');

    if (!this.layer) return;

    const cfg = GUN_VIEW_CONFIG;
    this.layer.style.setProperty('--gun-bottom-below', `${cfg.bottomBelowPx}px`);
    this.layer.style.setProperty('--gun-swap-travel', `${cfg.swapTravelPx}px`);
    this.layer.style.setProperty('--gun-swap-duration', `${cfg.swapDurationMs}ms`);
    this.layer.style.setProperty('--gun-dual-inner-gap-half', `${cfg.dualPistolInnerGapPx / 2}px`);
    this.layer.style.setProperty('--gun-dual-sprite-gap-half', `${cfg.dualPistolSpriteInnerGapPx / 2}px`);
    this.layer.style.setProperty('--gun-single-max-h', `${cfg.singleMaxHeightPx}px`);
    this.layer.style.setProperty('--gun-dual-max-h', `${cfg.dualMaxHeightPx}px`);
    this.layer.style.setProperty('--gun-nuclear-max-h', `${cfg.nuclearMaxHeightPx}px`);
    this.layer.style.setProperty('--gun-muzzle-single-ratio', String(cfg.muzzleFlashSingleHeightRatio));
    this.layer.style.setProperty('--gun-muzzle-dual-ratio', String(cfg.muzzleFlashDualHeightRatio));
    const muzzleSrc = cfg.muzzleFlashSourcePx;
    this.layer.style.setProperty('--gun-muzzle-size', `${muzzleSrc * cfg.muzzleFlashScale}px`);
    this.layer.style.setProperty('--gun-muzzle-size-lg', `${muzzleSrc * cfg.muzzleFlashLargeScale}px`);
    this.layer.style.setProperty('--gun-muzzle-size-sm', `${muzzleSrc * cfg.muzzleFlashSmallScale}px`);
    const singleMuzzleBottom =
      -cfg.bottomBelowPx +
      cfg.singleMaxHeightPx * cfg.muzzleFlashSingleHeightRatio -
      cfg.muzzleFlashOffsetDownPx;
    const dualMuzzleBottom =
      -cfg.bottomBelowPx +
      cfg.dualMaxHeightPx * cfg.muzzleFlashDualHeightRatio -
      cfg.muzzleFlashOffsetDownPx;
    this.layer.style.setProperty('--gun-muzzle-single-bottom', `${singleMuzzleBottom}px`);
    this.layer.style.setProperty('--gun-muzzle-dual-bottom', `${dualMuzzleBottom}px`);
    this.layer.style.setProperty(
      '--gun-muzzle-translate-y',
      `${cfg.muzzleFlashTranslateYPercent}%`,
    );
    this.layer.style.setProperty('--gun-muzzle-dual-l-out', `${cfg.muzzleFlashDualLOffsetOutPx}px`);
    this.layer.style.setProperty('--gun-muzzle-dual-r-out', `${cfg.muzzleFlashDualROffsetOutPx}px`);
    this.layer.style.setProperty('--gun-nuclear-launch-ms', `${cfg.nuclearMissileLaunchMs}ms`);
    this.layer.style.setProperty('--gun-nuclear-return-ms', `${cfg.nuclearMissileReturnMs}ms`);
    this.layer.style.setProperty('--gun-nuclear-launch-travel', `${cfg.nuclearMissileLaunchTravelPx}px`);
    this.layer.style.setProperty('--gun-nuclear-return-below', `${cfg.nuclearMissileReturnBelowPx}px`);
    this.layer.style.setProperty('--gun-dual-recoil-kick', `${cfg.dualRecoilKickPx}px`);
    this.layer.style.setProperty('--gun-muzzle-sheet-url', `url("${GUN_FIRE_SHEET_URL}")`);
    this.motionTiltDeg = 0;
    this.motionBobY = 0;
    this.forceFlushMotionDom();

    if (this.dualLEl) this.dualLEl.src = GUN_IMAGE_URLS.dualPistolL;
    if (this.dualREl) this.dualREl.src = GUN_IMAGE_URLS.dualPistolR;
    if (this.nuclearHandEl) this.nuclearHandEl.src = GUN_IMAGE_URLS.nuclearHand;
    if (this.nuclearMissileEl) this.nuclearMissileEl.src = GUN_IMAGE_URLS.nuclearMissile;
    preloadGunFireSheet();
    for (const el of [this.muzzleSingleEl, this.muzzleDualLEl, this.muzzleDualREl]) {
      if (el) this.setMuzzleFrame(el, 0);
    }
  }

  reset(): void {
    this.currentWeapon = null;
    this.swapping = false;
    this.nuclearPhase = 'idle';
    if (this.dualRecoilTimer) {
      clearTimeout(this.dualRecoilTimer);
      this.dualRecoilTimer = null;
    }
    this.clearSingleRecoil();
    this.stopAllMuzzleFlashes();
    this.motionTiltDeg = 0;
    this.motionBobY = 0;
    this.bobPhaseRad = 0;
    this.forceFlushMotionDom();
    this.layer?.classList.remove('gun-view--swapping-down', 'gun-view--swapping-up');
    this.hideAll();
  }

  isBusy(): boolean {
    return this.swapping || this.nuclearPhase !== 'idle';
  }

  /** 매 프레임 — 스트레이프 기울임 + 걷기 bob 수치만 계산 (DOM은 flushMotionDom) */
  updateMotion(deltaMs: number, input: GunMotionInput): void {
    if (!this.layer) return;

    const cfg = GUN_VIEW_CONFIG;
    const dt = Math.min(deltaMs, 50) / 1000;

    if (this.isBusy()) {
      this.motionTiltDeg = this.approach(this.motionTiltDeg, 0, cfg.strafeTiltSmoothing, dt);
      this.motionBobY = 0;
      return;
    }

    const targetTilt = input.strafeDir * cfg.strafeTiltDeg;
    this.motionTiltDeg = this.approach(this.motionTiltDeg, targetTilt, cfg.strafeTiltSmoothing, dt);

    if (input.walking) {
      this.bobPhaseRad += dt * cfg.walkBobHz * Math.PI * 2;
      this.motionBobY = Math.sin(this.bobPhaseRad) * cfg.walkBobAmplitudePx;
    } else {
      this.motionBobY = 0;
    }
  }

  /** POST_RENDER — setProperty 직전 문자열 memo로 CSS 변수 반영 */
  flushMotionDom(): void {
    if (!this.layer) return;

    const tiltStr = `${this.motionTiltDeg.toFixed(2)}deg`;
    const bobStr = `${this.motionBobY.toFixed(2)}px`;

    if (tiltStr !== this.lastTiltStr) {
      this.lastTiltStr = tiltStr;
      this.layer.style.setProperty('--gun-tilt-deg', tiltStr);
    }
    if (bobStr !== this.lastBobStr) {
      this.lastBobStr = bobStr;
      this.layer.style.setProperty('--gun-bob-y', bobStr);
    }
  }

  private forceFlushMotionDom(): void {
    this.lastTiltStr = '';
    this.lastBobStr = '';
    this.flushMotionDom();
  }

  private approach(current: number, target: number, speed: number, dt: number): number {
    const t = 1 - Math.exp(-speed * dt);
    return current + (target - current) * t;
  }

  async equipWeapon(weaponId: WeaponId): Promise<void> {
    if (!this.layer) return;
    if (this.currentWeapon === weaponId) return;

    if (this.currentWeapon !== null) {
      await this.playSwapAnimation(weaponId);
    } else {
      this.applyWeaponLayout(weaponId, false);
    }
    this.currentWeapon = weaponId;
  }

  flashDualSide(side: DualFireSide): void {
    const el = side === 'left' ? this.dualLEl : this.dualREl;
    if (!el) return;
    el.classList.remove('gun-view__dual--firing');
    void el.offsetWidth;
    el.classList.add('gun-view__dual--firing');
    if (this.dualRecoilTimer) clearTimeout(this.dualRecoilTimer);
    this.dualRecoilTimer = setTimeout(() => {
      el.classList.remove('gun-view__dual--firing');
      this.dualRecoilTimer = null;
    }, GUN_VIEW_CONFIG.dualRecoilMs);
    this.playMuzzleFlash('DUAL_PISTOL', side);
  }

  playMuzzleFlash(weaponId: WeaponId, side?: DualFireSide): void {
    if (!hasGunMuzzleFlash(weaponId)) return;

    let el: HTMLElement | null;
    if (weaponId === 'DUAL_PISTOL') {
      el = side === 'left' ? this.muzzleDualLEl : this.muzzleDualREl;
    } else {
      el = this.muzzleSingleEl;
    }
    if (!el) return;

    el.classList.remove('gun-muzzle--size-lg', 'gun-muzzle--size-sm');
    if (weaponId === 'SHOTGUN' || weaponId === 'MISSILE_LAUNCHER') {
      el.classList.add('gun-muzzle--size-lg');
    } else if (weaponId === 'MINIGUN') {
      el.classList.add('gun-muzzle--size-sm');
      this.playMinigunMuzzle(el);
      return;
    }

    this.playMuzzleOn(el);
  }

  playFireRecoil(weaponId: WeaponId): void {
    if (weaponId === 'NUCLEAR_LAUNCHER' || weaponId === 'DUAL_PISTOL') return;

    if (hasGunMuzzleFlash(weaponId)) {
      this.playMuzzleFlash(weaponId);
    }

    const style = GUN_RECOIL_STYLE[weaponId];
    const el = this.singleEl;
    if (!el?.classList.contains('is-visible')) return;

    const kick = GUN_RECOIL_KICK[style];
    el.style.setProperty('--gun-recoil-kick-y', `${kick.y}px`);
    el.style.setProperty('--gun-recoil-scale', String(kick.scale));
    el.style.setProperty('--gun-recoil-rotate', `${kick.rotate ?? 0}deg`);
    el.style.setProperty('--gun-recoil-x-shake', `${kick.xShake ?? 0}px`);

    const className = `gun-view__single--recoil-${style}`;
    this.clearSingleRecoil();
    void el.offsetWidth;
    el.classList.add(className);

    if (this.singleRecoilTimer) clearTimeout(this.singleRecoilTimer);
    this.singleRecoilTimer = setTimeout(() => {
      el.classList.remove(className);
      this.singleRecoilTimer = null;
    }, GUN_RECOIL_MS[style]);
  }

  private playMinigunMuzzle(el: HTMLElement): void {
    const cfg = GUN_VIEW_CONFIG;
    this.minigunMuzzleHoldUntil = Date.now() + cfg.minigunMuzzleHoldMs;

    if (this.minigunMuzzleEl === el && this.minigunMuzzleLoopVersion > 0) {
      el.classList.add('is-visible');
      return;
    }

    this.minigunMuzzleEl = el;
    const version = ++this.minigunMuzzleLoopVersion;
    el.classList.add('is-visible');
    this.syncMuzzleSheetSize(el);

    const start = cfg.minigunMuzzleFrameStart;
    const count = cfg.minigunMuzzleFrameCount;
    if (count <= 0) return;

    let idx = 0;

    const step = (): void => {
      if (this.minigunMuzzleLoopVersion !== version || this.minigunMuzzleEl !== el) return;
      if (Date.now() > this.minigunMuzzleHoldUntil) {
        el.classList.remove('is-visible');
        if (this.minigunMuzzleEl === el) this.minigunMuzzleEl = null;
        return;
      }
      this.setMuzzleFrame(el, start + (idx % count));
      idx += 1;
      setTimeout(step, cfg.minigunMuzzleFrameMs);
    };
    step();
  }

  private playMuzzleOn(el: HTMLElement): void {
    const version = (this.muzzleAnimVersion.get(el) ?? 0) + 1;
    this.muzzleAnimVersion.set(el, version);
    el.classList.add('is-visible');
    this.syncMuzzleSheetSize(el);

    let frame = 0;
    const frameMs = GUN_VIEW_CONFIG.muzzleFlashFrameMs;

    const step = (): void => {
      if (this.muzzleAnimVersion.get(el) !== version) return;
      if (frame >= GUN_FIRE_FRAME_COUNT) {
        el.classList.remove('is-visible');
        return;
      }
      this.setMuzzleFrame(el, frame);
      frame += 1;
      setTimeout(step, frameMs);
    };
    step();
  }

  /** 표시 크기에 맞춰 시트 스케일 + 프레임 offset */
  private setMuzzleFrame(el: HTMLElement, frameIndex: number): void {
    const displayFrame = el.offsetWidth || GUN_FIRE_FRAME_PX * GUN_VIEW_CONFIG.muzzleFlashScale;
    const scale = displayFrame / GUN_FIRE_FRAME_PX;
    el.style.backgroundSize = `${GUN_FIRE_SHEET_WIDTH * scale}px ${GUN_FIRE_FRAME_PX * scale}px`;
    el.style.backgroundPosition = `${-frameIndex * displayFrame}px 0`;
  }

  private syncMuzzleSheetSize(el: HTMLElement): void {
    void el.offsetWidth;
    this.setMuzzleFrame(el, 0);
  }

  private stopMuzzleOn(el: HTMLElement): void {
    this.muzzleAnimVersion.set(el, (this.muzzleAnimVersion.get(el) ?? 0) + 1);
    el.classList.remove('is-visible', 'gun-muzzle--size-lg', 'gun-muzzle--size-sm');
  }

  private stopAllMuzzleFlashes(): void {
    this.minigunMuzzleLoopVersion += 1;
    this.minigunMuzzleEl = null;
    this.minigunMuzzleHoldUntil = 0;
    for (const el of [this.muzzleSingleEl, this.muzzleDualLEl, this.muzzleDualREl]) {
      if (el) this.stopMuzzleOn(el);
    }
  }

  private clearSingleRecoil(): void {
    if (!this.singleEl) return;
    for (const cls of this.singleRecoilClasses) {
      this.singleEl.classList.remove(cls);
    }
    if (this.singleRecoilTimer) {
      clearTimeout(this.singleRecoilTimer);
      this.singleRecoilTimer = null;
    }
  }

  async playNuclearLaunch(onImpact: () => void): Promise<void> {
    if (!this.nuclearHandEl || !this.nuclearMissileEl) {
      onImpact();
      return;
    }

    this.nuclearPhase = 'arming';
    this.hideAll();
    this.nuclearHandEl.classList.add('is-visible');
    this.nuclearMissileEl.classList.add('is-visible');
    this.nuclearMissileEl.classList.remove('is-launching', 'is-returning', 'is-offscreen-below');

    await waitMs(60);

    this.nuclearPhase = 'launching';
    this.nuclearMissileEl.classList.add('is-launching');
    await waitMs(GUN_VIEW_CONFIG.nuclearMissileLaunchMs);

    onImpact();

    this.nuclearMissileEl.classList.remove('is-launching');
    this.nuclearMissileEl.classList.add('is-offscreen-below');
    await waitMs(40);
  }

  async playNuclearReload(): Promise<void> {
    if (!this.nuclearHandEl || !this.nuclearMissileEl) return;

    this.nuclearPhase = 'reloading';
    this.nuclearMissileEl.classList.remove('is-offscreen-below');
    this.nuclearMissileEl.classList.add('is-returning');
    await waitMs(GUN_VIEW_CONFIG.nuclearMissileReturnMs);

    this.nuclearMissileEl.classList.remove('is-returning', 'is-visible');
    this.nuclearHandEl.classList.remove('is-visible');
    this.nuclearPhase = 'idle';
    this.applyWeaponLayout('NUCLEAR_LAUNCHER', false);
    this.currentWeapon = 'NUCLEAR_LAUNCHER';
  }

  finishNuclearAfterLastShot(): void {
    this.nuclearMissileEl?.classList.remove(
      'is-visible',
      'is-launching',
      'is-returning',
      'is-offscreen-below',
    );
    this.nuclearHandEl?.classList.remove('is-visible');
    this.nuclearPhase = 'idle';
    this.applyWeaponLayout('NUCLEAR_LAUNCHER', false);
  }

  private async playSwapAnimation(nextWeapon: WeaponId): Promise<void> {
    if (!this.layer) return;
    this.swapping = true;
    this.layer.classList.remove('gun-view--swapping-up');
    this.layer.classList.add('gun-view--swapping-down');
    await waitMs(GUN_VIEW_CONFIG.swapDurationMs);

    this.applyWeaponLayout(nextWeapon, false);

    this.layer.classList.remove('gun-view--swapping-down');
    this.layer.classList.add('gun-view--swapping-up');
    await waitMs(GUN_VIEW_CONFIG.swapDurationMs);

    this.layer.classList.remove('gun-view--swapping-up');
    this.swapping = false;
  }

  private setSingleMaxHeight(weaponId: WeaponId): void {
    if (!this.layer) return;
    const cfg = GUN_VIEW_CONFIG;
    const height =
      weaponId === 'NUCLEAR_LAUNCHER' ? cfg.nuclearIdleMaxHeightPx : cfg.singleMaxHeightPx;
    this.layer.style.setProperty('--gun-single-max-h', `${height}px`);
  }

  private applyWeaponLayout(weaponId: WeaponId, nuclearFiring: boolean): void {
    this.hideAll();

    if (isDualPistol(weaponId)) {
      this.dualLEl?.classList.add('is-visible');
      this.dualREl?.classList.add('is-visible');
      return;
    }

    if (isNuclearLauncher(weaponId) && !nuclearFiring) {
      this.setSingleMaxHeight('NUCLEAR_LAUNCHER');
      if (this.singleEl) {
        this.singleEl.src = GUN_IMAGE_URLS.nuclearIdle;
        this.singleEl.classList.add('is-visible');
      }
      return;
    }

    this.setSingleMaxHeight(weaponId);
    const url = getGunImageUrl(weaponId);
    if (this.singleEl && url) {
      this.singleEl.src = url;
      this.singleEl.classList.add('is-visible');
    }
  }

  setFeverVisual(active: boolean, warn: boolean, blinkOn: boolean): void {
    if (!this.layer) return;
    this.layer.classList.toggle('fever-active', active);
    this.layer.classList.toggle('fever-warn', active && warn);
    this.layer.classList.toggle('fever-blink-off', active && warn && !blinkOn);
  }

  private hideAll(): void {
    this.clearSingleRecoil();
    this.stopAllMuzzleFlashes();
    this.singleEl?.classList.remove('is-visible');
    this.dualLEl?.classList.remove('is-visible', 'gun-view__dual--firing');
    this.dualREl?.classList.remove('is-visible', 'gun-view__dual--firing');
    this.nuclearHandEl?.classList.remove('is-visible');
    this.nuclearMissileEl?.classList.remove(
      'is-visible',
      'is-launching',
      'is-returning',
      'is-offscreen-below',
    );
  }
}

export const gunViewDom = new GunViewDom();
