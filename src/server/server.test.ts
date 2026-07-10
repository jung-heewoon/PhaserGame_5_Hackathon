import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, reddit, redis, runWithContext} from '@devvit/web/server'
import {
  type ClaimTombstonesRsp,
  type ContributeWeeklyDefenseRsp,
  Endpoint,
  type ErrorRsp,
  type GetLeaderboardRsp,
  type GetPersistenceBulkRsp,
  type GetTombstonesRsp,
  type GetWeeklyDefenseRsp,
  type SetPersistenceReq,
  type SetPersistenceRsp,
  type SubmitLeaderboardRsp,
  type SubmitTombstoneCommentRsp,
  type UpsertTombstoneRsp,
} from '../shared/api.ts'
import {
  mondayUtcWeekStartMs,
  validateRunKills,
  WEEKLY_DEFENSE_CONFIG,
} from '../shared/weeklyDefense.ts'
import {
  buildBattleReportPersonalSection,
  TOMBSTONE_COMMENT_COOLDOWN_NEW_RECORD_MS,
  TOMBSTONE_COMMENT_COOLDOWN_REGULAR_MS,
  TOMBSTONE_MIN_PLAY_MS,
} from '../shared/tombstone.ts'
import {onReq} from './server.ts'
import {setWeeklyDefenseNowMsForTests} from './weeklyDefense.ts'

type ZMember = {member: string; score: number}

let server: Server
let serverURL: string
const redisValues = new Map<string, string>()
const redisHashes = new Map<string, Map<string, string>>()
const redisSortedSets = new Map<string, ZMember[]>()
const redisGet = redis.get.bind(redis)
const redisSet = redis.set.bind(redis)
const redisHGet = redis.hGet.bind(redis)
const redisHGetAll = redis.hGetAll.bind(redis)
const redisHSet = redis.hSet.bind(redis)
const redisHDel = redis.hDel.bind(redis)
const redisZAdd = redis.zAdd.bind(redis)
const redisZRange = redis.zRange.bind(redis)
const redisZRank = redis.zRank.bind(redis)
const redisZScore = redis.zScore.bind(redis)
const redisZCard = redis.zCard.bind(redis)
const redisZRemRangeByRank = redis.zRemRangeByRank.bind(redis)
const redditGetCurrentUsername = reddit.getCurrentUsername.bind(reddit)
const redditSubmitComment = (
  reddit as {submitComment?: (opts: unknown) => Promise<unknown>}
).submitComment?.bind(reddit)

function sortedSetFor(key: string): ZMember[] {
  let set = redisSortedSets.get(key)
  if (!set) {
    set = []
    redisSortedSets.set(key, set)
  }
  return set
}

function hashFor(key: string): Map<string, string> {
  let hash = redisHashes.get(key)
  if (!hash) {
    hash = new Map()
    redisHashes.set(key, hash)
  }
  return hash
}

function sortSet(set: ZMember[]): void {
  set.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return a.member.localeCompare(b.member)
  })
}

before(async () => {
  redis.get = async key => redisValues.get(key) ?? undefined
  redis.set = async (key, value) => {
    redisValues.set(key, value)
    return 'OK'
  }
  redis.hGet = async (key, field) => hashFor(key).get(field)
  redis.hGetAll = async key => Object.fromEntries(hashFor(key).entries())
  redis.hSet = async (key, data) => {
    const hash = hashFor(key)
    if (typeof data === 'string') return 0
    for (const [field, value] of Object.entries(data)) {
      hash.set(field, value)
    }
    return Object.keys(data).length
  }
  redis.hDel = async (key, fields) => {
    const hash = hashFor(key)
    let removed = 0
    for (const field of fields) {
      if (hash.delete(field)) removed += 1
    }
    return removed
  }
  redis.zAdd = async (key, ...members) => {
    const set = sortedSetFor(key)
    for (const entry of members) {
      const idx = set.findIndex(item => item.member === entry.member)
      if (idx >= 0) set[idx] = entry
      else set.push(entry)
    }
    sortSet(set)
    return members.length
  }
  // Devvit playtest와 동일하게 음수 인덱스는 지원하지 않는 것처럼 mock
  redis.zRange = async (key, start, stop, options) => {
    const set = sortedSetFor(key)
    if (options?.by !== 'rank') return []
    const len = set.length
    if (start < 0 || stop < 0) return []
    const from = Math.max(0, start)
    const to = Math.min(len - 1, stop)
    if (len === 0 || from > to) return []
    return set.slice(from, to + 1)
  }
  redis.zRank = async (key, member) => {
    const set = sortedSetFor(key)
    const idx = set.findIndex(item => item.member === member)
    return idx < 0 ? null : idx
  }
  redis.zScore = async (key, member) => {
    const set = sortedSetFor(key)
    const item = set.find(entry => entry.member === member)
    return item?.score ?? null
  }
  redis.zCard = async key => sortedSetFor(key).length
  redis.zRemRangeByRank = async (key, start, stop) => {
    const set = sortedSetFor(key)
    const removeCount = stop - start + 1
    set.splice(start, removeCount)
    return removeCount
  }
  reddit.getCurrentUsername = async () => 'test-user'
  ;(reddit as {submitComment: (opts: unknown) => Promise<void>}).submitComment =
    async () => {}

  server = createServer(async (req, rsp) => {
    await runWithContext(
      {
        appName: 'hell-dice-shooter',
        postId: 't3_123',
        userId: 't2_123',
        username: 'test-user',
      } as unknown as Context,
      () => onReq(req, rsp),
    )
  })
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const info = server.address() as AddressInfo
  serverURL = `http://127.0.0.1:${info.port}`
})

