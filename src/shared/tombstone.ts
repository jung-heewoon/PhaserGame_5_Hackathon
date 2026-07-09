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

/** Server-side death reason text for Reddit comments (Korean). */
export const DEATH_REASON_COMMENT_KO: readonly string[] = [
  '악마의 손톱에 긁혀',
  '주사위 굴리다 몹이랑 눈이 맞아',
  '보스 브링어의 빔에 흡수되어',
  '미니건 과열로 총이 폭발하며',
  '야찌 팝업 보는 사이에',
  '코인 줍다가 허리를 삐끗해',
  '레일건 반동에 튕겨져 나가',
  '핵미사일 자폭 범위 안에서',
  '가디언 스파이크에 꿰뚫려',
  '안개 너머로 떨어져',
  '콤보 자랑하다 방심해서',
  '탄창 없는데 야찌 안 열어서',
  '듀얼 피스톨 반동에 양손이 꼬여',
  '샷건 근접전에서 자기 산탄에',
  '미사일 유도 실패로 벽에 박혀',
  '보스 상자 열려는데 몹에게 습격당해',
  '주사위 다섯 개가 동시에 1이 나와 운명에 굴복해',
  '런너 족보 연습하다 길을 잃어',
  'Reddit 댓글 읽다가 산만해져',
  '비석 밟으려다 발이 꼬여',
]

export function deathReasonCommentText(reasonId: number): string {
  const idx = Math.max(
    0,
    Math.min(DEATH_REASON_COUNT - 1, Math.floor(reasonId)),
  )
  return (
    DEATH_REASON_COMMENT_KO[idx] ?? DEATH_REASON_COMMENT_KO[0] ?? '전사하며'
  )
}

export function tombstoneCoinBonus(coinsAtDeath: number, ratio = 0.1): number {
  return Math.max(0, Math.floor(Math.max(0, coinsAtDeath) * ratio))
}

export function pickRandomDeathReasonId(): number {
  return Math.floor(Math.random() * DEATH_REASON_COUNT)
}
