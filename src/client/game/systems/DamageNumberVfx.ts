import type Phaser from 'phaser';
import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import { DAMAGE_NUMBER_CONFIG } from '../config/DamageNumberConfig.ts';
import DamageNumberEntity from '../entities/DamageNumberEntity.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import type { RunSession } from './RunSession.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export interface DamageNumberAnchor {
  x: number;
  y: number;
  z: number;
}

export class DamageNumberVfx {
  private pool: DamageNumberEntity[] = [];
  private active = new Set<DamageNumberEntity>();
  private gs: GameState | null = null;
  private tpf: TwoPointFiveScenePlugin | null = null;
  private scene: Phaser.Scene | null = null;
  private session: RunSession | null = null;

  dispose(): void {
    this.releaseAll();
    this.pool = [];
    this.gs = null;
    this.tpf = null;
    this.scene = null;
    this.session = null;
  }

  warmUp(
    gs: GameState,
    tpf: TwoPointFiveScenePlugin,
    scene: Phaser.Scene,
    session: RunSession,
  ): void {
    this.gs = gs;
    this.tpf = tpf;
    this.scene = scene;
    this.session = session;

    for (let i = 0; i < DAMAGE_NUMBER_CONFIG.poolSize; i++) {
      const fx = gs.spawnEntity(DamageNumberEntity, STASH_X, STASH_Y, {
        damageNumberVfx: this,
        poolIndex: i,
        tpf,
        phaserScene: scene,
        session,
      }) as DamageNumberEntity;
      this.release(fx);
    }
  }

  spawnAtEntity(enemy: EnemyEntity, amount: number): void {
    if (amount <= 0) return;
    this.spawnAtAnchor(enemy.getDamageNumberAnchor(), amount, enemy);
  }

  spawnAtAnchor(
    anchor: DamageNumberAnchor,
    amount: number,
    followTarget: EnemyEntity | null = null,
  ): void {
    if (amount <= 0) return;

    const fx = this.acquire();
    if (!fx) return;
    fx.activateAt(anchor.x, anchor.y, anchor.z, amount, followTarget);
    this.active.add(fx);
  }

  release(fx: DamageNumberEntity): void {
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

  private acquire(): DamageNumberEntity | null {
    const fx = this.pool.pop();
    if (fx) return fx;
    if (!this.gs || !this.tpf || !this.scene || !this.session) return null;
    const poolIndex = this.pool.length + this.active.size;
    return this.gs.spawnEntity(DamageNumberEntity, STASH_X, STASH_Y, {
      damageNumberVfx: this,
      poolIndex,
      tpf: this.tpf,
      phaserScene: this.scene,
      session: this.session,
    }) as DamageNumberEntity;
  }
}
