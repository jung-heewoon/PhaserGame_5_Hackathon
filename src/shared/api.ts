/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

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

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetPersistenceBulk: 'api/persistence/bulk',
  SetPersistence: 'api/persistence/set',
  GetLeaderboard: 'api/leaderboard',
  SubmitLeaderboard: 'api/leaderboard/submit',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
} as const

export const EndpointMethod = {
  [Endpoint.GetPersistenceBulk]: 'GET',
  [Endpoint.SetPersistence]: 'POST',
  [Endpoint.GetLeaderboard]: 'GET',
  [Endpoint.SubmitLeaderboard]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
