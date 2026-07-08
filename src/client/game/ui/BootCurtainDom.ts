const FADE_MS = 280;

let dismissed = false;

/** 씬·튜토리얼 준비 완료 시 페이드아웃 (최초 1회) */
export function dismissBootCurtain(): void {
  if (dismissed) return;
  dismissed = true;

  const el = document.getElementById('boot-curtain');
  if (!el) return;

  el.setAttribute('aria-busy', 'false');
  el.classList.add('boot-curtain--dismiss');

  window.setTimeout(() => {
    el.classList.add('boot-curtain--gone');
  }, FADE_MS);
}
