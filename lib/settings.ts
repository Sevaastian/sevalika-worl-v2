/** Kullanıcı ayarları (tarayıcıda saklanır): ses seviyeleri ve grafik kalitesi. */
export interface Settings {
  sfxVol: number; // 0..1
  musicVol: number; // 0..1
  low: boolean; // düşük kalite: parçacık/kuş/yönlü gölge kapalı
}

const KEY = "sw_settings";
const DEFAULTS: Settings = { sfxVol: 0.8, musicVol: 0.6, low: false };

/** Çizim kodunun okuduğu canlı kalite bayrağı. */
export const gfx = { low: false };

export function loadSettings(): Settings {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw) as Partial<Settings>;
    const clamp = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);
    return { sfxVol: clamp(o.sfxVol, DEFAULTS.sfxVol), musicVol: clamp(o.musicVol, DEFAULTS.musicVol), low: o.low === true };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings) {
  gfx.low = s.low;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* depolama kapalı olabilir */
  }
}
