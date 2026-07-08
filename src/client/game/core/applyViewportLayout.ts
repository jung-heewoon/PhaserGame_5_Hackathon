import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';

/** CrazyGames iframe: 16:9 박스 CSS 변수 (GameDisplayConfig와 동기화) */
export function applyViewportLayout(): void {
  const root = document.documentElement;
  root.style.setProperty('--game-design-w', String(GAME_DESIGN_WIDTH));
  root.style.setProperty('--game-design-h', String(GAME_DESIGN_HEIGHT));
}
