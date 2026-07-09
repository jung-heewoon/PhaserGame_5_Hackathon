/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

import type {TombstoneRecord} from './tombstone.ts'

/** Bulk persistence values for the current user. */
export type GetPersistenceBulkRsp = {values: Record<string, string>}

/** Set a single persistence key for the current user. */
export type SetPersistenceReq = {key: string; value: string}
export type SetPersistenceRsp = {ok: true}

/** Leaderboard entry for a single player. */
export type LeaderboardEntry = {
  rank: number
  username: string
  score: number
}

/** Leaderboard data for one scope (post or global). */
export type LeaderboardScopeData = {
  entries: LeaderboardEntry[]
  me: LeaderboardEntry | null
  meOutOfRange?: {rank: number; score: number}
}

/** Submit a high score to post + global leaderboards. */
export type SubmitLeaderboardReq = {score: number}
export type SubmitLeaderboardRsp = {
  post: LeaderboardScopeData
  global: LeaderboardScopeData
}

/** Fetch current leaderboard standings. */
export type GetLeaderboardRsp = {
  post: LeaderboardScopeData
  global: LeaderboardScopeData
}

/** List tombstones for the current post (excludes anonymous). */
export type GetTombstonesRsp = {
  me: string
  tombstones: TombstoneRecord[]
}

/** Upsert the current user's tombstone on new survival record. */
export type UpsertTombstoneReq = {
  score: number
  triggerMs: number
  coinsAtDeath: number
  deathReasonId: number
}
export type UpsertTombstoneRsp = {
  ok: true
  updated: boolean
  record: TombstoneRecord | null
}

/** Claim other users' tombstones (1-time, deletes from Redis). */
export type ClaimTombstonesReq = {usernames: string[]}
export type ClaimTombstonesRsp = {
  ok: true
  claimed: TombstoneRecord[]
  totalCoinBonus: number
}

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetPersistenceBulk: 'api/persistence/bulk',
  SetPersistence: 'api/persistence/set',
  GetLeaderboard: 'api/leaderboard',
  SubmitLeaderboard: 'api/leaderboard/submit',
  GetTombstones: 'api/tombstone/list',
  UpsertTombstone: 'api/tombstone/upsert',
  ClaimTombstones: 'api/tombstone/claim',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
} as const

export const EndpointMethod = {
  [Endpoint.GetPersistenceBulk]: 'GET',
  [Endpoint.SetPersistence]: 'POST',
  [Endpoint.GetLeaderboard]: 'GET',
  [Endpoint.SubmitLeaderboard]: 'POST',
  [Endpoint.GetTombstones]: 'GET',
  [Endpoint.UpsertTombstone]: 'POST',
  [Endpoint.ClaimTombstones]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
