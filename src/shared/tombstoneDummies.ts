import type {TombstoneRecord} from './tombstone.ts'

/** playtest용 더미 비석 시드 — triggerMs는 생존 시간(ms) 기준 */
export type TombstoneDummySeed = {
  username: string
  score: number
  triggerMs: number
  coinsAtDeath: number
  deathReasonId: number
}

export const DUMMY_TOMBSTONE_SEEDS: readonly TombstoneDummySeed[] = [
  {
    username: 'dice_demon',
    score: 15400,
    triggerMs: 12_000,
    coinsAtDeath: 280,
    deathReasonId: 0,
  },
  {
    username: 'yatzy_knight',
    score: 8200,
    triggerMs: 22_000,
    coinsAtDeath: 150,
    deathReasonId: 1,
  },
  {
    username: 'hell_runner',
    score: 12300,
    triggerMs: 32_000,
    coinsAtDeath: 200,
    deathReasonId: 2,
  },
  {
    username: 'combo_cat',
    score: 6100,
    triggerMs: 42_000,
    coinsAtDeath: 90,
    deathReasonId: 3,
  },
  {
    username: 'railgun_rex',
    score: 9800,
    triggerMs: 42_500,
    coinsAtDeath: 120,
    deathReasonId: 4,
  },
  {
    username: 'nuke_nova',
    score: 7500,
    triggerMs: 43_000,
    coinsAtDeath: 110,
    deathReasonId: 5,
  },
  {
    username: 'shotty_sam',
    score: 5400,
    triggerMs: 55_000,
    coinsAtDeath: 80,
    deathReasonId: 6,
  },
  {
    username: 'minigun_mia',
    score: 11200,
    triggerMs: 68_000,
    coinsAtDeath: 175,
    deathReasonId: 7,
  },
] as const

export function buildDummyTombstoneRecords(
  updatedAt = Date.now(),
): TombstoneRecord[] {
  return DUMMY_TOMBSTONE_SEEDS.map(seed => ({
    username: seed.username,
    score: seed.score,
    triggerMs: seed.triggerMs,
    coinsAtDeath: seed.coinsAtDeath,
    deathReasonId: seed.deathReasonId,
    updatedAt,
  }))
}

/** 본인 비석 제외 — 클라이언트 로컬 폴백용 */
export function tombstoneDummiesForPlaytest(me: string): TombstoneRecord[] {
  return buildDummyTombstoneRecords().filter(record => record.username !== me)
}

const DUMMY_USERNAMES = new Set(
  DUMMY_TOMBSTONE_SEEDS.map(seed => seed.username),
)

/** playtest 더미는 본인 계정과 이름이 같아도 습득 가능 */
export function isDummyTombstoneUsername(username: string): boolean {
  return DUMMY_USERNAMES.has(username)
}
