import { BULLET_PICKUP_CONFIG } from '../config/BulletPickupConfig.ts';
import { HEART_PICKUP_FRAME_PX } from '../assets/HeartPickupAssets.ts';
import { randomPickupSpawnX, RUN_GAME_CONFIG, spawnAheadY } from '../config/RunGameConfig.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import { computeEnemyHealth } from './EnemyHealthScaling.ts';
import { rollEnemyMoveSpeed } from './EnemyMoveSpeedScaling.ts';
import {
  getBatchAbsoluteCap,
  getEnemiesPerBatch,
  getEnemyBatchIntervalMs,
} from './EnemySpawnBatch.ts';
import { buildBatchSpawnSlots, isValidEnemySpawnY } from './EnemySpawnLayout.ts';
import { getSpawnWave, type SpawnWaveMod } from './EnemySpawnWave.ts';
import { getSpawnPool, pickEnemyType } from './EnemySpawnRotation.ts';
import { SpawnPatternDirector } from './SpawnPatternDirector.ts';
import type { EntityPool } from './EntityPool.ts';
import type { GameRunState } from './GameRunState.ts';
import type { RunSession } from './RunSession.ts';

export class SpawnDirector {
  private diceSpawnElapsedMs = 0;
  private heartSpawnElapsedMs = 0;
  private bulletSpawnElapsedMs = 0;
  private enemyBatchElapsedMs = 0;
  private enemyBatchIndex = 0;
  private readonly patternDirector = new SpawnPatternDirector();
  private readonly getPlayer: () => RunnerPlayerEntity | null;
  private readonly session: RunSession;
  private readonly gameRunState: GameRunState;
  private readonly entityPool: EntityPool;

  private readonly getEnemySpawnBlocked: () => boolean;

  constructor(
    getPlayer: () => RunnerPlayerEntity | null,
    session: RunSession,
    gameRunState: GameRunState,
    entityPool: EntityPool,
    getEnemySpawnBlocked: () => boolean = () => false,
  ) {
    this.getPlayer = getPlayer;
    this.session = session;
    this.gameRunState = gameRunState;
    this.entityPool = entityPool;
    this.getEnemySpawnBlocked = getEnemySpawnBlocked;
    this.patternDirector.rerollDeck(0);
  }

  onBossClear(): void {
    const elapsedSec = this.session.runElapsedMs / 1000;
    this.patternDirector.rerollDeck(elapsedSec);
    this.session.bossClearCount += 1;
  }

  update(deltaMs: number): void {
    if (this.session.isGameplayFrozen) return;
    if (this.session.worldShiftedThisFrame) return;

    const player = this.getPlayer();
    if (!player || player.isDead) return;

    const simDelta = this.session.simDeltaMs(deltaMs);

    this.diceSpawnElapsedMs += simDelta;
    if (this.diceSpawnElapsedMs >= RUN_GAME_CONFIG.diceSpawnIntervalMs) {
      this.diceSpawnElapsedMs = 0;
      this.spawnDice(player);
    }

    this.heartSpawnElapsedMs += simDelta;
    if (this.heartSpawnElapsedMs >= RUN_GAME_CONFIG.heartSpawnIntervalMs) {
      this.heartSpawnElapsedMs = 0;
      this.spawnHeart(player);
    }

    this.bulletSpawnElapsedMs += simDelta;
    if (this.bulletSpawnElapsedMs >= RUN_GAME_CONFIG.bulletSpawnIntervalMs) {
      this.bulletSpawnElapsedMs = 0;
      this.spawnBullet(player);
    }

    this.enemyBatchElapsedMs += simDelta;
    const elapsed = this.session.runElapsedMs;
    const wave = getSpawnWave(elapsed);
    const batchIntervalMs = getEnemyBatchIntervalMs(elapsed, wave);
    if (this.enemyBatchElapsedMs >= batchIntervalMs) {
      this.enemyBatchElapsedMs = 0;
      this.spawnEnemyBatch(player, wave);
    }
  }

  private spawnBullet(player: RunnerPlayerEntity): void {
    const snap = this.gameRunState.snapshot;
    if (snap.isInfiniteAmmo) return;
    if (snap.currentAmmo >= (this.gameRunState.weaponEntry.maxAmmo ?? 0)) return;

    const spawnY = spawnAheadY(player.pos.y);
    if (spawnY >= player.pos.y - 32) return;

    const spawnX = randomPickupSpawnX(BULLET_PICKUP_CONFIG.hitboxWidthPx);
    this.entityPool.acquireBullet(spawnX, spawnY);
  }

  private spawnHeart(player: RunnerPlayerEntity): void {
    if (player.health >= RUN_GAME_CONFIG.playerMaxHealth) return;

    const spawnY = spawnAheadY(player.pos.y);
    if (spawnY >= player.pos.y - 32) return;

    const spawnX = randomPickupSpawnX(HEART_PICKUP_FRAME_PX);
    this.entityPool.acquireHeart(spawnX, spawnY);
  }

  private spawnDice(player: RunnerPlayerEntity): void {
    const spawnY = spawnAheadY(player.pos.y);
    if (spawnY >= player.pos.y - 32) return;

    const spawnX = randomPickupSpawnX(20);
    this.entityPool.acquireDice(spawnX, spawnY);
  }

  private spawnEnemyBatch(player: RunnerPlayerEntity, wave: SpawnWaveMod): void {
    if (this.getEnemySpawnBlocked()) return;

    const elapsed = this.session.runElapsedMs;
    const elapsedSec = elapsed / 1000;
    const pool = getSpawnPool(elapsed);
    let count = getEnemiesPerBatch(elapsed, wave);

    const resolved = this.patternDirector.resolveBatch(this.enemyBatchIndex, count);
    count = Math.max(
      1,
      Math.min(getBatchAbsoluteCap(elapsedSec), count + resolved.batchCountDelta),
    );

    const slotMods = this.patternDirector.buildSlotMods(count, resolved);
    const slots = buildBatchSpawnSlots(count, resolved.layout, player.pos.y, {
      flankSoft: resolved.flankSoft,
    });

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!;
      const mod = slotMods[i] ?? { speedMult: 1, hpMult: 1, moveProfile: undefined };
      if (!isValidEnemySpawnY(slot.y, player.pos.y)) continue;

      const typeId = pickEnemyType(pool);
      const baseHp = computeEnemyHealth(typeId, elapsed, wave.hpMult);
      const health = Math.max(1, Math.floor(baseHp * resolved.hpMult * mod.hpMult));
      const baseSpeed = rollEnemyMoveSpeed(elapsed);
      const moveSpeed = baseSpeed * resolved.speedMult * mod.speedMult;
      const moveProfile = mod.moveProfile ?? resolved.moveProfile;

      this.entityPool.acquireEnemy(slot.x, slot.y, {
        typeId,
        health,
        moveSpeed,
        moveProfile,
      });
    }

    this.enemyBatchIndex += 1;
  }
}
