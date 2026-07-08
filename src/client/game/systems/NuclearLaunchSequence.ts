import type EnemyEntity from '../entities/EnemyEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import type { GunViewDom } from '../ui/GunViewDom.ts';
import type { InstantWeaponHandler } from './InstantWeaponHandler.ts';

export class NuclearLaunchSequence {
  private active = false;
  private onComplete: (() => void) | null = null;

  setOnComplete(callback: (() => void) | null): void {
    this.onComplete = callback;
  }

  isActive(): boolean {
    return this.active;
  }

  async start(
    player: RunnerPlayerEntity,
    damage: number,
    ammoRemaining: number,
    getEnemies: () => EnemyEntity[],
    gunView: GunViewDom,
    instantHandler: InstantWeaponHandler,
  ): Promise<void> {
    if (this.active) return;
    this.active = true;

    try {
      await gunView.playNuclearLaunch(() => {
        instantHandler.applyNuclearFieldDamage(player, damage, getEnemies());
      });

      if (ammoRemaining > 0) {
        await gunView.playNuclearReload();
      } else {
        gunView.finishNuclearAfterLastShot();
      }
    } finally {
      this.active = false;
      this.onComplete?.();
    }
  }
}
