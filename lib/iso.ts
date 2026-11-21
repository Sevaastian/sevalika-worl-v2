import { BASE_TILE_H, BASE_TILE_W, GRID_SIZE } from "./constants";

export interface Layout {
  scale: number;
  tileW: number;
  tileH: number;
  originX: number;
  originY: number;
  cols: number;
  rows: number;
}

export function getLayout(
  width: number,
  height: number,
  cols = GRID_SIZE,
  rows = GRID_SIZE,
  camX = 0,
  camY = 0,
): Layout {
  // Büyük haritalarda (cols > 14 veya rows > 14) karakteri yakından görebilmek için haritayı ekrana sıkıştırmıyoruz
  const isLarge = cols > 14 || rows > 14;
  const fullGridWidth = cols * BASE_TILE_W;
  const scale = isLarge
    ? width < 768
      ? 0.85
      : 1.05
    : width < 768
      ? Math.min(1, (width - 24) / fullGridWidth)
      : 1;

  const tileW = BASE_TILE_W * scale;
  const tileH = BASE_TILE_H * scale;

  // Küçük odalar ekran ortasında durur; büyük odalarda kamera (camX, camY) ofseti devreye girer
  const originX = isLarge ? width / 2 - camX : width / 2;
  const originY = isLarge
    ? height / 2 - camY
    : height / 2 - (rows * tileH) / 2 + (width < 768 ? 10 : 40);

  return { scale, tileW, tileH, originX, originY, cols, rows };
}

export function gridToScreen(gx: number, gy: number, l: Layout) {
  return {
    sx: l.originX + (gx - gy) * (l.tileW / 2),
    sy: l.originY + (gx + gy) * (l.tileH / 2),
  };
}

export function screenToGrid(sx: number, sy: number, l: Layout) {
  const dx = sx - l.originX;
  const dy = sy - l.originY;
  return {
    gx: Math.floor((dx / (l.tileW / 2) + dy / (l.tileH / 2)) / 2),
    gy: Math.floor((dy / (l.tileH / 2) - dx / (l.tileW / 2)) / 2),
  };
}

export const inGrid = (gx: number, gy: number, cols = GRID_SIZE, rows = GRID_SIZE) =>
  gx >= 0 && gx < cols && gy >= 0 && gy < rows;
