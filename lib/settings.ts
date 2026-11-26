/** Kullanıcı ayarları (tarayıcıda saklanır): ses seviyeleri ve grafik kalitesi. */
export interface Settings {
  sfxVol: number; // 0..1
  musicVol: number; // 0..1
  low: boolean; // düşük kalite: parçacık/kuş/yönlü gölge kapalı
  f3d: boolean; // 3D eşyalar tüm yönlerde (kapalıyken yalnız arka yönler 3D)
}

const KEY = "sw_settings";
const DEFAULTS: Settings = { sfxVol: 0.8, musicVol: 0.6, low: false, f3d: false };

/** Çizim kodunun okuduğu canlı kalite bayrağı. */
/** res: çizim çözünürlük çarpanı (1 = tam). Çok yavaş cihazlarda otomatik düşer ve hatırlanır. */
export const gfx = { low: false, f3d: false, res: 1 };

export function loadSettings(): Settings {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw) as Partial<Settings>;
    const clamp = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);
    return { sfxVol: clamp(o.sfxVol, DEFAULTS.sfxVol), musicVol: clamp(o.musicVol, DEFAULTS.musicVol), low: o.low === true, f3d: o.f3d === true };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings) {
  gfx.low = s.low;
  gfx.f3d = s.f3d;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* depolama kapalı olabilir */
  }
}
