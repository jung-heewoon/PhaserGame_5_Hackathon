import { fogRecycleTriggerY, fogSpawnAheadDistance, fogSpawnAheadJitterPx } from './FogConfig.ts';

export const RUN_GAME_CONFIG = {
  forwardSpeed: 220,
  strafeSpeed: 200,
  corridorTileMinX: 12,
  corridorTileMaxX: 19,
  tileSize: 64,
  /** 통로 타일 경계에서 안쪽으로 밀어넣는 여백 (벽 관통 방지) */
  corridorInnerMarginPx: 56,
  /**
   * 픽업(체력·총알·주사위) 전용 스폰 여백.
   * 통로 양끝 벽 사이드 타일이 한 칸(tileSize=64) 차지하므로, 스프라이트가
   * 벽에 겹치지 않도록 벽 두께 + 여유분만큼 안쪽으로 넣는다.
   */
  pickupSpawnMarginPx: 76,
  spawnAheadDistance: fogSpawnAheadDistance(),
  spawnAheadJitterPx: fogSpawnAheadJitterPx(),
  diceSpawnIntervalMs: 2200,
  heartSpawnIntervalMs: 8000,
  bulletSpawnIntervalMs: 6500,
  /** 탭 전환·최소화 후 복귀 시 delta spike 방지 (ms) */
  maxFrameDeltaMs: 100,
  heartPickupPoolSize: 8,
  bulletPickupPoolSize: 8,
  pickupRadius: 48,
  enemyContactRadius: 40,
  /** 플레이어 좌우(스트레이프 X) 피격 반폭 — 작을수록 화면 밖·옆에서 맞는 체감 감소 */
  playerContactHalfWidth: 6,
  /** 플레이어 앞뒤(런 방향 Y) 피격 반폭 (size.y/2=14 대신 사용) */
  playerContactHalfHeight: 2,
  /** 보스 본체 접촉만 — 일반 몬스터·스킬과 분리해 Y 판정 유지 */
  playerBossContactHalfHeight: 4,
  /**
   * 적(몬스터) 좌우 접촉 피격에 쓰는 적 반폭 (히트박스 size.x/2=8 대신 사용).
   * 작을수록 좌우 판정이 좁아져 화면 밖으로 밀려난 적이 데미지를 주지 않는다.
   * 보스는 BossEntity에서 자체 히트박스(size.x/2)를 유지한다.
   */
  enemyContactHalfWidthPx: 5,
  /**
   * 적(몬스터) 앞뒤(런 방향 Y) 접촉 피격에 쓰는 적 반폭 (히트박스 size.y/2=8 대신 사용).
   * 보스는 BossEntity에서 자체 히트박스(size.y/2)를 유지한다.
   */
  enemyContactHalfHeightPx: 2,
  enemyContactDamage: 1,
  /** 적 접촉 피격 후 무적 시간 (ms) — 매 프레임 check 중복 피해 방지 */
  playerContactIFrameMs: 1200,
  /** 피격 카메라 흔들림 */
  playerHitShakeDurationMs: 340,
  playerHitShakeAmplitudePx: 11,
  playerMaxHealth: 3,
  hitScanRange: 520,
  hitScanHalfAngle: 0.45,
  /** 투사체 풀 크기 (미니건 연사 대비) */
  projectilePoolSize: 96,
  beamFlashPoolSize: 16,
  weaponExplosionPoolSize: 8,
  projectileMaxRange: 520,
  projectileMaxLifetimeMs: 1200,
  /**
   * ProjectileEntity 전용 — 적 피격 AABB에 더할 X/Y 반폭 (px).
   * HomingMissile·빔·레일·핵에는 미적용.
   */
  projectileEnemyHitPadX: 10,
  projectileEnemyHitPadY: 12,
  projectileSpeedPistol: 720,
  projectileSpeedRevolver: 780,
  projectileSpeedDual: 700,
  projectileSpeedShotgun: 640,
  projectileSpeedMinigun: 680,
  projectileSpeedMissile: 380,
  shotgunPelletCount: 8,
  shotgunSpreadRad: 0.314,
  /** 듀얼 피스톨 좌/우 총구 월드 X 오프셋 (플레이어 중심 기준 px) — DOM 총구 불꽃과 동기 */
  dualPistolOffsetX: 16,
  minigunSpawnJitterPx: 2,
  minigunAngleJitterRad: 0.012,
  /** 미니건 4총구 클러스터 (중심 기준 px) */
  minigunMuzzleOffsets: [
    { x: -7, y: -4 },
    { x: 7, y: -4 },
    { x: -7, y: 4 },
    { x: 7, y: 4 },
  ],
  missileAoeRadius: 140,
  /** 유도 미사일 풀 (연사 무기보다 적음) */
  homingMissilePoolSize: 12,
  /** ── 유도 미사일 2단계 연출 ──
   * 코스트: 푸슉 하고 잠깐 천천히 부양하며 드리프트
   * 부스트: 목표를 향해 급추진하며 빠르게 쉭 */
  /** 코스트(부양) 지속 시간 (ms) */
  missileCoastMs: 340,
  /** 코스트 중 owner 속도 위에 더하는 느린 드리프트 속도 */
  missileCoastDriftSpeed: 70,
  /** 부스트 최고 속도 */
  missileHomingMaxSpeed: 660,
  /** 부스트 급가속도 (px/s^2) */
  missileBoostAccel: 1250,
  /** 코스트 중 약한 선회 (초당 rad) — 거의 발사 방향 유지 */
  missileCoastTurnRateRad: 1.0,
  /** 부스트 중 강한 유도 선회 (초당 rad) */
  missileBoostTurnRateRad: 6.2,
  /** 코스트 중 살짝 떠오르는 최대 높이 (월드 z) */
  missileArcPopHeight: 76,
  /** 부스트 후 목표 높이로 내려오는 시간 (ms) */
  missileArcDescendMs: 240,
  /** 플레이어 중심에서 전방(북쪽) 총구 오프셋 */
  missileSpawnForwardPx: 20,
  missileSpawnZ: 4,
  /** 적 스프라이트에 닿았을 때만 폭발 (직격 판정 여유 px) */
  missileHomingHitRadius: 4,
  missileHomingMaxLifetimeMs: 3200,
  /** 미사일 꼬리 트레일 */
  missileTrailMaxSegments: 12,
  missileTrailSpawnStepPx: 6,
  missileTrailDurationMs: 340,
  missileTrailSize: 10,
  /** 뉴클리어 폭발 — 플레이어 전방(화면 중앙) Y 오프셋 */
  nuclearExplosionAheadPx: 280,
  nuclearExplosionZ: 8,
  beamWidth: 14,
  railHalfWidth: 100,
  beamFlashDurationMs: 200,
  railFlashDurationMs: 340,
  explosionFlashDurationMs: 220,
  /** 2.5D 빔 경로 — 얇고 촘촘한 코어 */
  beamSegmentStepPx: 10,
  beamSegmentVisualSize: 16,
  beamGlowScale: 1.1,
  beamCoreVisualH: 4,
  /** 빔 주변 전기 스파크 */
  beamSparkStepPx: 20,
  beamSparkSpreadPx: 12,
  beamSparkSize: 6,
  beamSparkTexPx: 8,
  railSegmentStepPx: 26,
  railSegmentVisualH: 16,
  railCoreVisualH: 5,
  initialDiceCount: 0,
  yatzyDiceCost: 5,
  trackRecycleTriggerY: fogRecycleTriggerY(),
  trackRecycleSegmentPx: 1024,
  trackCleanupBehindPx: 96,
  /** cleanup: 플레이어 앞쪽 despawn 여유 */
  spawnAheadCleanupMarginPx: 200,
  /** 플레이어 Y 근처에서 화면 밖(좌우) X에 있으면 적 즉시 제거 */
  enemyOffscreenDespawnHalfWidth: 190,
  enemyOffscreenDespawnYRange: 150,
  entityPoolSize: 24,
  fireObstaclePoolSize: 48,
  guardianVolleyPoolSize: 3,
  guardianSpikePoolSize: 36,
  bringerBeamPoolSize: 24,
  bossPoolSize: 1,
} as const;

