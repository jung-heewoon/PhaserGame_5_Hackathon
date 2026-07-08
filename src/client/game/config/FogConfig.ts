/** TPF 단일 안개 대신 다겹 smoothstep 누적 (LayeredFog.ts 셰이더에서 사용) */
export interface FogLayer {
  /** 카메라에서 더 먼 depth — 이 지점부터 안개 시작 */
  far: number;
  /** 더 가까운 depth — 이 레이어 최대 농도 도달 */
  near: number;
  /** 0~1, 이 레이어가 기여하는 최대 fog mix */
  amount: number;
}

export interface FogVoidCurtain {
  /** depth가 이 값보다 멀면 void 커튼 0 */
  far: number;
  /** depth가 이 값보다 가까우면 void 커튼 1 (완전 가림) */
  near: number;
}

export const RUNNER_FOG_CONFIG = {
  color: 0x0a1018,
  /** 미생성 void·빈 타일이 비치지 않게 먼 거리를 강제로 막음 */
  voidCurtain: { far: 680, near: 440 } as const satisfies FogVoidCurtain,
  /** 가까운 쪽 → 먼 쪽: 마지막 레이어는 amount 1.0 */
  layers: [
    { far: 200, near: 120, amount: 0.06 },
    { far: 320, near: 220, amount: 0.20 },
    { far: 440, near: 330, amount: 0.45 },
    { far: 560, near: 430, amount: 0.78 },
    { far: 640, near: 500, amount: 1.0 },
  ] as const satisfies readonly FogLayer[],
} as const;

export function outerFogFar(): number {
  return Math.max(
    RUNNER_FOG_CONFIG.voidCurtain.far,
    RUNNER_FOG_CONFIG.layers[RUNNER_FOG_CONFIG.layers.length - 1]!.far,
  );
}

export function fogColorToRgb(color: number): [number, number, number] {
  return [
    ((color & 0xff0000) >> 16) / 255,
    ((color & 0x00ff00) >> 8) / 255,
    (color & 0x0000ff) / 255,
  ];
}

/** 주사위·적이 최외곽 안개 far 이후(깊은 쪽)에서 등장 — 안개를 뚫고 다가옴 */
export function fogSpawnAheadDistance(): number {
  return outerFogFar() + 64;
}

/** 스폰 Y에 더해 북쪽으로 흩뿌리는 여유 (view depth ≈ world ΔY) */
export function fogSpawnAheadJitterPx(): number {
  return 96;
}

/** 스폰·리사이클 트리거가 최외곽 안개 밖에 있지 않게 */
export function fogRecycleTriggerY(): number {
  return outerFogFar() + 192;
}

/** 몬스터 스폰 최소 전방 거리 — 최외곽 안개 레이어 far(안개 안쪽 가까운 경계) */
export function fogMinEnemySpawnAheadPx(): number {
  return RUNNER_FOG_CONFIG.layers[RUNNER_FOG_CONFIG.layers.length - 1]!.far;
}

/** spawnAheadDistance 대비 최소 깊이 비율 — 이보다 가까우면 안개 밖 스폰 규칙 위반 */
export function fogMinEnemySpawnAheadRatio(spawnAheadDistance = fogSpawnAheadDistance()): number {
  return fogMinEnemySpawnAheadPx() / spawnAheadDistance;
}
