import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';

export type EnemyMoveProfile = 'default' | 'zigzag' | 'rush' | 'cross';

export interface MovementSample {
  /** 통로 좌우(X) 흔들림 속도 보정 */
  lateralX: number;
  /** TPF 높이 — 0 이상만 (바닥 아래로 내려가지 않음) */
  zOffset: number;
  squashScale: number;
  /** 스프라이트 좌우 기울기 (라디안) */
  wobbleAngle: number;
}

export interface MovementUpdateContext {
  playerCenterX?: number;
  enemyCenterX?: number;
  /** 스폰·램프 반영 후 추적 속도 — cross·zigzag 강도 스케일 */
  moveSpeed?: number;
}

/** sin 기반 삼각파 — 지그재그 lateral */
function triangleWave(angle: number): number {
  return (2 / Math.PI) * Math.asin(Math.sin(angle));
}

/** 통로 X strafe + 위로 hop(양수 z) + squash — world Y 관통 없음 */
export class EnemyMovementBehavior {
  private profile: EnemyMoveProfile = 'default';

  strafeAmplitude: number;
  strafePeriod: number;
  strafePhase: number;
  hopCooldownMs: number;
  hopDurationMs: number;
  wobbleAmplitude: number;
  wobblePeriod: number;

  private readonly crossBiasRatio = 0.62;
  private elapsedMs = 0;
  private hopTimerMs = 0;
  private hopActiveMs = 0;

  constructor(seed = Math.random()) {
    const t = seed;
    this.strafeAmplitude =
      ENEMY_CONFIG.strafeAmplitudeMin +
      t * (ENEMY_CONFIG.strafeAmplitudeMax - ENEMY_CONFIG.strafeAmplitudeMin);
    this.strafePeriod =
      ENEMY_CONFIG.strafePeriodMin +
      (1 - t) * (ENEMY_CONFIG.strafePeriodMax - ENEMY_CONFIG.strafePeriodMin);
    this.strafePhase = t * Math.PI * 2;
    this.hopCooldownMs = ENEMY_CONFIG.jumpCooldownMs * (0.75 + t * 0.5);
    this.hopDurationMs = ENEMY_CONFIG.jumpDurationMs;
    this.hopTimerMs = t * this.hopCooldownMs;
    this.wobbleAmplitude = 0.08 + t * 0.12;
    this.wobblePeriod = 0.7 + (1 - t) * 0.8;
  }

  configure(profile: EnemyMoveProfile, seed = Math.random()): void {
    this.profile = profile;
    this.reset(seed);
    if (profile === 'zigzag') {
      this.strafeAmplitude = Math.min(
        ENEMY_CONFIG.strafeAmplitudeMax * 1.2,
        this.strafeAmplitude * 1.35,
      );
      this.strafePeriod = Math.max(ENEMY_CONFIG.strafePeriodMin * 0.72, this.strafePeriod * 0.78);
    }
  }

  getProfile(): EnemyMoveProfile {
    return this.profile;
  }

  reset(seed = Math.random()): void {
    this.elapsedMs = 0;
    this.hopActiveMs = 0;
    const t = seed;
    this.hopTimerMs = t * this.hopCooldownMs;
    this.strafeAmplitude =
      ENEMY_CONFIG.strafeAmplitudeMin +
      t * (ENEMY_CONFIG.strafeAmplitudeMax - ENEMY_CONFIG.strafeAmplitudeMin);
    this.strafePeriod =
      ENEMY_CONFIG.strafePeriodMin +
      (1 - t) * (ENEMY_CONFIG.strafePeriodMax - ENEMY_CONFIG.strafePeriodMin);
    this.strafePhase = t * Math.PI * 2;
  }

  update(deltaMs: number, ctx: MovementUpdateContext = {}): MovementSample {
    this.elapsedMs += deltaMs;
    const sec = this.elapsedMs / 1000;

    const speed = ctx.moveSpeed ?? ENEMY_CONFIG.moveSpeedMax;
    const lateralScale = Math.max(0.75, speed / ENEMY_CONFIG.moveSpeedMax);

    const strafeAngle = sec * ((Math.PI * 2) / this.strafePeriod) + this.strafePhase;
    let lateralX: number;
    switch (this.profile) {
      case 'zigzag':
        lateralX = triangleWave(strafeAngle) * this.strafeAmplitude * lateralScale;
        break;
      case 'cross': {
        const sinPart = Math.sin(strafeAngle) * this.strafeAmplitude * 0.45 * lateralScale;
        const px = ctx.playerCenterX;
        const ex = ctx.enemyCenterX;
        const crossBias = Math.max(36, speed * this.crossBiasRatio);
        const cross =
          px != null && ex != null && Math.abs(px - ex) > 4
            ? Math.sign(px - ex) * crossBias
            : 0;
        lateralX = sinPart + cross;
        break;
      }
      case 'rush':
        lateralX = Math.sin(strafeAngle) * this.strafeAmplitude * 0.55 * lateralScale;
        break;
      case 'default':
      default:
        lateralX = Math.sin(strafeAngle) * this.strafeAmplitude * lateralScale;
        break;
    }

    const wobbleAngle =
      Math.sin(sec * ((Math.PI * 2) / this.wobblePeriod) + this.strafePhase * 1.7) *
      this.wobbleAmplitude;

    this.hopTimerMs += deltaMs;
    if (this.hopActiveMs <= 0 && this.hopTimerMs >= this.hopCooldownMs) {
      this.hopActiveMs = this.hopDurationMs;
      this.hopTimerMs = 0;
    }

    let zOffset = 0;
    let squashScale = 1;
    if (this.hopActiveMs > 0) {
      this.hopActiveMs = Math.max(0, this.hopActiveMs - deltaMs);
      const t = 1 - this.hopActiveMs / this.hopDurationMs;
      const wave = Math.sin(t * Math.PI);
      zOffset = wave * ENEMY_CONFIG.jumpDepth;
      squashScale = 1 - (1 - wave) * 0.14 + wave * 0.1;
    } else {
      const bob = (Math.sin(sec * 4 + this.strafePhase) + 1) * 0.5;
      zOffset = bob * ENEMY_CONFIG.bobDepth;
      squashScale = 1 - bob * 0.06;
    }

    return { lateralX, zOffset, squashScale, wobbleAngle };
  }
}
