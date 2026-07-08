import {redis} from '@devvit/web/server'
import type {LeaderboardEntry, LeaderboardScopeData} from '../shared/api.ts'

export const POST_LEADERBOARD_LIMIT = 50
export const GLOBAL_LEADERBOARD_LIMIT = 10
const POST_TRIM_SIZE = 200
const GLOBAL_TRIM_SIZE = 500

const GLOBAL_KEY = 'leaderboard:global'

/** 테스트용 더미 유저 — 랭킹이 비어 있을 때만 1회 시드 */
const DUMMY_POST_SCORES: ReadonlyArray<{member: string; score: number}> = [
  {member: 'dice_demon', score: 980},
  {member: 'yatzy_knight', score: 845},
  {member: 'hell_runner', score: 720},
  {member: 'combo_cat', score: 615},
  {member: 'railgun_rex', score: 540},
  {member: 'nuke_nova', score: 480},
  {member: 'shotty_sam', score: 390},
  {member: 'minigun_mia', score: 310},
  {member: 'pistol_pete', score: 240},
  {member: 'rookie_roll', score: 120},
]

const DUMMY_GLOBAL_SCORES: ReadonlyArray<{member: string; score: number}> = [
  {member: 'global_champ', score: 2500},
  {member: 'dice_demon', score: 2100},
  {member: 'subreddit_slugger', score: 1880},
  {member: 'yatzy_knight', score: 1650},
  {member: 'hell_runner', score: 1420},
  {member: 'crown_chaser', score: 1190},
  {member: 'combo_cat', score: 980},
  {member: 'railgun_rex', score: 760},
  {member: 'nuke_nova', score: 520},
  {member: 'pistol_pete', score: 280},
]

function postKey(postId: string): string {
  return `leaderboard:post:${postId}`
}

async function seedIfEmpty(
  key: string,
  dummies: ReadonlyArray<{member: string; score: number}>,
): Promise<void> {
  // card>0 이어도 더미가 없으면 합친다 (이전에 실유저만 먼저 저장된 경우)
  const existing = await getTopEntries(key, Math.max(dummies.length, 20))
  const names = new Set(existing.map(entry => entry.username))
  const missing = dummies.filter(dummy => !names.has(dummy.member))
  if (missing.length === 0) return
  await redis.zAdd(key, ...missing)
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.floor(score))
}

async function upsertScore(
  key: string,
  username: string,
  score: number,
): Promise<boolean> {
  const next = normalizeScore(score)
  if (next <= 0) return false

  const existing = await redis.zScore(key, username)
  if (existing !== undefined && existing !== null && next <= existing) {
    return false
  }

  await redis.zAdd(key, {member: username, score: next})
  return true
}

async function trimLeaderboard(key: string, maxSize: number): Promise<void> {
  const card = await redis.zCard(key)
  if (card <= maxSize) return
  const removeCount = card - maxSize
  await redis.zRemRangeByRank(key, 0, removeCount - 1)
}

async function getTopEntries(
  key: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const card = await redis.zCard(key)
  if (card === 0) return []

  // Devvit zRange(by:'rank')는 Redis 음수 인덱스를 안정적으로 지원하지 않음.
  // 오름차순 기준 상위(높은 점수) 구간을 양수 인덱스로 읽은 뒤 뒤집는다.
  const fetchCount = Math.min(limit, card)
  const start = Math.max(0, card - fetchCount)
  const stop = card - 1
  const raw = await redis.zRange(key, start, stop, {by: 'rank'})
  const reversed = [...raw].reverse()

  return reversed.map((item, index) => {
    const username =
      typeof item === 'string'
        ? item
        : String((item as {member?: string}).member ?? '')
    const score =
      typeof item === 'string'
        ? 0
        : Number((item as {score?: number}).score ?? 0)
    return {
      rank: index + 1,
      username,
      score: Number.isFinite(score) ? score : 0,
    }
  }).filter(entry => entry.username.length > 0)
}

async function getUserStanding(
  key: string,
  username: string,
  limit: number,
  entries: LeaderboardEntry[],
): Promise<Pick<LeaderboardScopeData, 'me' | 'meOutOfRange'>> {
  const ascRank = await redis.zRank(key, username)
  if (ascRank === null || ascRank === undefined) {
    return {me: null}
  }

  const card = await redis.zCard(key)
  const displayRank = card - ascRank
  const score = await redis.zScore(key, username)
  const normalizedScore = score ?? 0

  const inTop = displayRank <= limit
  if (inTop) {
    const me =
      entries.find(entry => entry.username === username) ??
      ({
        rank: displayRank,
        username,
        score: normalizedScore,
      } satisfies LeaderboardEntry)
    return {me}
  }

  return {
    me: null,
    meOutOfRange: {rank: displayRank, score: normalizedScore},
  }
}

export async function getLeaderboardScope(
  key: string,
  username: string,
  limit: number,
): Promise<LeaderboardScopeData> {
  const entries = await getTopEntries(key, limit)
  const standing = await getUserStanding(key, username, limit, entries)
  return {entries, ...standing}
}

function resolvePostKey(postId: string | undefined): string {
  // postId 없으면도 스레드 탭이 비지 않도록 공유 키 사용
  return postKey(postId && postId.length > 0 ? postId : 'default')
}

export async function getLeaderboards(
  username: string,
  postId: string | undefined,
): Promise<{post: LeaderboardScopeData; global: LeaderboardScopeData}> {
  const key = resolvePostKey(postId)

  // 실제 점수 제출 전에 항상 시드 가능하도록 조회 시에도 먼저 채움
  await seedIfEmpty(GLOBAL_KEY, DUMMY_GLOBAL_SCORES)
  await seedIfEmpty(key, DUMMY_POST_SCORES)

  const [global, post] = await Promise.all([
    getLeaderboardScope(GLOBAL_KEY, username, GLOBAL_LEADERBOARD_LIMIT),
    getLeaderboardScope(key, username, POST_LEADERBOARD_LIMIT),
  ])
  return {post, global}
}

export async function submitLeaderboardScore(
  username: string,
  postId: string | undefined,
  score: number,
): Promise<{post: LeaderboardScopeData; global: LeaderboardScopeData}> {
  const normalized = normalizeScore(score)
  const key = resolvePostKey(postId)

  // upsert 전에 시드 — 유저 1명만 먼저 들어가면 더미가 영원히 안 들어감
  await seedIfEmpty(GLOBAL_KEY, DUMMY_GLOBAL_SCORES)
  await seedIfEmpty(key, DUMMY_POST_SCORES)

  if (normalized > 0 && username !== 'anonymous') {
    await upsertScore(key, username, normalized)
    await trimLeaderboard(key, POST_TRIM_SIZE)
    await upsertScore(GLOBAL_KEY, username, normalized)
    await trimLeaderboard(GLOBAL_KEY, GLOBAL_TRIM_SIZE)
  }

  return getLeaderboards(username, postId)
}
