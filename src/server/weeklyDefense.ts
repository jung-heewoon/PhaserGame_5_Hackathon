import {redis} from '@devvit/web/server'
import type {ContributeWeeklyDefenseRsp} from '../shared/api.ts'
import {
  WEEKLY_DEFENSE_CONFIG,
  computeMySharePercent,
  computeWeeklyPercent,
  mondayUtcWeekStartMs,
  validateRunKills,
  type RunKillPayload,
  type WeeklyDefenseStatus,
} from '../shared/weeklyDefense.ts'

const KEYS = {
  kills: 'global:kills',
  target: 'global:target',
  buffActive: 'global:buff_active',
  lastResetMs: 'global:last_reset_ms',
} as const

let nowMsOverride: number | undefined

/** Test-only: override Date.now() for lazy reset tests. */
export function setWeeklyDefenseNowMsForTests(ms: number | undefined): void {
  nowMsOverride = ms
}

function nowMs(): number {
  return nowMsOverride ?? Date.now()
}

async function readInt(key: string, fallback: number): Promise<number> {
  const raw = await redis.get(key)
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

async function readBool(key: string, fallback: boolean): Promise<boolean> {
  const raw = await redis.get(key)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

async function seedDefaultsIfMissing(): Promise<void> {
  const targetRaw = await redis.get(KEYS.target)
  if (!targetRaw) {
    await redis.set(KEYS.target, String(WEEKLY_DEFENSE_CONFIG.baseTarget))
  }
  const killsRaw = await redis.get(KEYS.kills)
  if (!killsRaw) {
    await redis.set(KEYS.kills, '0')
  }
  const buffRaw = await redis.get(KEYS.buffActive)
  if (!buffRaw) {
    await redis.set(KEYS.buffActive, '0')
  }
}

function userContribKey(weekResetMs: number): string {
  return `global:contrib:${weekResetMs}`
}

async function readUserContrib(
  weekResetMs: number,
  username: string,
): Promise<number> {
  const raw = await redis.hGet(userContribKey(weekResetMs), username)
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : 0
}

async function addUserContrib(
  weekResetMs: number,
  username: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return
  const key = userContribKey(weekResetMs)
  const current = await readUserContrib(weekResetMs, username)
  await redis.hSet(key, {[username]: String(current + amount)})
}

async function readState(
  weekResetMs: number,
  username?: string,
): Promise<WeeklyDefenseStatus> {
  await seedDefaultsIfMissing()
  const kills = await readInt(KEYS.kills, 0)
  const target = await readInt(KEYS.target, WEEKLY_DEFENSE_CONFIG.baseTarget)
  const buffActive = await readBool(KEYS.buffActive, false)
  const myKills = username ? await readUserContrib(weekResetMs, username) : 0
  return {
    kills,
    target,
    percent: computeWeeklyPercent(kills, target),
    buffActive,
    weekResetMs,
    myKills,
    myPercent: computeMySharePercent(myKills, kills),
  }
}

/** Lazy weekly reset — first request after Monday 00:00 UTC settles prior week. */
export async function ensureCurrentWeek(): Promise<number> {
  const weekStart = mondayUtcWeekStartMs(nowMs())
  await seedDefaultsIfMissing()

  const lastResetRaw = await redis.get(KEYS.lastResetMs)
  if (!lastResetRaw) {
    await redis.set(KEYS.lastResetMs, String(weekStart))
    return weekStart
  }

  const lastReset = parseInt(lastResetRaw, 10)
  if (!Number.isFinite(lastReset) || lastReset >= weekStart) {
    return weekStart
  }

  const kills = await readInt(KEYS.kills, 0)
  const target = await readInt(KEYS.target, WEEKLY_DEFENSE_CONFIG.baseTarget)
  const succeeded = kills >= target

  const newTarget = succeeded
    ? Math.floor(target * WEEKLY_DEFENSE_CONFIG.successTargetMul)
    : Math.max(
        WEEKLY_DEFENSE_CONFIG.minTarget,
        Math.floor(target * WEEKLY_DEFENSE_CONFIG.failTargetMul),
      )

  await redis.set(KEYS.buffActive, succeeded ? '1' : '0')
  await redis.set(KEYS.target, String(newTarget))
  await redis.set(KEYS.kills, '0')
  await redis.set(KEYS.lastResetMs, String(weekStart))

  return weekStart
}

export async function getWeeklyDefenseStatus(
  username?: string,
): Promise<WeeklyDefenseStatus> {
  const weekResetMs = await ensureCurrentWeek()
  return readState(weekResetMs, username)
}

export async function contributeWeeklyDefense(
  req: RunKillPayload,
  username?: string,
): Promise<ContributeWeeklyDefenseRsp> {
  const validation = validateRunKills(req)

  if (validation.rejected) {
    if (username) {
      console.warn(
        `weekly-defense contribute rejected for ${username}: reason=${validation.reason ?? 'unknown'} kills=${req.monsterKills} elapsed=${req.runElapsedMs}`,
      )
    }
    const status = await getWeeklyDefenseStatus(username)
    return {...status, contributed: 0, rejected: true}
  }

  const weekResetMs = await ensureCurrentWeek()
  const contributed = validation.acceptedMonsterKills

  if (contributed > 0) {
    const current = await readInt(KEYS.kills, 0)
    await redis.set(KEYS.kills, String(current + contributed))
    if (username) {
      await addUserContrib(weekResetMs, username, contributed)
    }
  }

  const status = await readState(weekResetMs, username)
  return {...status, contributed, rejected: false}
}
