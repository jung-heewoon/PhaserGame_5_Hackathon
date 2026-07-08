import Phaser from 'phaser'
import {
  applyViewportLayout,
  getLandscapeParentSize,
} from './applyViewportLayout.ts'

/**
 * CSS rotate(90deg) 환경에서 Phaser Scale이 깨지는 근본 원인:
 *
 * 1) getParentBounds() — parent.getBoundingClientRect() AABB (가로↔세로 스왑)
 * 2) updateCenter() — canvas.getBoundingClientRect()로 마진 계산 → 화면 밖으로 밀림
 * 3) updateBounds() — 동일 AABB를 canvasBounds에 저장 (입력 좌표도 어긋남)
 *
 * clientWidth/Height·offsetWidth/Height(레이아웃 크기)로 모두 교체한다.
 * boot-curtain은 CSS라 정상이고, Phaser canvas만 깨지던 이유다.
 */
export function patchPhaserScaleForCssRotate(game: Phaser.Game): void {
  const scale = game.scale

  scale.getParentBounds = function patchedGetParentBounds(
    this: Phaser.Scale.ScaleManager,
  ): boolean {
    if (!this.parent) return false

    const size = getLandscapeParentSize(this.parent as HTMLElement)
    if (size.width <= 0 || size.height <= 0) return false

    const parentSize = this.parentSize
    if (parentSize.width !== size.width || parentSize.height !== size.height) {
      parentSize.setSize(size.width, size.height)
      return true
    }

    if (this.canvas) {
      const canvasBounds = this.canvasBounds
      if (
        this.canvas.offsetLeft !== canvasBounds.x ||
        this.canvas.offsetTop !== canvasBounds.y
      ) {
        return true
      }
    }

    return false
  }

  scale.updateCenter = function patchedUpdateCenter(this: Phaser.Scale.ScaleManager): void {
    // NO_CENTER여도 안전하게: margin을 항상 0으로 고정 (CSS flex가 중앙정렬)
    if (!this.canvas) return
    this.canvas.style.marginLeft = '0px'
    this.canvas.style.marginTop = '0px'
  }

  scale.updateBounds = function patchedUpdateBounds(this: Phaser.Scale.ScaleManager): void {
    if (!this.canvas) return
    const bounds = this.canvasBounds
    // 레이아웃 좌표 (rotate AABB 금지). 터치는 주로 DOM 버튼이라 screen AABB 불필요.
    bounds.x = this.canvas.offsetLeft
    bounds.y = this.canvas.offsetTop
    bounds.width = this.canvas.offsetWidth
    bounds.height = this.canvas.offsetHeight
  }

  refreshPhaserScaleLayout(game)
}

export function refreshPhaserScaleLayout(game: Phaser.Game): void {
  applyViewportLayout()

  const parent = game.scale.parent as HTMLElement | null
  if (parent) {
    const size = getLandscapeParentSize(parent)
    if (size.width > 0 && size.height > 0) {
      game.scale.parentSize.setSize(size.width, size.height)
    }
  }

  game.scale.refresh()

  // FIT이 canvas style을 세팅한 뒤에도 margin이 남지 않게
  if (game.canvas) {
    game.canvas.style.marginLeft = '0px'
    game.canvas.style.marginTop = '0px'
  }
}
