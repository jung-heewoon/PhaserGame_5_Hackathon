import {once} from 'node:events'
import type {IncomingMessage, ServerResponse} from 'node:http'
import {context, reddit} from '@devvit/web/server'
import type {
  PartialJsonValue,
  TriggerResponse,
  UiResponse,
} from '@devvit/web/shared'
import {
  Endpoint,
  EndpointMethod,
  type ErrorRsp,
  type GetLeaderboardRsp,
  type GetPersistenceBulkRsp,
  type SetPersistenceReq,
  type SetPersistenceRsp,
  type SubmitLeaderboardReq,
  type SubmitLeaderboardRsp,
} from '../shared/api.ts'
import {dbGetPersistenceBulk, dbGetUsername, dbSetPersistence} from './db.ts'
import {getLeaderboards, submitLeaderboardScore} from './leaderboard.ts'

type AnyRsp =
  | GetPersistenceBulkRsp
  | GetLeaderboardRsp
  | SetPersistenceRsp
  | SubmitLeaderboardRsp
  | UiResponse
  | TriggerResponse
  | ErrorRsp

export async function onReq(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  try {
    await route(reqMsg, rspMsg)
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`
    console.error(msg)
    writeJson<ErrorRsp>(500, {error: msg, status: 500}, rspMsg)
  }
}

async function route(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  const endpoint = parseEndpoint(reqMsg.url)
  const method =
    endpoint in EndpointMethod
      ? EndpointMethod[endpoint as Endpoint]
      : undefined

  let rsp: AnyRsp
  if (!method || method !== reqMsg.method) {
    rsp = {error: 'not found', status: 404}
  } else {
    switch (endpoint) {
      case Endpoint.GetPersistenceBulk:
        rsp = await routeGetPersistenceBulk()
        break
      case Endpoint.SetPersistence:
        rsp = await routeSetPersistence(reqMsg)
        break
      case Endpoint.GetLeaderboard:
        rsp = await routeGetLeaderboard()
        break
      case Endpoint.SubmitLeaderboard:
        rsp = await routeSubmitLeaderboard(reqMsg)
        break
      case Endpoint.OnMenuNewPost:
        rsp = await routeMenuNewPost()
        break
      case Endpoint.OnAppInstall:
        rsp = await routeAppInstall()
        break
      default:
        rsp = {error: 'not found', status: 404}
        break
    }
  }

  writeJson<PartialJsonValue>('status' in rsp ? rsp.status : 200, rsp, rspMsg)
}

function parseEndpoint(url: string | undefined): Endpoint | string {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname.slice(1)
  return pathname
}

async function routeGetPersistenceBulk(): Promise<GetPersistenceBulkRsp> {
  const username = await dbGetUsername()
  return {values: await dbGetPersistenceBulk(username)}
}

async function routeSetPersistence(
  reqMsg: IncomingMessage,
): Promise<SetPersistenceRsp | ErrorRsp> {
  const req = await readJson<SetPersistenceReq>(reqMsg)
  if (!req.key || req.value === undefined) {
    return {error: 'key and value required', status: 400}
  }
  const username = await dbGetUsername()
  await dbSetPersistence(username, req.key, req.value)
  return {ok: true}
}

async function routeGetLeaderboard(): Promise<GetLeaderboardRsp> {
  const username = await dbGetUsername()
  return getLeaderboards(username, context.postId)
}

async function routeSubmitLeaderboard(
  reqMsg: IncomingMessage,
): Promise<SubmitLeaderboardRsp | ErrorRsp> {
  const req = await readJson<SubmitLeaderboardReq>(reqMsg)
  if (req.score === undefined || !Number.isFinite(req.score)) {
    return {error: 'score required', status: 400}
  }
  const username = await dbGetUsername()
  return submitLeaderboardScore(username, context.postId, req.score)
}

async function routeMenuNewPost(): Promise<UiResponse> {
  const post = await reddit.submitCustomPost({title: context.appSlug})
  return {
    showToast: {text: `Post ${post.id} created.`, appearance: 'success'},
    navigateTo: post.url,
  }
}

async function routeAppInstall(): Promise<TriggerResponse> {
  await reddit.submitCustomPost({title: context.appSlug})
  return {}
}

async function readJson<T>(reqMsg: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = []
  reqMsg.on('data', chunk => chunks.push(chunk))
  await once(reqMsg, 'end')
  return JSON.parse(`${Buffer.concat(chunks)}`)
}

function writeJson<T extends PartialJsonValue>(
  status: number,
  json: Readonly<T>,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json)
  const len = Buffer.byteLength(body)
  rsp.writeHead(status, {
    'Content-Length': len,
    'Content-Type': 'application/json',
  })
  rsp.end(body)
}
