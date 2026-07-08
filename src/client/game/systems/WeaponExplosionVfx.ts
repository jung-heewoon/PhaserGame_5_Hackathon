import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { WeaponExplosionCatalog } from '../assets/WeaponExplosionAssets.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import WeaponExplosionEntity from '../entities/WeaponExplosionEntity.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export class WeaponExplosionVfx {
  private pool: WeaponExplosionEntity[] = [];
  private active = new Set<WeaponExplosionEntity>();
  private gs: GameState | null = null;
  private catalog: WeaponExplosionCatalog | null = null;

  dispose(): void {
    this.releaseAll();
    this.pool = [];
    this.gs = null;
    this.catalog = null;
  }

  warmUp(gs: GameState, catalog: WeaponExplosionCatalog): void {
    this.gs = gs;
    this.catalog = catalog;

    for (let i = 0; i < RUN_GAME_CONFIG.weaponExplosionPoolSize; i++) {
      const fx = gs.spawnEntity(WeaponExplosionEntity, STASH_X, STASH_Y, {
        weaponExplosionVfx: this,
        weaponExplosionCatalog: catalog,
      }) as WeaponExplosionEntity;
      this.release(fx);
    }
  }

  spawnMissile(worldX: number, worldY: number, z: number): void {
    this.spawnAt(worldX, worldY, z, 'missile');
  }

  spawnNuclear(worldX: number, worldY: number, z: number): void {
    this.spawnAt(worldX, worldY, z, 'nuclear');
  }

  release(fx: WeaponExplosionEntity): void {
    if (this.pool.includes(fx)) return;

    this.active.delete(fx);
    fx.finish();
    fx.remove();
    this.pool.push(fx);
  }

  releaseAll(): void {
    for (const fx of this.active) {
      fx.finish();
      fx.remove();
      if (!this.pool.includes(fx)) {
        this.pool.push(fx);
      }
    }
    this.active.clear();
  }

  private spawnAt(
    worldX: number,
    worldY: number,
    z: number,
    variant: 'missile' | 'nuclear',
  ): void {
    const fx = this.acquire();
    if (!fx) return;
    fx.activate(worldX, worldY, z, variant);
    this.active.add(fx);
  }

  private acquire(): WeaponExplosionEntity | null {
    const fx = this.pool.pop();
    if (fx) return fx;
    if (!this.gs || !this.catalog) return null;
    return this.gs.spawnEntity(WeaponExplosionEntity, STASH_X, STASH_Y, {
      weaponExplosionVfx: this,
      weaponExplosionCatalog: this.catalog,
    }) as WeaponExplosionEntity;
  }
}
