import {reddit, redis} from '@devvit/web/server'
import {GAME_PERSISTENCE_KEYS} from '../shared/persistence.ts'

export async function dbGetPersistenceBulk(
  username: string,
): Promise<Record<string, string>> {
  const values: Record<string, string> = {}
  await Promise.all(
    GAME_PERSISTENCE_KEYS.map(async key => {
      const value = await redis.get(persistenceKey(username, key))
      if (value !== undefined && value !== null) {
        values[key] = value
      }
    }),
  )
  return values
}

export async function dbSetPersistence(
  username: string,
  key: string,
  value: string,
): Promise<void> {
  await redis.set(persistenceKey(username, key), value)
}

export async function dbGetUsername(): Promise<string> {
  return (await reddit.getCurrentUsername()) ?? 'anonymous'
}

function persistenceKey(username: string, key: string): string {
  return `user:${username}:${key}`
}