after(async () => {
  redis.get = redisGet
  redis.set = redisSet
  redis.hGet = redisHGet
  redis.hGetAll = redisHGetAll
  redis.hSet = redisHSet
  redis.hDel = redisHDel
  redis.zAdd = redisZAdd
  redis.zRange = redisZRange
  redis.zRank = redisZRank
  redis.zScore = redisZScore
  redis.zCard = redisZCard
  redis.zRemRangeByRank = redisZRemRangeByRank
  reddit.getCurrentUsername = redditGetCurrentUsername
  if (redditSubmitComment) {
    ;(reddit as {submitComment: (opts: unknown) => Promise<unknown>}).submitComment =
      redditSubmitComment
  }
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  redisValues.clear()
  redisHashes.clear()
  redisSortedSets.clear()
  setWeeklyDefenseNowMsForTests(undefined)
})

test('get persistence bulk', async () => {
  redisValues.set('user:test-user:hell-dice-shooter-wallet', '42')
  const rsp = await fetch(`${serverURL}/${Endpoint.GetPersistenceBulk}`)
  assert.equal(rsp.status, 200)
  assert.equal(rsp.headers.get('Content-Type'), 'application/json')
  const body = (await rsp.json()) as GetPersistenceBulkRsp
  assert.equal(body.values['hell-dice-shooter-wallet'], '42')
})

