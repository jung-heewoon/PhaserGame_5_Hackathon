import type RunnerPlayerEntity from '../entities/RunnerPlayerEntity.ts';

/** 플레이어 중심 + aim 정렬 오프셋(전방·우측) → 월드 총구 좌표 */
export function aimAlignedMuzzlePoint(
  player: RunnerPlayerEntity,
  forwardPx: number,
  rightPx = 0,
): { x: number; y: number } {
  const cx = player.pos.x + player.size.x / 2;
  const cy = player.pos.y + player.size.y / 2;
  const angle = player.aimAngle;
  const perp = angle + Math.PI / 2;
  return {
    x: cx + Math.cos(angle) * forwardPx + Math.cos(perp) * rightPx,
    y: cy + Math.sin(angle) * forwardPx + Math.sin(perp) * rightPx,
  };
}
