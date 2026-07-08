import Phaser from 'phaser';
import { GAME_DESIGN_HEIGHT, GAME_DESIGN_WIDTH } from '../config/GameDisplayConfig.ts';
import { RunnerYatzyScene, twoPointFiveGlobalPlugin } from '../scenes/RunnerYatzyScene.ts';

export function bootstrapGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    parent,
    width: GAME_DESIGN_WIDTH,
    height: GAME_DESIGN_HEIGHT,
    backgroundColor: '#0a1018',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_DESIGN_WIDTH,
      height: GAME_DESIGN_HEIGHT,
    },
    render: {
      antialias: false,
      roundPixels: true,
    },
    fps: {
      smoothStep: false,
    },
    plugins: {
      global: [{ key: 'TwoPointFivePlugin', plugin: twoPointFiveGlobalPlugin, start: true }],
    },
    scene: [RunnerYatzyScene],
  };

  return new Phaser.Game(config);
}
