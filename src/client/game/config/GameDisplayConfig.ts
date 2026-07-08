/**
 * 가로(랜드스케이프) 16:9 고정 디자인 해상도.
 * Devvit/Reddit 모바일은 세로 iframe이므로 style.css에서 #game-shell을 90° 회전하고,
 * Phaser `Scale.FIT` + `CENTER_BOTH`로 회전된 박스 안에 맞춤.
 */
export const GAME_DESIGN_WIDTH = 1280;
export const GAME_DESIGN_HEIGHT = 720;
export const GAME_ASPECT_RATIO = GAME_DESIGN_WIDTH / GAME_DESIGN_HEIGHT;
