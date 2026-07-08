import type Phaser from 'phaser';
import {bgmManager} from '../../systems/BgmManager.ts';

let gameRef: Phaser.Game | null = null;
let installed = false;

export function setBrowserGuardGame(game: Phaser.Game): void {
  gameRef = game;
}

export function installBrowserGuards(): void {
  if (installed) return;
  installed = true;

  window.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
    },
    {passive: false},
  );

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
    }
  });

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      onGameBackground();
    } else if (document.visibilityState === 'visible') {
      onGameForeground();
    }
  });

  window.addEventListener('pagehide', onGameBackground);
  window.addEventListener('pageshow', onGameForeground);
  window.addEventListener('focus', () => {
    if (document.visibilityState === 'visible') {
      bgmManager.resumeFromVisibility();
    }
  });
  window.addEventListener(
    'pointerdown',
    () => {
      if (document.visibilityState === 'visible') {
        bgmManager.tryRestartBgmAfterForeground();
      }
    },
    {capture: true, passive: true},
  );
}

function onGameBackground(): void {
  gameRef?.loop.sleep();
  bgmManager.pauseForVisibility();
}

function onGameForeground(): void {
  gameRef?.loop.wake();
  bgmManager.resumeFromVisibility();
}
