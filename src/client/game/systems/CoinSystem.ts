import { COIN_CONFIG } from '../config/CoinConfig.ts';

/** 이번 런 코인 총량. 처치 시 로직상 즉시 가산(선반영), HUD 표시는 연출로 따라붙음. */
export class CoinSystem {
  private total = 0;

  reset(): void {
    this.total = 0;
  }

  get coins(): number {
    return this.total;
  }

  /** 처치 보상 롤 + 즉시 가산, 연출용 amount 반환 */
  rollDropAmount(elapsedRunMs = 0): number {
    const elapsedSec = elapsedRunMs / 1000;
    const { minDrop, maxDrop, timeBonusPerMinute, timeBonusMax } = COIN_CONFIG;
    const span = Math.max(0, maxDrop - minDrop);
    const base = minDrop + Math.floor(Math.random() * (span + 1));
    const bonus = Math.min(timeBonusMax, Math.floor(elapsedSec / 60) * timeBonusPerMinute);
    const amount = base + bonus;
    this.total += amount;
    return amount;
  }

  /** 고정 보상 가산 (보스 상자 등) */
  addAmount(amount: number): void {
    if (amount <= 0) return;
    this.total += amount;
  }
}
