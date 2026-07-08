/**
 * public/ 폴더 리소스 URL — 게임 index.html·번들 script 기준 절대 URL.
 * CrazyGames iframe의 `<base>` 태그·서브경로 배포에서 `./` 상대경로가 깨지는 문제를 피한다.
 */
let gameRootUrl: string | null = null;

/** index.html 또는 `./assets/index-*.js` 기준 게임 루트 URL (trailing slash) */
export function getGameRootUrl(): string {
  if (gameRootUrl) return gameRootUrl;

  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i]?.src;
    if (!src) continue;
    if (src.includes('/assets/index-') && src.endsWith('.js')) {
      gameRootUrl = new URL('../', src).href;
      return gameRootUrl;
    }
  }

  gameRootUrl = new URL('./', window.location.href).href;
  return gameRootUrl;
}

export function publicUrl(relativePath: string): string {
  const path = relativePath.replace(/^\//, '');
  return new URL(path, getGameRootUrl()).href;
}
