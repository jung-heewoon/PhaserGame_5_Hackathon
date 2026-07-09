import type GameState from 'twopointfive-phaser-3/src/twopointfive/game.ts';
import { spawnAheadY } from '../config/RunGameConfig.ts';
import {
  TOMBSTONE_CONFIG,
  tombstonePickupOverlapsPlayer,
  tombstoneVisualHeightPx,
} from '../config/TombstoneConfig.ts';
import TombstonePickupEntity from '../entities/TombstonePickupEntity.ts';
import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';
import type { TombstoneRecord } from '../../../shared/tombstone.ts';
import type { EntityPool } from './EntityPool.ts';
import type { RunSession } from './RunSession.ts';
import { tombstoneClient } from '../platform/reddit/TombstoneClient.ts';

export class TombstoneDirector {
  private readonly getPlayer: () => RunnerPlayerEntity | null;
  private readonly getGameState: () => GameState | null;
  private readonly session: RunSession;
  private readonly entityPool: EntityPool;
  private queue: TombstoneRecord[] = [];
  private me = '';
  private spawnedUsernames = new Set<string>();
  private loaded = false;

  constructor(
    getPlayer: () => RunnerPlayerEntity | null,
    getGameState: () => GameState | null,
    session: RunSession,
    entityPool: EntityPool,
  ) {
    this.getPlayer = getPlayer;
    this.getGameState = getGameState;
    this.session = session;
    this.entityPool = entityPool;
  }

  reset(): void {
    this.queue = [];
    this.me = '';
    this.spawnedUsernames.clear();
    this.loaded = false;
  }

  async hydrate(): Promise<void> {
    try {
      const data = await tombstoneClient.fetchTombstones();
      this.me = data.me;
      this.queue = [...data.tombstones].sort((a, b) => a.triggerMs - b.triggerMs);
      this.loaded = true;
    } catch (err) {
      console.warn('tombstone hydrate failed', err);
      this.me = '';
      this.queue = [];
      this.loaded = true;
    }
  }

  getActiveTombstones(): TombstonePickupEntity[] {
    const gs = this.getGameState();
    if (!gs) return [];
    const out: TombstonePickupEntity[] = [];
    for (const ent of gs.entities) {
      if (ent instanceof TombstonePickupEntity && !ent._killed && ent.record) {
        out.push(ent);
      }
    }
    return out;
  }

  collectNearbyAtPickup(
    playerPosY: number,
    playerSizeY: number,
  ): TombstonePickupEntity[] {
    const playerCy = playerPosY + playerSizeY / 2;
    const visualH = tombstoneVisualHeightPx();
    return this.getActiveTombstones().filter((ent) => {
      if (ent.isOwn || !ent.record) return false;
      const tombCy = ent.pos.y + visualH / 2;
      return Math.abs(tombCy - playerCy) <= TOMBSTONE_CONFIG.mergeBandPx;
    });
  }

  findPickupTrigger(
    playerPosY: number,
    playerSizeY: number,
  ): TombstonePickupEntity[] {
    return this.getActiveTombstones().filter((ent) => {
      if (ent.isOwn || !ent.record || ent.collecting) return false;
      return tombstonePickupOverlapsPlayer(ent.pos.y, playerPosY, playerSizeY);
    });
  }

  getPlayerEntity(): RunnerPlayerEntity | null {
    return this.getPlayer();
  }

  update(): void {
    if (!this.loaded) return;
    if (this.session.isGameplayFrozen) return;
    if (this.session.worldShiftedThisFrame) return;

    const player = this.getPlayer();
    if (!player || player.isDead) return;

    while (this.queue.length > 0 && this.session.runElapsedMs >= this.queue[0]!.triggerMs) {
      const next = this.queue.shift()!;
      if (this.spawnedUsernames.has(next.username)) continue;
      this.spawnTombstone(next);
    }
  }

  private spawnTombstone(record: TombstoneRecord): void {
    const player = this.getPlayer();
    if (!player) return;

    const spawnY = spawnAheadY(player.pos.y);
    if (spawnY >= player.pos.y - 32) return;

    const isOwn = record.username === this.me;
    const ent = this.entityPool.acquireTombstone(spawnY, record, isOwn);
    if (!ent) return;
    this.spawnedUsernames.add(record.username);
  }

  releaseTombstone(ent: TombstonePickupEntity): void {
    this.entityPool.releaseTombstone(ent);
  }
}
