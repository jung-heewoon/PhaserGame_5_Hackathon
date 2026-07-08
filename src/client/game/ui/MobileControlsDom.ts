import bulletUrl from '../Image/Object/bullet.png';

/**
 * 모바일(터치) 전용 온스크린 컨트롤.
 * - 좌측 하단: 좌/우 이동 버튼 (strafe)
 * - 우측 하단: 반투명 원형 총알 발사 버튼
 * 버튼은 눌린 상태(boolean)만 유지하고, 씬/전투 시스템이 이를 읽는다.
 */
class MobileControls {
  /** 터치 기기에서만 true (컨트롤 표시·발사 게이팅 기준) */
  enabled = false;
  left = false;
  right = false;
  fireHeld = false;

  private root: HTMLElement | null = null;

  private static detectTouch(): boolean {
    const override = new URLSearchParams(window.location.search).get('touch');
    if (override === '1') return true;
    if (override === '0') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  init(): void {
    this.enabled = MobileControls.detectTouch();
    if (!this.enabled) return;

    const hud = document.getElementById('doom-hud-layer');
    if (!hud) return;

    const root = document.createElement('div');
    root.id = 'mobile-controls';
    root.className = 'mobile-controls';
    root.setAttribute('aria-hidden', 'true');

    const moveGroup = document.createElement('div');
    moveGroup.className = 'mobile-controls__move';

    const moveHit = document.createElement('div');
    moveHit.className = 'mobile-controls__move-hit';
    moveHit.setAttribute('aria-hidden', 'true');

    const leftBtn = this.createButton('mobile-btn mobile-btn--left', '◀', 'Move left');
    const rightBtn = this.createButton('mobile-btn mobile-btn--right', '▶', 'Move right');
    moveGroup.appendChild(moveHit);
    moveGroup.appendChild(leftBtn);
    moveGroup.appendChild(rightBtn);

    const fireBtn = this.createButton('mobile-btn mobile-btn--fire', '', 'Fire');
    const fireIcon = document.createElement('span');
    fireIcon.className = 'mobile-btn__fire-icon';
    fireIcon.style.backgroundImage = `url(${bulletUrl})`;
    fireBtn.appendChild(fireIcon);

    this.bindMoveGroup(moveHit, leftBtn, rightBtn);
    this.bindHold(fireBtn, (down) => {
      this.fireHeld = down;
    });

    root.appendChild(moveGroup);
    root.appendChild(fireBtn);
    hud.appendChild(root);
    this.root = root;
  }

  setVisible(visible: boolean): void {
    if (!this.root) return;
    this.root.classList.toggle('hidden', !visible);
    if (!visible) {
      this.left = false;
      this.right = false;
      this.fireHeld = false;
    }
  }

  private createButton(className: string, label: string, ariaLabel: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.setAttribute('aria-label', ariaLabel);
    if (label) btn.textContent = label;
    return btn;
  }

  /**
   * 좌/우 이동 — 확장 히트존 전체를 좌/우 반으로 나눠 판별.
   * 버튼 사이 gap·상단 여유도 터치 가능, 드래그로 좌↔우 전환.
   */
  private bindMoveGroup(
    hitArea: HTMLElement,
    leftBtn: HTMLElement,
    rightBtn: HTMLElement,
  ): void {
    let activePointerId: number | null = null;

    const applySide = (side: 'left' | 'right' | null): void => {
      this.left = side === 'left';
      this.right = side === 'right';
      leftBtn.classList.toggle('is-active', side === 'left');
      rightBtn.classList.toggle('is-active', side === 'right');
    };

    const isInsideHit = (x: number, y: number): boolean => {
      const r = hitArea.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const sideFromX = (clientX: number): 'left' | 'right' => {
      const r = hitArea.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      return clientX < mid ? 'left' : 'right';
    };

    const press = (e: PointerEvent): void => {
      if (!isInsideHit(e.clientX, e.clientY)) return;
      e.preventDefault();
      activePointerId = e.pointerId;
      try {
        hitArea.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처 실패는 무시 */
      }
      applySide(sideFromX(e.clientX));
    };

    const move = (e: PointerEvent): void => {
      if (activePointerId !== e.pointerId) return;
      e.preventDefault();
      applySide(sideFromX(e.clientX));
    };

    const release = (e: PointerEvent): void => {
      if (activePointerId !== e.pointerId) return;
      e.preventDefault();
      activePointerId = null;
      try {
        hitArea.releasePointerCapture(e.pointerId);
      } catch {
        /* 해제 실패는 무시 */
      }
      applySide(null);
    };

    hitArea.addEventListener('pointerdown', press);
    hitArea.addEventListener('pointermove', move);
    hitArea.addEventListener('pointerup', release);
    hitArea.addEventListener('pointercancel', release);
  }

  /** pointer 이벤트로 held 상태 갱신 (멀티터치 동시 입력 허용) */
  private bindHold(el: HTMLElement, setDown: (down: boolean) => void): void {
    const press = (e: PointerEvent): void => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처 실패는 무시 */
      }
      el.classList.add('is-active');
      setDown(true);
    };
    const release = (e: PointerEvent): void => {
      e.preventDefault();
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* 해제 실패는 무시 */
      }
      el.classList.remove('is-active');
      setDown(false);
    };

    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  }
}

export const mobileControls = new MobileControls();
