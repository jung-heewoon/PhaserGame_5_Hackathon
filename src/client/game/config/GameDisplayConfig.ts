/**
 * CrazyGames 가로(랜드스케이프) 플랫폼: 공식 문서 기준 **16:9** 비율을 지원하는 것이 일반적이다.
 * iframe 크기는 가변이므로 고정 **디자인 해상도** + Phaser `Scale.FIT`로 맞춘다.
 */
export const GAME_DESIGN_WIDTH = 1280;
export const GAME_DESIGN_HEIGHT = 720;
export const GAME_ASPECT_RATIO = GAME_DESIGN_WIDTH / GAME_DESIGN_HEIGHT;
