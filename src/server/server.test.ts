import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, reddit, redis, runWithContext} from '@devvit/web/server'
import {
  Endpoint,
  type ErrorRsp,
  type GetLeaderboardRsp,
  type GetPersistenceBulkRsp,
  type SetPersistenceReq,
  type SetPersistenceRsp,
  type SubmitLeaderboardRsp,
} from '../shared/api.ts'
import {onReq} from './server.ts'

type ZMember = {member: string; score: number}

let server: Server
let serverURL: string
const redisValues = new Map<string, string>()
const redisSortedSets = new Map<string, ZMember[]>()
const redisGet = redis.get.bind(redis)
const redisSet = redis.set.bind(redis)
const redisZAdd = redis.zAdd.bind(redis)
const redisZRange = redis.zRange.bind(redis)
const redisZRank = redis.zRank.bind(redis)
const redisZScore = redis.zScore.bind(redis)
const redisZCard = redis.zCard.bind(redis)
const redisZRemRangeByRank = redis.zRemRangeByRank.bind(redis)
const redditGetCurrentUsername = reddit.getCurrentUsername.bind(reddit)

function sortedSetFor(key: string): ZMember[] {
  let set = redisSortedSets.get(key)
  if (!set) {
    set = []
    redisSortedSets.set(key, set)
  }
  return set
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
  redis.zAdd = redisZAdd
  redis.zRange = redisZRange
  redis.zRank = redisZRank
  redis.zScore = redisZScore
  redis.zCard = redisZCard
  redis.zRemRangeByRank = redisZRemRangeByRank
  reddit.getCurrentUsername = redditGetCurrentUsername
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  redisValues.clear()
  redisSortedSets.clear()
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
  assert.ok(body.post.entries.some(entry => entry.username === 'dice_demon'))
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
  const score =
    body.global.me?.score ?? body.global.meOutOfRange?.score ?? null
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
  assert.ok(body.global.entries.some(entry => entry.username === 'global_champ'))
})

test('get leaderboard seeds dummy users when empty', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.GetLeaderboard}`)
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as GetLeaderboardRsp
  assert.equal(body.post.entries.length, 10)
  assert.equal(body.post.entries[0]?.username, 'dice_demon')
  assert.equal(body.global.entries.length, 10)
  assert.equal(body.global.entries[0]?.username, 'global_champ')
})

test('submit after empty still keeps dummy users', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitLeaderboard}`, {
    body: JSON.stringify({score: 50}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as SubmitLeaderboardRsp
  assert.ok(body.post.entries.length >= 10)
  assert.ok(body.global.entries.length >= 10)
  assert.ok(body.post.entries.some(entry => entry.username === 'dice_demon'))
  assert.ok(body.post.entries.some(entry => entry.username === 'test-user'))
})
