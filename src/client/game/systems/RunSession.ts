import { RUN_GAME_CONFIG } from '../config/RunGameConfig.ts';
import { crazyGamesLifecycle } from '../platform/crazygames/CrazyGamesLifecycle.ts';

/** 게임플레이이 멈춘 이유 — null이면 질주 중 */
export type RunFreezeReason = 'yatzy' | 'dead' | 'settings' | 'bossReward' | 'tutorial';
export class RunSession {
  freezeReason: RunFreezeReason | null = null;
  /** 사망 후 재시작 전까지 팝업·unfreeze 차단 */
  playerDead = false;
  ammoDepletionHandled = false;
  /** 야찌 팝업이 열려 있을 때 보스 상자 보상을 지연 */
  pendingBossReward = false;
  /** 이번 런에서 처치한 보스 수 — 스폰 패턴 리롤·통계 */
  bossClearCount = 0;
  onPlayerDeath: (() => void) | null = null;
  /** 누적 질주 거리 (월드 shift와 무관, 리셋 안 함) */
  runDistance = 0;
  /** 적용된 Y shift 누적 */
  totalWorldShift = 0;
  /** 이번 프레임에 WorldScroller가 shift 했는지 — SpawnDirector 스킵용 */
  worldShiftedThisFrame = false;
  /** 생존 점수 (살아 있는 동안 1초당 +1) */
  survivalScore = 0;
  /** 이번 런에서 처치한 적 수 */
  enemyKills = 0;
  /** freeze 제외 런 경과 시간 (ms) — 몬스터 순환·체력 스케일 */
  runElapsedMs = 0;
  private scoreAccumulatorMs = 0;

  /** 야찌·사망 등으로 월드 시뮬레이션(이동·스폰·전투)을 멈출지 */
  get isGameplayFrozen(): boolean {
    return this.freezeReason !== null;
  }

  /** freeze 중 0 — gameplay 시뮬·수명·타이머 전용 delta */
  simDeltaMs(rawDeltaMs: number): number {
    return this.isGameplayFrozen ? 0 : rawDeltaMs;
  }

  /** freeze 중 0 — TPF context.tick 대신 gameplay 이동·수명 계산용 */
  simTickSec(rawTickSec: number): number {
    return this.isGameplayFrozen ? 0 : rawTickSec;
  }

  /** 탭 숨김·복귀 등으로 delta가 커질 때 gameplay 시뮬 스파이크 방지 */
  clampFrameDeltaMs(rawDeltaMs: number): number {
    return Math.min(rawDeltaMs, RUN_GAME_CONFIG.maxFrameDeltaMs);
  }

  freeze(reason: RunFreezeReason): void {
    if (this.playerDead && reason !== 'dead') return;
    const wasActive = this.freezeReason === null;
    this.freezeReason = reason;
    if (wasActive) {
      crazyGamesLifecycle.notifyFreeze(reason);
    }
  }

  unfreeze(): void {
    if (this.playerDead) return;
    if (this.freezeReason === null) return;
    const reason = this.freezeReason;
    this.freezeReason = null;
    crazyGamesLifecycle.notifyUnfreeze(reason);
  }

  /** 플레이어 사망 — 보상·야찌 등 후속 팝업 차단 */
  markPlayerDead(): void {
    if (this.playerDead) return;
    this.playerDead = true;
    this.pendingBossReward = false;
    this.ammoDepletionHandled = true;
    this.freeze('dead');
  }

  reset(): void {
    this.freezeReason = null;
    this.playerDead = false;
    this.ammoDepletionHandled = false;
    this.pendingBossReward = false;
    this.runDistance = 0;
    this.totalWorldShift = 0;
    this.worldShiftedThisFrame = false;
    this.survivalScore = 0;
    this.enemyKills = 0;
    this.bossClearCount = 0;
    this.scoreAccumulatorMs = 0;
    this.runElapsedMs = 0;
  }

  addScore(amount: number): void {
    if (amount > 0) this.survivalScore += amount;
  }

  addKill(): void {
    this.enemyKills += 1;
  }

  /** 플레이어 생존 + unfrozen 시 런 시간·점수 누적 */
  tickRunProgress(deltaMs: number, playerAlive: boolean): void {
    if (!playerAlive || this.isGameplayFrozen) return;
    this.runElapsedMs += deltaMs;
    this.scoreAccumulatorMs += deltaMs;
    while (this.scoreAccumulatorMs >= 1000) {
      this.scoreAccumulatorMs -= 1000;
      this.survivalScore += 1;
    }
  }

  beginFrame(): void {
    this.worldShiftedThisFrame = false;
  }

  markWorldShifted(shift: number): void {
    this.totalWorldShift += shift;
    this.worldShiftedThisFrame = true;
  }
}
