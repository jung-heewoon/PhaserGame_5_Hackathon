import { getEntryByHand, type HandId } from '../config/WeaponTable.ts';

export interface HandResult {
  handId: HandId;
  weaponId: ReturnType<typeof getEntryByHand>['weaponId'];
}

function sortedCopy(dice: number[]): number[] {
  return [...dice].sort((a, b) => a - b);
}

function countFreq(dice: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of dice) {
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

function hasStraightOfLength(sorted: number[], len: number): boolean {
  const unique = [...new Set(sorted)];
  if (unique.length < len) return false;
  for (let start = 0; start <= unique.length - len; start++) {
    let ok = true;
    for (let i = 1; i < len; i++) {
      if (unique[start + i] !== unique[start]! + i) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function maxFreq(freq: Map<number, number>): number {
  let max = 0;
  for (const c of freq.values()) max = Math.max(max, c);
  return max;
}

function countPairs(freq: Map<number, number>): number {
  let pairs = 0;
  for (const c of freq.values()) {
    if (c >= 2) pairs += 1;
  }
  return pairs;
}

/** 5개 주사위 → 상위 족보부터 단일 판정 */
export function evaluateHand(dice: number[]): HandResult {
  if (dice.length !== 5) {
    throw new Error(`evaluateHand expects 5 dice, got ${dice.length}`);
  }

  const sorted = sortedCopy(dice);
  const freq = countFreq(dice);
  const counts = [...freq.values()].sort((a, b) => b - a);
  const max = maxFreq(freq);
  const pairs = countPairs(freq);

  let handId: HandId;

  if (max === 5) {
    handId = 'YATZY';
  } else if (sorted.join(',') === '1,2,3,4,5' || sorted.join(',') === '2,3,4,5,6') {
    handId = 'LARGE_STRAIGHT';
  } else if (hasStraightOfLength(sorted, 4)) {
    handId = 'SMALL_STRAIGHT';
  } else if (counts[0] === 3 && counts[1] === 2) {
    handId = 'FULL_HOUSE';
  } else if (max === 4) {
    handId = 'FOUR_OF_A_KIND';
  } else if (max === 3) {
    handId = 'THREE_OF_A_KIND';
  } else if (pairs >= 2) {
    handId = 'TWO_PAIR';
  } else if (max === 2) {
    handId = 'ONE_PAIR';
  } else {
    handId = 'NONE';
  }

  const entry = getEntryByHand(handId);
  return {
    handId: entry.handId,
    weaponId: entry.weaponId,
  };
}

/** 족보 판정에 사용되는 주사위 인덱스 (NONE이면 전부 false) */
export function getScoringDieMask(dice: number[]): boolean[] {
  const handId = evaluateHand(dice).handId;
  const mask = [false, false, false, false, false];
  if (handId === 'NONE') return mask;

  const freq = countFreq(dice);

  const markByValue = (value: number, count: number): void => {
    let left = count;
    for (let i = 0; i < dice.length; i++) {
      if (dice[i] === value && left > 0 && !mask[i]) {
        mask[i] = true;
        left -= 1;
      }
    }
  };

  switch (handId) {
    case 'YATZY':
    case 'LARGE_STRAIGHT':
    case 'FULL_HOUSE':
      return [true, true, true, true, true];
    case 'SMALL_STRAIGHT':
      return scoringStraightMask(dice, 4);
    case 'FOUR_OF_A_KIND': {
      const val = [...freq.entries()].find(([, c]) => c >= 4)?.[0];
      if (val != null) markByValue(val, 4);
      return mask;
    }
    case 'THREE_OF_A_KIND': {
      const val = [...freq.entries()].find(([, c]) => c >= 3)?.[0];
      if (val != null) markByValue(val, 3);
      return mask;
    }
    case 'TWO_PAIR': {
      const pairValues = [...freq.entries()]
        .filter(([, c]) => c >= 2)
        .map(([v]) => v)
        .slice(0, 2);
      for (const v of pairValues) markByValue(v, 2);
      return mask;
    }
    case 'ONE_PAIR': {
      const val = [...freq.entries()].find(([, c]) => c >= 2)?.[0];
      if (val != null) markByValue(val, 2);
      return mask;
    }
    default:
      return mask;
  }
}

function scoringStraightMask(dice: number[], len: number): boolean[] {
  const empty = [false, false, false, false, false];
  for (let start = 1; start <= 7 - len; start++) {
    const seq = Array.from({ length: len }, (_, i) => start + i);
    const used = new Set<number>();
    const mask = [false, false, false, false, false];
    let matched = 0;
    for (const v of seq) {
      const idx = dice.findIndex((d, i) => d === v && !used.has(i));
      if (idx < 0) break;
      used.add(idx);
      mask[idx] = true;
      matched += 1;
    }
    if (matched === len) return mask;
  }
  return empty;
}

export function rollOneDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollFiveDice(): number[] {
  return Array.from({ length: 5 }, () => rollOneDie());
}
