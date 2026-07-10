/** Redis / API tombstone record (post-scoped, 1 per user). */
export type TombstoneRecord = {
  username: string
  score: number
  triggerMs: number
  coinsAtDeath: number
  deathReasonId: number
  updatedAt: number
}

export const DEATH_REASON_COUNT = 20

/** 비석을 남길 수 있는 최소 생존 시간 (ms) */
export const TOMBSTONE_MIN_PLAY_MS = 30_000

/** 전사 보고서 댓글 재송신 쿨다운 — 신기록 (ms) */
export const TOMBSTONE_COMMENT_COOLDOWN_NEW_RECORD_MS = 5 * 60 * 1000

/** 전사 보고서 댓글 재송신 쿨다운 — 일반 사망 (ms) */
export const TOMBSTONE_COMMENT_COOLDOWN_REGULAR_MS = 30 * 60 * 1000

export function tombstoneCommentCooldownMs(isNewRecord: boolean): number {
  return isNewRecord
    ? TOMBSTONE_COMMENT_COOLDOWN_NEW_RECORD_MS
    : TOMBSTONE_COMMENT_COOLDOWN_REGULAR_MS
}

export type BattleReportPersonalInput = {
  score: number
  triggerMs: number
  deathReasonId: number
  monsterKills: number
  isNewRecord: boolean
}

/** Reddit 전사 보고서 [개인 기록] 본문 — 30초 미만이면 비석 문구 생략 */
export function buildBattleReportPersonalSection(
  input: BattleReportPersonalInput,
): string {
  const score = Math.max(0, Math.floor(input.score))
  const triggerMs = Math.max(0, Math.floor(input.triggerMs))
  const monsterKills = Math.max(0, Math.floor(input.monsterKills))
  const reason = deathReasonCommentText(input.deathReasonId)
  const tombstonePlaced = triggerMs >= TOMBSTONE_MIN_PLAY_MS

  if (input.isNewRecord) {
    const highScoreLine = tombstonePlaced
      ? `Set a new personal best of **[${score.toLocaleString()} pts]** and placed a tombstone on the ridge.`
      : `Set a new personal best of **[${score.toLocaleString()} pts]**.`
    return (
      `Eliminated [${monsterKills.toLocaleString()}] alien horrors this run!\n` +
      `${highScoreLine}\n` +
      `(Cause of death): ${reason}.`
    )
  }

  return (
    `Eliminated [${monsterKills.toLocaleString()}] alien horrors this run — ` +
    `survived **${score.toLocaleString()} pts** / **${formatRunElapsedMs(triggerMs)}**.\n` +
    `(Cause of death): ${reason}.`
  )
}

/** ms → m:ss */
export function formatRunElapsedMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/** Server-side death reason text for Reddit comments (English). */
export const DEATH_REASON_COMMENT_EN: readonly string[] = [
  'clawed by a demon\'s nails',
  'locked eyes with a mob while rolling dice',
  'absorbed by the Bringer\'s beam',
  'blown up by an overheated minigun',
  'while staring at the Yatzy popup',
  'threw out their back picking up coins',
  'knocked away by railgun recoil',
  'caught in their own nuke',
  'impaled on a Guardian spike',
  'fell beyond the fog',
  'got cocky showing off a combo',
  'ran dry without opening Yatzy',
  'tangled both hands on dual pistols',
  'shot themselves with a shotgun',
  'slammed into a wall chasing a missile',
  'ambushed while opening a boss chest',
  'surrendered to five ones on the dice',
  'got lost practicing poker hands',
  'distracted reading Reddit comments',
  'tripped trying to step on a tombstone',
]

export function deathReasonCommentText(reasonId: number): string {
  const idx = Math.max(
    0,
    Math.min(DEATH_REASON_COUNT - 1, Math.floor(reasonId)),
  )
  return (
    DEATH_REASON_COMMENT_EN[idx] ?? DEATH_REASON_COMMENT_EN[0] ?? 'fell in battle'
  )
}

export function tombstoneCoinBonus(coinsAtDeath: number, ratio = 0.1): number {
  return Math.max(0, Math.floor(Math.max(0, coinsAtDeath) * ratio))
}

export function pickRandomDeathReasonId(): number {
  return Math.floor(Math.random() * DEATH_REASON_COUNT)
}
