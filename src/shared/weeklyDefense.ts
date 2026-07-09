export const WEEKLY_DEFENSE_CONFIG = {
  baseTarget: 10_000,
  minTarget: 5_000,
  successTargetMul: 1.5,
  failTargetMul: 0.7,
  buffBonusDice: 100,
  maxKillsPerRun: 9_999,
  maxKillsPerSec: 10,
  killGrace: 20,
  minRunMsForKills: 2_000,
  bossIntervalMs: 30_000,
  bossGrace: 1,
  rejectMultiplier: 2,
} as const

export type WeeklyDefenseStatus = {
  kills: number
  target: number
  percent: number
  buffActive: boolean
  weekResetMs: number
}

export type RunKillPayload = {
  monsterKills: number
  bossKills?: number
  runElapsedMs: number
}

export type RunKillValidation = {
  acceptedMonsterKills: number
  acceptedBossKills: number
  rejected: boolean
  reason?: 'time' | 'boss' | 'absurd'
}

/** Monday 00:00 UTC for the week containing `now`. */
export function mondayUtcWeekStartMs(now = Date.now()): number {
  const d = new Date(now)
  const day = d.getUTCDay()
  const daysFromMonday = (day + 6) % 7
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - daysFromMonday,
    0,
    0,
    0,
    0,
  )
}

export function computeWeeklyPercent(kills: number, target: number): number {
  if (target <= 0) return 0
  return (kills / target) * 100
}

export function formatDefenseGaugeBar(percent: number, width = 10): string {
  const clamped = Math.max(0, Math.min(100, percent))
  const filled = Math.round((clamped / 100) * width)
  return `[${'▓'.repeat(filled)}${'░'.repeat(width - filled)}]`
}

function maxBossKillsForElapsed(runElapsedMs: number): number {
  const {bossIntervalMs, bossGrace} = WEEKLY_DEFENSE_CONFIG
  if (runElapsedMs <= 0) return 0
  return Math.floor(runElapsedMs / bossIntervalMs) + bossGrace
}

function timeCapForElapsed(runElapsedMs: number): number {
  const {maxKillsPerSec, killGrace, minRunMsForKills} = WEEKLY_DEFENSE_CONFIG
  if (runElapsedMs < minRunMsForKills) return 0
  const elapsedSec = Math.max(1, runElapsedMs / 1000)
  return Math.ceil(elapsedSec * maxKillsPerSec) + killGrace
}

/** Shared client/server kill validation — server has final authority. */
export function validateRunKills(payload: RunKillPayload): RunKillValidation {
  const {maxKillsPerRun, rejectMultiplier} = WEEKLY_DEFENSE_CONFIG
  const runElapsedMs = Math.max(0, Math.floor(payload.runElapsedMs))
  const rawMonster = Math.max(0, Math.floor(payload.monsterKills))
  const rawBoss = Math.max(0, Math.floor(payload.bossKills ?? 0))

  const bossCap = maxBossKillsForElapsed(runElapsedMs)
  const acceptedBossKills = Math.min(rawBoss, bossCap)

  if (runElapsedMs < WEEKLY_DEFENSE_CONFIG.minRunMsForKills) {
    return {
      acceptedMonsterKills: 0,
      acceptedBossKills,
      rejected: rawMonster > 0,
      reason: rawMonster > 0 ? 'time' : undefined,
    }
  }

  const capped = Math.min(rawMonster, maxKillsPerRun)
  const timeCap = timeCapForElapsed(runElapsedMs)
  const absurdThreshold = timeCap * rejectMultiplier

  if (capped > absurdThreshold) {
    return {
      acceptedMonsterKills: 0,
      acceptedBossKills,
      rejected: true,
      reason: 'absurd',
    }
  }

  if (capped > timeCap) {
    return {
      acceptedMonsterKills: timeCap,
      acceptedBossKills,
      rejected: false,
      reason: 'time',
    }
  }

  return {
    acceptedMonsterKills: capped,
    acceptedBossKills,
    rejected: false,
  }
}
