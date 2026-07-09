import {context, reddit, redis} from '@devvit/web/server'
import type {
  ClaimTombstonesRsp,
  GetTombstonesRsp,
  UpsertTombstoneReq,
  UpsertTombstoneRsp,
} from '../shared/api.ts'
import {
  DEATH_REASON_COUNT,
  deathReasonCommentText,
  type TombstoneRecord,
  tombstoneCoinBonus,
} from '../shared/tombstone.ts'
import {DUMMY_TOMBSTONE_SEEDS} from '../shared/tombstoneDummies.ts'
import {
  formatDefenseGaugeBar,
  validateRunKills,
} from '../shared/weeklyDefense.ts'
import {getWeeklyDefenseStatus} from './weeklyDefense.ts'

function tombstoneKey(postId: string): string {
  return `tombstone:post:${postId}`
}

function commentIdempotencyKey(
  username: string,
  postId: string,
  updatedAt: number,
): string {
  return `user:${username}:tombstone-comment:${postId}:${updatedAt}`
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

/** 실유저만 있어도 더미가 없으면 합친다 (리더보드 seedIfEmpty 패턴) */
async function seedMissingDummies(key: string): Promise<void> {
  const all = await redis.hGetAll(key)
  const existing = new Set(Object.keys(all))
  const toAdd: Record<string, string> = {}
  const updatedAt = Date.now()

  for (const seed of DUMMY_TOMBSTONE_SEEDS) {
    if (existing.has(seed.username)) continue
    toAdd[seed.username] = serializeRecord({
      score: seed.score,
      triggerMs: seed.triggerMs,
      coinsAtDeath: seed.coinsAtDeath,
      deathReasonId: seed.deathReasonId,
      updatedAt,
    })
  }

  if (Object.keys(toAdd).length > 0) {
    await redis.hSet(key, toAdd)
  }
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
  postId: string,
  record: TombstoneRecord,
  runMonsterKills: number,
  runBossKills: number,
): Promise<void> {
  if (!context.postId) return

  const idemKey = commentIdempotencyKey(username, postId, record.updatedAt)
  const already = await redis.get(idemKey)
  if (already) return

  const validation = validateRunKills({
    monsterKills: runMonsterKills,
    bossKills: runBossKills,
    runElapsedMs: record.triggerMs,
  })
  const monsterKills = validation.acceptedMonsterKills
  const bossKills = validation.acceptedBossKills

  const weekly = await getWeeklyDefenseStatus()
  const gaugeBar = formatDefenseGaugeBar(weekly.percent)
  const percentStr = weekly.percent.toFixed(1)
  const reason = deathReasonCommentText(record.deathReasonId)

  const text =
    `🪦 [${username}] 요원의 전사 보고서\n\n` +
    `[개인 기록]\n` +
    `이번 작전에서 외계 괴수 [${monsterKills.toLocaleString()}마리] 소탕, 중형 보스 [${bossKills}기] 격추!\n` +
    `통산 최고 기록을 **[${record.score.toLocaleString()}점]**으로 경신하며 고지에 비석을 세웠습니다.\n` +
    `(사망 사유): ${reason}.\n\n` +
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
  await redis.set(idemKey, '1')
}

export async function listTombstones(
  me: string,
  postId: string | undefined,
): Promise<GetTombstonesRsp> {
  const key = tombstoneKey(resolveTombstonePostKey(postId))
  await seedMissingDummies(key)
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
  if (existingRaw) {
    const existing = parseRecord(username, existingRaw)
    if (existing && triggerMs <= existing.triggerMs) {
      return {ok: true, updated: false, record: existing}
    }
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

  try {
    await submitTombstoneComment(
      username,
      resolvedPost,
      stored,
      monsterKills,
      bossKills,
    )
  } catch (err) {
    console.error('tombstone comment failed', err)
  }

  return {ok: true, updated: true, record: stored}
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
