import type { TombstoneRecord } from '../../../shared/tombstone.ts';
import { pickRandomDeathReasonId } from '../../../shared/tombstone.ts';
import { tombstoneClient } from '../platform/reddit/TombstoneClient.ts';
import type TombstonePickupEntity from '../entities/TombstonePickupEntity.ts';
import type { CoinSystem } from './CoinSystem.ts';
import { feverTimeSystem } from './FeverTimeSystem.ts';
import type { GameRunState } from './GameRunState.ts';
import type { RunSession } from './RunSession.ts';
import type { TombstoneDirector } from './TombstoneDirector.ts';
import { showTombstoneRewardModal } from '../ui/TombstoneRewardModalDom.ts';
import { spawnCoinBurst } from '../ui/CoinHudDom.ts';
import { GAME_DESIGN_WIDTH, GAME_DESIGN_HEIGHT } from '../config/GameDisplayConfig.ts';

export class TombstonePickupFlow {
  private busy = false;
  private readonly session: RunSession;
  private readonly director: TombstoneDirector;
  private readonly coinSystem: CoinSystem;
  private readonly gameRunState: GameRunState;

  constructor(
    session: RunSession,
    director: TombstoneDirector,
    coinSystem: CoinSystem,
    gameRunState: GameRunState,
  ) {
    this.session = session;
    this.director = director;
    this.coinSystem = coinSystem;
    this.gameRunState = gameRunState;
  }

  tryPending(playerY: number): void {
    if (!this.session.pendingTombstonePickup || this.busy) return;
    if (this.session.isGameplayFrozen) return;
    this.session.pendingTombstonePickup = false;
    const band = 48;
    const nearby = this.director.getActiveTombstones().find(
      (ent) => !ent.isOwn && ent.record && Math.abs(ent.pos.y - playerY) <= band,
    );
    if (nearby) {
      void this.onPickup(nearby);
    }
  }

  async onPickup(source: TombstonePickupEntity): Promise<void> {
    if (this.busy || !source.record) return;
    if (this.session.isGameplayFrozen && this.session.freezeReason !== 'tombstone') return;

    const playerY = source.pos.y;
    const merged = this.director.collectMergeBand(playerY, source);
    const records = merged
      .map((ent) => ent.record)
      .filter((r): r is TombstoneRecord => r !== null);
    if (records.length === 0) return;

    this.busy = true;
    this.session.freeze('tombstone');
    this.gameRunState.setFeverInfiniteAmmo(false);

    try {
      const result = await showTombstoneRewardModal(records);
      const usernames = records.map((r) => r.username);
      const claim = await tombstoneClient.claim(usernames);
      const bonus = claim.totalCoinBonus;
      if (bonus > 0) {
        this.coinSystem.addAmount(bonus);
        spawnCoinBurst(GAME_DESIGN_WIDTH / 2, GAME_DESIGN_HEIGHT * 0.35, bonus);
      }

      for (const ent of merged) {
        this.director.releaseTombstone(ent);
      }

      feverTimeSystem.start(result.totalPips);
      this.gameRunState.setFeverInfiniteAmmo(true);
    } catch (err) {
      console.warn('tombstone pickup flow failed', err);
      for (const ent of merged) {
        this.director.releaseTombstone(ent);
      }
    } finally {
      this.busy = false;
      if (this.session.freezeReason === 'tombstone') {
        this.session.unfreeze();
      }
    }
  }
}

export function pickDeathReasonForRun(): number {
  return pickRandomDeathReasonId();
}
