import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { BeamFlashCatalog, BeamFlashVariant } from '../assets/ProjectileAssets.ts';
import BeamFlashEntity, {
  type BeamFlashBeamParams,
  type BeamFlashRailParams,
} from '../entities/BeamFlashEntity.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export class BeamFlashPool {
  private pool: BeamFlashEntity[] = [];
  private active = new Set<BeamFlashEntity>();
  private gs: GameState | null = null;
  private catalog: BeamFlashCatalog | null = null;

  dispose(): void {
    this.releaseAll();
    this.pool = [];
    this.gs = null;
    this.catalog = null;
  }

  warmUp(gs: GameState, catalog: BeamFlashCatalog): void {
    this.gs = gs;
    this.catalog = catalog;

    for (let i = 0; i < RUN_GAME_CONFIG.beamFlashPoolSize; i++) {
      const fx = gs.spawnEntity(BeamFlashEntity, STASH_X, STASH_Y, {
        beamFlashPool: this,
        beamFlashCatalog: catalog,
      }) as BeamFlashEntity;
      this.release(fx);
    }
  }

  spawn(worldX: number, worldY: number, z: number, variant: BeamFlashVariant): void {
    const fx = this.acquire();
    if (!fx) return;
    fx.activate(worldX, worldY, z, variant);
    this.active.add(fx);
  }

  spawnBeam(params: BeamFlashBeamParams): void {
    const fx = this.acquire();
    if (!fx) return;
    fx.activateBeam(params);
    this.active.add(fx);
  }

  spawnRail(params: BeamFlashRailParams): void {
    const fx = this.acquire();
    if (!fx) return;
    fx.activateRail(params);
    this.active.add(fx);
  }

  release(fx: BeamFlashEntity): void {
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

  private acquire(): BeamFlashEntity | null {
    const fx = this.pool.pop();
    if (fx) return fx;
    if (!this.gs || !this.catalog) return null;
    return this.gs.spawnEntity(BeamFlashEntity, STASH_X, STASH_Y, {
      beamFlashPool: this,
      beamFlashCatalog: this.catalog,
    }) as BeamFlashEntity;
  }
}
