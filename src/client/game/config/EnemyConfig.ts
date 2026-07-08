import { ENEMY_FRAME_HEIGHT, ENEMY_FRAME_WIDTH, ENEMY_SPRITE_COUNT } from '../assets/EnemyAssets.ts';

export const ENEMY_CONFIG = {
  spriteCount: ENEMY_SPRITE_COUNT,
  frameWidth: ENEMY_FRAME_WIDTH,
  frameHeight: ENEMY_FRAME_HEIGHT,
  displayScale: 3,
  walkAnimFps: 8,
  spawnRotationCycleMs: 30_000,
  /** 배치 스폰 간격(ms) — start→min으로 elapsed에 따라 보간 */
  enemyBatchIntervalStartMs: 1_900,
  enemyBatchIntervalMinMs: 1_250,
  enemyBatchIntervalRampSec: 300,
  /** 배치당 시작 마릿수 */
  enemiesPerBatchStart: 2,
  /** N초마다 배치 마릿수 +1 */
  enemiesPerBatchStepSec: 30,
  enemiesPerBatchMax: 7,
  /**
   * 배치당 절대 상한(base+웨이브 합산 후) — waypoint 선형 보간.
   * 2분30초~5분 swarm 9 유지 → 10분에 10까지 완만 상승(5~6분 10마리 스파이크 방지).
   */
  spawnBatchAbsoluteCapWaypoints: [
    { sec: 150, cap: 9 },
    { sec: 300, cap: 9 },
    { sec: 420, cap: 9 },
    { sec: 600, cap: 10 },
  ],
  /** 수량 상한 정체 이후 체력 추가 램프 시작(초) */
  healthPostCapStartSec: 360,
  /** 상한 이후 체력 시간 배율 — 초당 선형 증가(무한, 완만) */
  healthPostCapScalePerSec: 0.0012,
  /** 배치 내 몬스터 Y 간격 (북쪽으로 흩뿌림) */
  enemyBatchSpreadYPx: 44,
  /** 50s 웨이브 — swarm / normal / breather */
  spawnWaveCycleSec: 50,
  spawnWaveSwarmEndSec: 18,
  spawnWaveNormalEndSec: 32,
  spawnWaveSwarmCountDelta: 2,
  spawnWaveSwarmHpMult: 0.72,
  spawnWaveBreatherCountDelta: -1,
  spawnWaveBreatherIntervalBonusMs: 350,
  /** 5분 이후 웨이브 추가 압박 */
  spawnWaveLateStartSec: 300,
  spawnWaveLateSwarmCountBonus: 1,
  spawnWaveLateBreatherIntervalBonusMs: 300,
  /** 초반 1마리 체력 = full × start → elapsed 후 1.0 (easeIn) */
  earlyHealthScaleStart: 0.32,
  earlyHealthScaleEndSec: 210,
  /** 초반 HP 상한 — DEFAULT_PISTOL(14) 기준 원샷 (초) */
  earlyHealthCap: 14,
  earlyHealthCapUntilSec: 150,
  /** cap 해제 후 14→fullHp 완만 상승 구간 끝 (초) */
  earlyHealthSoftCapEndSec: 210,
  /** lane_narrow: 통로 폭 대비 X 밴드 비율 */
  laneNarrowBandRatio: 0.22,
  /** wide_front: 통로 폭 사용 비율 */
  laneWideSpreadRatio: 0.55,
  /** flank/surround: 벽 쪽 inset 비율 */
  flankSideInsetRatio: 0.12,
  /** typeId 기본 체력 = base + typeId * perType */
  healthBase: 20,
  healthPerType: 4,
  /** elapsedSec당 체력 배율 — easeIn ramp 기준 최대 기여 초 */
  healthTimeScalePerSec: 0.0045,
  healthTimeScaleRampSec: 300,
  /** 이동속도 최고값 (램프 완료 후 min~max) */
  moveSpeedMin: 70,
  moveSpeedMax: 110,
  /** 초반 속도 = 최고속 × start (거의 정지) → 후반까지 easeIn ramp */
  moveSpeedEarlyScaleStart: 0.08,
  moveSpeedRampSec: 390,
  hitFlashMs: 260,
  hitPulseMs: 140,
  hitPulseScale: 1.32,
  /** tex×(1+boost)로 실루엣만 흰색에 가깝게 — 빈 투명 영역은 discard */
  hitFlashBoost: 5,
  /** 총알 피격 VFX (Attack_1/2, 48×48×7) */
  hitEffectDisplayScale: 0.6,
  /** 프레임당 ms — TPF Animation frameTime(초) = ms / 1000 */
  hitEffectFrameMs: 32,
  hitEffectZOffset: 2,
  /** 몬스터 스프라이트 가장자리 여백(px) */
  hitEffectBodyPadding: 2,
  jumpCooldownMs: 1400,
  jumpDurationMs: 520,
  jumpDepth: 14,
  /** idle bob — 항상 >= 0 */
  bobDepth: 5,
  strafeAmplitudeMin: 28,
  strafeAmplitudeMax: 56,
  strafePeriodMin: 0.9,
  strafePeriodMax: 1.6,
} as const;

export function enemyHitboxWidth(): number {
  return ENEMY_CONFIG.frameWidth;
}

export function enemyHitboxHeight(): number {
  return ENEMY_CONFIG.frameHeight;
}
