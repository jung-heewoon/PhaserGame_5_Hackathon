import Phaser from 'phaser';
import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';

/** DOM HUD를 Phaser 캔버스 bounds·스케일과 1:1 동기화 */
export function bindHudViewportSync(game: Phaser.Game): () => void {
  const hud = document.getElementById('doom-hud-layer');
  const shell = document.getElementById('game-shell');
  if (!hud || !shell) return () => {};

  const sync = (): void => {
    const canvas = game.canvas;
    if (!canvas.isConnected) return;

    const shellRect = shell.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

    const scale = canvasRect.width / GAME_DESIGN_WIDTH;

    hud.style.left = `${canvasRect.left - shellRect.left}px`;
    hud.style.top = `${canvasRect.top - shellRect.top}px`;
    hud.style.width = `${GAME_DESIGN_WIDTH}px`;
    hud.style.height = `${GAME_DESIGN_HEIGHT}px`;
    hud.style.transformOrigin = 'top left';
    hud.style.transform = `scale(${scale})`;
  };

  game.scale.on('resize', sync);
  window.addEventListener('resize', sync);

  const observer = new ResizeObserver(sync);
  observer.observe(shell);
  observer.observe(game.canvas);

  sync();
  requestAnimationFrame(sync);

  return () => {
    game.scale.off('resize', sync);
    window.removeEventListener('resize', sync);
    observer.disconnect();
  };
}
