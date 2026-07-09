import type {
  GetLeaderboardRsp,
  LeaderboardEntry,
  LeaderboardScopeData,
} from '../../../../shared/api.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import {
  leaderboardClient,
  type LeaderboardScope,
} from '../platform/reddit/LeaderboardClient.ts';
import { createDummyLeaderboard } from '../platform/reddit/LeaderboardDummy.ts';

const CROWN_SVG = `<svg class="gameover-leaderboard__podium-crown" viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M4 22h24v3H4v-3zm2.2-14 3.4 6.2 5.6-9.4 5.6 9.4 3.4-6.2L28 22H4L6.2 8z"/></svg>`;

let activeScope: LeaderboardScope = 'post';
let cachedData: GetLeaderboardRsp | null = null;
let bound = false;
let scrollBound = false;
let pendingHighScore = 0;
let loadToken = 0;

const SCROLL_DRAG_THRESHOLD_PX = 6;

function isLeaderboardBodyScrollable(body: HTMLElement): boolean {
  return body.scrollHeight > body.clientHeight + 1;
}

function formatUsername(username: string): string {
  return username.startsWith('u/') ? username : `u/${username}`;
}

function scopeData(scope: LeaderboardScope): LeaderboardScopeData | null {
  if (!cachedData) return null;
  return scope === 'post' ? cachedData.post : cachedData.global;
}

function scopeLimit(scope: LeaderboardScope): number {
  return scope === 'post' ? 50 : 10;
}

function setStatus(message: string, isError = false): void {
  const statusEl = document.getElementById('gameover-leaderboard-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('hidden', message.length === 0);
  statusEl.classList.toggle('gameover-leaderboard__status--error', isError);
}

function setTabActive(scope: LeaderboardScope): void {
  activeScope = scope;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(
    '.gameover-leaderboard__tab',
  )) {
    const isActive = btn.dataset.scope === scope;
    btn.classList.toggle('gameover-leaderboard__tab--active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }
}

function renderPodium(entries: LeaderboardEntry[]): string {
  const top3 = entries.filter(entry => entry.rank <= 3);
  if (top3.length === 0) return '';

  const byRank = new Map(top3.map(entry => [entry.rank, entry]));
  const second = byRank.get(2);
  const first = byRank.get(1);
  const third = byRank.get(3);

  const slot = (
    entry: LeaderboardEntry | undefined,
    place: 'second' | 'first' | 'third',
  ): string => {
    if (!entry) {
      return `<div class="gameover-leaderboard__podium-slot gameover-leaderboard__podium-slot--${place} gameover-leaderboard__podium-slot--empty" aria-hidden="true"></div>`;
    }
    const crown = place === 'first' ? CROWN_SVG : '';
    return `<div class="gameover-leaderboard__podium-slot gameover-leaderboard__podium-slot--${place}">
      ${crown}
      <span class="gameover-leaderboard__podium-rank">#${entry.rank}</span>
      <span class="gameover-leaderboard__podium-user">${formatUsername(entry.username)}</span>
      <span class="gameover-leaderboard__podium-score">${entry.score}</span>
    </div>`;
  };

  return `<div class="gameover-leaderboard__podium">
    ${slot(second, 'second')}
    ${slot(first, 'first')}
    ${slot(third, 'third')}
  </div>`;
}

function renderList(entries: LeaderboardEntry[]): string {
  const rest = entries.filter(entry => entry.rank > 3);
  if (rest.length === 0) return '';
  return `<div class="gameover-leaderboard__list">${rest
    .map(
      entry => `<div class="gameover-leaderboard__row">
        <span class="gameover-leaderboard__row-rank">#${entry.rank}</span>
        <span class="gameover-leaderboard__row-user">${formatUsername(entry.username)}</span>
        <span class="gameover-leaderboard__row-score">${entry.score}</span>
      </div>`,
    )
    .join('')}</div>`;
}

function renderMe(scope: LeaderboardScope, data: LeaderboardScopeData): void {
  const meEl = document.getElementById('gameover-leaderboard-me');
  if (!meEl) return;

  const limit = scopeLimit(scope);
  let rankText = '—';
  let userText = localeManager.t('leaderboard.anonymous');
  let scoreText = '0';

  if (data.me) {
    rankText = `#${data.me.rank}`;
    userText = formatUsername(data.me.username);
    scoreText = String(data.me.score);
  } else if (data.meOutOfRange) {
    rankText = localeManager.t('leaderboard.outOfRange', {
      rank: String(limit),
    });
    userText = localeManager.t('leaderboard.you');
    scoreText = String(data.meOutOfRange.score);
  } else {
    meEl.innerHTML = `<div class="gameover-leaderboard__me-label">${localeManager.t('leaderboard.me')}</div>
      <div class="gameover-leaderboard__empty">${localeManager.t('leaderboard.notRanked')}</div>`;
    return;
  }

  meEl.innerHTML = `<div class="gameover-leaderboard__me-label">${localeManager.t('leaderboard.me')}</div>
    <div class="gameover-leaderboard__me-row">
      <span class="gameover-leaderboard__me-rank">${rankText}</span>
      <span class="gameover-leaderboard__me-user">${userText}</span>
      <span class="gameover-leaderboard__me-score">${scoreText}</span>
    </div>`;
}

function renderScope(scope: LeaderboardScope): void {
  const bodyEl = document.getElementById('gameover-leaderboard-body');
  if (!bodyEl) return;

  const data = scopeData(scope);
  if (!data) {
    bodyEl.innerHTML = '';
    renderMe(scope, {entries: [], me: null});
    return;
  }

  if (data.entries.length === 0) {
    bodyEl.innerHTML = `<div class="gameover-leaderboard__empty">${localeManager.t('leaderboard.empty')}</div>`;
    renderMe(scope, data);
    return;
  }

  bodyEl.innerHTML = `${renderPodium(data.entries)}${renderList(data.entries)}`;
  renderMe(scope, data);
}

function bindTabs(): void {
  if (bound) return;
  bound = true;

  for (const btn of document.querySelectorAll<HTMLButtonElement>(
    '.gameover-leaderboard__tab',
  )) {
    btn.addEventListener('click', () => {
      const scope = btn.dataset.scope === 'global' ? 'global' : 'post';
      setTabActive(scope);
      const bodyEl = document.getElementById('gameover-leaderboard-body');
      bodyEl?.scrollTo({top: 0});
      renderScope(scope);
    });
  }
}

/** 리스트 영역을 위/아래로 드래그(마우스·터치)해서 스크롤 */
function bindLeaderboardBodyScroll(): void {
  if (scrollBound) return;
  const body = document.getElementById('gameover-leaderboard-body');
  if (!body) return;
  scrollBound = true;

  let pointerId: number | null = null;
  let startY = 0;
  let startScroll = 0;
  let dragging = false;

  body.addEventListener(
    'wheel',
    (event) => {
      if (!isLeaderboardBodyScrollable(body)) return;
      event.stopPropagation();
    },
    {passive: true},
  );

  body.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!isLeaderboardBodyScrollable(body)) return;

    pointerId = event.pointerId;
    startY = event.clientY;
    startScroll = body.scrollTop;
    dragging = false;
    try {
      body.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  });

  body.addEventListener(
    'pointermove',
    (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      if (!isLeaderboardBodyScrollable(body)) return;

      const dy = event.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < SCROLL_DRAG_THRESHOLD_PX) return;
        dragging = true;
        body.classList.add('gameover-leaderboard__body--dragging');
      }

      body.scrollTop = startScroll - dy;
      event.preventDefault();
    },
    {passive: false},
  );

  const endDrag = (event: PointerEvent): void => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    if (dragging) {
      body.classList.remove('gameover-leaderboard__body--dragging');
      try {
        body.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
    pointerId = null;
    dragging = false;
  };

  body.addEventListener('pointerup', endDrag);
  body.addEventListener('pointercancel', endDrag);
}

