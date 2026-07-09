# hell-dice-shooter — AI 작업 가이드

Reddit Devvit Web + Phaser 3 러너/야찌 슈터. **탐색 전 이 문서를 먼저 읽고**, 필요한 파일만 열 것.

## 아키텍처 (한 줄)

`splash.html` → `game.html` (Phaser `#app`) + DOM HUD (`#doom-hud-layer`) ↔ Devvit server (`dist/server/index.cjs`) ↔ Redis

## 어디를 보면 되나

| 작업 | 먼저 볼 파일 |
|------|----------------|
| 게임 로직/전투/스폰 | `src/client/game/scenes/RunnerYatzyScene.ts`, `src/client/game/systems/` |
| HUD/모달/DOM UI | `src/client/game.html`, `src/client/game/ui/*Dom.ts`, `src/client/game/ui/*.css` |
| HUD 스케일/모바일 회전 | `src/client/game/ui/HudViewportSync.ts`, `applyViewportLayout.ts`, `patchPhaserScaleForCssRotate.ts` |
| i18n | `public/locale/strings.csv`, `LocaleManager.ts`, `applyLocaleDom.ts` |
| 클라이언트↔서버 API | `src/shared/api.ts` → `src/server/server.ts` |
| 유저 저장(코인/하이스코어 등) | `src/shared/persistence.ts`, `RedditPersistence.ts`, `src/server/db.ts` |
| 랭킹 | `src/server/leaderboard.ts`, `LeaderboardClient.ts`, `GameOverLeaderboardDom.ts` |
| 빌드/배포 | `scripts/build.mjs`, `devvit.json` |

## 불변 규칙 (자주 깨지는 것)

1. **HUD 좌표는 1280×720 디자인 px** — `vw`/`vh`로 HUD·모달 크기 잡지 말 것. 스케일은 `HudViewportSync`가 처리.
2. **모바일 `portrait-rotate`는 `#game-shell` 전체 90°** — HUD 내부를 세로 스택으로 다시 쪼개지 말 것.
3. **API 계약은 `src/shared/api.ts`에 추가** — 클라/서버 양쪽 타입·엔드포인트 동기화.
4. **유저 식별은 서버만** — `reddit.getCurrentUsername()` / `dbGetUsername()`. 클라이언트는 username 직접 다루지 않음.
5. **Redis 리더보드 `zRange(by:'rank')`는 음수 인덱스 비권장** — `zCard`로 양수 구간 계산 후 reverse.
6. **변경 범위 최소화** — 요청과 무관한 리팩터·주석·테스트 추가 금지(요청 시만).
7. **커밋/푸시/PR은 사용자가 명시할 때만.**

## 데이터 흐름 요약

- **점수**: `RunSession.survivalScore` (생존+콤보) → 게임오버 `HighScoreStore` (개인 persistence) → 선택적으로 `api/leaderboard/submit`
- **Persistence**: 클라 `RedditPersistence` (localStorage + 300ms debounce flush) → `api/persistence/*` → Redis `user:{username}:{key}`
- **랭킹 키**: `leaderboard:post:{postId|default}`, `leaderboard:global` (Sorted Set)

## 명령어

```bash
npm run playtest          # Devvit 로컬 테스트
npm run build             # client(Vite) + server(esbuild)
npm run test              # types + lint + unit + build
npm run test:unit         # server tests only
```

## 수정 시 체크리스트

- [ ] `src/shared/api.ts` 타입/엔드포인트 반영?
- [ ] HUD CSS는 디자인 px인가?
- [ ] `strings.csv`에 UI 문구 추가했는가? (`data-i18n`)
- [ ] `server.test.ts`에 API 변경 테스트?
- [ ] `npm run test:types` / `npm run test:unit` 통과?

## 건드리지 말 것

- `dist/` (빌드 산출물)
- `devvit.json.bak*` 등 백업 파일
- `node_modules/`
- 계획 파일(`.cursor/plans/`) — 사용자가 요청하지 않으면 수정 금지

## 응답 언어

사용자-facing 설명은 **한국어**.
