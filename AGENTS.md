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
| **비석 / 피버타임** | `TombstoneConfig.ts`, `TombstoneDirector.ts`, `TombstonePickupFlow.ts`, `FeverTimeSystem.ts`, `TombstoneRewardModalDom.ts`, `tombstone-reward.css`, `GunViewDom.ts` |
| 비석 서버·타입 | `src/shared/tombstone.ts`, `src/server/tombstone.ts`, `TombstoneClient.ts` |
| 총기 DOM 연출 | `GunViewDom.ts`, `gun-view.css`, `GunViewConfig.ts` |
| 빌드/배포 | `scripts/build.mjs`, `devvit.json` |

## 불변 규칙 (자주 깨지는 것)

1. **HUD 좌표는 1280×720 디자인 px** — `vw`/`vh`로 HUD·모달 크기 잡지 말 것. 스케일은 `HudViewportSync`가 처리.
2. **모바일 `portrait-rotate`는 `#game-shell` 전체 90°** — HUD 내부를 세로 스택으로 다시 쪼개지 말 것.
3. **API 계약은 `src/shared/api.ts`에 추가** — 클라/서버 양쪽 타입·엔드포인트 동기화.
4. **유저 식별은 서버만** — `reddit.getCurrentUsername()` / `dbGetUsername()`. 클라이언트는 username 직접 다루지 않음.
5. **Redis 리더보드 `zRange(by:'rank')`는 음수 인덱스 비권장** — `zCard`로 양수 구간 계산 후 reverse.
6. **변경 범위 최소화** — 요청과 무관한 리팩터·주석·테스트 추가 금지(요청 시만).
7. **커밋/푸시/PR은 사용자가 명시할 때만.**
8. **`#gun-view-layer`에 `position: relative` 등으로 `.doom-hud__gun-view`의 `position:absolute; inset:0`을 덮지 말 것** — 총·총구 위치가 위로 밀림.
9. **총 DOM z-order (1인칭 뒷모습)** — 총구 불꽃 `z-index:1` → 총 스프라이트 `z-index:2`. 불꽃을 총 위로 올리지 말 것. 피버 글로우는 `#gun-view-layer::after` `z-index:0`으로 맨 뒤.
10. **피버 총 연출은 `animation`을 총 스프라이트에 걸지 말 것** — 리코일도 `animation` 사용. 충돌 시 발사 애니·불꽃이 깨짐. `filter` + `::after` 펄스만 사용.

## 데이터 흐름 요약

- **점수**: `RunSession.survivalScore` (생존+콤보) → 게임오버 `HighScoreStore` (개인 persistence) → 선택적으로 `api/leaderboard/submit`
- **Persistence**: 클라 `RedditPersistence` (localStorage + 300ms debounce flush) → `api/persistence/*` → Redis `user:{username}:{key}`
- **랭킹 키**: `leaderboard:post:{postId|default}`, `leaderboard:global` (Sorted Set)
- **비석**: 게임오버 시 `api/tombstone/upsert` → 런 중 `api/tombstone/list`로 스폰 → Y밴드 습득 → 3단계 DOM 모달(정보→보상 합산→주사위) → `api/tombstone/claim` (백그라운드) + 로컬 코인 보너스
- **피버타임**: 모달 주사위 합계 눈금 × `feverSecPerPip`(2초) → `FeverTimeSystem` (무적·무한 탄창·공격속도 +30%·황금 총 연출)

## 비석 / 피버타임 요약

### 습득·병합 (`TombstoneConfig.ts`)

| 상수 | 값 | 의미 |
|------|-----|------|
| `pickupBandHalfYPx` | 64 | Y축 트리거 반폭 (X 무관, 통로 전폭) |
| `mergeBandPx` | 520 | 습득 시 주변 비석 일괄 병합 (플레이어 Y 중심 ±px) |
| `spawnOffsetHalfXPx` | 100 | 스폰 X = 통로 중앙 ±100px |
| `feverSecPerPip` | 2 | 주사위 1눈 = 2초 피버 (최소 2초) |
| `feverAttackSpeedMul` | 1.3 | `CombatSystem` 쿨다운 ÷1.3 |

- 스프라이트: `Tombstone.png` 138×110, `displayScale` 64/138
- 자기 비석(`isOwn`)은 습득 불가. 닉네임 라벨은 `TombstoneLabelDom.ts` + `projectQuadCenterToHud`
- 모달: 보상은 **개별 breakdown 없이 합산만**, 주사위는 **최대 5개 표시** + 초과 `×N` 배지 (`tombstone.step.diceExtra`)

### 피버타임 효과

- `RunnerPlayerEntity`: `feverTimeSystem.isActive` 시 피해 무시
- `GameRunState.setFeverInfiniteAmmo(true)`: 무한 탄창
- `CombatSystem`: `feverAttackSpeedMul` 적용
- `GunViewDom.setFeverVisual` → `tombstone-reward.css`의 `#gun-view-layer.fever-active` 클래스
- 모달 종료 **즉시** `unfreeze()`; `claim`은 `TombstonePickupFlow.applyClaimBonus`에서 비동기

### 비석 API (`src/shared/api.ts`)

- `api/tombstone/list` — 포스트 스코프 목록
- `api/tombstone/upsert` — 신기록 시 본인 비석 갱신
- `api/tombstone/claim` — 타인 비석 1회 수령·삭제

## i18n

- 기본 로케일: **`en`** (`LocaleManager.ts` `DEFAULT_LOCALE`)
- 비석 UI 키: `tombstone.*`, `tombstone.step.*`, `tombstone.death.00`~`19`

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
- [ ] 비석/피버 변경 시 `TombstoneConfig.ts` 상수·총 z-order·리코일 충돌 확인?
- [ ] `npm run test:types` / `npm run test:unit` 통과?

## 건드리지 말 것

- `dist/` (빌드 산출물)
- `devvit.json.bak*` 등 백업 파일
- `node_modules/`
- 계획 파일(`.cursor/plans/`) — 사용자가 요청하지 않으면 수정 금지

## 응답 언어

사용자-facing 설명은 **한국어**.
