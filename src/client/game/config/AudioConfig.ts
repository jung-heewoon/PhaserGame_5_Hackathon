import type { BossType } from './BossConfig.ts';

export interface BossBgmSegment {
  loopStart: number;
  loopEnd: number;
  outroStart: number;
  outroEnd: number;
  /** outro 재생 시 파일 끝에서 잘라낼 길이(초) */
  outroTailCutSec?: number;
}

/** SFX·BGM 볼륨·세그먼트 튜닝 — 수치는 여기서만 조정. */
export const AUDIO_CONFIG = {
  /** localStorage 키 (0–100 정수) */
  sfxVolumeStorageKey: 'hell-dice-shooter-sfx-volume',
  /** HTML 기본 슬라이더 값과 일치 */
  defaultSfxVolume: 60,
  /** BGM localStorage 키 (0–100 정수) */
  bgmVolumeStorageKey: 'hell-dice-shooter-bgm-volume',
  /** HTML 기본 BGM 슬라이더 값과 일치 */
  defaultBgmVolume: 60,
  /** 야찌·설정 팝업 중 BGM duck 배율 (전투·보스 공통, full vol에 곱함) */
  modalDuckVolumeMult: 0.15,
  /** 보스 BGM 세그먼트 (초) — intro는 0부터 loopStart 직전까지 */
  bossSegments: {
    demon: { loopStart: 1.6, loopEnd: 10, outroStart: 10, outroEnd: 12, outroTailCutSec: 0.7 },
    bringer: { loopStart: 2.5, loopEnd: 11.6, outroStart: 11.6, outroEnd: 13.3 },
    guardian: { loopStart: 0.4, loopEnd: 6.4, outroStart: 6.4, outroEnd: 7.7 },
  } satisfies Record<BossType, BossBgmSegment>,
  /** MissileLauncher.wav — 발사 시 앞부분 재생 길이(초) */
  missileLauncherFireSec: 1.0,
  /** MissileLauncher.wav — 폭발 시 seek 시작점(초). 전체 길이 ~2.16s */
  missileLauncherExplodeStartSec: 1.0,
  /** Minigun.mp3 — 루프 시 끝에서 잘라낼 tail 길이(초). 손 뗄 때 이 구간만 재생 */
  minigunLoopTailSec: 0.2,
  /** 미사일 발사/폭발 동시 재생 풀 크기 */
  missileSoundPoolSize: 6,
  /** DiceRoll.mp3 — 한 번 굴릴 때 겹쳐 재생할 횟수 */
  diceRollBurstCount: 3,
  /** DiceRoll.mp3 — burst 간 지연(ms). 약간 불규칙하게 재생해 여러 주사위 느낌 */
  diceRollBurstDelaysMs: [0, 52, 118],
  /** DiceRoll.mp3 — 글로벌 SFX 슬라이더 추가 배율 */
  diceRollVolumeMult: 1.55,
  /** 게임오버 스팅 이후 기본 BGM 루프 배율 (전투 full 대비, 팝업 duck 0.15보다 큼) */
  postGameOverBgmVolumeMult: 0.45,
  /** BossClear.wav — SFX 슬라이더 추가 배율 */
  bossSuccessVolumeMult: 0.6,
  /** BossDie.wav — die 스프라이트 시작 시 SFX 슬라이더 추가 배율 */
  bossDieVolumeMult: 1,
  /** BossWarnig.wav — 보스 경고 알람 2회 재생 간 지연(ms) */
  bossWarningBurstDelaysMs: [0, 1150],
  /** BossWarnig.wav — SFX 슬라이더 추가 배율 */
  bossWarningVolumeMult: 0.85,
  /** GameOver.mp3 — SFX 슬라이더 추가 배율 */
  gameOverVolumeMult: 0.6,
  /** CoinGet.mp3 — SFX 슬라이더 추가 배율 */
  coinGetVolumeMult: 1,
  /** CoinGet.mp3 — 연속 도착 시 최소 재생 간격(ms). 너무 촘촘하면 스킵 */
  coinGetMinIntervalMs: 90,
  /** CoinGet.mp3 — 동시 겹침 재생 풀 크기 */
  coinGetSoundPoolSize: 4,
  /** 무기별 SFX 추가 배율 (글로벌 SFX 슬라이더에 곱함) */
  weaponSfxVolumeMult: {
    pistol: 1.7,
    revolver: 0.45,
    shotgun: 0.6,
    beamGun: 0.55,
    missileLauncher: 0.45,
  },
} as const;
