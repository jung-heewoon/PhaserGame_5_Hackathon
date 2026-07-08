/** 스프라이트시트/단일 이미지에 흰색 외곽선을 베이크한 캔버스 반환 */
export function canvasWithWhiteOutline(
  source: HTMLImageElement | HTMLCanvasElement,
  outlinePx: number,
  alphaThreshold = 24,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const read = document.createElement('canvas');
  read.width = w;
  read.height = h;
  const readCtx = read.getContext('2d');
  if (!readCtx) return read;

  readCtx.drawImage(source, 0, 0);
  const src = readCtx.getImageData(0, 0, w, h);
  const outline = new Uint8ClampedArray(w * h * 4);
  const radius = Math.max(1, Math.round(outlinePx));
  const r2 = radius * radius;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] > alphaThreshold) continue;

      let edge = false;
      for (let dy = -radius; dy <= radius && !edge; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = (ny * w + nx) * 4;
          if (src.data[ni + 3] > alphaThreshold) {
            edge = true;
            break;
          }
        }
      }
      if (edge) {
        outline[i] = 255;
        outline[i + 1] = 255;
        outline[i + 2] = 255;
        outline[i + 3] = 255;
      }
    }
  }

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) return read;

  outCtx.putImageData(new ImageData(outline, w, h), 0, 0);
  outCtx.drawImage(read, 0, 0);
  return out;
}
