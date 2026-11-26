import { gridToScreen, type Layout } from "./iso";
import { PROF_FX_TEXT } from "./constants";
import type { Player, ProfFx } from "./types";

type Ctx = CanvasRenderingContext2D;

function pill(ctx: Ctx, text: string, x: number, y: number, bg: string, fg: string, scale: number) {
  ctx.font = `bold ${Math.round(12 * Math.max(0.85, scale))}px sans-serif`;
  const w = ctx.measureText(text).width + 16;
  const h = 20 * Math.max(0.85, scale);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y + 4.2 * Math.max(0.85, scale));
  ctx.textAlign = "left";
}

/** Meslek efektlerini çizer: flaş, toplanma işareti, klaket, müzik notaları, sancak ve tablo parıltısı. */
export function drawProfFx(ctx: Ctx, l: Layout, fxs: ProfFx[], players: Player[], now: number) {
  for (const f of fxs) {
    const age = now - f.createdAt;
    if (age < 0 || age > f.dur) continue;
    const k = age / f.dur;
    const pl = players.find((p) => p.id === f.playerId);
    const sc = Math.max(0.8, l.scale);
    if (f.kind === "marker") {
      // Yere sabit toplanma işareti: nabız atan elmas halka + bayrak etiketi
      const { sx, sy } = gridToScreen(f.gx, f.gy, l);
      const cy = sy + l.tileH / 2;
      const pulse = (now / 700) % 1;
      ctx.save();
      ctx.globalAlpha = k > 0.85 ? Math.max(0, (1 - k) / 0.15) : 1;
      for (let i = 0; i < 2; i++) {
        const q = (pulse + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(250, 204, 21, ${1 - q})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const rw = (l.tileW * 0.5 + q * l.tileW * 0.55);
        const rh = rw / 2;
        ctx.moveTo(sx, cy - rh); ctx.lineTo(sx + rw, cy); ctx.lineTo(sx, cy + rh); ctx.lineTo(sx - rw, cy); ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(250, 204, 21, 0.28)";
      ctx.beginPath();
      ctx.moveTo(sx, cy - l.tileH / 2); ctx.lineTo(sx + l.tileW / 2, cy); ctx.lineTo(sx, cy + l.tileH / 2); ctx.lineTo(sx - l.tileW / 2, cy); ctx.closePath();
      ctx.fill();
      const bob = Math.sin(now / 260) * 3;
      pill(ctx, `${PROF_FX_TEXT.marker} • ${f.name}`, sx, cy - 52 * sc + bob, "rgba(15,23,42,0.88)", "#fde047", sc);
      ctx.restore();
      continue;
    }
    if (!pl) continue;
    const { sx, sy } = gridToScreen(pl.gx, pl.gy, l);
    const head = sy - 62 * sc;
    if (f.kind === "flash") {
      ctx.save();
      const r = (20 + k * 120) * sc;
      const g = ctx.createRadialGradient(sx + 10 * sc, head + 20 * sc, 0, sx + 10 * sc, head + 20 * sc, r);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - k)})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx + 10 * sc, head + 20 * sc, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "clap") {
      const step = age < 900 ? "3" : age < 1800 ? "2" : age < 2700 ? "1" : "";
      const txt = step ? `🎬 ${step}...` : PROF_FX_TEXT.clap.replace("3, 2, 1... ", "");
      ctx.save();
      ctx.globalAlpha = k > 0.85 ? Math.max(0, (1 - k) / 0.15) : 1;
      const big = step ? 1 + (1 - ((age % 900) / 900)) * 0.25 : 1.1;
      ctx.translate(sx, head - 18 * sc);
      ctx.scale(big, big);
      pill(ctx, txt, 0, 0, step ? "rgba(15,23,42,0.9)" : "#dc2626", "#ffffff", sc);
      ctx.restore();
    } else if (f.kind === "music") {
      ctx.save();
      const notes = ["♪", "♫", "♬", "♩"];
      ctx.font = `bold ${Math.round(18 * sc)}px sans-serif`;
      ctx.textAlign = "center";
      const fade = k > 0.9 ? Math.max(0, (1 - k) / 0.1) : 1;
      for (let i = 0; i < 5; i++) {
        const q = ((now / 1400 + i / 5) % 1);
        ctx.globalAlpha = Math.sin(q * Math.PI) * fade;
        ctx.fillStyle = `hsl(${(i * 70 + now / 12) % 360} 90% 70%)`;
        ctx.fillText(notes[i % notes.length], sx + Math.sin(q * 6 + i * 1.7) * 26 * sc + (i - 2) * 6, head + 18 * sc - q * 52 * sc);
      }
      ctx.restore();
    } else if (f.kind === "banner" || f.kind === "paint") {
      ctx.save();
      ctx.globalAlpha = k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1;
      const rise = Math.min(1, age / 250) * 6;
      pill(ctx, PROF_FX_TEXT[f.kind], sx, head - 14 * sc - rise, f.kind === "banner" ? "rgba(2,132,199,0.95)" : "rgba(190,24,93,0.95)", "#ffffff", sc);
      if (f.kind === "paint") {
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + now / 300;
          ctx.fillStyle = `hsl(${i * 60} 90% 60%)`;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(a) * 20 * sc, head + 30 * sc + Math.sin(a) * 8 * sc - k * 14, 2.4 * sc, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}
