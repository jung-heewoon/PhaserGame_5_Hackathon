import {
  applyWeeklyDefenseDebugOverrides,
  type WeeklyDefenseStatus,
} from '../../../shared/weeklyDefense.ts';

class WeeklyDefenseBootStateImpl {
  private status: WeeklyDefenseStatus | null = null;

  set(status: WeeklyDefenseStatus): void {
    this.status = applyWeeklyDefenseDebugOverrides(status);
  }

  get buffActive(): boolean {
    return this.status?.buffActive ?? false;
  }

  getStatus(): WeeklyDefenseStatus | null {
    return this.status;
  }
}

export const weeklyDefenseBootState = new WeeklyDefenseBootStateImpl();
