import { GRID_SIZE } from "./constants";
import type { Tile } from "./types";

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Izgara üzerinde en kısa yolu bulur (8 yön, köşeden kesme yok).
 * `cols` ve `rows` parametreleri ile her boyuttaki odayı destekler.
 */
export function findPath(
  start: Tile,
  goal: Tile,
  isBlocked: (gx: number, gy: number) => boolean,
  cols = GRID_SIZE,
  rows = GRID_SIZE,
): Tile[] | null {
  if (start.gx === goal.gx && start.gy === goal.gy) return [];
  if (goal.gx < 0 || goal.gy < 0 || goal.gx >= cols || goal.gy >= rows) return null;
  if (isBlocked(goal.gx, goal.gy)) return null;

  const key = (gx: number, gy: number) => gy * cols + gx;
  const prev = new Map<number, number>();
  const seen = new Set<number>([key(start.gx, start.gy)]);
  const queue: Tile[] = [start];

  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = cur.gx + dx;
      const ny = cur.gy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const k = key(nx, ny);
      if (seen.has(k) || isBlocked(nx, ny)) continue;
      // Çaprazda iki yan kareden biri doluysa köşeden kesme
      if (dx !== 0 && dy !== 0 && (isBlocked(cur.gx + dx, cur.gy) || isBlocked(cur.gx, cur.gy + dy))) continue;

      seen.add(k);
      prev.set(k, key(cur.gx, cur.gy));
      if (nx === goal.gx && ny === goal.gy) {
        const path: Tile[] = [];
        let c: number | undefined = k;
        while (c !== undefined && c !== key(start.gx, start.gy)) {
          path.push({ gx: c % cols, gy: Math.floor(c / cols) });
          c = prev.get(c);
        }
        return path.reverse();
      }
      queue.push({ gx: nx, gy: ny });
    }
  }
  return null;
}
