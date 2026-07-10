import {context, reddit, redis} from '@devvit/web/server'
import type {
  ClaimTombstonesRsp,
  GetTombstonesRsp,
  SubmitTombstoneCommentReq,
  UpsertTombstoneReq,
  UpsertTombstoneRsp,
} from '../shared/api.ts'
import {
  buildBattleReportPersonalSection,
  DEATH_REASON_COUNT,
  type TombstoneRecord,
  TOMBSTONE_MIN_PLAY_MS,
  tombstoneCoinBonus,
  tombstoneCommentCooldownMs,
} from '../shared/tombstone.ts'
import {
  formatDefenseGaugeBar,
  validateRunKills,
} from '../shared/weeklyDefense.ts'
import {getWeeklyDefenseStatus} from './weeklyDefense.ts'

function tombstoneKey(postId: string): string {
  return `tombstone:post:${postId}`
}

function commentLastAtKey(username: string, postId: string): string {
  return `user:${username}:tombstone-comment-last:${postId}`
}

export function resolveTombstonePostKey(postId: string | undefined): string {
  return postId && postId.length > 0 ? postId : 'default'
}

function parseRecord(username: string, raw: string): TombstoneRecord | null {
  try {
    const data = JSON.parse(raw) as Partial<TombstoneRecord>
    if (
      typeof data.score !== 'number' ||
      typeof data.triggerMs !== 'number' ||
      typeof data.coinsAtDeath !== 'number' ||
      typeof data.deathReasonId !== 'number' ||
      typeof data.updatedAt !== 'number'
    ) {
      return null
    }
    return {
      username,
      score: Math.max(0, Math.floor(data.score)),
      triggerMs: Math.max(0, Math.floor(data.triggerMs)),
      coinsAtDeath: Math.max(0, Math.floor(data.coinsAtDeath)),
      deathReasonId: Math.max(
        0,
        Math.min(DEATH_REASON_COUNT - 1, Math.floor(data.deathReasonId)),
      ),
      updatedAt: Math.floor(data.updatedAt),
    }
  } catch {
    return null
  }
}

function serializeRecord(record: Omit<TombstoneRecord, 'username'>): string {
  return JSON.stringify(record)
}

async function readHash(key: string): Promise<TombstoneRecord[]> {
  const all = await redis.hGetAll(key)
  const records: TombstoneRecord[] = []
  for (const [field, value] of Object.entries(all)) {
    if (!value) continue
    const parsed = parseRecord(field, value)
    if (parsed) records.push(parsed)
  }
  records.sort((a, b) => a.triggerMs - b.triggerMs)
  return records
}

type RedditCommentApi = {
  submitComment?: (opts: {
    id: string
    text: string
    runAs?: 'USER' | 'APP'
  }) => Promise<unknown>
}

async function submitTombstoneComment(
  username: string,
  req: SubmitTombstoneCommentReq,
): Promise<void> {
  if (!context.postId) return

  const validation = validateRunKills({
    monsterKills: req.monsterKills,
    bossKills: req.bossKills,
    runElapsedMs: req.triggerMs,
  })
  const monsterKills = validation.acceptedMonsterKills
  const personalSection = buildBattleReportPersonalSection({
    score: req.score,
    triggerMs: req.triggerMs,
    deathReasonId: req.deathReasonId,
    monsterKills,
    isNewRecord: req.isNewRecord,
  })

  const weekly = await getWeeklyDefenseStatus()
  const gaugeBar = formatDefenseGaugeBar(weekly.percent)
  const percentStr = weekly.percent.toFixed(1)

  const text =
    `🪦 [${username}] 요원의 전사 보고서\n\n` +
    `[개인 기록]\n` +
    `${personalSection}\n\n` +
    `[전체 전황]\n` +
    `현재 서브레딧 주간 누적 킬 수: ${weekly.kills.toLocaleString()} / ${weekly.target.toLocaleString()}\n` +
    `이번 주 침공 방어율: ${gaugeBar} ${percentStr}%`

  const api = reddit as RedditCommentApi
  if (typeof api.submitComment !== 'function') {
    console.warn(
      'reddit.submitComment unavailable — skipping tombstone comment',
    )
    return
  }

  await api.submitComment({
    id: context.postId,
    text,
    runAs: 'USER',
  })
}

