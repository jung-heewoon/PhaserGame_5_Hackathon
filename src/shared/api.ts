/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

/** Bulk persistence values for the current user. */
export type GetPersistenceBulkRsp = {values: Record<string, string>}

/** Set a single persistence key for the current user. */
export type SetPersistenceReq = {key: string; value: string}
export type SetPersistenceRsp = {ok: true}

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetPersistenceBulk: 'api/persistence/bulk',
  SetPersistence: 'api/persistence/set',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
} as const

export const EndpointMethod = {
  [Endpoint.GetPersistenceBulk]: 'GET',
  [Endpoint.SetPersistence]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
