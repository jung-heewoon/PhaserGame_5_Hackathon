import type { LocaleId } from '../locale/LocaleManager.ts';
import { localeManager } from '../locale/LocaleManager.ts';
import type { RunSession } from '../systems/RunSession.ts';
import { domUiBridge } from './DomUiBridge.ts';
import { isGameOverModalOpen } from './GameOverModalDom.ts';
import { sfxManager } from '../systems/SfxManager.ts';
import { bgmManager } from '../systems/BgmManager.ts';

let session: RunSession | null = null;
let listenersBound = false;

function syncBgmVolumeInput(): void {
  const input = document.getElementById('settings-bgm-volume') as HTMLInputElement | null;
  const fill = document.getElementById('settings-bgm-fill');
  if (!input) return;

  const volume = bgmManager.getBgmVolume();
  input.value = String(volume);
  input.setAttribute('aria-valuenow', String(volume));
  if (fill) fill.style.width = `${volume}%`;
}

function bindBgmVolume(): void {
  const input = document.getElementById('settings-bgm-volume') as HTMLInputElement | null;
  if (!input) return;

  syncBgmVolumeInput();
  input.addEventListener('input', () => {
    bgmManager.setBgmVolume(Number.parseInt(input.value, 10));
    syncBgmVolumeInput();
  });
}

function syncSfxVolumeInput(): void {
  const input = document.getElementById('settings-sfx-volume') as HTMLInputElement | null;
  const fill = document.getElementById('settings-sfx-fill');
  if (!input) return;

  const volume = sfxManager.getSfxVolume();
  input.value = String(volume);
  input.setAttribute('aria-valuenow', String(volume));
  if (fill) fill.style.width = `${volume}%`;
}

function bindSfxVolume(): void {
  const input = document.getElementById('settings-sfx-volume') as HTMLInputElement | null;
  if (!input) return;

  syncSfxVolumeInput();
  input.addEventListener('input', () => {
    sfxManager.setSfxVolume(Number.parseInt(input.value, 10));
    syncSfxVolumeInput();
  });
}

function syncLanguageSelect(): void {
  const select = document.getElementById('settings-language') as HTMLSelectElement | null;
  if (select) {
    select.value = localeManager.getLocale();
  }
}

function bindListeners(): void {
  if (listenersBound) return;

  const openBtn = document.getElementById('settings-open-btn');
  const modal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-close-btn');
  const languageSelect = document.getElementById('settings-language') as HTMLSelectElement | null;
  if (!openBtn || !modal || !closeBtn) return;

  listenersBound = true;

  const open = (): void => {
    // 야찌·보스 보상 등 진행 중에는 차단. 게임오버(사망) 중에는 허용.
    if (session?.isGameplayFrozen && !session.playerDead) return;

    if (!session?.playerDead) {
      session?.freeze('settings');
    }

    modal.classList.remove('hidden');
    domUiBridge.setLayerInteractive(true);
  };

  const close = (): void => {
    modal.classList.add('hidden');
    if (session?.freezeReason === 'settings') {
      session.unfreeze();
    }
    if (session?.playerDead || isGameOverModalOpen()) {
      domUiBridge.setLayerInteractive(true);
    } else {
      domUiBridge.setLayerInteractive(false);
    }
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  languageSelect?.addEventListener('change', () => {
    const value = languageSelect.value;
    if (value === 'ko' || value === 'en') {
      localeManager.setLocale(value as LocaleId);
    }
  });

  localeManager.onChange(syncLanguageSelect);

  bindBgmVolume();
  bindSfxVolume();
}

export function forceHideSettingsModal(): void {
  const modal = document.getElementById('settings-modal');
  modal?.classList.add('hidden');
  if (isGameOverModalOpen()) {
    domUiBridge.setLayerInteractive(true);
  } else {
    domUiBridge.setLayerInteractive(false);
  }
}

/** 설정 패널 — UI + 런 세션 freeze */
export function initSettingsModal(runSession: RunSession): void {
  session = runSession;
  syncLanguageSelect();
  syncBgmVolumeInput();
  syncSfxVolumeInput();
  bindListeners();
}
