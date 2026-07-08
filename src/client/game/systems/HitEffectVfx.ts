import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { HitEffectCatalog } from '../assets/HitEffectAssets.ts';
import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';
import HitEffectEntity, { type HitEffectVariant } from '../entities/HitEffectEntity.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';

const STASH_X = -9999;
const STASH_Y = -9999;
const POOL_SIZE = 24;

export class HitEffectVfx {
  private pool: HitEffectEntity[] = [];
  private active = new Set<HitEffectEntity>();
  private gs: GameState | null = null;
  private catalog: HitEffectCatalog | null = null;

  dispose(): void {
    this.releaseAll();
    this.pool = [];
    this.gs = null;
    this.catalog = null;
  }

  warmUp(gs: GameState, catalog: HitEffectCatalog): void {
    this.gs = gs;
    this.catalog = catalog;

    for (let i = 0; i < POOL_SIZE; i++) {
      const fx = gs.spawnEntity(HitEffectEntity, STASH_X, STASH_Y, {
        hitEffectVfx: this,
        hitEffectCatalog: catalog,
      }) as HitEffectEntity;
      this.release(fx);
    }
  }

  spawnAtEntity(enemy: EnemyEntity): void {
    const pad = ENEMY_CONFIG.hitEffectBodyPadding;
    const bodyW = enemy.size.x;
    const bodyH = enemy.size.y;
    const localX = pad + Math.random() * Math.max(1, bodyW - pad * 2);
    const localY = pad + Math.random() * Math.max(1, bodyH - pad * 2);
    const worldX = enemy.pos.x + localX;
    const worldY = enemy.pos.y + localY;
    const z = enemy.pos.z + ENEMY_CONFIG.hitEffectZOffset;
    const variant: HitEffectVariant = Math.random() < 0.5 ? 'attack1' : 'attack2';

    const fx = this.acquire();
    if (!fx) return;
    fx.activate(worldX, worldY, z, variant);
    this.active.add(fx);
  }

  release(fx: HitEffectEntity): void {
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

  private acquire(): HitEffectEntity | null {
    const fx = this.pool.pop();
    if (fx) return fx;
    if (!this.gs || !this.catalog) return null;
    return this.gs.spawnEntity(HitEffectEntity, STASH_X, STASH_Y, {
      hitEffectVfx: this,
      hitEffectCatalog: this.catalog,
    }) as HitEffectEntity;
  }
}
