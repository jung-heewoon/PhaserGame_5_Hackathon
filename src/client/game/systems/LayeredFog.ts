import Program from 'twopointfive-phaser-3/src/twopointfive/renderer/program.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { TwoPointFiveScenePlugin } from 'twopointfive-phaser-3/src/twopointfive/two-point-five-plugin.ts';
import {
  RUNNER_FOG_CONFIG,
  fogColorToRgb,
  type FogLayer,
  type FogVoidCurtain,
} from '../config/FogConfig.ts';

const VERTEX_SHADER = [
  'precision highp float;',
  'attribute vec3 pos;',
  'attribute vec2 uv;',
  'attribute vec4 color;',
  'varying vec4 vColor;',
  'varying vec2 vUv;',
  'uniform mat4 view;',
  'uniform mat4 projection;',
  'void main(void) {',
  '  vColor = color;',
  '  vUv = uv;',
  '  gl_Position = projection * view * vec4(pos, 1.0);',
  '}',
].join('\n');

function buildLayeredFogFragment(
  layers: readonly FogLayer[],
  voidCurtain: FogVoidCurtain,
): string {
  const layerLines = layers.map(
    (layer) =>
      `  fogFactor = max(fogFactor, (1.0 - smoothstep(${layer.far}.0, ${layer.near}.0, depth)) * ${layer.amount.toFixed(4)});`,
  );

  return [
    'precision highp float;',
    'varying vec4 vColor;',
    'varying vec2 vUv;',
    'uniform sampler2D texture;',
    'uniform vec3 fogColor;',
    'void main(void) {',
    '  float depth = gl_FragCoord.z / gl_FragCoord.w;',
    '  float fogFactor = 0.0;',
    ...layerLines,
    `  float voidCurtain = 1.0 - smoothstep(${voidCurtain.far}.0, ${voidCurtain.near}.0, depth);`,
    '  fogFactor = max(fogFactor, voidCurtain);',
    '  fogFactor = 1.0 - pow(1.0 - clamp(fogFactor, 0.0, 1.0), 1.35);',
    '  vec4 tex = texture2D(texture, vUv);',
    '  if( tex.a < 0.8 ) discard;',
    '  gl_FragColor = tex * vColor;',
    '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor.rgb, fogFactor);',
    '}',
  ].join('\n');
}

type LayeredFogRenderer = Renderer & { __layeredFogSetFogPatched?: boolean };

function patchSetFog(renderer: LayeredFogRenderer): void {
  if (renderer.__layeredFogSetFogPatched) return;
  renderer.__layeredFogSetFogPatched = true;

  renderer.setFog = (color: number | false | undefined) => {
    if (color === false || typeof color === 'undefined') {
      renderer.setProgram(renderer.programDefault, true);
      renderer.fog = null;
      return;
    }
    renderer.setProgram(renderer.programFog, true);
    renderer.fog = { color, near: 0, far: 1 };
    const c1 = ((color & 0xff0000) >> 16) / 255;
    const c2 = ((color & 0x00ff00) >> 8) / 255;
    const c3 = (color & 0x0000ff) / 255;
    renderer.gl.uniform3f(renderer.program.uniform.fogColor, c1, c2, c3);
  };
}

/** TPF Renderer에 다겹 안개 + void 커튼 fragment program 설치 */
export function installLayeredFog(renderer: Renderer): void {
  const layered = renderer as LayeredFogRenderer;
  const fragment = buildLayeredFogFragment(
    RUNNER_FOG_CONFIG.layers,
    RUNNER_FOG_CONFIG.voidCurtain,
  );
  layered.programFog = new Program(layered.gl, VERTEX_SHADER, fragment);
  patchSetFog(layered);
}

export function applyRunnerFog(tpf: TwoPointFiveScenePlugin): void {
  const renderer = tpf.getRenderer();
  if (!renderer) return;
  installLayeredFog(renderer);

  const gs = tpf.getGameState();
  if (gs) {
    gs.clearColor = fogColorToRgb(RUNNER_FOG_CONFIG.color);
  }

  tpf.setFog(RUNNER_FOG_CONFIG.color, 0, 1);
}
