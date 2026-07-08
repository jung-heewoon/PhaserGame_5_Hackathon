import Phaser from 'phaser';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import type { GameRunState } from './GameRunState.ts';
import type { RunSession } from './RunSession.ts';
import type { WeaponFireSystem } from './WeaponFireSystem.ts';
import type { YatzyFlowController } from './YatzyFlowController.ts';
import type { GunViewDom } from '../ui/GunViewDom.ts';
import { upgradeStore } from './UpgradeStore.ts';
import { mobileControls } from '../ui/MobileControlsDom.ts';
import { sfxManager } from './SfxManager.ts';

export class CombatSystem {
  private fireCooldownRemainingMs = 0;
  private pendingAmmoDepletion = false;
  private readonly shootKey: Phaser.Input.Keyboard.Key | null;
  private readonly scene: Phaser.Scene;
  private readonly state: GameRunState;
  private readonly yatzyFlow: YatzyFlowController;
  private readonly session: RunSession;
  private readonly weaponFireSystem: WeaponFireSystem;
  private readonly gunView: GunViewDom;
  private readonly getPlayer: () => RunnerPlayerEntity | null;
  private readonly getEnemies: () => EnemyEntity[];

  constructor(
    scene: Phaser.Scene,
    state: GameRunState,
    yatzyFlow: YatzyFlowController,
    session: RunSession,
    weaponFireSystem: WeaponFireSystem,
    gunView: GunViewDom,
    getPlayer: () => RunnerPlayerEntity | null,
    getEnemies: () => EnemyEntity[],
  ) {
    this.scene = scene;
    this.state = state;
    this.yatzyFlow = yatzyFlow;
    this.session = session;
    this.weaponFireSystem = weaponFireSystem;
    this.gunView = gunView;
    this.getPlayer = getPlayer;
    this.getEnemies = getEnemies;
    this.shootKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) ?? null;
  }

  update(deltaMs: number): void {
    if (this.session.isGameplayFrozen) {
      sfxManager.stopMinigunLoop();
      return;
    }

    const simDelta = this.session.simDeltaMs(deltaMs);
    if (this.fireCooldownRemainingMs > 0) {
      this.fireCooldownRemainingMs = Math.max(0, this.fireCooldownRemainingMs - simDelta);
    }

    const player = this.getPlayer();
    if (!player || player.isDead || player.isFrozen) {
      sfxManager.stopMinigunLoop();
      return;
    }

    if (this.gunView.isBusy() || this.weaponFireSystem.isNuclearActive()) {
      sfxManager.stopMinigunLoop();
      return;
    }

    const wantsShoot =
      this.shootKey?.isDown ||
      mobileControls.fireHeld ||
      (!mobileControls.enabled && this.scene.input.activePointer.isDown);

    const currentWeapon = this.state.weaponEntry.weaponId;
    const isMinigun = currentWeapon === 'MINIGUN';

    if (!wantsShoot) {
      if (isMinigun) {
        sfxManager.releaseMinigunLoop();
      } else {
        sfxManager.stopMinigunLoop();
      }
    } else if (!isMinigun) {
      sfxManager.stopMinigunLoop();
    }

    if (!wantsShoot) return;

    if (!this.state.canFire()) {
      if (this.state.isAmmoDepleted()) {
        this.yatzyFlow.onAmmoDepleted();
      }
      return;
    }

    const baseEntry = this.state.weaponEntry;
    if (this.fireCooldownRemainingMs > 0) return;

    this.fireCooldownRemainingMs = baseEntry.fireRateMs;
    const fired = this.state.consumeAmmo();
    if (!fired) return;

    const ammoRemaining = this.state.snapshot.isInfiniteAmmo ? 0 : this.state.snapshot.currentAmmo;
    const isNuclear = baseEntry.weaponId === 'NUCLEAR_LAUNCHER';

    // 강화 배율을 반영한 유효 데미지로 발사 (원본 테이블은 불변 유지)
    const entry = {
      ...baseEntry,
      damage: upgradeStore.getEffectiveDamage(baseEntry.damage, baseEntry.weaponId),
    };

    this.weaponFireSystem.fire(player, entry, () => this.getEnemies(), ammoRemaining);

    if (entry.weaponId !== 'NUCLEAR_LAUNCHER' && entry.weaponId !== 'DUAL_PISTOL') {
      this.gunView.playFireRecoil(entry.weaponId);
    }

    if (this.state.isAmmoDepleted()) {
      if (isNuclear) {
        this.pendingAmmoDepletion = true;
      } else {
        this.yatzyFlow.onAmmoDepleted();
      }
    }
  }

  onNuclearSequenceComplete(): void {
    if (this.pendingAmmoDepletion) {
      this.pendingAmmoDepletion = false;
      this.yatzyFlow.onAmmoDepleted();
    }
  }
}