/** 월드 Y 재활용 밴드 [min, max) */
export function worldBandMinY(): number {
  return RUN_GAME_CONFIG.trackRecycleTriggerY;
}

export function worldBandMaxY(): number {
  return worldBandMinY() + RUN_GAME_CONFIG.trackRecycleSegmentPx;
}

export function wrapWorldY(y: number): number {
  const min = worldBandMinY();
  const max = worldBandMaxY();
  const span = max - min;
  if (y >= min && y < max) return y;
  return min + ((((y - min) % span) + span) % span);
}

export function spawnAheadY(playerY: number): number {
  const jitter = Math.random() * RUN_GAME_CONFIG.spawnAheadJitterPx;
  return playerY - RUN_GAME_CONFIG.spawnAheadDistance - jitter;
}

export function corridorWorldMinX(): number {
  return RUN_GAME_CONFIG.corridorTileMinX * RUN_GAME_CONFIG.tileSize;
}

export function corridorWorldMaxX(): number {
  return (RUN_GAME_CONFIG.corridorTileMaxX + 1) * RUN_GAME_CONFIG.tileSize;
}

/** 통로 내 최소 X (왼쪽 벽 안쪽) */
export function corridorInnerMinX(): number {
  return corridorWorldMinX() + RUN_GAME_CONFIG.corridorInnerMarginPx;
}

