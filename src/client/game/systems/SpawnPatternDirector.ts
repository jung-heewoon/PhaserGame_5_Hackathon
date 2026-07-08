import {
  EARLY_PATTERN_POOL,
  LATE_LAYOUT_POOL,
  LATE_MOVE_POOL,
  LATE_STAT_POOL,
  SPAWN_PATTERN_CONFIG,
  SPAWN_PATTERN_MODULES,
  type SpawnPatternModuleId,
} from '../config/SpawnPatternConfig.ts';
import type { EnemyBatchLayout } from './EnemySpawnLayout.ts';
import type { EnemyMoveProfile } from './EnemyMovementBehavior.ts';

export interface SlotSpawnMod {
  speedMult: number;
  hpMult: number;
  moveProfile?: EnemyMoveProfile;
}

export interface ResolvedSpawnBatch {
  layout: EnemyBatchLayout;
  flankSoft: boolean;
  moveProfile: EnemyMoveProfile;
  speedMult: number;
  hpMult: number;
  batchCountDelta: number;
  eliteSlot: boolean;
}

function deckKey(deck: readonly SpawnPatternModuleId[]): string {
  return [...deck].sort().join('|');
}

function pickWeightedId(pool: readonly SpawnPatternModuleId[]): SpawnPatternModuleId {
  let total = 0;
  for (const id of pool) {
    total += SPAWN_PATTERN_MODULES[id]?.weight ?? 0;
  }
  if (total <= 0) return pool[0] ?? 'layout_wide';

  let roll = Math.random() * total;
  for (const id of pool) {
    roll -= SPAWN_PATTERN_MODULES[id]?.weight ?? 0;
    if (roll <= 0) return id;
  }
  return pool[pool.length - 1] ?? 'layout_wide';
}

function pickEarlyDeck(excludeKey: string | null): SpawnPatternModuleId[] {
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = pickWeightedId(EARLY_PATTERN_POOL);
    const deck = [id];
    const key = deckKey(deck);
    if (key !== excludeKey) return deck;
  }
  return [EARLY_PATTERN_POOL[0] ?? 'layout_lane'];
}

function pickLateDeck(excludeKey: string | null): SpawnPatternModuleId[] {
  for (let attempt = 0; attempt < 16; attempt++) {
    const deck: SpawnPatternModuleId[] = [
      pickWeightedId(LATE_LAYOUT_POOL),
      pickWeightedId(LATE_MOVE_POOL),
    ];
    if (Math.random() < SPAWN_PATTERN_CONFIG.lateStatModuleChance) {
      deck.push(pickWeightedId(LATE_STAT_POOL));
    }
    if (deckKey(deck) !== excludeKey) return deck;
  }
  return ['layout_wide', 'move_default'];
}

function mergeDeck(deck: readonly SpawnPatternModuleId[]): {
  layout: EnemyBatchLayout;
  flankSoft: boolean;
  layoutAlternate: readonly EnemyBatchLayout[] | null;
  moveProfile: EnemyMoveProfile;
  speedMult: number;
  hpMult: number;
  batchCountDelta: number;
  eliteSlot: boolean;
} {
  let layout: EnemyBatchLayout = 'wide_front';
  let flankSoft = false;
  let layoutAlternate: readonly EnemyBatchLayout[] | null = null;
  let moveProfile: EnemyMoveProfile = 'default';
  let speedMult = 1;
  let hpMult = 1;
  let batchCountDelta = 0;
  let eliteSlot = false;

  for (const id of deck) {
    const mod = SPAWN_PATTERN_MODULES[id];
    if (!mod) continue;
    if (mod.layout) layout = mod.layout;
    if (mod.flankSoft) flankSoft = true;
    if (mod.layoutAlternate) layoutAlternate = mod.layoutAlternate;
    if (mod.moveProfile) moveProfile = mod.moveProfile;
    if (mod.speedMult != null) speedMult *= mod.speedMult;
    if (mod.hpMult != null) hpMult *= mod.hpMult;
    if (mod.batchCountDelta != null) batchCountDelta += mod.batchCountDelta;
    if (id === 'stat_elite_speed') eliteSlot = true;
  }

  speedMult = Math.min(SPAWN_PATTERN_CONFIG.maxSpeedMult, speedMult);
  hpMult = Math.max(SPAWN_PATTERN_CONFIG.minHpMult, hpMult);

  return {
    layout,
    flankSoft,
    layoutAlternate,
    moveProfile,
    speedMult,
    hpMult,
    batchCountDelta,
    eliteSlot,
  };
}

export class SpawnPatternDirector {
  private currentDeck: SpawnPatternModuleId[] = [];
  private previousDeckKey: string | null = null;
  private merged = mergeDeck([]);

  getCurrentDeck(): readonly SpawnPatternModuleId[] {
    return this.currentDeck;
  }

  reset(): void {
    this.currentDeck = [];
    this.previousDeckKey = null;
    this.rerollDeck(0);
  }

  rerollDeck(elapsedSec: number): void {
    const excludeKey = this.previousDeckKey;
    const deck =
      elapsedSec < SPAWN_PATTERN_CONFIG.earlyTierUntilSec
        ? pickEarlyDeck(excludeKey)
        : pickLateDeck(excludeKey);

    this.previousDeckKey = deckKey(this.currentDeck);
    this.currentDeck = deck;
    this.merged = mergeDeck(deck);
  }

  resolveBatch(batchIndex: number, _slotCount: number): ResolvedSpawnBatch {
    const m = this.merged;
    let layout = m.layout;
    let flankSoft = m.flankSoft;

    if (m.layoutAlternate && m.layoutAlternate.length > 0) {
      const pick = m.layoutAlternate[batchIndex % m.layoutAlternate.length] ?? m.layout;
      layout = pick;
      flankSoft = pick === 'flank' ? m.flankSoft : false;
    }

    return {
      layout,
      flankSoft,
      moveProfile: m.moveProfile,
      speedMult: m.speedMult,
      hpMult: m.hpMult,
      batchCountDelta: m.batchCountDelta,
      eliteSlot: m.eliteSlot,
    };
  }

  buildSlotMods(slotCount: number, batch: ResolvedSpawnBatch): SlotSpawnMod[] {
    const mods: SlotSpawnMod[] = [];
    for (let i = 0; i < slotCount; i++) {
      mods.push({
        speedMult: 1,
        hpMult: 1,
        moveProfile: undefined,
      });
    }
    if (batch.eliteSlot && slotCount > 0) {
      const eliteIdx = Math.floor(slotCount / 2);
      mods[eliteIdx] = {
        speedMult: 1.4,
        hpMult: 1,
        moveProfile: 'zigzag',
      };
    }
    return mods;
  }
}
