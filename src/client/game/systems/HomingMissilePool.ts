import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { ProjectileCatalog } from '../assets/ProjectileAssets.ts';
import type { WeaponFireProfile } from '../config/WeaponFireConfig.ts';
import type { HandWeaponEntry } from '../config/WeaponTable.ts';
import HomingMissileEntity from '../entities/HomingMissileEntity.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type { InstantWeaponHandler } from './InstantWeaponHandler.ts';
import type { RunSession } from './RunSession.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export class HomingMissilePool {
  private pool: HomingMissileEntity[] = [];
  private active = new Set<HomingMissileEntity>();
  private gs: GameState | null = null;
  private catalog: ProjectileCatalog | null = null;
  private session: RunSession | null = null;
  private instantHandler: InstantWeaponHandler | null = null;
  private getEnemies: (() => EnemyEntity[]) | null = null;

  dispose(): void {
    this.releaseAll();
    this.pool = [];
    this.gs = null;
    this.catalog = null;
    this.session = null;
    this.instantHandler = null;
    this.getEnemies = null;
  }

  warmUp(
    gs: GameState,
    catalog: ProjectileCatalog,
    session: RunSession,
    instantHandler: InstantWeaponHandler,
    getEnemies: () => EnemyEntity[],
  ): void {
    this.gs = gs;
    this.catalog = catalog;
    this.session = session;
    this.instantHandler = instantHandler;
    this.getEnemies = getEnemies;

    for (let i = 0; i < RUN_GAME_CONFIG.homingMissilePoolSize; i++) {
      const missile = gs.spawnEntity(HomingMissileEntity, STASH_X, STASH_Y, {
        homingMissilePool: this,
        projectileCatalog: catalog,
        session,
        instantHandler,
      }) as HomingMissileEntity;
      this.release(missile);
    }
  }

  spawnFromProfile(
    player: RunnerPlayerEntity,
    profile: WeaponFireProfile,
    entry: HandWeaponEntry,
  ): void {
    const angle = player.aimAngle;
    const forward = RUN_GAME_CONFIG.missileSpawnForwardPx;
    const cx = player.pos.x + player.size.x / 2 + Math.cos(angle) * forward;
    const cy = player.pos.y + player.size.y / 2 + Math.sin(angle) * forward;
    const getEnemies = this.getEnemies;
    if (!getEnemies) return;

    const missile = this.acquire();
    if (!missile) return;

    missile.activate({
      originX: cx,
      originY: cy,
      spawnZ: player.pos.z + RUN_GAME_CONFIG.missileSpawnZ,
      aimAngle: angle,
      damage: entry.damage,
      aoeRadius: profile.aoeRadius ?? RUN_GAME_CONFIG.missileAoeRadius,
      owner: player,
      ownerVelX: player.vel.x,
      ownerVelY: player.vel.y,
      getEnemies,
    });
    this.active.add(missile);
  }

  release(missile: HomingMissileEntity): void {
    if (this.pool.includes(missile)) return;
    this.active.delete(missile);
    missile.finish();
    missile.remove();
    this.pool.push(missile);
  }

  releaseAll(): void {
    for (const missile of this.active) {
      missile.finish();
      missile.remove();
      if (!this.pool.includes(missile)) {
        this.pool.push(missile);
      }
    }
    this.active.clear();
  }

  private acquire(): HomingMissileEntity | null {
    const missile = this.pool.pop();
    if (missile) return missile;
    if (!this.gs || !this.catalog || !this.session || !this.instantHandler) return null;
    return this.gs.spawnEntity(HomingMissileEntity, STASH_X, STASH_Y, {
      homingMissilePool: this,
      projectileCatalog: this.catalog,
      session: this.session,
      instantHandler: this.instantHandler,
    }) as HomingMissileEntity;
  }
}
