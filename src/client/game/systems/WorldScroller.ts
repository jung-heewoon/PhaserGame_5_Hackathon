import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import type TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import {
  RUN_GAME_CONFIG,
  worldBandMinY,
} from '../config/RunGameConfig.ts';
import DicePickupEntity from '../entities/DicePickupEntity.ts';
import HeartPickupEntity from '../entities/HeartPickupEntity.ts';
import BulletPickupEntity from '../entities/BulletPickupEntity.ts';
import EnemyEntity from '../entities/EnemyEntity.ts';
import BossEntity from '../entities/BossEntity.ts';
import FireObstacleEntity from '../entities/FireObstacleEntity.ts';
import GuardianSpikeEntity from '../entities/GuardianSpikeEntity.ts';
import GuardianVolleyEntity from '../entities/GuardianVolleyEntity.ts';
import BringerBeamSlotEntity from '../entities/BringerBeamSlotEntity.ts';
import HitEffectEntity from '../entities/HitEffectEntity.ts';
import DamageNumberEntity from '../entities/DamageNumberEntity.ts';
import WeaponExplosionEntity from '../entities/WeaponExplosionEntity.ts';
import ProjectileEntity from '../entities/ProjectileEntity.ts';
import HomingMissileEntity from '../entities/HomingMissileEntity.ts';
import BeamFlashEntity from '../entities/BeamFlashEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import type { EntityPool } from './EntityPool.ts';
import type { RunSession } from './RunSession.ts';

/** 북쪽 밴드 경계에서 플레이어·동적 엔티티를 남쪽으로 일괄 shift */
export class WorldScroller {
  private readonly getGameState: () => GameState | null;
  private readonly getPlayer: () => RunnerPlayerEntity | null;
  private readonly session: RunSession;
  private readonly entityPool: EntityPool;

  constructor(
    getGameState: () => GameState | null,
    getPlayer: () => RunnerPlayerEntity | null,
    session: RunSession,
    entityPool: EntityPool,
  ) {
    this.getGameState = getGameState;
    this.getPlayer = getPlayer;
    this.session = session;
    this.entityPool = entityPool;
  }

  update(): void {
    const player = this.getPlayer();
    const gs = this.getGameState();
    if (!player || !gs || player.isDead) return;

    const bandMin = worldBandMinY();

    if (player.pos.y < bandMin) {
      this.cleanupOutOfBand(player.pos.y, gs);
      this.performShift(player, gs);
      this.cleanupOutOfBand(player.pos.y, gs);
      this.cullOffscreenLateralEnemies(player, gs);
      return;
    }

    this.cleanupOutOfBand(player.pos.y, gs);
    this.cullOffscreenLateralEnemies(player, gs);
  }

  private performShift(player: RunnerPlayerEntity, gs: GameState): void {
    const shift = RUN_GAME_CONFIG.trackRecycleSegmentPx;

    this.shiftEntityY(player, shift);

    for (const ent of gs.entities) {
      if (ent === player || ent._killed) continue;
      if (
        ent instanceof DicePickupEntity ||
        ent instanceof HeartPickupEntity ||
        ent instanceof BulletPickupEntity ||
        ent instanceof EnemyEntity ||
        ent instanceof BossEntity ||
        ent instanceof FireObstacleEntity ||
        ent instanceof GuardianSpikeEntity ||
        ent instanceof GuardianVolleyEntity ||
        ent instanceof BringerBeamSlotEntity ||
        ent instanceof DamageNumberEntity ||
        ent instanceof HitEffectEntity ||
        ent instanceof WeaponExplosionEntity ||
        ent instanceof ProjectileEntity ||
        ent instanceof HomingMissileEntity ||
        ent instanceof BeamFlashEntity
      ) {
        if (ent instanceof GuardianVolleyEntity) {
          ent.shiftWorldY(shift);
        } else {
          this.shiftEntityY(ent, shift);
        }
        if (ent instanceof HomingMissileEntity) {
          ent.shiftWorldY(shift);
        }
        if (ent instanceof ProjectileEntity) {
          ent.shiftWorldY(shift);
        }
      }
    }

    this.session.markWorldShifted(shift);
  }

