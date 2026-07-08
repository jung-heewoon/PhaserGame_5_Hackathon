import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, reddit, redis, runWithContext} from '@devvit/web/server'
import {
  Endpoint,
  type ErrorRsp,
  type GetPersistenceBulkRsp,
  type SetPersistenceReq,
  type SetPersistenceRsp,
} from '../shared/api.ts'
import {onReq} from './server.ts'

let server: Server
let serverURL: string
const redisValues = new Map<string, string>()
const redisGet = redis.get.bind(redis)
const redisSet = redis.set.bind(redis)
const redditGetCurrentUsername = reddit.getCurrentUsername.bind(reddit)

before(async () => {
  redis.get = async key => redisValues.get(key) ?? undefined
  redis.set = async (key, value) => {
    redisValues.set(key, value)
    return 'OK'
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
  reddit.getCurrentUsername = redditGetCurrentUsername
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => redisValues.clear())

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
