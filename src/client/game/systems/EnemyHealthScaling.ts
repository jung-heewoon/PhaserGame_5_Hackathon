import { ENEMY_CONFIG } from '../config/EnemyConfig.ts';

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** 끝 구간 빠름 — softCap 해제 등 */
export function easeOutQuad(t: number): number {
  const c = clamp01(t);
  return 1 - (1 - c) * (1 - c);
}

/** 초반 유지 — earlyScale·timeMult 완만 상승 */
function easeInQuad(t: number): number {
  const c = clamp01(t);
  return c * c;
}

function healthTimeMultiplier(elapsedSec: number): number {
  const rampSec = ENEMY_CONFIG.healthTimeScaleRampSec;
  const capSec = ENEMY_CONFIG.healthPostCapStartSec;
  const perSec = ENEMY_CONFIG.healthTimeScalePerSec;

  const primaryT = easeInQuad(Math.min(elapsedSec, rampSec) / rampSec);
  const primaryMult = 1 + primaryT * rampSec * perSec;

  if (elapsedSec <= capSec) {
    return primaryMult;
  }

  const capPrimaryT = easeInQuad(Math.min(capSec, rampSec) / rampSec);
  const multAtCap = 1 + capPrimaryT * rampSec * perSec;
  const postSec = elapsedSec - capSec;
  return multAtCap + postSec * ENEMY_CONFIG.healthPostCapScalePerSec;
}

/** 초반 per-enemy 체력 분산 — 마릿수↑ 대신 1마리 HP↓ */
export function getEarlyHealthScale(elapsedRunMs: number): number {
  const elapsedSec = elapsedRunMs / 1000;
  const rampSec = ENEMY_CONFIG.earlyHealthScaleEndSec;
  if (elapsedSec >= rampSec) return 1;
  const t = easeInQuad(elapsedSec / rampSec);
  const start = ENEMY_CONFIG.earlyHealthScaleStart;
  return start + (1 - start) * t;
}

function applyHealthCap(hp: number, fullHp: number, elapsedSec: number): number {
  const hardCapUntil = ENEMY_CONFIG.earlyHealthCapUntilSec;
  const softCapEnd = ENEMY_CONFIG.earlyHealthSoftCapEndSec;
  const capHp = ENEMY_CONFIG.earlyHealthCap;

  if (elapsedSec < hardCapUntil) {
    return Math.min(hp, capHp);
  }
  if (elapsedSec < softCapEnd) {
    const span = Math.max(1, softCapEnd - hardCapUntil);
    const t = easeOutQuad((elapsedSec - hardCapUntil) / span);
    const softLimit = capHp + (fullHp - capHp) * t;
    return Math.min(hp, Math.max(capHp, Math.floor(softLimit)));
  }
  return hp;
}

/** 웨이브 hpMult는 SpawnDirector에서 곱함 */
export function computeEnemyHealth(
  typeId: number,
  elapsedRunMs: number,
  waveHpMult = 1,
): number {
  const elapsedSec = elapsedRunMs / 1000;
  const base = ENEMY_CONFIG.healthBase + typeId * ENEMY_CONFIG.healthPerType;
  const multiplier = healthTimeMultiplier(elapsedSec);
  const earlyScale = getEarlyHealthScale(elapsedRunMs);
  const fullHp = Math.max(1, Math.floor(base * multiplier * earlyScale));
  let hp = fullHp;
  hp = applyHealthCap(hp, fullHp, elapsedSec);
  if (waveHpMult !== 1) {
    hp = Math.max(1, Math.floor(hp * waveHpMult));
  }
  return hp;
}
