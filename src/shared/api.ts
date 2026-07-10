/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

import type {TombstoneRecord} from './tombstone.ts'
import type {WeeklyDefenseStatus} from './weeklyDefense.ts'

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

/** Weekly subreddit defense status (lazy reset on read). */
export type GetWeeklyDefenseRsp = WeeklyDefenseStatus

/** Contribute run monster kills to the weekly global pool. */
export type ContributeWeeklyDefenseReq = {
  monsterKills: number
  runElapsedMs: number
  bossKills?: number
}
export type ContributeWeeklyDefenseRsp = WeeklyDefenseStatus & {
  contributed: number
  rejected?: boolean
}

/** Upsert the current user's tombstone at death (post-scoped, 1 per user). */
export type UpsertTombstoneReq = {
  score: number
  triggerMs: number
  coinsAtDeath: number
  deathReasonId: number
  monsterKills: number
  bossKills: number
}
export type UpsertTombstoneRsp = {
  ok: true
  updated: boolean
  record: TombstoneRecord | null
}

/** Post a battle report as a Reddit comment (explicit user action). */
export type SubmitTombstoneCommentReq = {
  score: number
  triggerMs: number
  deathReasonId: number
  monsterKills: number
  bossKills: number
  isNewRecord: boolean
}
export type SubmitTombstoneCommentRsp = {
  ok: true
  submitted: boolean
  cooldownRemainingMs?: number
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
  SubmitTombstoneComment: 'api/tombstone/submit-comment',
  ClaimTombstones: 'api/tombstone/claim',
  GetWeeklyDefense: 'api/weekly-defense/status',
  ContributeWeeklyDefense: 'api/weekly-defense/contribute',
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
  [Endpoint.SubmitTombstoneComment]: 'POST',
  [Endpoint.ClaimTombstones]: 'POST',
  [Endpoint.GetWeeklyDefense]: 'GET',
  [Endpoint.ContributeWeeklyDefense]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
