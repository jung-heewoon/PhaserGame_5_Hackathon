import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { ProjectileCatalog } from '../assets/ProjectileAssets.ts';
import type { WeaponFireProfile } from '../config/WeaponFireConfig.ts';
import type { HandWeaponEntry } from '../config/WeaponTable.ts';
import ProjectileEntity from '../entities/ProjectileEntity.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import type { InstantWeaponHandler } from './InstantWeaponHandler.ts';
import type { RunSession } from './RunSession.ts';
import type { DualFireSide } from '../ui/GunViewDom.ts';
import { aimAlignedMuzzlePoint } from './ProjectileSpawnOrigin.ts';
import { gunMuzzleForwardPx } from './GunMuzzleForward.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export class ProjectilePool {
  private pool: ProjectileEntity[] = [];
  private active = new Set<ProjectileEntity>();
  private gs: GameState | null = null;
  private catalog: ProjectileCatalog | null = null;
  private session: RunSession | null = null;
  private instantHandler: InstantWeaponHandler | null = null;
  private getEnemies: (() => EnemyEntity[]) | null = null;
  /** 듀얼 피스톨: 다음 발사 총구 (false=왼쪽, true=오른쪽) */
  private dualAlternateRight = false;
  private onDualFire: ((side: DualFireSide) => void) | null = null;

  setOnDualFire(callback: ((side: DualFireSide) => void) | null): void {
    this.onDualFire = callback;
  }

  dispose(): void {
    this.releaseAll();
    this.pool = [];
    this.gs = null;
    this.catalog = null;
    this.session = null;
    this.instantHandler = null;
    this.getEnemies = null;
    this.dualAlternateRight = false;
    this.onDualFire = null;
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
    this.dualAlternateRight = false;

    for (let i = 0; i < RUN_GAME_CONFIG.projectilePoolSize; i++) {
      const proj = gs.spawnEntity(ProjectileEntity, STASH_X, STASH_Y, {
        projectilePool: this,
        projectileCatalog: catalog,
        session,
        instantHandler,
      }) as ProjectileEntity;
      this.release(proj);
    }
  }

  spawnFromProfile(
    player: RunnerPlayerEntity,
    profile: WeaponFireProfile,
    entry: HandWeaponEntry,
  ): void {
    const baseAngle = player.aimAngle;
    const forwardBase = gunMuzzleForwardPx(profile);
    const speed = profile.speed ?? RUN_GAME_CONFIG.projectileSpeedPistol;
    const variant = profile.variant ?? 'pistol';
    const getEnemies = this.getEnemies;
    if (!getEnemies) return;

    const spawnOne = (originX: number, originY: number, angle: number) => {
      const proj = this.acquire();
      if (!proj) return;
      proj.activate({
        originX,
        originY,
        angle,
        speed,
        damage: entry.damage,
        variant,
        owner: player,
        aoeRadius: profile.aoeRadius,
        getEnemies,
      });
      this.active.add(proj);
    };

    switch (profile.delivery) {
      case 'projectile': {
        const { x, y } = aimAlignedMuzzlePoint(player, forwardBase);
        spawnOne(x, y, baseAngle);
        break;
      }
      case 'projectile_dual': {
        const offset = profile.dualOffsetX ?? RUN_GAME_CONFIG.dualPistolOffsetX;
        const sideX = this.dualAlternateRight ? offset : -offset;
        const firedSide = this.dualAlternateRight ? 'right' : 'left';
        this.dualAlternateRight = !this.dualAlternateRight;
        const { x, y } = aimAlignedMuzzlePoint(player, forwardBase, sideX);
        spawnOne(x, y, baseAngle);
        this.onDualFire?.(firedSide);
        break;
      }
      case 'projectile_multi': {
        const jitter = profile.spawnJitterPx ?? RUN_GAME_CONFIG.minigunSpawnJitterPx;
        const angleJitter = profile.angleJitterRad ?? RUN_GAME_CONFIG.minigunAngleJitterRad;
        const muzzles =
          profile.muzzleOffsets ?? RUN_GAME_CONFIG.minigunMuzzleOffsets;
        for (const muzzle of muzzles) {
          const { x, y } = aimAlignedMuzzlePoint(
            player,
            forwardBase - muzzle.y,
            muzzle.x,
          );
          const ox = x + (Math.random() * 2 - 1) * jitter;
          const oy = y + (Math.random() * 2 - 1) * jitter;
          const angle = baseAngle + (Math.random() * 2 - 1) * angleJitter;
          spawnOne(ox, oy, angle);
        }
        break;
      }
      case 'projectile_spread': {
        const count = profile.pelletCount ?? RUN_GAME_CONFIG.shotgunPelletCount;
        const spread = profile.spreadRad ?? RUN_GAME_CONFIG.shotgunSpreadRad;
        const { x, y } = aimAlignedMuzzlePoint(player, forwardBase);
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
          const angle = baseAngle + t * spread;
          spawnOne(x, y, angle);
        }
        break;
      }
      case 'projectile_scatter': {
        const jitter = profile.spawnJitterPx ?? RUN_GAME_CONFIG.minigunSpawnJitterPx;
        const angleJitter = profile.angleJitterRad ?? RUN_GAME_CONFIG.minigunAngleJitterRad;
        const { x, y } = aimAlignedMuzzlePoint(player, forwardBase);
        const ox = x + (Math.random() * 2 - 1) * jitter;
        const oy = y + (Math.random() * 2 - 1) * jitter;
        const angle = baseAngle + (Math.random() * 2 - 1) * angleJitter;
        spawnOne(ox, oy, angle);
        break;
      }
      case 'projectile_aoe': {
        const { x, y } = aimAlignedMuzzlePoint(player, forwardBase);
        spawnOne(x, y, baseAngle);
        break;
      }
      default:
        break;
    }
  }

  release(proj: ProjectileEntity): void {
    if (this.pool.includes(proj)) return;
    this.active.delete(proj);
    proj.finish();
    proj.remove();
    this.pool.push(proj);
  }

  releaseAll(): void {
    for (const proj of this.active) {
      proj.finish();
      proj.remove();
      if (!this.pool.includes(proj)) {
        this.pool.push(proj);
      }
    }
    this.active.clear();
  }

  private acquire(): ProjectileEntity | null {
    const proj = this.pool.pop();
    if (proj) return proj;
    if (!this.gs || !this.catalog || !this.session || !this.instantHandler) return null;
    return this.gs.spawnEntity(ProjectileEntity, STASH_X, STASH_Y, {
      projectilePool: this,
      projectileCatalog: this.catalog,
      session: this.session,
      instantHandler: this.instantHandler,
    }) as ProjectileEntity;
  }
}