  /** 화면에 안 보이는 측면에서 플레이어 옆으로 붙어 피격하는 것 방지 */
  private cullOffscreenLateralEnemies(player: RunnerPlayerEntity, gs: GameState): void {
    const pcx = player.pos.x + player.size.x / 2;
    const py = player.pos.y + player.size.y / 2;
    const halfW = RUN_GAME_CONFIG.enemyOffscreenDespawnHalfWidth;
    const yRange = RUN_GAME_CONFIG.enemyOffscreenDespawnYRange;

    for (const ent of gs.entities) {
      if (!(ent instanceof EnemyEntity) || ent instanceof BossEntity || ent._killed) continue;

      const ecx = ent.pos.x + ent.size.x / 2;
      const ecy = ent.pos.y + ent.size.y / 2;
      const dx = Math.abs(ecx - pcx);
      const dy = Math.abs(ecy - py);

      if (dy <= yRange && dx > halfW) {
        this.entityPool.releaseEnemy(ent);
      }
    }
  }

  private shiftEntityY(ent: TPFEntity, deltaY: number): void {
    ent.pos.y += deltaY;
    ent.last.y += deltaY;
    ent.updateQuad();
    if (ent.context.culledSectors) {
      ent.context.culledSectors.moveEntity(ent);
    }
  }

  private cleanupOutOfBand(playerY: number, gs: GameState): void {
    const behindLimit = playerY + RUN_GAME_CONFIG.trackCleanupBehindPx;
    const aheadLimit =
      playerY - RUN_GAME_CONFIG.spawnAheadDistance - RUN_GAME_CONFIG.spawnAheadCleanupMarginPx;

    for (const ent of gs.entities) {
      if (ent instanceof DicePickupEntity) {
        if (ent._killed) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseDice(ent);
        }
      } else if (ent instanceof HeartPickupEntity) {
        if (ent._killed) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseHeart(ent);
        }
      } else if (ent instanceof BulletPickupEntity) {
        if (ent._killed) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseBullet(ent);
        }
      } else if (ent instanceof EnemyEntity) {
        if (ent._killed) continue;
        if (ent instanceof BossEntity) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseEnemy(ent);
        }
      } else if (ent instanceof FireObstacleEntity) {
        if (ent._killed) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseFire(ent);
        }
      } else if (ent instanceof GuardianVolleyEntity) {
        if (ent._killed) continue;
        if (ent.isVolleyActive() && ent.pos.y > behindLimit) {
          this.entityPool.releaseGuardianVolley(ent);
        }
      } else if (ent instanceof GuardianSpikeEntity) {
        if (ent._killed || !ent.isSlotActive()) continue;
        // volley가 슬롯 수명 관리 — WorldScroller cull 제외
      } else if (ent instanceof BringerBeamSlotEntity) {
        if (ent._killed) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseBringerBeam(ent);
        }
      } else if (ent instanceof DamageNumberEntity) {
        if (!ent.isPlaying()) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseDamageNumber(ent);
        }
      } else if (ent instanceof HitEffectEntity) {
        if (!ent.isPlaying()) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseHitEffect(ent);
        }
      } else if (ent instanceof WeaponExplosionEntity) {
        if (!ent.isPlaying()) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseWeaponExplosion(ent);
        }
      } else if (ent instanceof ProjectileEntity) {
        if (!ent.isActive()) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseProjectile(ent);
        }
      } else if (ent instanceof HomingMissileEntity) {
        if (!ent.isActive()) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseHomingMissile(ent);
        }
      } else if (ent instanceof BeamFlashEntity) {
        if (!ent.isPlaying()) continue;
        if (ent.pos.y > behindLimit || ent.pos.y < aheadLimit) {
          this.entityPool.releaseBeamFlash(ent);
        }
      }
    }
  }
}
