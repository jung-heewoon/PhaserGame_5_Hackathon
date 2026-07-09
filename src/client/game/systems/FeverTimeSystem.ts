import { TOMBSTONE_CONFIG } from '../config/TombstoneConfig.ts';

/** 비석 습득 후 피버타임 — 무한 탄창 + 공격속도 +30% + 황금 총 연출 */
export class FeverTimeSystem {
  private active = false;
  private remainingMs = 0;
  private warnPhase = false;
  private blinkAccumulatorMs = 0;
  private blinkOn = false;
  private onChange: ((active: boolean, warn: boolean, blinkOn: boolean) => void) | null = null;

  get isActive(): boolean {
    return this.active;
  }

  get isWarning(): boolean {
    return this.warnPhase;
  }

  get isBlinkOn(): boolean {
    return this.blinkOn;
  }

  get remainingSec(): number {
    return this.active ? Math.ceil(this.remainingMs / 1000) : 0;
  }

  setOnChange(listener: ((active: boolean, warn: boolean, blinkOn: boolean) => void) | null): void {
    this.onChange = listener;
  }

  start(totalPips: number): void {
    const sec = Math.max(2, totalPips * TOMBSTONE_CONFIG.feverSecPerPip);
    this.active = true;
    this.remainingMs = sec * 1000;
    this.warnPhase = false;
    this.blinkOn = false;
    this.blinkAccumulatorMs = 0;
    this.emit();
  }

  reset(): void {
    this.active = false;
    this.remainingMs = 0;
    this.warnPhase = false;
    this.blinkOn = false;
    this.blinkAccumulatorMs = 0;
    this.emit();
  }

  tick(deltaMs: number): void {
    if (!this.active) return;
    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);

    const warn = this.remainingMs > 0 && this.remainingMs <= TOMBSTONE_CONFIG.feverWarnBeforeMs;
    if (warn) {
      this.blinkAccumulatorMs += deltaMs;
      const interval = this.remainingMs < 1200 ? 80 : 140;
      if (this.blinkAccumulatorMs >= interval) {
        this.blinkAccumulatorMs = 0;
        this.blinkOn = !this.blinkOn;
      }
    } else {
      this.blinkOn = false;
      this.blinkAccumulatorMs = 0;
    }

    if (warn !== this.warnPhase || this.blinkOn) {
      this.warnPhase = warn;
      this.emit();
    }

    if (this.remainingMs <= 0) {
      this.reset();
    }
  }

  private emit(): void {
    this.onChange?.(this.active, this.warnPhase, this.blinkOn);
  }
}

export const feverTimeSystem = new FeverTimeSystem();
