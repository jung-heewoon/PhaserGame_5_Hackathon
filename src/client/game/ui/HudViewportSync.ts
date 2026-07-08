import Phaser from 'phaser'
import {GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH} from '../config/GameDisplayConfig.ts'
import {refreshPhaserScaleLayout} from '../core/patchPhaserScaleForCssRotate.ts'

/** DOM HUD를 Phaser 캔버스와 1:1 동기화 (#game-shell 로컬, CSS rotate 무시) */
export function bindHudViewportSync(game: Phaser.Game): () => void {
  const hud = document.getElementById('doom-hud-layer')
  const shell = document.getElementById('game-shell')
  const app = document.getElementById('app')
  if (!hud || !shell || !app) return () => {}

  const sync = (): void => {
    const canvas = game.canvas
    if (!canvas.isConnected) return

    const canvasW = canvas.offsetWidth
    const canvasH = canvas.offsetHeight
    if (canvasW <= 0 || canvasH <= 0) return

    // #app 이 flex center이므로 canvas offset은 app 기준 → app의을 shell에 더함
    const scale = canvasW / GAME_DESIGN_WIDTH
    const left = app.offsetLeft + canvas.offsetLeft
    const top = app.offsetTop + canvas.offsetTop

    hud.style.left = `${left}px`
    hud.style.top = `${top}px`
    hud.style.width = `${GAME_DESIGN_WIDTH}px`
    hud.style.height = `${GAME_DESIGN_HEIGHT}px`
    hud.style.transformOrigin = 'top left'
    hud.style.transform = `scale(${scale})`
  }

  const refreshScaleAndHud = (): void => {
    refreshPhaserScaleLayout(game)
    requestAnimationFrame(sync)
  }

  game.scale.on('resize', sync)
  window.addEventListener('resize', refreshScaleAndHud)
  window.addEventListener('orientationchange', refreshScaleAndHud)

  const observer = new ResizeObserver(refreshScaleAndHud)
  observer.observe(shell)
  observer.observe(app)

  refreshScaleAndHud()
  requestAnimationFrame(sync)

  return () => {
    game.scale.off('resize', sync)
    window.removeEventListener('resize', refreshScaleAndHud)
    window.removeEventListener('orientationchange', refreshScaleAndHud)
    observer.disconnect()
  }
}
