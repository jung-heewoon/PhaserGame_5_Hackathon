import { GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';
import { DICE_ASSETS } from '../assets/DiceAssets.ts';
import { GUN_ICON_URL } from '../assets/GunIconAssets.ts';
import { DICE_SPRITE_CONFIG as DSC } from '../config/DiceSpriteConfig.ts';
import { YATZY_CONFIG, holdRerollCost } from '../config/YatzyConfig.ts';
import { getEntryByHand, HAND_WEAPON_TABLE, type HandId } from '../config/WeaponTable.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import { evaluateHand, getScoringDieMask, rollOneDie } from '../systems/YatzyHandEvaluator.ts';
import { sfxManager } from '../systems/SfxManager.ts';
import { domUiBridge } from './DomUiBridge.ts';
import { hideYatzyToast, showYatzyToast } from './YatzyToastDom.ts';
import { updateYatzyTipVisibility } from './TutorialModalDom.ts';

export interface YatzyModalParams {
  /** 첫 굴림 결과 5개 (1~6) */
  initialRolls: number[];
  /** 현재 보유 주사위 수 */
  getDiceBalance: () => number;
  /** 리롤 비용 차감 (성공 시 true) */
  spendDice: (n: number) => boolean;
  /** 최종 장착: 유효 족보(테스트 override ?? 주사위 족보) */
  onEquip: (handId: HandId) => void;
}

interface DieCell {
  root: HTMLElement;
  overlay: HTMLElement;
  face: HTMLElement;
  cursor: HTMLElement;
  hold: HTMLButtonElement;
}

interface YatzySession {
  params: YatzyModalParams;
  dice: number[];
  held: boolean[];
  rerollsUsed: number;
  cells: DieCell[];
  testOverride: HandId | null;
  busy: boolean;
  cursorFrame: number;
  cursorTimer: number | null;
  timers: number[];
  cleanup: (() => void) | null;
}

let session: YatzySession | null = null;

let hudDiceRestore: { parent: HTMLElement; next: ChildNode | null } | null = null;

const WEAPON_TIER_CLASSES = HAND_WEAPON_TABLE.map((e) => `yz-weapon--${e.hudClass.replace('weapon-', '')}`);

const S = DSC.displayScale;

/* ---------- DOM 조회 ---------- */

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/* ---------- 전투 HUD 주사위 — 딤 위로 올리기 ---------- */

function elevateHudDice(): void {
  const dice = document.querySelector<HTMLElement>('.doom-hud__dice');
  const layer = el('doom-hud-layer');
  if (!dice || !layer || hudDiceRestore) return;

  const layerRect = layer.getBoundingClientRect();
  const diceRect = dice.getBoundingClientRect();
  const scale = layerRect.width > 0 ? layerRect.width / GAME_DESIGN_WIDTH : 1;

  hudDiceRestore = { parent: dice.parentElement!, next: dice.nextSibling };
  layer.appendChild(dice);
  dice.classList.add('doom-hud__dice--yatzy-elevated');
  dice.style.top = `${(diceRect.top - layerRect.top) / scale}px`;
  dice.style.right = `${(layerRect.right - diceRect.right) / scale}px`;
}

function restoreHudDice(): void {
  const dice = document.querySelector<HTMLElement>('.doom-hud__dice');
  if (!dice || !hudDiceRestore) return;

  dice.classList.remove('doom-hud__dice--yatzy-elevated');
  dice.style.top = '';
  dice.style.right = '';

  const { parent, next } = hudDiceRestore;
  if (next) parent.insertBefore(dice, next);
  else parent.appendChild(dice);
  hudDiceRestore = null;
}

/* ---------- 주사위 셀 스프라이트 ---------- */

function applyDieFace(cell: DieCell, value: number, held: boolean): void {
  const face = cell.face;
  const spec = held ? DSC.faceNormal : DSC.faceDragging;
  const url = held ? DICE_ASSETS.faceNormal : DICE_ASSETS.faceDragging;
  const w = spec.frameW * S;
  const h = spec.frameH * S;
  face.style.width = `${w}px`;
  face.style.height = `${h}px`;
  face.style.backgroundImage = `url(${url})`;
  face.style.backgroundSize = `${spec.frameW * DSC.faceFrameCount * S}px ${h}px`;
  face.style.backgroundPosition = `${-value * w}px 0`;
}

function applyDieOverlay(cell: DieCell, held: boolean): void {
  const o = cell.overlay;
  const spec = held ? DSC.overlayNormal : DSC.overlayDragging;
  const url = held ? DICE_ASSETS.overlayNormal : DICE_ASSETS.overlayDragging;
  const w = spec.w * S;
  const h = spec.h * S;
  o.style.width = `${w}px`;
  o.style.height = `${h}px`;
  o.style.backgroundImage = `url(${url})`;
  o.style.backgroundSize = `${w}px ${h}px`;
}

function renderDie(cell: DieCell, index: number): void {
  if (!session) return;
  const held = session.held[index]!;
  cell.root.classList.toggle('held', held);
  applyDieOverlay(cell, held);
  applyDieFace(cell, session.dice[index]!, held);
  cell.hold.textContent = localeManager.t(held ? 'yatzy.held' : 'yatzy.hold');
}

function createDieCell(index: number): DieCell {
  const root = document.createElement('div');
  root.className = 'yz-die';

  const cw = DSC.cursor.frameW * S;
  const ch = DSC.cursor.frameH * S;

  const visual = document.createElement('div');
  visual.className = 'yz-die__visual';
  visual.style.width = `${cw}px`;
  visual.style.height = `${ch}px`;

  const frame = document.createElement('div');
  frame.className = 'yz-die__frame';
  frame.style.width = `${DSC.overlayDragging.w * S}px`;
  frame.style.height = `${DSC.overlayDragging.h * S}px`;

  const overlay = document.createElement('div');
  overlay.className = 'yz-die__layer yz-die__overlay';

  const face = document.createElement('div');
  face.className = 'yz-die__layer yz-die__face';
  face.style.left = '50%';
  face.style.top = '50%';
  face.style.transform = 'translate(-50%, -50%)';

  const cursor = document.createElement('div');
  cursor.className = 'yz-die__layer yz-die__cursor';
  cursor.style.width = `${cw}px`;
  cursor.style.height = `${ch}px`;
  cursor.style.left = '50%';
  cursor.style.top = '50%';
  cursor.style.transform = 'translate(-50%, -50%)';
  cursor.style.backgroundImage = `url(${DICE_ASSETS.cursor})`;
  cursor.style.backgroundSize = `${DSC.cursor.frameW * DSC.cursor.frameCount * S}px ${ch}px`;
  cursor.style.backgroundPosition = '0 0';

  frame.append(overlay, face);
  visual.append(frame, cursor);

  const hold = document.createElement('button');
  hold.type = 'button';
  hold.className = 'yz-die__hold';
  hold.textContent = localeManager.t('yatzy.hold');

  root.append(visual, hold);

  const cell: DieCell = { root, overlay, face, cursor, hold };
  hold.addEventListener('click', () => onHoldToggle(index));
  // 주사위 스프라이트 영역을 눌러도 홀드 토글
  visual.addEventListener('click', () => onHoldToggle(index));
  return cell;
}

/* ---------- 커서 애니메이션 ---------- */

function tickCursor(): void {
  if (!session) return;
  session.cursorFrame ^= 1;
  const posX = -session.cursorFrame * DSC.cursor.frameW * S;
  for (let i = 0; i < session.cells.length; i++) {
    if (session.held[i]) {
      session.cells[i]!.cursor.style.backgroundPosition = `${posX}px 0`;
    }
  }
}

/* ---------- 타이머 유틸 ---------- */

function later(fn: () => void, ms: number): void {
  if (!session) return;
  const id = window.setTimeout(fn, ms);
  session.timers.push(id);
}

function clearTimers(): void {
  if (!session) return;
  for (const id of session.timers) window.clearTimeout(id);
  session.timers = [];
}

/* ---------- 홀드/리롤 ---------- */

function heldCount(): number {
  return session ? session.held.filter(Boolean).length : 0;
}

function rerollsRemaining(): number {
  return session ? YATZY_CONFIG.maxRerolls - session.rerollsUsed : 0;
}

function onHoldToggle(index: number): void {
  if (!session || session.busy) return;
  if (rerollsRemaining() <= 0) return;

  const cell = session.cells[index]!;
  if (session.held[index]) {
    session.held[index] = false;
  } else {
    // 최소 1개는 굴려야 하므로 5개 홀드 금지 (최대 4개)
    if (heldCount() >= YATZY_CONFIG.maxHold) {
      showYatzyToast(localeManager.t('toast.hold_max', { max: String(YATZY_CONFIG.maxHold) }));
      return;
    }
    const nextCost = holdRerollCost(heldCount() + 1);
    if (session.params.getDiceBalance() < nextCost) {
      showYatzyToast(localeManager.t('yatzy.insufficient', { need: String(nextCost) }));
      return;
    }
    session.held[index] = true;
  }
  renderDie(cell, index);
  updateControls();
}

function releaseAllHolds(): void {
  if (!session) return;
  for (let i = 0; i < session.held.length; i++) session.held[i] = false;
  session.cells.forEach((c, i) => renderDie(c, i));
}

/** 리롤 직후: 남은 주사위로 현재 홀드를 유지할 수 없으면 홀드 전부 해제 */
function releaseHoldsIfUnaffordable(): void {
  if (!session) return;
  if (rerollsRemaining() <= 0) return;
  if (heldCount() === 0) return;
  if (session.params.getDiceBalance() >= holdRerollCost(heldCount())) return;
  releaseAllHolds();
  showYatzyToast(localeManager.t('yatzy.hold_released'));
}

function onReroll(): void {
  if (!session || session.busy) return;
  if (rerollsRemaining() <= 0) return;

  const cost = holdRerollCost(heldCount());
  if (cost > 0) {
    if (session.params.getDiceBalance() >= cost) {
      // 홀드한 만큼 주사위 소모 (매 리롤마다)
      session.params.spendDice(cost);
    } else {
      // 방어: 유지 비용 부족 → 홀드 전부 해제 후 무료 전체 리롤
      releaseAllHolds();
      showYatzyToast(localeManager.t('yatzy.hold_released'));
    }
  }

  session.rerollsUsed += 1;

  const indices: number[] = [];
  const finalValues = session.dice.slice();
  for (let i = 0; i < 5; i++) {
    if (!session.held[i]) {
      indices.push(i);
      finalValues[i] = rollOneDie();
    }
  }

  session.busy = true;
  updateControls();
  animateDice(finalValues, indices, afterSettle);
}

function onEquipClick(): void {
  if (!session || session.busy) return;
  finish(effectiveHandId());
}

/* ---------- 굴림 애니메이션 ---------- */

function animateDice(finalValues: number[], indices: number[], done: () => void): void {
  if (!session) return;
  if (indices.length === 0) {
    done();
    return;
  }

  clearScoringDiceHighlight();
  sfxManager.playDiceRollBurst();

  let settled = 0;
  const total = indices.length;

  indices.forEach((i, order) => {
    const cell = session!.cells[i]!;
    const startDelay = order * DSC.revealStaggerMs;

    const runShuffle = (elapsed: number): void => {
      if (!session) return;
      applyDieFace(cell, 1 + Math.floor(Math.random() * 6), session.held[i]!);
      const next = elapsed + DSC.shuffleTickMs;
      if (next < DSC.shuffleMs) {
        cell.root.classList.add('yz-die--shuffle');
        later(() => runShuffle(next), DSC.shuffleTickMs);
      } else {
        cell.root.classList.remove('yz-die--shuffle');
        session.dice[i] = finalValues[i]!;
        applyDieFace(cell, finalValues[i]!, session.held[i]!);
        cell.root.classList.add('yz-die--pop');
        later(() => cell.root.classList.remove('yz-die--pop'), 340);
        settled += 1;
        if (settled === total) done();
      }
    };

    later(() => runShuffle(0), startDelay);
  });
}

function afterSettle(): void {
  if (!session) return;
  session.busy = false;
  if (rerollsRemaining() <= 0) {
    // 리롤 소진 → 홀드는 더 이상 의미 없으므로 전부 해제
    releaseAllHolds();
  } else {
    releaseHoldsIfUnaffordable();
  }
  updateHandAndWeapon();
  updateControls();
}

function clearScoringDiceHighlight(): void {
  if (!session) return;
  for (const cell of session.cells) {
    cell.root.classList.remove('yz-die--scoring');
  }
}

function updateScoringDiceHighlight(restartAnimation = false): void {
  if (!session) return;
  const mask = getScoringDieMask(session.dice);

  if (restartAnimation) {
    clearScoringDiceHighlight();
    void session.cells[0]?.root.offsetWidth;
  }

  session.cells.forEach((cell, i) => {
    cell.root.classList.toggle('yz-die--scoring', mask[i] ?? false);
  });
}

function applyWeaponTierPanel(entry: ReturnType<typeof getEntryByHand>): void {
  const weaponInfo = el('yatzy-weapon-info');
  if (!weaponInfo) return;
  for (const cls of WEAPON_TIER_CLASSES) weaponInfo.classList.remove(cls);
  weaponInfo.classList.add(`yz-weapon--${entry.hudClass.replace('weapon-', '')}`);
}

/* ---------- 족보 / 무기 정보 ---------- */

function diceHandId(): HandId {
  if (!session) return 'NONE';
  return evaluateHand(session.dice).handId;
}

function effectiveHandId(): HandId {
  if (!session) return 'NONE';
  return session.testOverride ?? diceHandId();
}

function updateHandAndWeapon(): void {
  if (!session) return;

  const handLabel = el('yatzy-hand-label');
  if (handLabel) handLabel.textContent = localeManager.getHandLabel(diceHandId());

  const handId = effectiveHandId();
  const entry = getEntryByHand(handId);

  const icon = el('yatzy-weapon-icon');
  if (icon) icon.style.backgroundImage = `url(${GUN_ICON_URL[entry.weaponId]})`;

  const name = el('yatzy-weapon-name');
  if (name) name.textContent = localeManager.getWeaponLabel(entry.weaponId);

  const ammo = el('yatzy-weapon-ammo');
  if (ammo) {
    ammo.textContent = entry.maxAmmo === null ? localeManager.t('yatzy.infinite') : String(entry.maxAmmo);
  }

  const dmg = el('yatzy-weapon-damage');
  if (dmg) dmg.textContent = String(entry.damage);

  const summary = el('yatzy-weapon-summary');
  if (summary) summary.textContent = localeManager.t(`weapon.summary.${entry.weaponId}`);

  applyWeaponTierPanel(entry);
  updateScoringDiceHighlight(true);
}

/* ---------- 컨트롤 상태 ---------- */

function updateControls(): void {
  if (!session) return;
  const busy = session.busy;
  const remaining = rerollsRemaining();

  const rolls = el('yatzy-rolls-left');
  if (rolls) rolls.textContent = String(remaining);

  const cost = holdRerollCost(heldCount());
  const costEl = el('yatzy-reroll-cost');
  if (costEl) {
    const balance = session.params.getDiceBalance();
    costEl.textContent =
      cost > 0 ? localeManager.t('yatzy.cost_spend', { cost: String(cost) }) : localeManager.t('yatzy.free');
    costEl.classList.toggle('yz-reroll-cost-display--warn', cost > 0 && balance < cost);
    costEl.classList.toggle('yz-reroll-cost-display--free', cost <= 0);
  }

  const rerollBtn = el<HTMLButtonElement>('yatzy-reroll-btn');
  if (rerollBtn) rerollBtn.disabled = busy || remaining <= 0;

  const equipBtn = el<HTMLButtonElement>('yatzy-equip-btn');
  if (equipBtn) equipBtn.disabled = busy;

  for (const cell of session.cells) {
    cell.hold.disabled = busy || remaining <= 0;
  }
}

/* ---------- 테스트 패널 (임시 · 분리) ---------- */

function initTestPanel(): void {
  const picker = el<HTMLSelectElement>('yatzy-weapon-picker');
  if (!picker || !session) return;

  picker.innerHTML = '';
  const autoOpt = document.createElement('option');
  autoOpt.value = '';
  autoOpt.textContent = localeManager.t('yatzy.test_auto');
  picker.appendChild(autoOpt);

  for (const entry of HAND_WEAPON_TABLE) {
    const opt = document.createElement('option');
    opt.value = entry.handId;
    opt.textContent = localeManager.getWeaponLabel(entry.weaponId);
    picker.appendChild(opt);
  }

  picker.value = session.testOverride ?? '';
  picker.onchange = () => {
    if (!session) return;
    session.testOverride = picker.value ? (picker.value as HandId) : null;
    updateHandAndWeapon();
  };
}

/* ---------- 표시 / 종료 ---------- */

function hideYatzyModalUi(): void {
  if (session) {
    session.cleanup?.();
    clearTimers();
    if (session.cursorTimer !== null) window.clearInterval(session.cursorTimer);
    session = null;
  }
  hideYatzyToast();
  restoreHudDice();
  const modal = el('yatzy-modal');
  modal?.classList.add('hidden');
  domUiBridge.setLayerInteractive(false);
  updateYatzyTipVisibility();
}

function finish(handId: HandId): void {
  if (!session) return;
  const onEquip = session.params.onEquip;
  hideYatzyModalUi();
  onEquip(handId);
}

/** 사망 등 — 장착·unfreeze 없이 닫기 */
export function dismissYatzyModal(): void {
  hideYatzyModalUi();
}

export function showYatzyModal(params: YatzyModalParams): void {
  const modal = el('yatzy-modal');
  const diceRow = el('yatzy-dice-row');
  const rerollBtn = el<HTMLButtonElement>('yatzy-reroll-btn');
  const equipBtn = el<HTMLButtonElement>('yatzy-equip-btn');

  if (!modal || !diceRow || !rerollBtn || !equipBtn) {
    params.onEquip(evaluateHand(params.initialRolls).handId);
    return;
  }

  const initial = params.initialRolls.slice(0, 5);
  while (initial.length < 5) initial.push(1);

  const cells: DieCell[] = [];
  diceRow.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const cell = createDieCell(i);
    cells.push(cell);
    diceRow.appendChild(cell.root);
  }

  session = {
    params,
    dice: initial.slice(),
    held: [false, false, false, false, false],
    rerollsUsed: 0,
    cells,
    testOverride: null,
    busy: true,
    cursorFrame: 0,
    cursorTimer: null,
    timers: [],
    cleanup: null,
  };

  // 초기 렌더 후 첫 굴림 전까지 빈 주사위(프레임 0)로 표시
  cells.forEach((c, i) => renderDie(c, i));
  cells.forEach((c) => applyDieFace(c, 0, false));
  initTestPanel();
  updateControls();

  const onRerollClick = () => onReroll();
  const onEquipBtnClick = () => onEquipClick();
  rerollBtn.addEventListener('click', onRerollClick);
  equipBtn.addEventListener('click', onEquipBtnClick);
  session.cleanup = () => {
    rerollBtn.removeEventListener('click', onRerollClick);
    equipBtn.removeEventListener('click', onEquipBtnClick);
    const picker = el<HTMLSelectElement>('yatzy-weapon-picker');
    if (picker) picker.onchange = null;
  };

  session.cursorTimer = window.setInterval(tickCursor, DSC.cursorFrameMs);

  domUiBridge.setLayerInteractive(true);
  modal.classList.remove('hidden');
  elevateHudDice();
  updateYatzyTipVisibility();

  // 첫 굴림 연출
  animateDice(initial.slice(), [0, 1, 2, 3, 4], afterSettle);
}

export function isYatzyModalOpen(): boolean {
  const modal = el('yatzy-modal');
  return Boolean(modal && !modal.classList.contains('hidden'));
}

/** 언어 변경 시 야찌 모달 라벨 갱신 */
export function refreshYatzyModalLocale(): void {
  if (!session) return;
  const modal = el('yatzy-modal');
  if (!modal || modal.classList.contains('hidden')) return;

  session.cells.forEach((c, i) => renderDie(c, i));
  initTestPanel();
  updateHandAndWeapon();
  updateControls();
}