export async function listTombstones(
  me: string,
  postId: string | undefined,
): Promise<GetTombstonesRsp> {
  const key = tombstoneKey(resolveTombstonePostKey(postId))
  const tombstones = await readHash(key)
  const filtered =
    me === 'anonymous'
      ? tombstones.filter(t => t.username !== 'anonymous')
      : tombstones
  return {me, tombstones: filtered}
}

export async function upsertTombstone(
  username: string,
  postId: string | undefined,
  req: UpsertTombstoneReq,
): Promise<UpsertTombstoneRsp> {
  if (username === 'anonymous') {
    return {ok: true, updated: false, record: null}
  }

  const score = Math.max(0, Math.floor(req.score))
  const triggerMs = Math.max(0, Math.floor(req.triggerMs))
  const coinsAtDeath = Math.max(0, Math.floor(req.coinsAtDeath))
  const deathReasonId = Math.max(
    0,
    Math.min(DEATH_REASON_COUNT - 1, Math.floor(req.deathReasonId)),
  )
  const monsterKills = Math.max(0, Math.floor(req.monsterKills))
  const bossKills = Math.max(0, Math.floor(req.bossKills))

  const resolvedPost = resolveTombstonePostKey(postId)
  const key = tombstoneKey(resolvedPost)
  const existingRaw = await redis.hGet(key, username)
  let existing: TombstoneRecord | null = null
  if (existingRaw) {
    existing = parseRecord(username, existingRaw)
  }

  if (triggerMs < TOMBSTONE_MIN_PLAY_MS) {
    return {ok: true, updated: false, record: existing}
  }

  if (existing && triggerMs <= existing.triggerMs) {
    return {ok: true, updated: false, record: existing}
  }

  const updatedAt = Date.now()
  const stored: TombstoneRecord = {
    username,
    score,
    triggerMs,
    coinsAtDeath,
    deathReasonId,
    updatedAt,
  }
  await redis.hSet(key, {
    [username]: serializeRecord({
      score,
      triggerMs,
      coinsAtDeath,
      deathReasonId,
      updatedAt,
    }),
  })

  return {ok: true, updated: true, record: stored}
}

export async function submitTombstoneCommentForUser(
  username: string,
  postId: string | undefined,
  req: SubmitTombstoneCommentReq,
): Promise<
  | {ok: true; submitted: boolean; cooldownRemainingMs?: number}
  | {error: string; status: number}
> {
  if (username === 'anonymous') {
    return {error: 'anonymous cannot submit comment', status: 403}
  }

  const resolvedPost = resolveTombstonePostKey(postId)
  const lastKey = commentLastAtKey(username, resolvedPost)
  const cooldownMs = tombstoneCommentCooldownMs(req.isNewRecord)
  const lastRaw = await redis.get(lastKey)
  if (lastRaw) {
    const lastAt = Number.parseInt(lastRaw, 10)
    if (Number.isFinite(lastAt)) {
      const elapsed = Date.now() - lastAt
      if (elapsed < cooldownMs) {
        return {
          ok: true,
          submitted: false,
          cooldownRemainingMs: cooldownMs - elapsed,
        }
      }
    }
  }

  try {
    await submitTombstoneComment(username, req)
  } catch (err) {
    console.error('tombstone comment failed', err)
    return {error: 'comment submission failed', status: 500}
  }

  await redis.set(lastKey, String(Date.now()))
  return {ok: true, submitted: true}
}

export async function claimTombstones(
  claimer: string,
  postId: string | undefined,
  usernames: string[],
): Promise<ClaimTombstonesRsp | {error: string; status: number}> {
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return {error: 'usernames required', status: 400}
  }
  if (claimer === 'anonymous') {
    return {error: 'anonymous cannot claim', status: 403}
  }

  const unique = [
    ...new Set(usernames.map(u => String(u).trim()).filter(Boolean)),
  ]
  if (unique.some(u => u === claimer)) {
    return {error: 'cannot claim own tombstone', status: 400}
  }

  const key = tombstoneKey(resolveTombstonePostKey(postId))
  const claimed: TombstoneRecord[] = []
  let totalCoinBonus = 0

  for (const target of unique) {
    const raw = await redis.hGet(key, target)
    if (!raw) continue
    const record = parseRecord(target, raw)
    if (!record) continue
    await redis.hDel(key, [target])
    claimed.push(record)
    totalCoinBonus += tombstoneCoinBonus(record.coinsAtDeath)
  }

  return {ok: true, claimed, totalCoinBonus}
}