/** 엔티티 폭을 고려한 통로 내 최대 X (오른쪽 벽 안쪽) */
export function corridorInnerMaxX(entityWidth: number): number {
  return corridorWorldMaxX() - RUN_GAME_CONFIG.corridorInnerMarginPx - entityWidth;
}

export function clampToCorridorX(x: number, entityWidth = 28): number {
  const min = corridorInnerMinX();
  const max = corridorInnerMaxX(entityWidth);
  return Math.max(min, Math.min(max, x));
}

/** TPF updateQuad: 스프라이트 중심 = pos + hitbox/2 → 시각 좌측 가장자리 */
export function entityVisualLeftX(
  posX: number,
  hitboxWidth: number,
  visualWidth: number,
): number {
  return posX + hitboxWidth / 2 - visualWidth / 2;
}

/** 시각 좌측 가장자리가 targetLeftX가 되도록 pos.x 계산 */
export function posXFromVisualLeft(
  visualLeftX: number,
  hitboxWidth: number,
  visualWidth: number,
): number {
  return visualLeftX + visualWidth / 2 - hitboxWidth / 2;
}

/** 시각 폭 기준 통로 내 pos.x 클램프 (히트박스·스프라이트 폭 불일치 보정) */
export function clampPosXToCorridorVisual(
  posX: number,
  hitboxWidth: number,
  visualWidth: number,
): number {
  const minPos = posXFromVisualLeft(corridorInnerMinX(), hitboxWidth, visualWidth);
  const maxPos = posXFromVisualLeft(corridorInnerMaxX(visualWidth), hitboxWidth, visualWidth);
  return Math.max(minPos, Math.min(maxPos, posX));
}

/** 시각 폭 기준 통로 가로 균등 배치 — 각 슬롯의 시각 좌측 X */
export function corridorRowVisualLeftXs(slotCount: number, visualWidth: number): number[] {
  const minLeft = corridorInnerMinX();
  const maxLeft = corridorInnerMaxX(visualWidth);
  const span = maxLeft - minLeft;
  const xs: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    xs.push(slotCount > 1 ? minLeft + (span * i) / (slotCount - 1) : minLeft + span / 2);
  }
  return xs;
}

/** 시각 폭 기준 통로 가로 균등 배치 — TPF pos.x (히트박스 좌상단) */
export function corridorRowSlotPosXs(
  slotCount: number,
  visualWidth: number,
  hitboxWidth: number,
): number[] {
  return corridorRowVisualLeftXs(slotCount, visualWidth).map((left) =>
    posXFromVisualLeft(left, hitboxWidth, visualWidth),
  );
}

/** 스폰용 랜덤 X (통로 안쪽) */
export function randomCorridorSpawnX(entityWidth: number): number {
  const min = corridorInnerMinX();
  const max = corridorInnerMaxX(entityWidth);
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

/**
 * 픽업 전용 스폰 랜덤 X.
 * 통로 양끝 벽 사이드 타일과 겹치지 않도록 `pickupSpawnMarginPx`만큼 안쪽에서 스폰한다.
 */
export function randomPickupSpawnX(entityWidth: number): number {
  const margin = RUN_GAME_CONFIG.pickupSpawnMarginPx;
  const min = corridorWorldMinX() + margin;
  const max = corridorWorldMaxX() - margin - entityWidth;
  if (max <= min) return (min + max) / 2;
  return min + Math.random() * (max - min);
}