function withDummyFallback(data: GetLeaderboardRsp | null): GetLeaderboardRsp {
  const dummy = createDummyLeaderboard(pendingHighScore);
  if (!data) return dummy;

  // THREAD만 비어 있고 GLOBAL만 채워진 경우에도 더미로 보완
  // (postId 누락 / 시드 스킵 / 구버전 서버 응답 대응)
  return {
    post:
      data.post.entries.length > 0
        ? data.post
        : {
            ...dummy.post,
            me: data.post.me ?? dummy.post.me,
            meOutOfRange: data.post.meOutOfRange ?? dummy.post.meOutOfRange,
          },
    global:
      data.global.entries.length > 0
        ? data.global
        : {
            ...dummy.global,
            me: data.global.me ?? dummy.global.me,
            meOutOfRange:
              data.global.meOutOfRange ?? dummy.global.meOutOfRange,
          },
  };
}

async function loadLeaderboard(submitScore: number | null): Promise<void> {
  const token = ++loadToken;
  setStatus(localeManager.t('leaderboard.loading'));

  try {
    const data =
      submitScore !== null
        ? await leaderboardClient.submitScore(submitScore)
        : await leaderboardClient.fetchLeaderboard();

    if (token !== loadToken) return;

    cachedData = withDummyFallback(data);
    setStatus('');
    renderScope(activeScope);
  } catch {
    if (token !== loadToken) return;
    cachedData = withDummyFallback(leaderboardClient.getCached());
    setStatus('');
    renderScope(activeScope);
  }
}

export function resetGameOverLeaderboard(): void {
  loadToken += 1;
  cachedData = null;
  pendingHighScore = 0;
  activeScope = 'post';
  setTabActive('post');
  setStatus('');
  const bodyEl = document.getElementById('gameover-leaderboard-body');
  const meEl = document.getElementById('gameover-leaderboard-me');
  if (bodyEl) bodyEl.innerHTML = '';
  if (meEl) meEl.innerHTML = '';
}

export function showGameOverLeaderboard(highScore: number): void {
  bindTabs();
  bindLeaderboardBodyScroll();
  pendingHighScore = highScore;
  setTabActive('post');
  void loadLeaderboard(highScore > 0 ? highScore : null);
}

export function refreshGameOverLeaderboardLocale(): void {
  if (!cachedData) return;
  renderScope(activeScope);
}