test('set persistence', async () => {
  const req: SetPersistenceReq = {
    key: 'hell-dice-shooter-wallet',
    value: '99',
  }
  const rsp = await fetch(`${serverURL}/${Endpoint.SetPersistence}`, {
    body: JSON.stringify(req),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  assert.deepEqual<SetPersistenceRsp>(await rsp.json(), {ok: true})
  assert.equal(redisValues.get('user:test-user:hell-dice-shooter-wallet'), '99')
})

test('wrong method', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.SetPersistence}`)
  assert.equal(rsp.status, 404)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'not found',
    status: 404,
  })
})

test('404', async () => {
  const rsp = await fetch(serverURL)
  assert.equal(rsp.status, 404)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'not found',
    status: 404,
  })
})

test('submit leaderboard score', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitLeaderboard}`, {
    body: JSON.stringify({score: 120}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as SubmitLeaderboardRsp
  const me = body.post.entries.find(entry => entry.username === 'test-user')
  assert.ok(me)
  assert.equal(me.score, 120)
  assert.deepEqual(body.post.me, me)
})

test('submit leaderboard keeps higher score only', async () => {
  await fetch(`${serverURL}/${Endpoint.SubmitLeaderboard}`, {
    body: JSON.stringify({score: 200}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitLeaderboard}`, {
    body: JSON.stringify({score: 150}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const body = (await rsp.json()) as SubmitLeaderboardRsp
  // 200점은 글로벌 Top10 밖일 수 있음 → me / meOutOfRange로 검증
  const score = body.global.me?.score ?? body.global.meOutOfRange?.score ?? null
  assert.equal(score, 200)
})

test('get leaderboard ranks multiple users', async () => {
  await redis.zAdd('leaderboard:global', {member: 'alpha', score: 50})
  await redis.zAdd('leaderboard:global', {member: 'test-user', score: 3000})
  await redis.zAdd('leaderboard:global', {member: 'bravo', score: 75})

  const rsp = await fetch(`${serverURL}/${Endpoint.GetLeaderboard}`)
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as GetLeaderboardRsp
  assert.equal(body.global.entries[0]?.username, 'test-user')
  assert.equal(body.global.me?.rank, 1)
  assert.equal(body.global.me?.score, 3000)
  assert.ok(body.global.entries.some(entry => entry.username === 'alpha'))
})

test('get leaderboard returns empty when no scores', async () => {
  redisSortedSets.delete('leaderboard:global')
  redisSortedSets.delete('leaderboard:post:default')

  const rsp = await fetch(`${serverURL}/${Endpoint.GetLeaderboard}`)
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as GetLeaderboardRsp
  assert.equal(body.post.entries.length, 0)
  assert.equal(body.global.entries.length, 0)
})

test('submit leaderboard stores user score', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitLeaderboard}`, {
    body: JSON.stringify({score: 50}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as SubmitLeaderboardRsp
  assert.equal(body.post.entries.length, 1)
  assert.equal(body.post.entries[0]?.username, 'test-user')
  assert.equal(body.global.entries.length, 1)
  assert.equal(body.global.entries[0]?.username, 'test-user')
})

test('get tombstones returns empty when none stored', async () => {
  redisHashes.delete('tombstone:post:t3_123')

  const rsp = await fetch(`${serverURL}/${Endpoint.GetTombstones}`)
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as GetTombstonesRsp
  assert.equal(body.me, 'test-user')
  assert.equal(body.tombstones.length, 0)
})

test('upsert tombstone and list', async () => {
  const upsertRsp = await fetch(`${serverURL}/${Endpoint.UpsertTombstone}`, {
    body: JSON.stringify({
      score: 15400,
      triggerMs: 120000,
      coinsAtDeath: 350,
      deathReasonId: 0,
      monsterKills: 142,
      bossKills: 1,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(upsertRsp.status, 200)
  const upsertBody = (await upsertRsp.json()) as UpsertTombstoneRsp
  assert.equal(upsertBody.updated, true)
  assert.equal(upsertBody.record?.score, 15400)
  assert.equal(upsertBody.record?.triggerMs, 120000)

  const listRsp = await fetch(`${serverURL}/${Endpoint.GetTombstones}`)
  const listBody = (await listRsp.json()) as GetTombstonesRsp
  const mine = listBody.tombstones.find(t => t.username === 'test-user')
  assert.ok(mine)
  assert.equal(mine.score, 15400)
  assert.equal(mine.triggerMs, 120000)
})

test('upsert tombstone skipped under min play time', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.UpsertTombstone}`, {
    body: JSON.stringify({
      score: 1000,
      triggerMs: 15000,
      coinsAtDeath: 10,
      deathReasonId: 0,
      monsterKills: 5,
      bossKills: 0,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as UpsertTombstoneRsp
  assert.equal(body.updated, false)
  assert.equal(body.record, null)
})

test('submit tombstone comment without tombstone', async () => {
  const commentRsp = await fetch(`${serverURL}/${Endpoint.SubmitTombstoneComment}`, {
    body: JSON.stringify({
      score: 5000,
      triggerMs: 60000,
      deathReasonId: 0,
      monsterKills: 50,
      bossKills: 0,
      isNewRecord: false,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(commentRsp.status, 200)
  const commentBody = (await commentRsp.json()) as SubmitTombstoneCommentRsp
  assert.equal(commentBody.submitted, true)
})

test('submit tombstone comment after upsert', async () => {
  const upsertRsp = await fetch(`${serverURL}/${Endpoint.UpsertTombstone}`, {
    body: JSON.stringify({
      score: 20000,
      triggerMs: 180000,
      coinsAtDeath: 500,
      deathReasonId: 2,
      monsterKills: 200,
      bossKills: 3,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(upsertRsp.status, 200)

  const commentRsp = await fetch(`${serverURL}/${Endpoint.SubmitTombstoneComment}`, {
    body: JSON.stringify({
      score: 20000,
      triggerMs: 180000,
      deathReasonId: 2,
      monsterKills: 200,
      bossKills: 3,
      isNewRecord: true,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(commentRsp.status, 200)
  const commentBody = (await commentRsp.json()) as SubmitTombstoneCommentRsp
  assert.equal(commentBody.submitted, true)
})

test('submit tombstone comment respects regular cooldown', async () => {
  const payload = {
    score: 8000,
    triggerMs: 90000,
    deathReasonId: 1,
    monsterKills: 80,
    bossKills: 1,
    isNewRecord: false,
  }
  const firstRsp = await fetch(`${serverURL}/${Endpoint.SubmitTombstoneComment}`, {
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(firstRsp.status, 200)
  const firstBody = (await firstRsp.json()) as SubmitTombstoneCommentRsp
  assert.equal(firstBody.submitted, true)

  const secondRsp = await fetch(`${serverURL}/${Endpoint.SubmitTombstoneComment}`, {
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(secondRsp.status, 200)
  const secondBody = (await secondRsp.json()) as SubmitTombstoneCommentRsp
  assert.equal(secondBody.submitted, false)
  assert.ok((secondBody.cooldownRemainingMs ?? 0) > TOMBSTONE_COMMENT_COOLDOWN_REGULAR_MS - 5000)
})

test('submit tombstone comment respects new record cooldown', async () => {
  const payload = {
    score: 12000,
    triggerMs: 120000,
    deathReasonId: 2,
    monsterKills: 120,
    bossKills: 1,
    isNewRecord: true,
  }
  const firstRsp = await fetch(`${serverURL}/${Endpoint.SubmitTombstoneComment}`, {
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(firstRsp.status, 200)
  const firstBody = (await firstRsp.json()) as SubmitTombstoneCommentRsp
  assert.equal(firstBody.submitted, true)

  const secondRsp = await fetch(`${serverURL}/${Endpoint.SubmitTombstoneComment}`, {
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(secondRsp.status, 200)
  const secondBody = (await secondRsp.json()) as SubmitTombstoneCommentRsp
  assert.equal(secondBody.submitted, false)
  assert.ok(
    (secondBody.cooldownRemainingMs ?? 0) > TOMBSTONE_COMMENT_COOLDOWN_NEW_RECORD_MS - 5000,
  )
})

test('battle report omits tombstone line under min play time', () => {
  const section = buildBattleReportPersonalSection({
    score: 9000,
    triggerMs: TOMBSTONE_MIN_PLAY_MS - 1,
    deathReasonId: 0,
    monsterKills: 40,
    isNewRecord: true,
  })
  assert.ok(!section.includes('비석을 세웠습니다'))
  assert.ok(section.includes('경신했습니다'))
})

test('battle report includes tombstone line at min play time', () => {
  const section = buildBattleReportPersonalSection({
    score: 9000,
    triggerMs: TOMBSTONE_MIN_PLAY_MS,
    deathReasonId: 0,
    monsterKills: 40,
    isNewRecord: true,
  })
  assert.ok(section.includes('비석을 세웠습니다'))
})

test('upsert tombstone keeps higher trigger only', async () => {
  await fetch(`${serverURL}/${Endpoint.UpsertTombstone}`, {
    body: JSON.stringify({
      score: 100,
      triggerMs: 200000,
      coinsAtDeath: 10,
      deathReasonId: 1,
      monsterKills: 50,
      bossKills: 2,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const lowRsp = await fetch(`${serverURL}/${Endpoint.UpsertTombstone}`, {
    body: JSON.stringify({
      score: 99999,
      triggerMs: 50000,
      coinsAtDeath: 99,
      deathReasonId: 2,
      monsterKills: 10,
      bossKills: 0,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const lowBody = (await lowRsp.json()) as UpsertTombstoneRsp
  assert.equal(lowBody.updated, false)
  assert.equal(lowBody.record?.triggerMs, 200000)
})

test('claim tombstones deletes and returns bonus', async () => {
  const record = {
    score: 8200,
    triggerMs: 90000,
    coinsAtDeath: 200,
    deathReasonId: 3,
    updatedAt: 1,
  }
  await redis.hSet('tombstone:post:t3_123', {
    other_user: JSON.stringify(record),
  })

  const rsp = await fetch(`${serverURL}/${Endpoint.ClaimTombstones}`, {
    body: JSON.stringify({usernames: ['other_user']}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as ClaimTombstonesRsp
  assert.equal(body.claimed.length, 1)
  assert.equal(body.totalCoinBonus, 20)
  assert.equal(
    (await redis.hGet('tombstone:post:t3_123', 'other_user')) ?? null,
    null,
  )
})

test('claim rejects own tombstone', async () => {
  await fetch(`${serverURL}/${Endpoint.UpsertTombstone}`, {
    body: JSON.stringify({
      score: 100,
      triggerMs: 10000,
      coinsAtDeath: 50,
      deathReasonId: 0,
      monsterKills: 5,
      bossKills: 0,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const rsp = await fetch(`${serverURL}/${Endpoint.ClaimTombstones}`, {
    body: JSON.stringify({usernames: ['test-user']}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 400)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'cannot claim own tombstone',
    status: 400,
  })
})

test('validateRunKills clamps by elapsed time', () => {
  const mild = validateRunKills({
    monsterKills: 200,
    runElapsedMs: 10_000,
  })
  assert.equal(mild.acceptedMonsterKills, 120)
  assert.equal(mild.rejected, false)

  const absurd = validateRunKills({
    monsterKills: 9999,
    runElapsedMs: 10_000,
  })
  assert.equal(absurd.acceptedMonsterKills, 0)
  assert.equal(absurd.rejected, true)
  assert.equal(absurd.reason, 'absurd')
})

test('get weekly defense status initial', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.GetWeeklyDefense}`)
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as GetWeeklyDefenseRsp
  assert.equal(body.kills, 0)
  assert.equal(body.target, WEEKLY_DEFENSE_CONFIG.baseTarget)
  assert.equal(body.buffActive, false)
  assert.equal(body.percent, 0)
  assert.equal(body.myKills, 0)
  assert.equal(body.myPercent, 0)
})

test('contribute weekly defense accumulates kills', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.ContributeWeeklyDefense}`, {
    body: JSON.stringify({
      monsterKills: 300,
      runElapsedMs: 60_000,
      bossKills: 1,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as ContributeWeeklyDefenseRsp
  assert.equal(body.contributed, 300)
  assert.equal(body.kills, 300)
  assert.equal(body.myKills, 300)
  assert.equal(body.myPercent, 100)
  assert.equal(body.rejected, false)
})

test('contribute rejects absurd kill spam', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.ContributeWeeklyDefense}`, {
    body: JSON.stringify({
      monsterKills: 9999,
      runElapsedMs: 10_000,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const body = (await rsp.json()) as ContributeWeeklyDefenseRsp
  assert.equal(body.contributed, 0)
  assert.equal(body.rejected, true)
  assert.equal(body.kills, 0)
})

test('contribute short run yields zero kills', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.ContributeWeeklyDefense}`, {
    body: JSON.stringify({
      monsterKills: 50,
      runElapsedMs: 1000,
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const body = (await rsp.json()) as ContributeWeeklyDefenseRsp
  assert.equal(body.contributed, 0)
})

test('weekly lazy reset on success increases target and enables buff', async () => {
  const thisWeek = mondayUtcWeekStartMs()
  const lastWeek = thisWeek - 7 * 24 * 60 * 60 * 1000
  redisValues.set('global:kills', '15000')
  redisValues.set('global:target', '10000')
  redisValues.set('global:buff_active', '0')
  redisValues.set('global:last_reset_ms', String(lastWeek))

  setWeeklyDefenseNowMsForTests(thisWeek + 60_000)

  const rsp = await fetch(`${serverURL}/${Endpoint.GetWeeklyDefense}`)
  const body = (await rsp.json()) as GetWeeklyDefenseRsp
  assert.equal(body.kills, 0)
  assert.equal(body.buffActive, true)
  assert.equal(body.target, 15_000)
})

test('weekly lazy reset on failure lowers target and disables buff', async () => {
  const thisWeek = mondayUtcWeekStartMs()
  const lastWeek = thisWeek - 7 * 24 * 60 * 60 * 1000
  redisValues.set('global:kills', '5000')
  redisValues.set('global:target', '10000')
  redisValues.set('global:buff_active', '1')
  redisValues.set('global:last_reset_ms', String(lastWeek))

  setWeeklyDefenseNowMsForTests(thisWeek + 60_000)

  const rsp = await fetch(`${serverURL}/${Endpoint.GetWeeklyDefense}`)
  const body = (await rsp.json()) as GetWeeklyDefenseRsp
  assert.equal(body.kills, 0)
  assert.equal(body.buffActive, false)
  assert.equal(body.target, 7000)
})

test('contribute requires runElapsedMs', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.ContributeWeeklyDefense}`, {
    body: JSON.stringify({monsterKills: 10}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 400)
})
