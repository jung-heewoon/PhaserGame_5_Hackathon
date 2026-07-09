import type { TombstoneRecord } from '../../../shared/tombstone.ts';
import { pickRandomDeathReasonId, tombstoneCoinBonus } from '../../../shared/tombstone.ts';
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
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';

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

  pollPlayerPickup(player: RunnerPlayerEntity | null): void {
    if (!player || player.isDead || this.busy) return;
    if (this.session.isGameplayFrozen && this.session.freezeReason !== 'tombstone') return;

    if (this.session.pendingTombstonePickup) {
      this.session.pendingTombstonePickup = false;
    }

    const triggers = this.director.findPickupTrigger(player.pos.y, player.size.y);
    if (triggers.length === 0) return;

    const source = triggers[0]!;
    source.collecting = true;
    void this.onPickup(source, player);
  }

  tryPending(player: RunnerPlayerEntity | null): void {
    if (!this.session.pendingTombstonePickup || this.busy) return;
    this.pollPlayerPickup(player);
  }

  async onPickup(source: TombstonePickupEntity, player?: RunnerPlayerEntity): Promise<void> {
    if (this.busy || !source.record) {
      source.collecting = false;
      return;
    }
    if (this.session.isGameplayFrozen && this.session.freezeReason !== 'tombstone') {
      source.collecting = false;
      return;
    }

    const playerEntity = player ?? this.director.getPlayerEntity();
    const playerY = playerEntity?.pos.y ?? source.pos.y;
    const playerSizeY = playerEntity?.size.y ?? 28;
    const merged = this.director.collectNearbyAtPickup(playerY, playerSizeY);
    for (const ent of merged) {
      ent.collecting = true;
    }
    const records = merged
      .map((ent) => ent.record)
      .filter((r): r is TombstoneRecord => r !== null);
    if (records.length === 0) {
      for (const ent of merged) {
        ent.collecting = false;
      }
      return;
    }

    this.busy = true;
    this.session.freeze('tombstone');
    this.gameRunState.setFeverInfiniteAmmo(false);

    try {
      const result = await showTombstoneRewardModal(records);

      for (const ent of merged) {
        this.director.releaseTombstone(ent);
      }

      if (this.session.freezeReason === 'tombstone') {
        this.session.unfreeze();
      }

      feverTimeSystem.start(result.totalPips);
      this.gameRunState.setFeverInfiniteAmmo(true);

      void this.applyClaimBonus(records);
    } catch (err) {
      console.warn('tombstone pickup flow failed', err);
      for (const ent of merged) {
        ent.collecting = false;
        this.director.releaseTombstone(ent);
      }
      if (this.session.freezeReason === 'tombstone') {
        this.session.unfreeze();
      }
    } finally {
      this.busy = false;
    }
  }

  private async applyClaimBonus(records: TombstoneRecord[]): Promise<void> {
    const usernames = records.map((r) => r.username);
    let bonus = records.reduce(
      (sum, record) => sum + tombstoneCoinBonus(record.coinsAtDeath),
      0,
    );
    try {
      const claim = await tombstoneClient.claim(usernames);
      bonus = claim.totalCoinBonus;
    } catch (claimErr) {
      console.warn('tombstone claim failed — local bonus fallback', claimErr);
    }
    if (bonus > 0) {
      this.coinSystem.addAmount(bonus);
      spawnCoinBurst(GAME_DESIGN_WIDTH / 2, GAME_DESIGN_HEIGHT * 0.35, bonus);
    }
  }
}

export function pickDeathReasonForRun(): number {
  return pickRandomDeathReasonId();
}
