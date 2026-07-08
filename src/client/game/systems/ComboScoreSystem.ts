import { COMBO_SCORE_CONFIG } from '../config/ComboScoreConfig.ts';
import { resetComboHud, updateComboHud } from '../ui/ComboHudDom.ts';
import type { RunSession } from './RunSession.ts';

export type ComboPhase = 'idle' | 'active' | 'settling';

export class ComboScoreSystem {
  onSettle: ((amount: number) => void) | null = null;

  private readonly session: RunSession;
  private killCount = 0;
  private multiplier = COMBO_SCORE_CONFIG.multiplierStart;
  private timerMs = 0;
  private phase: ComboPhase = 'idle';
  private pendingSettlement = 0;

  constructor(session: RunSession) {
    this.session = session;
  }

  get currentPhase(): ComboPhase {
    return this.phase;
  }

  reset(): void {
    this.killCount = 0;
    this.multiplier = COMBO_SCORE_CONFIG.multiplierStart;
    this.timerMs = 0;
    this.phase = 'idle';
    this.pendingSettlement = 0;
    resetComboHud();
  }

  onEnemyKill(): void {
    if (this.phase === 'settling') {
      this.startNewCombo();
    }

    this.killCount += 1;
    this.multiplier += COMBO_SCORE_CONFIG.multiplierStep;
    this.timerMs = COMBO_SCORE_CONFIG.windowMs;
    this.phase = 'active';
    this.syncHud();
  }

  tick(deltaMs: number, frozen: boolean): void {
    if (this.phase !== 'active' || frozen) return;

    this.timerMs -= deltaMs;
    if (this.timerMs <= 0) {
      this.timerMs = 0;
      this.beginSettlement();
      return;
    }

    this.syncHud();
  }

  flushOnDeath(): void {
    let amount = this.pendingSettlement;
    if (amount <= 0 && this.killCount > 0) {
      amount = this.computeSettlement();
    }

    resetComboHud();
    this.killCount = 0;
    this.multiplier = COMBO_SCORE_CONFIG.multiplierStart;
    this.timerMs = 0;
    this.pendingSettlement = 0;
    this.phase = 'idle';

    if (amount > 0) {
      this.session.addScore(amount);
    }
  }

  private beginSettlement(): void {
    if (this.killCount <= 0) {
      this.reset();
      return;
    }

    const amount = this.computeSettlement();
    this.phase = 'settling';
    this.pendingSettlement = amount;
    this.killCount = 0;
    this.multiplier = COMBO_SCORE_CONFIG.multiplierStart;
    this.timerMs = 0;

    if (amount > 0) {
      this.onSettle?.(amount);
    } else {
      this.pendingSettlement = 0;
      this.phase = 'idle';
    }
  }

  private startNewCombo(): void {
    this.killCount = 0;
    this.multiplier = COMBO_SCORE_CONFIG.multiplierStart;
    this.timerMs = 0;
    this.phase = 'idle';
  }

  onSettlementComplete(): void {
    this.pendingSettlement = 0;
    this.phase = 'idle';
  }

  private computeSettlement(): number {
    return Math.round(this.killCount * this.multiplier);
  }

  private syncHud(): void {
    const timerRatio =
      COMBO_SCORE_CONFIG.windowMs > 0 ? this.timerMs / COMBO_SCORE_CONFIG.windowMs : 0;

    updateComboHud({
      killCount: this.killCount,
      multiplier: this.multiplier,
      timerRatio,
      visible: this.phase === 'active' && this.killCount > 0,
    });
  }
}
