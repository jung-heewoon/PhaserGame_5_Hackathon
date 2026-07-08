import type TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import type EnemyEntity from '../entities/EnemyEntity.ts';
import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';

export function enemyCenter(enemy: EnemyEntity): { x: number; y: number } {
  return {
    x: enemy.pos.x + enemy.size.x / 2,
    y: enemy.pos.y + enemy.size.y / 2,
  };
}

export function projectileHitsEnemy(
  px: number,
  py: number,
  hitRadius: number,
  enemy: EnemyEntity,
  enemyHitPad?: { x: number; y: number },
): boolean {
  const { x: ex, y: ey } = enemyCenter(enemy);
  const dx = px - ex;
  const dy = py - ey;
  const padX = enemyHitPad?.x ?? 0;
  const padY = enemyHitPad?.y ?? 0;
  const halfW = enemy.size.x / 2 + hitRadius + padX;
  const halfH = enemy.size.y / 2 + hitRadius + padY;
  return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
}

/** 총알류 ProjectileEntity 전용 — 적 피격 여유 + variant hitRadius */
export function bulletProjectileHitsEnemy(
  px: number,
  py: number,
  hitRadius: number,
  enemy: EnemyEntity,
): boolean {
  return projectileHitsEnemy(px, py, hitRadius, enemy, {
    x: RUN_GAME_CONFIG.projectileEnemyHitPadX,
    y: RUN_GAME_CONFIG.projectileEnemyHitPadY,
  });
}

export function enemiesInAoe(
  cx: number,
  cy: number,
  radius: number,
  enemies: EnemyEntity[],
): EnemyEntity[] {
  const r2 = radius * radius;
  return enemies.filter((enemy) => {
    if (enemy._killed) return false;
    const { x, y } = enemyCenter(enemy);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r2;
  });
}

export function enemiesOnBeam(
  originX: number,
  originY: number,
  angle: number,
  range: number,
  halfWidth: number,
  enemies: EnemyEntity[],
): EnemyEntity[] {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const perpX = -dirY;
  const perpY = dirX;
  const hits: EnemyEntity[] = [];

  for (const enemy of enemies) {
    if (enemy._killed) continue;
    const { x: ex, y: ey } = enemyCenter(enemy);
    const toX = ex - originX;
    const toY = ey - originY;
    const along = toX * dirX + toY * dirY;
    if (along < 0 || along > range) continue;
    const perpDist = Math.abs(toX * perpX + toY * perpY);
    const enemyHalf = Math.max(enemy.size.x, enemy.size.y) / 2;
    if (perpDist <= halfWidth + enemyHalf) {
      hits.push(enemy);
    }
  }

  return hits;
}

export function enemiesInRailBand(
  originX: number,
  originY: number,
  angle: number,
  range: number,
  halfWidth: number,
  enemies: EnemyEntity[],
): EnemyEntity[] {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const hits: EnemyEntity[] = [];

  for (const enemy of enemies) {
    if (enemy._killed) continue;
    const { x: ex, y: ey } = enemyCenter(enemy);
    const toX = ex - originX;
    const toY = ey - originY;
    const along = toX * dirX + toY * dirY;
    if (along < 0 || along > range) continue;
    const perpDist = Math.abs(ex - originX);
    const enemyHalf = enemy.size.x / 2;
    if (perpDist <= halfWidth + enemyHalf) {
      hits.push(enemy);
    }
  }

  return hits;
}

export function isOutOfRange(
  originX: number,
  originY: number,
  px: number,
  py: number,
  maxRange = RUN_GAME_CONFIG.projectileMaxRange,
): boolean {
  return Math.hypot(px - originX, py - originY) > maxRange;
}

export function applyDamageToEnemies(
  enemies: EnemyEntity[],
  damage: number,
  from: TPFEntity,
): void {
  for (const enemy of enemies) {
    if (enemy._killed) continue;
    enemy.receiveDamage(damage, from);
  }
}

/** 유도 미사일 초기 타겟: 전방 콘 내 최근접 → 없으면 전역 최근접 */
export function findHomingTarget(
  originX: number,
  originY: number,
  aimAngle: number,
  enemies: EnemyEntity[],
  coneHalfAngle = RUN_GAME_CONFIG.hitScanHalfAngle,
): EnemyEntity | null {
  let bestCone: EnemyEntity | null = null;
  let bestConeDist2 = Infinity;
  let bestAny: EnemyEntity | null = null;
  let bestAnyDist2 = Infinity;

  const dirX = Math.cos(aimAngle);
  const dirY = Math.sin(aimAngle);
  const cosLimit = Math.cos(coneHalfAngle);

  for (const enemy of enemies) {
    if (enemy._killed) continue;
    const { x, y } = enemyCenter(enemy);
    const dx = x - originX;
    const dy = y - originY;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < bestAnyDist2) {
      bestAnyDist2 = dist2;
      bestAny = enemy;
    }

    const dist = Math.sqrt(dist2);
    if (dist < 1) continue;
    const dot = (dx * dirX + dy * dirY) / dist;
    if (dot < cosLimit) continue;
    if (dist2 < bestConeDist2) {
      bestConeDist2 = dist2;
      bestCone = enemy;
    }
  }

  return bestCone ?? bestAny;
}
