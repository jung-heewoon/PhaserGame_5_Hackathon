import { getFireProfile } from '../config/WeaponFireConfig.ts';
import type { HandWeaponEntry, WeaponId } from '../config/WeaponTable.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import type { GunViewDom } from '../ui/GunViewDom.ts';
import { sfxManager } from './SfxManager.ts';
import type { InstantWeaponHandler } from './InstantWeaponHandler.ts';
import type { NuclearLaunchSequence } from './NuclearLaunchSequence.ts';
import type { ProjectilePool } from './ProjectilePool.ts';
import type { HomingMissilePool } from './HomingMissilePool.ts';

export class WeaponFireSystem {
  private readonly projectilePool: ProjectilePool;
  private readonly homingMissilePool: HomingMissilePool;
  private readonly instantHandler: InstantWeaponHandler;
  private readonly nuclearSequence: NuclearLaunchSequence;
  private readonly gunView: GunViewDom;

  constructor(
    projectilePool: ProjectilePool,
    homingMissilePool: HomingMissilePool,
    instantHandler: InstantWeaponHandler,
    nuclearSequence: NuclearLaunchSequence,
    gunView: GunViewDom,
  ) {
    this.projectilePool = projectilePool;
    this.homingMissilePool = homingMissilePool;
    this.instantHandler = instantHandler;
    this.nuclearSequence = nuclearSequence;
    this.gunView = gunView;
  }

  fire(
    player: RunnerPlayerEntity,
    entry: HandWeaponEntry,
    getEnemies: () => EnemyEntity[],
    ammoRemaining: number,
  ): void {
    const profile = getFireProfile(entry.weaponId);
    const enemies = getEnemies();

    switch (profile.delivery) {
      case 'projectile':
      case 'projectile_dual':
      case 'projectile_multi':
      case 'projectile_spread':
      case 'projectile_scatter':
      case 'projectile_aoe':
        this.projectilePool.spawnFromProfile(player, profile, entry);
        break;
      case 'projectile_homing':
        this.homingMissilePool.spawnFromProfile(player, profile, entry);
        break;
      case 'instant_beam':
        this.instantHandler.fireBeam(player, profile, entry.damage, enemies);
        break;
      case 'instant_rail':
        this.instantHandler.fireRail(player, profile, entry.damage, enemies);
        break;
      case 'instant_field':
        void this.nuclearSequence.start(
          player,
          entry.damage,
          ammoRemaining,
          getEnemies,
          this.gunView,
          this.instantHandler,
        );
        break;
      default:
        break;
    }

    this.playWeaponSfx(entry.weaponId);
  }

  private playWeaponSfx(weaponId: WeaponId): void {
    switch (weaponId) {
      case 'DEFAULT_PISTOL':
      case 'DUAL_PISTOL':
        sfxManager.playPistolFire();
        break;
      case 'MISSILE_LAUNCHER':
        sfxManager.playMissileFire();
        break;
      case 'MINIGUN':
        sfxManager.startMinigunLoop();
        break;
      case 'NUCLEAR_LAUNCHER':
        break;
      default:
        sfxManager.playWeaponFire(weaponId);
        break;
    }
  }

  isNuclearActive(): boolean {
    return this.nuclearSequence.isActive();
  }
}
