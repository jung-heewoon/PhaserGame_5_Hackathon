import {GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH} from '../config/GameDisplayConfig.ts'

const PORTRAIT_ROTATE_MQ = '(max-width: 768px) and (orientation: portrait)'

export function isPortraitRotateLayout(): boolean {
  return window.matchMedia(PORTRAIT_ROTATE_MQ).matches
}

/**
 * Phaser parent(#app)의 레이아웃 크기.
 * getBoundingClientRect는 CSS rotate 아래 AABB가 스왑되므로 쓰지 않는다.
 */
export function getLandscapeParentSize(parent: HTMLElement): {
  width: number
  height: number
} {
  const width = Math.round(parent.clientWidth || parent.offsetWidth || 0)
  const height = Math.round(parent.clientHeight || parent.offsetHeight || 0)
  if (width > 0 && height > 0) return {width, height}

  // fallback: shell이 회전된 가로 박스면 window가 그대로 parent 크기
  const shell = document.getElementById('game-shell')
  if (shell) {
    return {
      width: Math.round(shell.clientWidth || 0),
      height: Math.round(shell.clientHeight || 0),
    }
  }
  return {width: 0, height: 0}
}

function clearShellInline(shell: HTMLElement): void {
  shell.style.width = ''
  shell.style.height = ''
  shell.style.left = ''
  shell.style.top = ''
}

/**
 * 모바일 세로: shell 전체를 고전 left=vw 회전 패턴으로 가로 박스화.
 * boot-curtain과 인게임이 같은 shell을 공유한다.
 */
export function applyViewportLayout(): void {
  const root = document.documentElement
  root.style.setProperty('--game-design-w', String(GAME_DESIGN_WIDTH))
  root.style.setProperty('--game-design-h', String(GAME_DESIGN_HEIGHT))

  const shell = document.getElementById('game-shell')
  if (!shell) return

  if (!isPortraitRotateLayout()) {
    root.classList.remove('portrait-rotate')
    clearShellInline(shell)
    return
  }

  root.classList.add('portrait-rotate')

  const vw = Math.round(window.innerWidth)
  const vh = Math.round(window.innerHeight)

  // width=vh, height=vw, left=vw, top=0, origin top-left, rotate 90deg (CSS)
  shell.style.left = `${vw}px`
  shell.style.top = '0'
  shell.style.width = `${vh}px`
  shell.style.height = `${vw}px`
}

export function bindViewportLayout(): () => void {
  const onChange = (): void => {
    applyViewportLayout()
  }

  window.addEventListener('resize', onChange)
  window.addEventListener('orientationchange', onChange)
  const mq = window.matchMedia(PORTRAIT_ROTATE_MQ)
  mq.addEventListener('change', onChange)

  onChange()
  requestAnimationFrame(onChange)

  return () => {
    window.removeEventListener('resize', onChange)
    window.removeEventListener('orientationchange', onChange)
    mq.removeEventListener('change', onChange)
  }
}
