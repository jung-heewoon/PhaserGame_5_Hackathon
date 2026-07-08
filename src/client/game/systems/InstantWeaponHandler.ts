import type Phaser from 'phaser';
import type TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type { WeaponFireProfile } from '../config/WeaponFireConfig.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import {
  applyDamageToEnemies,
  enemiesInAoe,
  enemiesInRailBand,
  enemiesOnBeam,
} from './CombatHitUtils.ts';
import type { BeamFlashPool } from './BeamFlashPool.ts';
import type { WeaponExplosionVfx } from './WeaponExplosionVfx.ts';
import { aimAlignedMuzzlePoint } from './ProjectileSpawnOrigin.ts';
import { gunMuzzleForwardPx } from './GunMuzzleForward.ts';
import { sfxManager } from './SfxManager.ts';

export class InstantWeaponHandler {
  private readonly beamFlashPool: BeamFlashPool;
  private readonly weaponExplosionVfx: WeaponExplosionVfx;
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    beamFlashPool: BeamFlashPool,
    weaponExplosionVfx: WeaponExplosionVfx,
  ) {
    this.scene = scene;
    this.beamFlashPool = beamFlashPool;
    this.weaponExplosionVfx = weaponExplosionVfx;
  }

  fireBeam(
    player: RunnerPlayerEntity,
    profile: WeaponFireProfile,
    damage: number,
    enemies: EnemyEntity[],
  ): void {
    const angle = player.aimAngle;
    const { x: cx, y: cy } = aimAlignedMuzzlePoint(player, gunMuzzleForwardPx(profile));
    const range = profile.beamRange ?? RUN_GAME_CONFIG.hitScanRange;
    const halfWidth = (profile.beamWidth ?? RUN_GAME_CONFIG.beamWidth) / 2;

    const hits = enemiesOnBeam(cx, cy, angle, range, halfWidth, enemies);
    applyDamageToEnemies(hits, damage, player);

    this.beamFlashPool.spawnBeam({
      originX: cx,
      originY: cy,
      z: player.pos.z + 2,
      angle,
      length: range,
      width: profile.beamWidth ?? RUN_GAME_CONFIG.beamWidth,
    });
  }

  fireRail(
    player: RunnerPlayerEntity,
    profile: WeaponFireProfile,
    damage: number,
    enemies: EnemyEntity[],
  ): void {
    const angle = player.aimAngle;
    const { x: cx, y: cy } = aimAlignedMuzzlePoint(player, gunMuzzleForwardPx(profile));
    const range = profile.railRange ?? RUN_GAME_CONFIG.hitScanRange;
    const halfWidth = profile.railHalfWidth ?? RUN_GAME_CONFIG.railHalfWidth;

    const hits = enemiesInRailBand(cx, cy, angle, range, halfWidth, enemies);
    applyDamageToEnemies(hits, damage, player);

    this.beamFlashPool.spawnRail({
      originX: cx,
      originY: cy,
      z: player.pos.z + 2,
      angle,
      length: range,
      bandWidth: halfWidth * 2,
    });
  }

  applyNuclearFieldDamage(
    player: RunnerPlayerEntity,
    damage: number,
    enemies: EnemyEntity[],
  ): void {
    const cx = player.pos.x + player.size.x / 2;
    const cy = player.pos.y - RUN_GAME_CONFIG.nuclearExplosionAheadPx;

    applyDamageToEnemies(enemies, damage, player);
    this.weaponExplosionVfx.spawnNuclear(cx, cy, RUN_GAME_CONFIG.nuclearExplosionZ);
    sfxManager.playNuclearExplode();
    this.scene.time.delayedCall(60, () => {
      this.scene.cameras.main.flash(280, 255, 240, 220);
    });
  }

  applyAoe(
    cx: number,
    cy: number,
    radius: number,
    damage: number,
    from: TPFEntity,
    enemies: EnemyEntity[],
  ): void {
    const hits = enemiesInAoe(cx, cy, radius, enemies);
    applyDamageToEnemies(hits, damage, from);
    this.weaponExplosionVfx.spawnMissile(cx, cy, from.pos.z + 2);
    sfxManager.playMissileExplode();
  }
}
