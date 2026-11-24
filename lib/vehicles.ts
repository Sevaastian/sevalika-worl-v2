/** 4 yönlü araç sheet'leri (tools/gen_vehicle3d.py): 4 sütun x 1 satır, kare 480x360, merkez (240,240). */
export const VEH_FW = 480;
export const VEH_FH = 360;
export const VEH_FEET = 240;
export const VEHICLES = ["car_red", "car_blue", "car_yellow", "police", "pickup", "bus"] as const;
export type VehicleKind = (typeof VEHICLES)[number];

const cache = new Map<string, HTMLImageElement | "loading">();
export function vehicleSheet(name: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  const c = cache.get(name);
  if (c && c !== "loading") return c.complete && c.naturalWidth > 0 ? c : null;
  if (!c) {
    const img = new Image();
    img.src = `/sprites/veh/${name}.png`;
    cache.set(name, img);
  }
  return null;
}
