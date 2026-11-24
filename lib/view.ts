/** Çizim sırasında görünür alan (CSS px, yerleşim koordinatları). Ekran dışı öğeleri atlamak için. */
export const view = { w: 100000, h: 100000 };
export function setView(w: number, h: number) { view.w = w; view.h = h; }
/** (x,y) noktası m kenar payıyla ekranın dışında mı? */
export const offscreen = (x: number, y: number, m: number) => x < -m || x > view.w + m || y < -m || y > view.h + m;
