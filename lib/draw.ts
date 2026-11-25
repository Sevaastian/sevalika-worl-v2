import { vehicleSheet, VEH_FW, VEH_FH, VEH_FEET } from "./vehicles";
import { mipDraw } from "./mip";
import { lighting, silhouette } from "./ambience";
import { gfx } from "./settings";
import { bodyLayers, drawLayer, hasLayeredTop, hasLayeredHat, hasLayeredGlasses, hasLayeredBack, layersReady } from "./avatarLayers";
import { FURNI_BY_TYPE, ROOM_ROCKS, ROOM_WALLS, canRideHorse, isWaterTile, oyunikaCellAt, isPartiRoute, PARTI_PODIUM } from "./constants";
import { HAIN_ZONE_LABELS, hainZone } from "./hain";
import { CHAR_K, getLayout, gridToScreen, type Layout } from "./iso";
import { FURNI_SPRITES, sprites } from "./sprites";
import { drawHorseSprite } from "./horse";
import { f3Frame } from "./f3";
import { offscreen } from "./view";
import { drawSignPlate, drawFloorTex, drawWallTex, isFloorKind, wallKindFor } from "./tiles";
import type { FurniItem, NpcKind, Player, Portal, RoomTheme } from "./types";

type Ctx = CanvasRenderingContext2D;

/** Metni x etrafında ortalar. textAlign="center" bazı mobil tarayıcılarda (iOS Safari) kayıyor; elle hizalıyoruz. */
function centerText(ctx: Ctx, text: string, x: number, y: number, maxWidth?: number) {
  ctx.textAlign = "left";
  const w = ctx.measureText(text).width;
  if (maxWidth && w > maxWidth) {
    ctx.fillText(text, x - maxWidth / 2, y, maxWidth);
  } else {
    ctx.fillText(text, x - w / 2, y);
  }
}

/** Metni verilen genişliğe göre satırlara böler (en fazla maxLines, taşarsa "…"). */
function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  const push = (l: string) => lines.push(l);
  for (let word of words) {
    while (ctx.measureText(word).width > maxWidth) {
      let cut = word.length - 1;
      while (cut > 1 && ctx.measureText(word.slice(0, cut)).width > maxWidth) cut--;
      if (cur) {
        push(cur);
        cur = "";
      }
      push(word.slice(0, cut));
      word = word.slice(cut);
    }
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else {
      push(cur);
      cur = word;
    }
  }
  if (cur) push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,2}$/, "") + "…";
    return kept;
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Zemin Karosu ve Doku Yardımcıları (Kum, Ahşap, Çim, Kıyı Köpüğü)    */
/* ------------------------------------------------------------------ */

function tilePath(ctx: Ctx, sx: number, sy: number, l: Layout, inset = 0) {
  ctx.beginPath();
  ctx.moveTo(sx, sy + inset);
  ctx.lineTo(sx + l.tileW / 2 - inset, sy + l.tileH / 2);
  ctx.lineTo(sx, sy + l.tileH - inset);
  ctx.lineTo(sx - l.tileW / 2 + inset, sy + l.tileH / 2);
  ctx.closePath();
}

/** Ahşap iskele ve teras karolarına tahta kalas çizgileri + çivi dokusu ekler */
function drawWoodPlanks(ctx: Ctx, sx: number, sy: number, l: Layout, gx: number, gy: number) {
  ctx.save();
  tilePath(ctx, sx, sy, l, 0.5);
  ctx.clip();

  ctx.strokeStyle = "rgba(28, 13, 3, 0.42)";
  ctx.lineWidth = Math.max(1, 1.1 * l.scale);
  for (let i = -2; i <= 2; i++) {
    const off = i * 5.5 * l.scale;
    ctx.beginPath();
    ctx.moveTo(sx - l.tileW / 2, sy + off);
    ctx.lineTo(sx + l.tileW / 2, sy + l.tileH + off);
    ctx.stroke();
  }

  // Küçük ahşap çivi noktaları
  ctx.fillStyle = "rgba(254, 243, 199, 0.16)";
  const seed = (gx * 17 + gy * 31) % 7;
  ctx.fillRect(sx - 6 * l.scale + seed, sy + l.tileH * 0.45, 1.5 * l.scale, 1.5 * l.scale);
  ctx.fillRect(sx + 5 * l.scale - seed, sy + l.tileH * 0.55, 1.5 * l.scale, 1.5 * l.scale);
  ctx.restore();
}

/** Kumsal karolarına doğal kum tanecikleri ve hafif dalga izleri ekler */
function drawSandTexture(ctx: Ctx, sx: number, sy: number, l: Layout, gx: number, gy: number) {
  const h = (gx * 73 + gy * 137) % 100;
  ctx.fillStyle = "rgba(120, 83, 44, 0.25)";
  ctx.fillRect(sx + ((h % 19) - 9) * l.scale, sy + l.tileH * 0.38, 1.6 * l.scale, 1.4 * l.scale);
  ctx.fillRect(sx + (((h * 3) % 21) - 10) * l.scale, sy + l.tileH * 0.62, 1.4 * l.scale, 1.4 * l.scale);

  ctx.fillStyle = "rgba(255, 251, 235, 0.28)";
  ctx.fillRect(sx + (((h * 7) % 17) - 8) * l.scale, sy + l.tileH * 0.5, 1.5 * l.scale, 1.2 * l.scale);
}

/** Park çim karolarına küçük çim tutamları ekler */
function drawGrassTexture(ctx: Ctx, sx: number, sy: number, l: Layout, gx: number, gy: number) {
  const h = (gx * 41 + gy * 89) % 13;
  if (h > 8) return;
  ctx.strokeStyle = "rgba(134, 239, 172, 0.32)";
  ctx.lineWidth = Math.max(1, 1.1 * l.scale);
  const bx = sx + (h - 4) * 2.2 * l.scale;
  const by = sy + l.tileH * 0.52;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - 2 * l.scale, by - 4 * l.scale);
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + 2 * l.scale, by - 3.5 * l.scale);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* Oda (duvar + mekan cepheleri + özel zemin dokuları + kapılar)        */
/* ------------------------------------------------------------------ */

/** Sağ duvar (gx ekseni) üzerinde mekan tabelası veya pencere çizer */
function drawRightWallSign(ctx: Ctx, l: Layout, gxStart: number, gxEnd: number, title: string, bg: string, border = "#ffffff", yOffset = 78) {
  const p1 = gridToScreen(gxStart, 0, l);
  const p2 = gridToScreen(gxEnd, 0, l);
  const midX = (p1.sx + p2.sx) / 2;
  const midY = (p1.sy + p2.sy) / 2 - yOffset * l.scale;
  ctx.save();
  ctx.translate(midX, midY);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  const tw = Math.max(76, (gxEnd - gxStart) * 22) * l.scale;
  const th = 25 * l.scale;
  if (!drawSignPlate(ctx, bg, border, tw, th)) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -th / 2, tw, th, 4 * l.scale);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.font = `900 ${Math.max(8, 9.5 * l.scale)}px sans-serif`;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 2 * l.scale;
  ctx.shadowOffsetY = 1 * l.scale;
  ctx.fillStyle = "#ffffff";
  centerText(ctx, title, 0, 3.5 * l.scale);
  ctx.restore();
}

/** Sol duvar (gy ekseni) üzerinde mekan tabelası çizer */
function drawLeftWallSign(ctx: Ctx, l: Layout, gyStart: number, gyEnd: number, title: string, bg: string, border = "#ffffff", yOffset = 72) {
  const p1 = gridToScreen(0, gyStart, l);
  const p2 = gridToScreen(0, gyEnd, l);
  const midX = (p1.sx + p2.sx) / 2;
  const midY = (p1.sy + p2.sy) / 2 - yOffset * l.scale;
  ctx.save();
  ctx.translate(midX, midY);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  const tw = Math.max(74, (gyEnd - gyStart) * 22) * l.scale;
  const th = 25 * l.scale;
  if (!drawSignPlate(ctx, bg, border, tw, th)) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -th / 2, tw, th, 4 * l.scale);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.font = `900 ${Math.max(8, 9 * l.scale)}px sans-serif`;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 2 * l.scale;
  ctx.shadowOffsetY = 1 * l.scale;
  ctx.fillStyle = "#ffffff";
  centerText(ctx, title, 0, 3.5 * l.scale);
  ctx.restore();
}

/** Sağ duvar üzerinde panoramik pencere çizer */
function drawRightWindow(ctx: Ctx, l: Layout, gxStart: number, gxEnd: number, glassColor: string) {
  const p1 = gridToScreen(gxStart, 0, l);
  const p2 = gridToScreen(gxEnd, 0, l);
  const winBot = 24 * l.scale;
  const winTop = 76 * l.scale;
  ctx.beginPath();
  ctx.moveTo(p1.sx, p1.sy - winBot);
  ctx.lineTo(p2.sx, p2.sy - winBot);
  ctx.lineTo(p2.sx, p2.sy - winTop);
  ctx.lineTo(p1.sx, p1.sy - winTop);
  ctx.closePath();
  ctx.fillStyle = glassColor;
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Cadde-1 arka duvarına Sanalika tarzı vitrinler ve neon tabelalar çizer. */
function drawStreetFacades(ctx: Ctx, l: Layout, time: number) {
  const wallH = 115 * l.scale;

  const drawStorefront = (gxStart: number, gxEnd: number, wallColor: string, awningA: string, awningB: string, title: string, signBg: string) => {
    const p1 = gridToScreen(gxStart, 0, l);
    const p2 = gridToScreen(gxEnd, 0, l);
    const bH = wallH * 0.92;

    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.lineTo(p2.sx, p2.sy - bH);
    ctx.lineTo(p1.sx, p1.sy - bH);
    ctx.closePath();
    const shopTex = drawWallTex(ctx, "shop", wallColor, p1, p2, bH, Math.max(1, Math.round(gxEnd - gxStart)));
    if (!shopTex) {
      ctx.fillStyle = wallColor;
      ctx.fill();
    }
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const w1x = p1.sx + (p2.sx - p1.sx) * 0.16;
    const w1y = p1.sy + (p2.sy - p1.sy) * 0.16;
    const w2x = p1.sx + (p2.sx - p1.sx) * 0.84;
    const w2y = p1.sy + (p2.sy - p1.sy) * 0.84;
    const winBot = 14 * l.scale;
    const winTop = 58 * l.scale;

    if (shopTex) {
      // PNG vitrin camlarının içine sıcak ışık (her karoda iki cam)
      const n = Math.max(1, Math.round(gxEnd - gxStart));
      const dx = (p2.sx - p1.sx) / n, dy = (p2.sy - p1.sy) / n;
      ctx.fillStyle = "rgba(253, 224, 71, 0.20)";
      for (let i = 0; i < n; i++) {
        for (const [a0, a1] of [[12, 84], [96, 168]]) {
          const xa = p1.sx + dx * (i + a0 / 180), ya = p1.sy + dy * (i + a0 / 180);
          const xb = p1.sx + dx * (i + a1 / 180), yb = p1.sy + dy * (i + a1 / 180);
          const top = bH * (1 - 200 / 440), bot = bH * (1 - 382 / 440);
          ctx.beginPath();
          ctx.moveTo(xa, ya - bot); ctx.lineTo(xb, yb - bot); ctx.lineTo(xb, yb - top); ctx.lineTo(xa, ya - top);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(w1x, w1y - winBot);
      ctx.lineTo(w2x, w2y - winBot);
      ctx.lineTo(w2x, w2y - winTop);
      ctx.lineTo(w1x, w1y - winTop);
      ctx.closePath();
      ctx.fillStyle = "rgba(253, 224, 71, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      const t0 = i / stripes;
      const t1 = (i + 1) / stripes;
      const ax0 = w1x + (w2x - w1x) * t0;
      const ay0 = w1y + (w2y - w1y) * t0;
      const ax1 = w1x + (w2x - w1x) * t1;
      const ay1 = w1y + (w2y - w1y) * t1;
      ctx.beginPath();
      ctx.moveTo(ax0, ay0 - winTop);
      ctx.lineTo(ax1, ay1 - winTop);
      ctx.lineTo(ax1 - 6 * l.scale, ay1 - winTop + 12 * l.scale);
      ctx.lineTo(ax0 - 6 * l.scale, ay0 - winTop + 12 * l.scale);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? awningA : awningB;
      ctx.fill();
    }

    drawRightWallSign(ctx, l, gxStart, gxEnd, title, signBg, "#ffffff", 92);
  };

  drawStorefront(1, 7, "#3f2e3e", "#e11d48", "#f8fafc", "☕ MEYDAN KAFE", "#be123c");
  drawStorefront(7, 15, "#4c1d95", "#a855f7", "#fde68a", "🛍️ SEVALİKA AVM", "#7c3aed");
  drawStorefront(15, 24, "#1e3a5f", "#db2777", "#fef08a", "🎲 OYUNİKA ARENA", "#9d174d");
  drawStorefront(24, 33, "#3b1d36", "#9333ea", "#facc15", "🎰 MONAKO VIP", "#6b21a8");

  const g1 = gridToScreen(0, 5, l);
  const g2 = gridToScreen(0, 9, l);
  ctx.beginPath();
  ctx.moveTo(g1.sx, g1.sy);
  ctx.lineTo(g2.sx, g2.sy);
  ctx.lineTo(g2.sx, g2.sy - 68 * l.scale);
  ctx.lineTo(g1.sx, g1.sy - 68 * l.scale);
  ctx.closePath();
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const pulse = 0.7 + Math.sin(time / 300) * 0.3;
  ctx.globalAlpha = pulse;
  drawLeftWallSign(ctx, l, 5, 9, "⚓ İSKELE YOLU", "#0284c7", "#38bdf8", 48);
  drawLeftWallSign(ctx, l, 13, 17, "🌴 SAHİL KASABASI", "#0f766e", "#5eead4", 54);
  ctx.globalAlpha = 1;
}

/** Sahil Kasabası mimarisi: Duvar dekorları (PNG binalar yüklüyse çift görüntü yapmaz) */
function drawSahilKasabasiFacades(ctx: Ctx, l: Layout, time: number) {
  const wallH = 112 * l.scale;
  const hasTikiSprite = Boolean(sprites.get("/sprites/tiki_bar.png"));

  // Sol duvarda Neon BAR (tiki_bar.png henüz yüklenmediyse gösterilir)
  if (!hasTikiSprite) {
    const b1 = gridToScreen(0, 5.5, l);
    const b2 = gridToScreen(0, 8.5, l);
    ctx.beginPath();
    ctx.moveTo(b1.sx, b1.sy);
    ctx.lineTo(b2.sx, b2.sy);
    ctx.lineTo(b2.sx, b2.sy - wallH * 0.78);
    ctx.lineTo(b1.sx, b1.sy - wallH * 0.78);
    ctx.closePath();
    ctx.fillStyle = "#3b0764";
    ctx.fill();
    ctx.strokeStyle = "#e879f9";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    drawLeftWallSign(ctx, l, 5.5, 8.5, "🍹 BAR", "#701a75", "#f0abfc", 72);
  }

  // Sağ duvarda Neon Palmiye Dekoru (gx: 7..9)
  const np = gridToScreen(7.5, 0, l);
  ctx.save();
  ctx.translate(np.sx, np.sy - 46 * l.scale);
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 14;
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2.5 * l.scale;
  ctx.beginPath();
  ctx.moveTo(0, 22 * l.scale);
  ctx.quadraticCurveTo(4 * l.scale, 4 * l.scale, 0, -10 * l.scale);
  ctx.stroke();
  for (let a = -2; a <= 2; a++) {
    ctx.beginPath();
    ctx.moveTo(0, -10 * l.scale);
    ctx.quadraticCurveTo(a * 9 * l.scale, -18 * l.scale, a * 14 * l.scale, -6 * l.scale);
    ctx.stroke();
  }
  ctx.restore();

  // Sağ duvarda hafif yıldızlı gece atmosferi ışıkları
  const beat = Math.sin(time / 180) * 0.2 + 0.8;
  ctx.fillStyle = `rgba(244, 114, 182, ${0.18 * beat})`;
  const d1 = gridToScreen(10, 0, l);
  const d2 = gridToScreen(14, 0, l);
  ctx.beginPath();
  ctx.moveTo(d1.sx, d1.sy);
  ctx.lineTo(d2.sx, d2.sy);
  ctx.lineTo(d2.sx, d2.sy - wallH * 0.9);
  ctx.lineTo(d1.sx, d1.sy - wallH * 0.9);
  ctx.closePath();
  ctx.fill();
}

/** Sağ duvara derinlikli, Sanalika tarzı küçük mekan cephesi çizer. */
function drawRightWallBuilding(ctx: Ctx, l: Layout, gxStart: number, gxEnd: number, palette: { wall: string; roof: string; trim: string; glass: string; door: string }) {
  const a = gridToScreen(gxStart, 0, l);
  const b = gridToScreen(gxEnd, 0, l);
  const h = 82 * l.scale;
  const n = Math.max(1, Math.round(gxEnd - gxStart));
  const dx = (b.sx - a.sx) / n;
  const dy = (b.sy - a.sy) / n;
  // duvar üzerinde (tile t, yükseklik y) -> ekran noktası
  const at = (t: number, y: number) => ({ x: a.sx + dx * t, y: a.sy + dy * t - y });
  const quad = (t0: number, t1: number, y0: number, y1: number) => {
    const p0 = at(t0, y0), p1 = at(t1, y0), p2 = at(t1, y1), p3 = at(t0, y1);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
  };
  ctx.save();
  // Ana cephe: vitrin dokulu duvar (PNG), yoksa düz dolgu
  quad(0, n, 0, h);
  const tex = drawWallTex(ctx, "shop", palette.wall, a, b, h, n);
  if (!tex) { ctx.fillStyle = palette.wall; ctx.fill(); }
  quad(0, n, 0, h);
  ctx.strokeStyle = "rgba(15,23,42,.85)"; ctx.lineWidth = 2 * l.scale; ctx.stroke();
  // Çatı saçağı (duvara paralel)
  quad(-0.04, n + 0.04, h - 1 * l.scale, h + 8 * l.scale);
  ctx.fillStyle = palette.roof; ctx.fill();
  quad(-0.04, n + 0.04, h - 1 * l.scale, h + 8 * l.scale);
  ctx.strokeStyle = "rgba(15,23,42,.7)"; ctx.lineWidth = 1.2 * l.scale; ctx.stroke();
  // Vitrin camlarına renkli yansıma (PNG'deki iki cam / karo)
  if (tex) {
    ctx.fillStyle = palette.glass;
    for (let i = 0; i < n; i++) {
      for (const [w0, w1] of [[12, 84], [96, 168]]) {
        quad(i + w0 / 180, i + w1 / 180, h * (1 - 382 / 440), h * (1 - 200 / 440));
        ctx.fill();
      }
    }
  } else {
    quad(0.12 * n, 0.55 * n, 24 * l.scale, 54 * l.scale);
    ctx.fillStyle = palette.glass; ctx.fill();
  }
  // Işık çizgisi
  quad(0.1 * n, 0.9 * n, h - 20 * l.scale, h - 18 * l.scale);
  ctx.fillStyle = "rgba(255,237,160,.65)"; ctx.fill();
  ctx.restore();
}

/** Tropik palmiye: katmanlı yapraklar, gövde kıvrımı ve hindistan cevizleri. */
function drawPalmTree(ctx: Ctx, l: Layout, gx: number, gy: number, variant = 0) {
  const p = gridToScreen(gx, gy, l);
  const s = l.scale;
  ctx.save();
  ctx.translate(p.sx, p.sy + l.tileH*.34);
  // Yere düşen yumuşak gölge
  ctx.fillStyle = "rgba(15,23,42,.24)"; ctx.beginPath(); ctx.ellipse(0,2*s,17*s,6*s,-.12,0,Math.PI*2); ctx.fill();
  // Gövde
  ctx.strokeStyle = "#713f12"; ctx.lineWidth = 7*s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(-4*s,-13*s,7*s,-27*s,2*s,-45*s); ctx.stroke();
  ctx.strokeStyle = "#b77932"; ctx.lineWidth = 2*s; ctx.beginPath(); ctx.moveTo(-1*s,-5*s); ctx.bezierCurveTo(-3*s,-17*s,8*s,-28*s,3*s,-43*s); ctx.stroke();
  const topY = -45*s; const lean = variant%2 ? -2*s : 2*s;
  const leafColors = ["#15803d", "#16a34a", "#4d7c0f", "#65a30d", "#166534"];
  for(let i=0;i<8;i++){
    const ang = (Math.PI*2*i/8) + variant*.18;
    const ex = Math.cos(ang)* (19+((i+variant)%3)*2)*s + lean;
    const ey = topY + Math.sin(ang)*13*s - (i%2===0?5:0)*s;
    ctx.strokeStyle = leafColors[(i+variant)%leafColors.length]; ctx.lineWidth = 4.2*s;
    ctx.beginPath(); ctx.moveTo(lean,topY); ctx.quadraticCurveTo(lean+ex*.35,topY-8*s,ex,ey); ctx.stroke();
    ctx.strokeStyle = "rgba(190,242,100,.48)"; ctx.lineWidth = 1*s;
    ctx.beginPath(); ctx.moveTo(lean,topY); ctx.lineTo(ex,ey); ctx.stroke();
  }
  ctx.fillStyle="#92400e"; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(lean+(i-1)*3*s,topY+5*s,2.5*s,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}

/** Diğer mekanların duvar dekorasyonları ve tabelaları */
function drawRoomWallDecor(ctx: Ctx, l: Layout, slug: string, time: number) {
  switch (slug) {
    case "cadde-1":
      drawStreetFacades(ctx, l, time);
      break;
    case "sahil-kasabasi":
      drawSahilKasabasiFacades(ctx, l, time);
      break;
    case "avm-kat2":
      drawLeftWallSign(ctx, l, 4, 13, "💇 KUAFÖR · AKSESUAR · 2. KAT", "#be185d", "#fbcfe8", 80);
      break;
    case "avm":
      drawLeftWallSign(ctx, l, 6, 14, "🛍️ SEVALİKA AVM", "#7c3aed", "#fde68a", 80);
      break;
    case "emlak-ofisi":
      drawLeftWallSign(ctx, l, 3, 9, "🏡 EMLAK OFİSİ · HAYALİNDEKİ EV", "#0f766e", "#99f6e4", 80);
      break;
    case "oyunika":
      drawRightWallSign(ctx, l, 3, 14, "🎮 OYUNİKA · EĞLENCE SALONU", "#db2777", "#fde047", 82);
      break;
    case "parti-oyunu":
      drawRightWallSign(ctx, l, 3, 12, "🎉 PARTİ OYUNU", "#db2777", "#fde047", 82);
      break;
    case "tetris-arena":
      drawRightWallSign(ctx, l, 3, 12, "🧱 BLOK RÜZGÂRI ARENASI", "#6d28d9", "#67e8f9", 82);
      break;
    case "monako-kulup":
      drawRightWallSign(ctx, l, 4, 11, "🎰 MONAKO CASINO & LOUNGE", "#be123c", "#facc15", 82);
      drawRightWindow(ctx, l, 12, 16, "rgba(244, 63, 94, 0.18)");
      drawLeftWallSign(ctx, l, 2, 7, "🍸 VIP BAR", "#6b21a8", "#f472b6", 74);
      break;
    case "vip-cati-kati":
      drawRightWindow(ctx, l, 2, 7, "rgba(56, 189, 248, 0.25)");
      drawRightWindow(ctx, l, 11, 16, "rgba(56, 189, 248, 0.25)");
      drawRightWallSign(ctx, l, 7, 11, "👑 SEVALİKA SKY TERRACE", "#581c87", "#facc15", 84);
      break;
    case "iskele":
      drawRightWallBuilding(ctx, l, 9, 15, { wall: "#8b5e3c", roof: "#1d4ed8", trim: "#fbbf24", glass: "rgba(125,211,252,.72)", door: "#422006" });
      drawRightWallSign(ctx, l, 2, 8, "⚓ SAHİL İSKELESİ & BALIKÇI", "#0369a1", "#7dd3fc", 78);
      drawLeftWallSign(ctx, l, 4, 10, "🏙️ MEYDAN BULVARI", "#1e293b", "#38bdf8", 70);
      break;
    case "restoran":
      drawRightWallBuilding(ctx, l, 10, 15, { wall: "#9a3412", roof: "#7c2d12", trim: "#fed7aa", glass: "rgba(254,215,170,.78)", door: "#431407" });
      drawRightWallSign(ctx, l, 2, 7, "👨‍🍳 ŞEF KEMAL MUTFAĞI", "#c2410c", "#fed7aa", 80);
      drawRightWindow(ctx, l, 9, 14, "rgba(14, 165, 233, 0.28)");
      break;
    case "ciftlik":
      drawRightWallBuilding(ctx, l, 10, 15, { wall: "#a16207", roof: "#78350f", trim: "#fde68a", glass: "rgba(217,249,157,.55)", door: "#451a03" });
      drawRightWallSign(ctx, l, 4, 12, "🌾 SEVALİKA ORGANİK ÇİFTLİĞİ", "#3f6212", "#bef264", 80);
      break;
    case "maden":
      drawRightWallSign(ctx, l, 4, 11, "⛏️ TAŞ OCAĞI MADENİ", "#92400e", "#fbbf24", 80);
      break;
  }
}

/** Mekanlara özel dekoratif zemin katmanları. Tamamı canvas ile çizilir; ek sprite gerektirmez. */
function drawRoomAtmosphere(ctx: Ctx, l: Layout, slug: string, time: number) {
  const tileMark = (gx: number, gy: number, fill: string, stroke: string, inset = 5) => {
    const { sx, sy } = gridToScreen(gx, gy, l);
    tilePath(ctx, sx, sy, l, inset * l.scale);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, l.scale);
    ctx.stroke();
    return { sx, sy };
  };
  const line = (a: { sx: number; sy: number }, b: { sx: number; sy: number }, color: string, width = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, width * l.scale);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  };

  // Sahil ve iskele çevresinde gerçek mekan hissi veren palmiye kümeleri.
  if (slug === "sahil-kasabasi") {
    drawPalmTree(ctx, l, 2, 11, 0);
    drawPalmTree(ctx, l, 5, 13, 1);
    drawPalmTree(ctx, l, 14, 14, 2);
  }
  if (slug === "iskele") {
  }

  if (slug === "monako-kulup") {
    // Altın bordürlü kırmızı halı ve casino zeminindeki mermer madalyonlar.
    for (let gy = 10; gy <= 12; gy++) {
      for (let gx = 7; gx <= 9; gx++) tileMark(gx, gy, "rgba(127, 29, 54, .82)", "rgba(251, 191, 36, .8)", 3);
    }
    for (const [gx, gy] of [[4, 3], [13, 3], [4, 10], [13, 10]] as const) {
      const { sx, sy } = gridToScreen(gx, gy, l);
      ctx.save();
      ctx.fillStyle = "rgba(251, 191, 36, .18)";
      ctx.strokeStyle = "rgba(253, 230, 138, .72)";
      ctx.lineWidth = 1.4 * l.scale;
      ctx.beginPath();
      ctx.ellipse(sx, sy + l.tileH / 2, 13 * l.scale, 6 * l.scale, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(sx, sy + l.tileH / 2, 2.2 * l.scale, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Tavana asılı sıcak ışık zinciri.
    const a = gridToScreen(3, 0, l), b = gridToScreen(15, 0, l);
    ctx.save();
    ctx.strokeStyle = "rgba(251, 191, 36, .55)"; ctx.lineWidth = 1.5 * l.scale;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 84 * l.scale); ctx.quadraticCurveTo((a.sx+b.sx)/2, a.sy - 62*l.scale, b.sx, b.sy - 84*l.scale); ctx.stroke();
    for (let i=0;i<9;i++) { const x=a.sx+(b.sx-a.sx)*i/8; const y=a.sy-84*l.scale+Math.sin(i/8*Math.PI)*22*l.scale; ctx.fillStyle="#fde68a"; ctx.shadowColor="#f59e0b"; ctx.shadowBlur=8*l.scale; ctx.beginPath(); ctx.arc(x,y+5*l.scale,2.2*l.scale,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }

  if (slug === "vip-cati-kati") {
    // Panoramik gece manzarası ve çatı havuzu.
    const skylineBase = gridToScreen(0, 0, l);
    ctx.save();
    for (let i=0;i<8;i++) {
      const x=skylineBase.sx+(i+1)*18*l.scale;
      const h=(22+(i*17)%34)*l.scale;
      ctx.fillStyle=i%2 ? "rgba(30, 41, 75, .82)" : "rgba(49, 46, 91, .9)";
      ctx.fillRect(x, skylineBase.sy-72*l.scale-h, 12*l.scale, h);
      for(let w=0;w<2;w++) for(let r=0;r<3;r++) { ctx.fillStyle="rgba(253, 230, 138, .72)"; ctx.fillRect(x+(2+w*5)*l.scale, skylineBase.sy-72*l.scale-h+(5+r*8)*l.scale, 2*l.scale, 3*l.scale); }
    }
    ctx.restore();
    for (let gx=3;gx<=6;gx++) for(let gy=8;gy<=10;gy++) tileMark(gx,gy,"rgba(14, 165, 233, .22)","rgba(125, 211, 252, .5)",4);
    const poolA=gridToScreen(3,8,l), poolB=gridToScreen(7,8,l), poolC=gridToScreen(7,11,l), poolD=gridToScreen(3,11,l);
    ctx.save(); ctx.strokeStyle="rgba(186, 230, 253, .8)"; ctx.lineWidth=2*l.scale;
    ctx.beginPath(); ctx.moveTo(poolA.sx,poolA.sy); ctx.lineTo(poolB.sx,poolB.sy); ctx.lineTo(poolC.sx,poolC.sy); ctx.lineTo(poolD.sx,poolD.sy); ctx.closePath(); ctx.stroke();
    for(let i=0;i<4;i++){ const q=gridToScreen(3+i,9,l); ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.beginPath(); ctx.moveTo(q.sx-5*l.scale,q.sy+2*l.scale); ctx.lineTo(q.sx+5*l.scale,q.sy+5*l.scale); ctx.stroke(); }
    ctx.restore();
  }

  if (slug === "restoran") {
    // Sıcak krem-kiremit dama döşeme, mutfak önü karo bordürü.
    for(let gx=7;gx<=13;gx++) for(let gy=3;gy<=11;gy++) {
      if ((gx+gy)%2===0) tileMark(gx,gy,"rgba(255, 237, 213, .13)","rgba(251, 146, 60, .18)",3);
    }
    for(let gx=1;gx<=6;gx++) tileMark(gx,2,"rgba(251, 146, 60, .18)","rgba(254, 215, 170, .5)",2);
    // Duvar boyunca sıcak servis ışıkları.
    for(let gx=3;gx<=13;gx+=2){ const q=gridToScreen(gx,0,l); ctx.save(); ctx.shadowColor="#fb923c"; ctx.shadowBlur=10*l.scale; ctx.fillStyle="#fed7aa"; ctx.beginPath(); ctx.arc(q.sx,q.sy-67*l.scale,3*l.scale,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  }

  if (slug === "ciftlik") {
    // Tarlada belirgin ekim sıraları, filizler ve çevre çitleri.
    for(let gy=4;gy<=7;gy++) for(let gx=5;gx<=10;gx++) {
      const q=gridToScreen(gx,gy,l);
      ctx.save(); ctx.strokeStyle="rgba(217, 164, 94, .65)"; ctx.lineWidth=1.5*l.scale;
      ctx.beginPath(); ctx.moveTo(q.sx-l.tileW*.22,q.sy+l.tileH*.42); ctx.lineTo(q.sx+l.tileW*.22,q.sy+l.tileH*.58); ctx.stroke();
      if((gx+gy)%2===0){ ctx.strokeStyle="#84cc16"; ctx.lineWidth=2*l.scale; ctx.beginPath(); ctx.moveTo(q.sx,q.sy+l.tileH*.52); ctx.lineTo(q.sx-2*l.scale,q.sy+l.tileH*.34); ctx.moveTo(q.sx,q.sy+l.tileH*.52); ctx.lineTo(q.sx+3*l.scale,q.sy+l.tileH*.32); ctx.stroke(); }
      ctx.restore();
    }
    // Tarlanın çevresine ahşap kazıklar.
    for(let gx=5;gx<=10;gx+=1){ for(const gy of [4,8]) { const q=gridToScreen(gx,gy,l); ctx.fillStyle="#854d0e"; ctx.fillRect(q.sx-1.8*l.scale,q.sy-8*l.scale,3.6*l.scale,12*l.scale); ctx.fillStyle="#d6a35d"; ctx.fillRect(q.sx-2.4*l.scale,q.sy-8*l.scale,4.8*l.scale,2*l.scale); } }
    // Küçük sulama kanalı.
    for(let gy=9;gy<=11;gy++) tileMark(8,gy,"rgba(56, 189, 248, .22)","rgba(125, 211, 252, .35)",4);
  }

  if (slug === "maden") {
    // Maden rayları, traversler ve parlayan cevher damarları.
    for(let gy=5;gy<=11;gy++) {
      const a=gridToScreen(5,gy,l), b=gridToScreen(9,gy,l);
      line(a,b,"rgba(120, 113, 108, .55)",5);
      line(a,b,"rgba(226, 232, 240, .7)",1.5);
      for(let gx=5;gx<=9;gx+=1){ const q=gridToScreen(gx,gy,l); line({sx:q.sx-3*l.scale,sy:q.sy+2*l.scale},{sx:q.sx+3*l.scale,sy:q.sy+5*l.scale},"#78350f",3); }
    }
    for(const [gx,gy] of [[2,5],[12,4],[3,11],[12,10]] as const){
      const q=gridToScreen(gx,gy,l); ctx.save(); ctx.shadowColor="#38bdf8"; ctx.shadowBlur=13*l.scale; ctx.fillStyle="#38bdf8"; ctx.strokeStyle="#bae6fd"; ctx.lineWidth=1*l.scale;
      ctx.beginPath(); ctx.moveTo(q.sx,q.sy-15*l.scale); ctx.lineTo(q.sx+6*l.scale,q.sy-4*l.scale); ctx.lineTo(q.sx+2*l.scale,q.sy+3*l.scale); ctx.lineTo(q.sx-5*l.scale,q.sy-2*l.scale); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // Uyarı şeritli maden giriş alanı.
    for(let gx=5;gx<=8;gx++){ const q=gridToScreen(gx,1,l); ctx.save(); ctx.strokeStyle="rgba(251, 191, 36, .7)"; ctx.lineWidth=2*l.scale; ctx.beginPath(); ctx.moveTo(q.sx-5*l.scale,q.sy-4*l.scale); ctx.lineTo(q.sx+5*l.scale,q.sy+1*l.scale); ctx.stroke(); ctx.restore(); }
  }

  if (slug === "hain-avi") {
    ctx.save();
    ctx.font = `bold ${Math.round(11 * l.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(226,232,240,0.28)";
    for (const z of HAIN_ZONE_LABELS) {
      const q = gridToScreen(z.gx, z.gy, l);
      ctx.fillText(z.name, q.sx, q.sy + l.tileH * 0.65);
    }
    ctx.restore();
  }
  if (slug === "parti-oyunu") {
    const q = gridToScreen(9, 20.4, l);
    ctx.save();
    ctx.font = `900 ${Math.max(9, 11 * l.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fde68a";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 10 * l.scale;
    ctx.fillText("🏆 LİDERLİK KÜRSÜSÜ", q.sx, q.sy);
    ctx.restore();
  }
  if (slug === "oyunika" || slug === "parti-oyunu" || slug === "tetris-arena") {
    // Parkur dışındaki alana neon yıldızlar ve sahne ışıkları.
    for(let i=0;i<12;i++){ const gx=(i*7)%l.cols, gy=(i*3+1)%l.rows; const q=gridToScreen(gx,gy,l); const pulse=.55+.45*Math.sin(time/250+i);
      ctx.save(); ctx.globalAlpha=pulse; const starColor=i%2?"#f0abfc":"#67e8f9"; ctx.fillStyle=starColor; ctx.shadowColor=starColor; ctx.shadowBlur=8*l.scale; ctx.beginPath(); ctx.arc(q.sx,q.sy,1.8*l.scale,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  }
}

/** Sahil Kasabası özel çizimleri: Plaj voleybolu sahası, DJ dans pisti, pergola, tekne */
function drawSahilKasabasiExtras(ctx: Ctx, l: Layout, time: number) {
  // 1) DJ Dans Pisti (gx: 10..13, gy: 2..3) - ışıklı neon karolar
  const discoColors = ["#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#f43f5e"];
  const step = Math.floor(time / 320);
  for (let gx = 10; gx <= 13; gx++) {
    for (let gy = 2; gy <= 3; gy++) {
      const { sx, sy } = gridToScreen(gx, gy, l);
      tilePath(ctx, sx, sy, l, 2 * l.scale);
      ctx.fillStyle = discoColors[(gx + gy + step) % discoColors.length];
      ctx.globalAlpha = 0.72;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.stroke();
    }
  }

   // 2) Plaj Voleybolu Sahası (gx: 7..12, gy: 6..9) - beyaz saha çizgileri, file ve top
  const cTop = gridToScreen(7, 6, l);
  const cRight = gridToScreen(13, 6, l);
  const cBot = gridToScreen(13, 10, l);
  const cLeft = gridToScreen(7, 10, l);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 1.8 * l.scale;
  ctx.beginPath();
  ctx.moveTo(cTop.sx, cTop.sy);
  ctx.lineTo(cRight.sx, cRight.sy);
  ctx.lineTo(cBot.sx, cBot.sy);
  ctx.lineTo(cLeft.sx, cLeft.sy);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1;

  // Voleybol filesi (ortada gx = 10 boyunca)
  const netA = gridToScreen(10, 6, l);
  const netB = gridToScreen(10, 10, l);
  const netH = 26 * l.scale;
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.beginPath();
  ctx.moveTo(netA.sx, netA.sy - 8 * l.scale);
  ctx.lineTo(netB.sx, netB.sy - 8 * l.scale);
  ctx.lineTo(netB.sx, netB.sy - netH);
  ctx.lineTo(netA.sx, netA.sy - netH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  // Direkler
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 3 * l.scale;
  ctx.beginPath();
  ctx.moveTo(netA.sx, netA.sy);
  ctx.lineTo(netA.sx, netA.sy - netH - 2 * l.scale);
  ctx.moveTo(netB.sx, netB.sy);
  ctx.lineTo(netB.sx, netB.sy - netH - 2 * l.scale);
  ctx.stroke();
  ctx.lineWidth = 1;

  // Voleybol topu
  const ballPos = gridToScreen(11, 8, l);
  const bounce = Math.abs(Math.sin(time / 480)) * 4 * l.scale;
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(ballPos.sx, ballPos.sy + l.tileH / 2 - 4 * l.scale - bounce, 5.5 * l.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1d4ed8";
  ctx.stroke();

  // 3) İskele yanındaki beyaz tekne (gx: 18, gy: 7)
  const boat = gridToScreen(18, 7, l);
  const bob = Math.sin(time / 450) * 2.5 * l.scale;
  ctx.save();
  ctx.translate(boat.sx, boat.sy + l.tileH / 2 + bob);
  ctx.scale(l.scale, l.scale);
  ctx.fillStyle = "rgba(3, 105, 161, 0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 6, 28, 12, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(-24, -2);
  ctx.quadraticCurveTo(0, -14, 26, 2);
  ctx.quadraticCurveTo(6, 14, -24, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(-6, -6, 12, 5);
  ctx.restore();

  // 4) Kum üstü dekor: havlular, deniz yıldızları, kabuklar, kum kalesi, ayak izleri
  const cxy = (gx: number, gy: number) => {
    const g = gridToScreen(gx, gy, l);
    return { x: g.sx, y: g.sy + l.tileH / 2 };
  };
  const towels: [number, number, string, string][] = [
    [2, 7, "#f43f5e", "#fecdd3"],
    [6, 7, "#0ea5e9", "#e0f2fe"],
    [2, 10, "#a855f7", "#f3e8ff"],
    [6, 10, "#f59e0b", "#fef3c7"],
    [14, 12, "#10b981", "#d1fae5"],
  ];
  for (const [tx, ty, c1, c2] of towels) {
    const g = gridToScreen(tx, ty, l);
    tilePath(ctx, g.sx, g.sy, l, 12 * l.scale);
    ctx.fillStyle = c1;
    ctx.fill();
    ctx.save();
    tilePath(ctx, g.sx, g.sy, l, 12 * l.scale);
    ctx.clip();
    ctx.strokeStyle = c2;
    ctx.lineWidth = 2.2 * l.scale;
    for (let q = -3; q <= 3; q++) {
      ctx.beginPath();
      ctx.moveTo(g.sx + q * 5 * l.scale - 14 * l.scale, g.sy + l.tileH * 0.5 - 8 * l.scale);
      ctx.lineTo(g.sx + q * 5 * l.scale + 14 * l.scale, g.sy + l.tileH * 0.5 + 8 * l.scale);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 1;
  }
  const star = (gx: number, gy: number, col: string) => {
    const { x, y } = cxy(gx, gy);
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let q = 0; q < 10; q++) {
      const r = (q % 2 ? 2.2 : 5) * l.scale;
      const a = -Math.PI / 2 + (q * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  };
  star(9, 12, "#fb7185");
  star(15, 4, "#fb923c");
  star(1, 4, "#f472b6");
  star(12, 8, "#f87171");
  const shell = (gx: number, gy: number) => {
    const { x, y } = cxy(gx, gy);
    ctx.fillStyle = "#fde8d0";
    ctx.beginPath();
    ctx.ellipse(x, y, 3.4 * l.scale, 2 * l.scale, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4a574";
    ctx.stroke();
  };
  shell(9.4, 11.2);
  shell(5.5, 8);
  shell(15, 8.6);
  shell(2.2, 14);
  // kum kalesi
  {
    const { x, y } = cxy(12.2, 14.6);
    ctx.fillStyle = "#e4c78a";
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * l.scale, 10 * l.scale, 4.5 * l.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 7 * l.scale, y - 6 * l.scale, 14 * l.scale, 8 * l.scale);
    for (let q = 0; q < 3; q++) ctx.fillRect(x - 7 * l.scale + q * 5 * l.scale, y - 9 * l.scale, 3.5 * l.scale, 3.5 * l.scale);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(x, y - 10 * l.scale);
    ctx.lineTo(x, y - 18 * l.scale);
    ctx.lineTo(x + 7 * l.scale, y - 15 * l.scale);
    ctx.closePath();
    ctx.fill();
  }
  // ayak izleri (kıyıya doğru)
  ctx.fillStyle = "rgba(160, 120, 60, 0.28)";
  for (let q = 0; q < 8; q++) {
    const { x, y } = cxy(10 + q * 0.7, 11.2 + q * 0.12 + (q % 2) * 0.22);
    ctx.beginPath();
    ctx.ellipse(x, y, 2.4 * l.scale, 1.2 * l.scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5) Denizde şamandıralar, yelkenli ve iskele fenerleri
  for (const [bx, by] of [[18.4, 1.5], [19.4, 3.2], [18.6, 11.5], [19.3, 13.8]] as const) {
    const { x, y } = cxy(bx, by);
    const bb = Math.sin(time / 520 + bx * 3 + by) * 2.2 * l.scale;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.ellipse(x, y + bb, 5 * l.scale, 6 * l.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 5 * l.scale, y + bb - 1.5 * l.scale, 10 * l.scale, 3 * l.scale);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + bb + 6 * l.scale, 7 * l.scale, 2 * l.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  {
    // yelkenli, ufukta yavaşça süzülür
    const t = (time / 22000) % 1;
    const { x, y } = cxy(18.6, 0.5 + t * 14);
    const bb = Math.sin(time / 600) * 2 * l.scale;
    ctx.save();
    ctx.translate(x, y + bb);
    ctx.scale(l.scale, l.scale);
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.lineTo(9, 6);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -30);
    ctx.lineTo(13, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(-2, -22);
    ctx.lineTo(-12, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const py of [5, 8]) {
    for (const px of [17, 18]) {
      const { x, y } = cxy(px, py);
      const g = 0.75 + Math.sin(time / 400 + px + py) * 0.25;
      ctx.fillStyle = "#4a2f17";
      ctx.fillRect(x - 1.5 * l.scale, y - 18 * l.scale, 3 * l.scale, 20 * l.scale);
      ctx.fillStyle = `rgba(253, 224, 71, ${g})`;
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 10 * l.scale;
      ctx.beginPath();
      ctx.arc(x, y - 20 * l.scale, 3.6 * l.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // 6) Martılar: gökyüzünde daire çizerek uçar
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 1.8 * l.scale;
  for (let q = 0; q < 3; q++) {
    const a = time / (2600 + q * 700) + q * 2.1;
    const c = cxy(13 + q * 1.5, 7 + q * 2);
    const x = c.x + Math.cos(a) * (120 + q * 30) * l.scale;
    const y = c.y - 150 * l.scale + Math.sin(a * 1.3) * 26 * l.scale;
    const flap = Math.sin(time / 130 + q) * 3.5 * l.scale;
    ctx.beginPath();
    ctx.moveTo(x - 8 * l.scale, y - flap);
    ctx.quadraticCurveTo(x - 3 * l.scale, y - 4 * l.scale - flap, x, y);
    ctx.quadraticCurveTo(x + 3 * l.scale, y - 4 * l.scale - flap, x + 8 * l.scale, y - flap);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/* ------------------------------------------------------------------ */
/* v7: Habbo tarzı sıcak zemin / duvar / zemin kalınlığı                */
/* ------------------------------------------------------------------ */

type TileKind = "plain" | "wood" | "sand" | "grass" | "asphalt" | "soil" | "stone" | "carpet" | "marble" | "brick" | "neon" | "metal" | "snow";
type TileStyle = { a: string; b: string; kind: TileKind; edge: string };

function tileStyle(slug: string, gx: number, gy: number, theme: RoomTheme): TileStyle {
  const base: TileStyle = { a: theme.floorA, b: theme.floorB, kind: "plain", edge: "#00000030" };
  switch (slug) {
    case "cadde-1":
      if (gy <= 5 || gy === 10 || gy === 11) return { a: "#e8dbc2", b: "#dccdb0", kind: "brick", edge: "#8a7a5c55" };
      if (gy >= 6 && gy <= 9) return { a: "#6f7683", b: "#676e7b", kind: "asphalt", edge: "#3a3f4a55" };
      if (gx >= 10 && gx <= 23) return { a: (gx + gy) % 6 < 3 ? "#f1e6cf" : "#e6d7b8", b: "#dccdb0", kind: "brick", edge: "#8a7a5c55" };
      return { a: "#74c04f", b: "#68b448", kind: "grass", edge: "#3f7a2a44" };
    case "kis-koyu":
      if (gx >= 11 && gx <= 19 && gy >= 4 && gy <= 11) return { a: (gx + gy) % 2 ? "#cfe9f7" : "#c3e1f2", b: "#b4d6ec", kind: "marble", edge: "#6aa5c855" };
      if (gy === 8 && gx <= 10) return { a: "#d9cfc0", b: "#cdc2b0", kind: "brick", edge: "#7a6e5d55" };
      return { a: (gx * 7 + gy * 3) % 5 < 2 ? "#f4f8fd" : "#eaf1f9", b: "#dde8f4", kind: "snow", edge: "#9fb6d333" };
    case "emlak-ofisi":
      if (gx >= 6 && gx <= 10 && gy >= 5 && gy <= 10) return { a: "#99f6e4", b: "#7fe7d8", kind: "carpet", edge: "#0f766e55" };
      return { a: "#efe6d6", b: "#e0d5bf", kind: "marble", edge: "#a8a29e44" };
    case "avm-kat2":
      if (gx >= 11 && gx <= 14) return { a: "#fbcfe8", b: "#f5b8d9", kind: "carpet", edge: "#be185d55" };
      return { a: "#f6efe4", b: "#e8dccb", kind: "marble", edge: "#a8a29e44" };
    case "avm":
      if (gx >= 12 && gx <= 15) return { a: "#c4b5fd", b: "#b9a8f5", kind: "carpet", edge: "#6d28d955" };
      if (gy >= 3 && gy <= 4 && gx <= 26) return { a: "#fbf7f0", b: "#efe7da", kind: "marble", edge: "#a8a29e44" };
      return { a: "#f3efe8", b: "#e0d9cc", kind: "marble", edge: "#a8a29e44" };
    case "sahil-kasabasi":
      if ((gx <= 7 && gy <= 4) || (gx >= 15 && (gy === 5 || gy === 8))) return { a: "#c98a4b", b: "#bb7c3e", kind: "wood", edge: "#5a381a66" };
      return { a: "#f3dfa8", b: "#ead29a", kind: "sand", edge: "#b8955a33" };
    case "iskele":
      if (gx <= 2) return { a: "#f3dfa8", b: "#ead29a", kind: "sand", edge: "#b8955a33" };
      return { a: "#c98a4b", b: "#bb7c3e", kind: "wood", edge: "#5a381a66" };
    case "ciftlik":
      if (gx >= 5 && gx <= 10 && gy >= 4 && gy <= 7) return { a: "#8a5a34", b: "#7d502d", kind: "soil", edge: "#3b240f55" };
      return { a: "#74c04f", b: "#68b448", kind: "grass", edge: "#3f7a2a44" };
    case "monako-kulup":
      return { a: "#a63048", b: "#932a40", kind: "carpet", edge: "#fbbf2455" };
    case "vip-cati-kati":
      return { a: "#efecf5", b: "#d9d4e6", kind: "marble", edge: "#7c6aa044" };
    case "restoran":
      return { a: "#f6e4c3", b: "#e3c08a", kind: "marble", edge: "#a0683044" };
    case "maden":
      return { a: "#a49a8f", b: "#948a7f", kind: "stone", edge: "#4a3f3566" };
    case "oyunika":
    case "parti-oyunu":
    case "tetris-arena":
      return { a: "#9b86f0", b: "#8873e0", kind: "neon", edge: "#c4b5fd44" };
    case "hain-avi":
      return { a: "#7d8ea6", b: "#71829a", kind: "metal", edge: "#94a3b844" };
    default:
      if (slug.startsWith("home-")) return { a: theme.floorA, b: theme.floorB, kind: (theme.floorKind as TileKind | undefined) ?? "wood", edge: "#6b431f55" };
      return base;
  }
}

function drawStyledTile(
  ctx: Ctx,
  sx: number,
  sy: number,
  l: Layout,
  slug: string,
  gx: number,
  gy: number,
  theme: RoomTheme,
  isHover: boolean,
  hoverColor: string,
) {
  const st = tileStyle(slug, gx, gy, theme);
  const fillCol = (gx + gy) % 2 === 0 ? st.a : st.b;
  const seamless = st.kind === "snow" || st.kind === "grass" || st.kind === "sand" || st.kind === "asphalt" || st.kind === "soil";
  const variant = ((gx * 73 + gy * 137) >> 2) % 4;
  const useTex = isFloorKind(st.kind) && drawFloorTex(ctx, st.kind, fillCol, variant, sx, sy, l.tileW, l.tileH);
  if (!useTex) {
    tilePath(ctx, sx, sy, l);
    ctx.fillStyle = fillCol;
    ctx.fill();
  }
  if (!useTex || !seamless) {
    tilePath(ctx, sx, sy, l);
    ctx.lineWidth = 1;
    ctx.strokeStyle = useTex ? "rgba(0,0,0,0.10)" : st.edge;
    ctx.stroke();
  }

  const s = l.scale;
  const hw = l.tileW / 2;
  const hh = l.tileH / 2;
  const cy = sy + hh;
  const h = (gx * 73 + gy * 137) % 100;

  // Üst kenarlara ışık (bevel) — her karoyu net okunur yapar
  if (!useTex && st.kind !== "grass" && st.kind !== "asphalt") {
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.max(1, 1.1 * s);
    ctx.beginPath();
    ctx.moveTo(sx - hw + 1.5 * s, cy);
    ctx.lineTo(sx, sy + 1.2 * s);
    ctx.lineTo(sx + hw - 1.5 * s, cy);
    ctx.stroke();
  }

  switch (useTex && st.kind !== "carpet" ? "plain" : st.kind) {
    case "wood":
      drawWoodPlanks(ctx, sx, sy, l, gx, gy);
      break;
    case "sand":
      drawSandTexture(ctx, sx, sy, l, gx, gy);
      break;
    case "grass": {
      drawGrassTexture(ctx, sx, sy, l, gx, gy);
      if (h % 11 === 0) {
        const colors = ["#fde047", "#f9a8d4", "#ffffff", "#fb923c"];
        ctx.fillStyle = colors[h % colors.length];
        ctx.beginPath();
        ctx.arc(sx + ((h % 13) - 6) * s, cy + ((h % 5) - 2) * s, 1.7 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(sx + ((h % 13) - 6) * s, cy + ((h % 5) - 2) * s, 0.6 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "brick": {
      // Kaldırım taşı derzleri
      ctx.strokeStyle = "rgba(120, 100, 70, 0.28)";
      ctx.lineWidth = Math.max(1, s);
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.5, cy - hh * 0.5);
      ctx.lineTo(sx + hw * 0.5, cy + hh * 0.5);
      ctx.moveTo(sx + hw * 0.5, cy - hh * 0.5);
      ctx.lineTo(sx - hw * 0.5, cy + hh * 0.5);
      ctx.stroke();
      break;
    }
    case "asphalt": {
      if (h % 7 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(sx + ((h % 17) - 8) * s, cy + ((h % 5) - 2) * s, 2 * s, 1.3 * s);
      }
      break;
    }
    case "soil": {
      ctx.strokeStyle = "rgba(60, 35, 15, 0.35)";
      ctx.lineWidth = Math.max(1, 1.3 * s);
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.45, cy - hh * 0.2);
      ctx.lineTo(sx + hw * 0.1, cy + hh * 0.55);
      ctx.moveTo(sx - hw * 0.1, cy - hh * 0.55);
      ctx.lineTo(sx + hw * 0.45, cy + hh * 0.2);
      ctx.stroke();
      break;
    }
    case "stone": {
      ctx.strokeStyle = "rgba(60, 50, 40, 0.3)";
      ctx.lineWidth = Math.max(1, s);
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.3 + (h % 5), cy - hh * 0.3);
      ctx.lineTo(sx + hw * 0.2, cy + hh * 0.1 + (h % 3));
      ctx.lineTo(sx + hw * 0.05, cy + hh * 0.5);
      ctx.stroke();
      if (h % 6 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(sx - 4 * s, cy - 2 * s, 3 * s, 2 * s);
      }
      break;
    }
    case "carpet": {
      // Altın baklava desenli halı (dama düzeninde seyrek süs)
      if ((gx + gy) % 2 !== 0) break;
      tilePath(ctx, sx, sy, l, 9 * s);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
      ctx.lineWidth = Math.max(1, 1.2 * s);
      ctx.stroke();
      ctx.fillStyle = "rgba(251, 191, 36, 0.7)";
      ctx.beginPath();
      ctx.arc(sx, cy, 1.6 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "marble": {
      if ((gx + gy) % 2 === 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = Math.max(1, 1.4 * s);
        ctx.beginPath();
        ctx.moveTo(sx - hw * 0.35, cy - hh * 0.1);
        ctx.lineTo(sx - hw * 0.05, cy - hh * 0.4);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

  // Cadde: yaya geçidi, şerit çizgileri, bordür
  if (slug === "cadde-1" && gy >= 6 && gy <= 9) {
    if (gx === 15 || gx === 16) {
      tilePath(ctx, sx, sy, l, 5 * s);
      ctx.fillStyle = "rgba(250, 250, 250, 0.82)";
      ctx.fill();
    } else if (gy === 7 && gx % 3 === 0) {
      ctx.strokeStyle = "rgba(253, 224, 71, 0.85)";
      ctx.lineWidth = Math.max(1.5, 2 * s);
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.4, cy + hh * 0.1);
      ctx.lineTo(sx + hw * 0.4, cy + hh * 0.9);
      ctx.stroke();
    }
    if (gy === 6 || gy === 9) {
      ctx.strokeStyle = "rgba(241, 245, 249, 0.8)";
      ctx.lineWidth = Math.max(1.2, 1.6 * s);
      ctx.beginPath();
      if (gy === 6) {
        ctx.moveTo(sx - hw + 1.5 * s, cy);
        ctx.lineTo(sx, sy + 1.2 * s);
      } else {
        ctx.moveTo(sx, sy + l.tileH - 1.2 * s);
        ctx.lineTo(sx + hw - 1.5 * s, cy);
      }
      ctx.stroke();
    }
  }

  if (isHover) {
    tilePath(ctx, sx, sy, l);
    ctx.fillStyle = hoverColor;
    ctx.fill();
  }
}

/** Zemin kalınlığı: oda kenarlarında kalın taş/toprak yüzeyi (karakterli oda silüeti) */
function drawSlab(ctx: Ctx, l: Layout, slug: string, theme: RoomTheme) {
  const depth = 11 * l.scale;
  const { cols, rows } = l;
  const base = (() => {
    switch (slug) {
      case "cadde-1": return ["#a8987a", "#8c7d60"];
      case "avm": return ["#b8afc9", "#9a90b0"];
      case "avm-kat2": return ["#d9a7c4", "#c18eac"];
      case "emlak-ofisi": return ["#8fbdb5", "#74a69d"];
      case "kis-koyu": return ["#9fb3cf", "#8499b9"];
      case "ciftlik": return ["#8a5a34", "#6e4426"];
      case "sahil-kasabasi":
      case "iskele": return ["#a5733c", "#845a2c"];
      case "monako-kulup": return ["#6b1a2c", "#521422"];
      case "vip-cati-kati": return ["#b9b2cf", "#9a92b8"];
      case "maden": return ["#6a5f55", "#524940"];
      case "oyunika":
      case "parti-oyunu":
      case "tetris-arena": return ["#3b2d7a", "#2e2262"];
      case "hain-avi": return ["#334155", "#2b3648"];
      default: return ["#b98a50", "#9a7040"];
    }
  })();
  for (let gx = 0; gx < cols; gx++) {
    if (isWaterTile(slug, gx, rows - 1)) continue;
    const p = gridToScreen(gx, rows - 1, l);
    ctx.beginPath();
    ctx.moveTo(p.sx - l.tileW / 2, p.sy + l.tileH / 2);
    ctx.lineTo(p.sx, p.sy + l.tileH);
    ctx.lineTo(p.sx, p.sy + l.tileH + depth);
    ctx.lineTo(p.sx - l.tileW / 2, p.sy + l.tileH / 2 + depth);
    ctx.closePath();
    ctx.fillStyle = base[0];
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
  }
  for (let gy = 0; gy < rows; gy++) {
    if (isWaterTile(slug, cols - 1, gy)) continue;
    const p = gridToScreen(cols - 1, gy, l);
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy + l.tileH);
    ctx.lineTo(p.sx + l.tileW / 2, p.sy + l.tileH / 2);
    ctx.lineTo(p.sx + l.tileW / 2, p.sy + l.tileH / 2 + depth);
    ctx.lineTo(p.sx, p.sy + l.tileH + depth);
    ctx.closePath();
    ctx.fillStyle = base[1];
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
  }
  void theme;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** Duvar: üst süpürgelik (taç), orta panel, alt lambri ve süpürgelik çizgileri. */
function drawWallPanel(
  ctx: Ctx,
  l: Layout,
  a: { sx: number; sy: number },
  b: { sx: number; sy: number },
  wallH: number,
  color: string,
  count: number,
  lit: boolean,
  slug = "",
) {
  if (drawWallTex(ctx, wallKindFor(slug), color, a, b, wallH, count)) {
    // yön ışığı + dış çizgi
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(b.sx, b.sy - wallH);
    ctx.lineTo(a.sx, a.sy - wallH);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, a.sy - wallH, 0, a.sy);
    g.addColorStop(0, lit ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)");
    g.addColorStop(1, lit ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.20)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(30, 20, 40, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  const poly = (y0: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy - y0);
    ctx.lineTo(b.sx, b.sy - y0);
    ctx.lineTo(b.sx, b.sy - y1);
    ctx.lineTo(a.sx, a.sy - y1);
    ctx.closePath();
  };
  const s = l.scale;
  poly(0, wallH);
  const g = ctx.createLinearGradient(0, a.sy - wallH, 0, a.sy);
  g.addColorStop(0, shade(color, lit ? 0.12 : 0.05));
  g.addColorStop(1, shade(color, lit ? -0.08 : -0.16));
  ctx.fillStyle = g;
  ctx.fill();
  // lambri (alt %30)
  poly(0, wallH * 0.3);
  ctx.fillStyle = shade(color, -0.18);
  ctx.fill();
  // lambri üst çıtası
  poly(wallH * 0.3, wallH * 0.3 + 3 * s);
  ctx.fillStyle = shade(color, 0.28);
  ctx.fill();
  // süpürgelik
  poly(0, 6 * s);
  ctx.fillStyle = shade(color, -0.42);
  ctx.fill();
  // taç silme
  poly(wallH - 7 * s, wallH);
  ctx.fillStyle = shade(color, 0.38);
  ctx.fill();
  // dikey panel çizgileri
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = a.sx + (b.sx - a.sx) * t;
    const y = a.sy + (b.sy - a.sy) * t;
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s);
    ctx.lineTo(x, y - wallH + 7 * s);
    ctx.stroke();
  }
  poly(0, wallH);
  ctx.strokeStyle = "rgba(30, 20, 40, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;
}

export function drawRoom(
  ctx: Ctx,
  l: Layout,
  slug: string,
  theme: RoomTheme,
  portals: Portal[],
  hover: { gx: number; gy: number } | null,
  hoverColor: string,
  time: number,
) {
  const { cols, rows } = l;
  const top = gridToScreen(0, 0, l);
  const left = gridToScreen(0, rows, l);
  const right = gridToScreen(cols, 0, l);
  const wallH = (slug === "cadde-1" || slug === "sahil-kasabasi" ? 115 : 110) * l.scale;

  drawSlab(ctx, l, slug, theme);
  drawWallPanel(ctx, l, top, left, wallH, theme.wallLeft, rows, false, slug);
  drawWallPanel(ctx, l, top, right, wallH, theme.wallRight, cols, true, slug);

  drawRoomWallDecor(ctx, l, slug, time);

  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      const { sx, sy } = gridToScreen(gx, gy, l);
      if (offscreen(sx, sy, 60 * l.scale)) continue;
      tilePath(ctx, sx, sy, l);
      const isHover = hover?.gx === gx && hover?.gy === gy;

      // Hain Avı: bölgelere göre renkli metal zemin
      if (slug === "hain-avi") {
        const z = hainZone(gx, gy);
        ctx.fillStyle = z?.tint ?? "#334155";
        ctx.fill();
        if ((gx + gy) % 2) {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fill();
        }
        if (isHover) {
          ctx.fillStyle = "rgba(56,189,248,0.25)";
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(148,163,184,0.22)";
        ctx.stroke();
        continue;
      }

      // Parti Oyunu: kıvrımlı kutu oyunu parkuru
      if (slug === "parti-oyunu") {
        const cell = oyunikaCellAt(gx, gy);
        const pod = PARTI_PODIUM.findIndex((q) => q.gx === gx && q.gy === gy);
        if (pod >= 0) {
          ctx.fillStyle = "#24135c";
          ctx.fill();
          ctx.strokeStyle = "rgba(244,114,182,0.5)";
          ctx.stroke();
          continue;
        }
        if (!cell && isPartiRoute(gx, gy)) {
          ctx.fillStyle = "#7c6bc4";
          ctx.fill();
          ctx.strokeStyle = "rgba(233,213,255,0.55)";
          ctx.stroke();
          continue;
        }
        if (!cell) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? "#4a3a94" : "#43348a";
          ctx.fill();
          ctx.strokeStyle = "rgba(196, 181, 253, 0.28)";
          ctx.stroke();
          continue;
        }
        const colors: Record<string, { bg: string; border: string; label: string }> = {
          start: { bg: "#0284c7", border: "#7dd3fc", label: "START" },
          normal: { bg: "#f8fafc", border: "#94a3b8", label: String(cell.index) },
          red: { bg: "#dc2626", border: "#fca5a5", label: "⏸️" },
          green: { bg: "#16a34a", border: "#86efac", label: "🎲" },
          purple: { bg: "#9333ea", border: "#e9d5ff", label: "?" },
          blue: { bg: "#0891b2", border: "#a5f3fc", label: "⚡" },
          orange: { bg: "#ea580c", border: "#fed7aa", label: "⏪" },
          finish: { bg: "#eab308", border: "#fef08a", label: "🏁" },
        };
        const st = colors[cell.kind];
        ctx.fillStyle = st.bg;
        ctx.fill();
        ctx.strokeStyle = st.border;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.lineWidth = 1;

        ctx.font = `900 ${Math.max(8, 9.5 * l.scale)}px sans-serif`;
        ctx.fillStyle = cell.kind === "normal" ? "#1e293b" : "#ffffff";
        centerText(ctx, st.label, sx, sy + l.tileH / 2 + 3 * l.scale);
        continue;
      }

      if (isWaterTile(slug, gx, gy)) {
        const wave = Math.sin(time / 420 + gx * 0.9 + gy * 0.7);
        const swell = Math.cos(time / 680 - gx * 0.5 + gy * 1.1);
        const isShore = !isWaterTile(slug, gx - 1, gy);

        // PNG su dokusu (4 kare animasyon); hover'da veya doku yoksa eski vektör dolgu
        const wf = Math.floor(time / 300 + gx * 0.7 + gy * 1.3) & 3;
        const texWater = !isHover && drawFloorTex(ctx, "water", isShore ? "#5fcdf5" : wave + swell < -0.45 ? "#1a86bf" : "#2aa0d8", wf, sx, sy, l.tileW, l.tileH);
        if (texWater) {
          ctx.fillStyle = "rgba(0,0,0,0)";
        } else
        ctx.fillStyle = isHover
          ? "rgba(56, 189, 248, 0.85)"
          : isShore
            ? "#0284c7"
            : wave + swell > 0.35
              ? "#0369a1"
              : wave + swell < -0.45
                ? "#0c4a6e"
                : "#075985";
        if (!texWater) {
          ctx.fill();
          ctx.strokeStyle = "rgba(125, 211, 252, 0.1)";
          ctx.stroke();
        }

        // Kıyı köpüğü ve kıyıya vuran dalga şeritleri
        if (isShore) {
          const foam = Math.sin(time / 350 + gy) * 2.5 * l.scale;
          const foam2 = Math.cos(time / 520 + gy * 1.3) * 1.8 * l.scale;

          ctx.strokeStyle = "rgba(240, 249, 255, 0.82)";
          ctx.lineWidth = 1.9 * l.scale;
          ctx.beginPath();
          ctx.moveTo(sx - l.tileW * 0.42 + foam, sy + l.tileH * 0.46);
          ctx.lineTo(sx - l.tileW * 0.04 + foam, sy + l.tileH * 0.88);
          ctx.stroke();

          ctx.strokeStyle = "rgba(186, 230, 253, 0.45)";
          ctx.lineWidth = 1.2 * l.scale;
          ctx.beginPath();
          ctx.moveTo(sx - l.tileW * 0.34 + foam2, sy + l.tileH * 0.38);
          ctx.lineTo(sx + l.tileW * 0.03 + foam2, sy + l.tileH * 0.79);
          ctx.stroke();
          ctx.lineWidth = 1;
        } else {
          // Açık deniz dalga çizgileri ve güneş/ay yansıma kıvılcımları
          ctx.save();
          tilePath(ctx, sx, sy, l, 1 * l.scale);
          ctx.clip();

          const drift = Math.sin(time / 550 + gx * 0.6 + gy * 0.8) * 3.5 * l.scale;
          const wy = sy + l.tileH * 0.5 + swell * 2.2 * l.scale;

          ctx.strokeStyle = "rgba(186, 230, 253, 0.28)";
          ctx.lineWidth = Math.max(1, 1.25 * l.scale);
          ctx.beginPath();
          ctx.moveTo(sx - 10 * l.scale + drift, wy);
          ctx.quadraticCurveTo(sx + drift, wy - 2 * l.scale, sx + 10 * l.scale + drift, wy);
          ctx.stroke();

          if ((gx * 3 + gy * 5) % 4 === 0) {
            ctx.strokeStyle = "rgba(125, 211, 252, 0.16)";
            ctx.beginPath();
            ctx.moveTo(sx - 6 * l.scale - drift * 0.6, wy + 5 * l.scale);
            ctx.lineTo(sx + 5 * l.scale - drift * 0.6, wy + 5 * l.scale);
            ctx.stroke();
          }

          const shimmer = Math.sin(time / 240 + gx * 1.7 + gy * 2.3);
          if (shimmer > 0.78) {
            ctx.fillStyle = `rgba(240, 249, 255, ${(shimmer - 0.78) * 2.5})`;
            ctx.beginPath();
            ctx.arc(sx + drift * 0.5, wy - 2 * l.scale, 1.4 * l.scale, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
        continue;
      }

      drawStyledTile(ctx, sx, sy, l, slug, gx, gy, theme, isHover, hoverColor);
    }
  }

  // Oda kimliğini güçlendiren özel mimari ve zemin detayları.
  drawRoomAtmosphere(ctx, l, slug, time);

  if (slug === "sahil-kasabasi") {
    drawSahilKasabasiExtras(ctx, l, time);
  }

  // Kapı (portal) okları: zeminde dışarıyı gösteren ok, üzerine gelince parlar ve isim kutusu çıkar
  for (const p of portals) {
    const { sx, sy } = gridToScreen(p.gx, p.gy, l);
    const cx = sx;
    const cy = sy + l.tileH / 2;
    const hw = l.tileW / 2;
    const hh = l.tileH / 2;
    const isHover = hover !== null && hover.gx === p.gx && hover.gy === p.gy;
    // Çıkış yönü: hangi kenara yakınsa oraya bakar
    let dx = 0;
    let dy = 0; // grid yönü
    if (p.gy === 0) dy = -1;
    else if (p.gx === 0) dx = -1;
    else if (p.gx === cols - 1) dx = 1;
    else if (p.gy === rows - 1) dy = 1;
    else dy = 1;
    // grid yönü → ekran yönü (izometrik)
    const vx = (dx - dy) * hw;
    const vy = (dx + dy) * hh;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len;
    const uy = vy / len;
    const nx = -uy;
    const ny = ux;
    const bob = Math.sin(time / 260) * 3 * l.scale;
    const k = l.scale;
    const ox = cx + ux * bob;
    const oy = cy + uy * bob;
    const glow = isHover ? 1 : 0.9 + Math.sin(time / 350) * 0.1;

    // zemin halkası
    ctx.save();
    ctx.globalAlpha = isHover ? 0.5 : 0.28;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.ellipse(cx, cy, hw * 0.62, hh * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ok gövdesi + başı
    const tail = -15 * k;
    const neck = 2 * k;
    const tip = 17 * k;
    const sw = 5 * k;
    const hwid = 11 * k;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.moveTo(ox + ux * tail + nx * sw, oy + uy * tail + ny * sw * 0.5);
    ctx.lineTo(ox + ux * neck + nx * sw, oy + uy * neck + ny * sw * 0.5);
    ctx.lineTo(ox + ux * neck + nx * hwid, oy + uy * neck + ny * hwid * 0.5);
    ctx.lineTo(ox + ux * tip, oy + uy * tip);
    ctx.lineTo(ox + ux * neck - nx * hwid, oy + uy * neck - ny * hwid * 0.5);
    ctx.lineTo(ox + ux * neck - nx * sw, oy + uy * neck - ny * sw * 0.5);
    ctx.lineTo(ox + ux * tail - nx * sw, oy + uy * tail - ny * sw * 0.5);
    ctx.closePath();
    ctx.fillStyle = isHover ? "#fde047" : theme.accent;
    ctx.shadowColor = isHover ? "#fde047" : theme.accent;
    ctx.shadowBlur = isHover ? 14 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();

    // isim: her zaman görünür; üzerine gelince büyür ve kutu içine alınır
    const fs = Math.max(9, (isHover ? 12 : 10) * l.scale);
    ctx.font = `bold ${fs}px sans-serif`;
    const text = `🚪 ${p.label}`;
    const ty = cy - 20 * k - (isHover ? 4 * k : 0);
    if (isHover) {
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2 - 7, ty - fs - 1, tw + 14, fs + 8, 6);
      ctx.fill();
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = isHover ? 0 : 3;
    centerText(ctx, text, cx, ty);
    ctx.shadowBlur = 0;
  }
}

export function drawRug(ctx: Ctx, item: FurniItem, l: Layout) {
  const { sx, sy } = gridToScreen(item.gx, item.gy, l);
  tilePath(ctx, sx, sy, l, 4 * l.scale);
  ctx.fillStyle = "#991b1b";
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;
}

/* ------------------------------------------------------------------ */
/* Eşyalar & Mekan Dekorasyonu (PNG Sprite + Vektörel Yedek)           */
/* ------------------------------------------------------------------ */

/** Eşyaların zemine vuran yuvarlak gölgesi kapatıldı (havada duruyormuş hissi veriyordu) */
const NO_SHADOW = "rgba(0,0,0,0)";

export function drawFurni(ctx: Ctx, item: FurniItem, l: Layout, time: number) {
  const ox = item.ox ?? 0;
  const oy = item.oy ?? 0;
  const sc = (item.sc ?? 100) / 100;
  // Bitkiler rüzgârda hafifçe sallanır (ayak noktası sabit, üst kısım yana yatar)
  const sway = item.type === "tree" || item.type === "palm" ? 0.022 : item.type === "plant" ? 0.03 : 0;
  if (!ox && !oy && sc === 1 && !sway) return drawFurniBase(ctx, item, l, time);
  const sp = FURNI_SPRITES[item.type];
  const df = FURNI_BY_TYPE[item.type];
  const bw = sp?.wTiles ?? df?.wTiles ?? 1;
  const bh = sp?.hTiles ?? df?.hTiles ?? 1;
  const odd = (item.rot ?? 0) % 2 === 1;
  const w = odd ? bh : bw;
  const h = odd ? bw : bh;
  const c = gridToScreen(item.gx + (w - 1) / 2, item.gy + (h - 1) / 2, l);
  const ax = c.sx;
  const ay = c.sy + l.tileH * ((w + h) / 4);
  ctx.save();
  ctx.translate(ox * l.scale, oy * l.scale);
  ctx.translate(ax, ay);
  ctx.scale(sc, sc);
  if (sway) ctx.transform(1, 0, Math.sin(time / 1100 + item.gx * 1.7 + item.gy) * sway, 1, 0, 0);
  ctx.translate(-ax, -ay);
  drawFurniBase(ctx, item, l, time);
  ctx.restore();
}

function drawFurniBase(ctx: Ctx, item: FurniItem, l: Layout, time: number) {
  const def = FURNI_BY_TYPE[item.type];
  const spriteMeta = FURNI_SPRITES[item.type];
  const baseW = spriteMeta?.wTiles ?? def?.wTiles ?? 1;
  const baseH = spriteMeta?.hTiles ?? def?.hTiles ?? 1;
  const oddRot = (item.rot ?? 0) % 2 === 1;
  const wTiles = oddRot ? baseH : baseW;
  const hTiles = oddRot ? baseW : baseH;

  // Çok kareli yapılarda görselin taban merkezini kapladığı karelerin ortasına oturturuz
  const centerGx = item.gx + (wTiles - 1) / 2;
  const centerGy = item.gy + (hTiles - 1) / 2;
  const { sx, sy } = gridToScreen(centerGx, centerGy, l);

  // 0a) Park halindeki arabalar: trafik araçlarının 4 yönlü sheet'i (rot 0 +x, 1 +y, 2 -x, 3 -y)
  if ((item.type === "car_red" || item.type === "car_blue" || item.type === "car_yellow") && ((item.rot ?? 0) >= 2 || gfx.f3d)) {
    const vs = vehicleSheet(item.type);
    if (vs) {
      const c = gridToScreen(item.gx + wTiles / 2, item.gy + hTiles / 2, l);
      const w = (VEH_FW / 4) * l.scale;
      const h = (VEH_FH / 4) * l.scale;
      mipDraw(ctx, vs, (((item.rot ?? 0) % 4 + 4) % 4) * VEH_FW, 0, VEH_FW, VEH_FH, c.sx - w / 2, c.sy - (VEH_FEET / 4) * l.scale, w, h);
      return;
    }
  }

  // 0) 4 yönlü 3D eşya sprite'ı (rot 0-3): zemin merkezi, kapladığı dikdörtgenin ortasına oturur
  const f3 = FURNI_BY_TYPE[item.type] ? f3Frame(item.type, item.rot ?? 0) : null;
  if (f3) {
    const c = gridToScreen(item.gx + wTiles / 2, item.gy + hTiles / 2, l);
    const u = l.scale;
    const w = f3.fw / 4 * u;
    const h = f3.fh / 4 * u;
    const fy = (f3.feet / 4) * u;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (!gfx.low && lighting.shadowAlpha > 0.01 && f3.fh <= 300) {
      const sil = silhouette(f3.canvas as CanvasImageSource & { width: number; height: number });
      if (sil) {
        ctx.save();
        ctx.globalAlpha = lighting.shadowAlpha;
        ctx.transform(1, 0, lighting.shadowSkew, -lighting.shadowSquash, c.sx, c.sy);
        ctx.drawImage(sil, -w / 2, -fy, w, h);
        ctx.restore();
      }
    }
    mipDraw(ctx, f3.canvas, 0, 0, f3.fw, f3.fh, c.sx - w / 2, c.sy - fy, w, h);
    return;
  }

  // 1) Eğer bu eşya için public/sprites/ altında PNG dosyası varsa doğrudan onu çiz!
  if (spriteMeta) {
    const img = sprites.get(spriteMeta.src);
    if (img) {
      const w = spriteMeta.drawW * l.scale;
      const h = spriteMeta.drawH * l.scale;
      const ox = (spriteMeta.offsetX ?? 0) * l.scale;
      const oy = (spriteMeta.offsetY ?? 6) * l.scale;
      const footY = sy + l.tileH * ((wTiles + hTiles) / 4);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Yönlü silüet gölgesi: güneşin yönüne göre yatar (yuvarlak temas gölgesi yok)
      if (!gfx.low && lighting.shadowAlpha > 0.01 && spriteMeta.drawH <= 135) {
        const sil = silhouette(img as CanvasImageSource & { width: number; height: number });
        if (sil) {
          ctx.save();
          ctx.globalAlpha = lighting.shadowAlpha;
          const ix = sx + ox;
          const iy = footY + oy;
          ctx.transform(1, 0, lighting.shadowSkew, -lighting.shadowSquash, ix, iy);
          if (item.rot === 1 && wTiles === 1 && hTiles === 1 && def?.sittable) ctx.scale(-1, 1);
          ctx.drawImage(sil, -w / 2, -h, w, h);
          ctx.restore();
        }
      }

      if (item.rot === 1 && wTiles === 1 && hTiles === 1 && def?.sittable) {
        // Döndürülmüş oturaklar: sprite'ı yatay çevir (güneybatıya baksın)
        ctx.save();
        ctx.translate(sx, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2 - ox, footY - h + oy, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, sx - w / 2 + ox, footY - h + oy, w, h);
      }
      return;
    }
  }

  // 2) PNG görseli henüz eklenmemişse yüksek kaliteli vektörel çizim (fallback) çalışır
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2);
  ctx.scale(l.scale, l.scale);

  switch (item.type) {
    case "beach_cafe": {
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 12, 95, 42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.roundRect(-78, -68, 156, 76, 8);
      ctx.fill();
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(-68, -54, 136, 26);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(-74, -28, 148, 12);

      const stripes = 10;
      for (let i = 0; i < stripes; i++) {
        const x0 = -84 + (i * 168) / stripes;
        const w = 168 / stripes;
        ctx.fillStyle = i % 2 === 0 ? "#1d4ed8" : "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(x0, -68);
        ctx.lineTo(x0 + w, -68);
        ctx.lineTo(x0 + w + 4, -52);
        ctx.lineTo(x0 - 4, -52);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.moveTo(-88, -68);
      ctx.lineTo(0, -104);
      ctx.lineTo(88, -68);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(-48, -90, 96, 18, 4);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = "900 10px sans-serif";
      ctx.fillStyle = "#ffffff";
      centerText(ctx, "🌴 SAHİL KAFESİ", 0, -78);
      break;
    }
    case "dj_booth": {
      const beat = Math.sin(time / 140) * 3;
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 8, 72, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1e1b4b";
      ctx.beginPath();
      ctx.roundRect(-62, -46, 124, 52, 6);
      ctx.fill();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#09090b";
      ctx.fillRect(-58, -64, 22, 64);
      ctx.fillRect(36, -64, 22, 64);
      ctx.fillStyle = "#ec4899";
      ctx.beginPath();
      ctx.arc(-47, -46, 6 + beat * 0.3, 0, Math.PI * 2);
      ctx.arc(-47, -24, 7 + beat * 0.3, 0, Math.PI * 2);
      ctx.arc(47, -46, 6 + beat * 0.3, 0, Math.PI * 2);
      ctx.arc(47, -24, 7 + beat * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(-16, -42, 9, 0, Math.PI * 2);
      ctx.arc(16, -42, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -68, 16, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case "tiki_bar": {
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.roundRect(-42, -38, 84, 42, 6);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-46, -44, 92, 8);
      break;
    }
    case "sofa":
      ctx.fillStyle = "#be123c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(item.rot === 0 ? -18 : 4, -22, 14, 20);
      break;
    case "chair":
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(item.rot === 0 ? -10 : 3, -20, 7, 18);
      break;
    case "bench":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-15, -10, 3, 12);
      ctx.fillRect(12, -10, 3, 12);
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.roundRect(-18, -11, 36, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.roundRect(-18, -21, 36, 7, 2);
      ctx.fill();
      break;
    case "lounger":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 2, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(-20, -8, 40, 8, 3);
      ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(-16, -9, 32, 4);
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-10, -20);
      ctx.lineTo(-6, -18);
      ctx.lineTo(-15, -8);
      ctx.closePath();
      ctx.fill();
      break;
    case "logseat":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.roundRect(-15, -9, 30, 11, 5);
      ctx.fill();
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.arc(item.rot === 0 ? 12 : -12, -3.5, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "beanbag":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = item.rot === 0 ? "#0284c7" : "#f1f5f9";
      ctx.beginPath();
      ctx.ellipse(0, -8, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "campfire": {
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 4, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 ? "#64748b" : "#475569";
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 14, Math.sin(ang) * 6 + 1, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(10, -4);
      ctx.moveTo(10, 2);
      ctx.lineTo(-10, -4);
      ctx.stroke();
      ctx.lineWidth = 1;
      const flicker = Math.sin(time / 95) * 3;
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(-8, -22 - flicker, 0, -28 + flicker);
      ctx.quadraticCurveTo(8, -22 + flicker, 10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(0, -18 + flicker, 5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case "umbrella":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -46);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.arc(0, -42, 22, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(0, -42, 12, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    case "surfboard":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.ellipse(0, -24, 6, 26, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -46);
      ctx.lineTo(3, 0);
      ctx.stroke();
      ctx.lineWidth = 1;
      break;
    case "counter":
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(-20, -24, 40, 26, 3);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(-22, -28, 44, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(-16, -14, 32, 3);
      break;
    case "casinotable":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.ellipse(0, -10, 24, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.ellipse(0, -12, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-6, -15, 5, 4);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(6, -12, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "lamp":
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -38);
      ctx.stroke();
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(0, -42, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case "streetlight":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 10, 2);
      ctx.fill();
      ctx.fillRect(-2, -62, 4, 56);
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.moveTo(-9, -62);
      ctx.lineTo(9, -62);
      ctx.lineTo(6, -74);
      ctx.lineTo(-6, -74);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = "#fef08a";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(0, -67, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case "plant":
      ctx.fillStyle = "#b45309";
      ctx.fillRect(-8, -12, 16, 14);
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(-6, -20, 9, 0, Math.PI * 2);
      ctx.arc(6, -22, 10, 0, Math.PI * 2);
      ctx.arc(0, -28, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "tree":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5c3a21";
      ctx.fillRect(-5, -34, 10, 36);
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(-13, -42, 15, 0, Math.PI * 2);
      ctx.arc(13, -42, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(-8, -54, 16, 0, Math.PI * 2);
      ctx.arc(9, -52, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(0, -62, 16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "palm":
      ctx.fillStyle = NO_SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 3, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(6, -28, 0, -56);
      ctx.stroke();
      ctx.fillStyle = "#16a34a";
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2 + Math.sin(time / 900) * 0.05;
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * 14, -56 + Math.sin(ang) * 7, 15, 5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "bin":
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(-7, -18, 14, 20, 3);
      ctx.fill();
      ctx.fillStyle = "#10b981";
      ctx.fillRect(-8, -20, 16, 4);
      break;
    case "kiosk":
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 3, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.roundRect(-22, -42, 44, 44, 4);
      ctx.fill();
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(-16, -32, 32, 16);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(-25, -42);
      ctx.lineTo(25, -42);
      ctx.lineTo(20, -52);
      ctx.lineTo(-20, -52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-14, -49, 28, 5);
      break;
    case "table":
      ctx.fillStyle = "#475569";
      ctx.fillRect(-2, -12, 4, 14);
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.ellipse(0, -12, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bookshelf": {
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-14, -44, 28, 46);
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(-12, -42, 24, 42);
      const colors = ["#e11d48", "#2563eb", "#facc15", "#16a34a", "#a855f7", "#f97316"];
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = colors[(i + row * 2) % colors.length];
          ctx.fillRect(-11 + i * 3.8, -40 + row * 13.5, 3, 11);
        }
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-12, -28.5 + row * 13.5, 24, 1.5);
      }
      break;
    }
    case "tv": {
      ctx.fillStyle = "#334155";
      ctx.fillRect(-3, -8, 6, 10);
      ctx.fillRect(-9, -2, 18, 3);
      ctx.fillStyle = "#020617";
      ctx.fillRect(-18, -36, 36, 26);
      const hue = (time / 18) % 360;
      ctx.shadowColor = `hsl(${hue} 90% 60%)`;
      ctx.shadowBlur = 14;
      const bars = 6;
      for (let i = 0; i < bars; i++) {
        ctx.fillStyle = `hsl(${(hue + i * 50) % 360} 85% ${45 + Math.sin(time / 300 + i) * 10}%)`;
        ctx.fillRect(-16 + i * (32 / bars), -34, 32 / bars - 0.5, 22);
      }
      ctx.shadowBlur = 0;
      break;
    }
    case "fountain": {
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.ellipse(0, -2, 20, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.fillRect(-3, -22, 6, 20);
      ctx.fillStyle = "rgba(186, 230, 253, 0.9)";
      for (let i = 0; i < 5; i++) {
        const t = ((time / 700 + i / 5) % 1);
        const dx = Math.sin(i * 2.4) * 14 * t;
        const dy = -22 + (t * t * 34 - t * 14);
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "rug":
      break;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Süvari atı                                                          */
/* ------------------------------------------------------------------ */

/** Süvari atı: kestane rengi, gölgeli gövde, eklemli bacaklar, akan yele/kuyruk, eyer takımı ve dizgin. */
function drawHorse(ctx: Ctx, isMoving: boolean, time: number) {
  const t = time / 85;
  const idle = Math.sin(time / 900) * 0.6;
  const gallop = isMoving ? Math.sin(t) * 1.6 : idle * 0.4;
  const COAT = "#8a4b2a";
  const COAT_D = "#5f3119";
  const COAT_L = "#b06a3f";
  const MANE = "#241610";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Toz bulutu (dörtnalda)
  if (isMoving) {
    for (let i = 0; i < 3; i++) {
      const k = (time / 220 + i / 3) % 1;
      ctx.fillStyle = `rgba(214, 190, 150, ${0.34 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(-20 - k * 14, -2 - k * 6, 2.2 + k * 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bir bacak: kalça/omuz → diz → toynak; faz ile salınır
  const leg = (x: number, phase: number, upper: string, lower: string, front: boolean) => {
    const sw = isMoving ? Math.sin(t + phase) : 0;
    const lift = isMoving ? Math.max(0, Math.cos(t + phase)) * 3 : 0;
    const hx = x;
    const hy = -13;
    const kx = x + sw * 4.2 + (front ? 1.2 : -1.2);
    const ky = -6.5 - lift * 0.4;
    const fx = x + sw * 6.4 + (front ? 0.2 : 0.8);
    const fy = -1.4 - lift;
    ctx.strokeStyle = upper;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.strokeStyle = lower;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = "#f1f5f9"; // beyaz çorap
    ctx.fillRect(fx - 1.5, fy - 3.4, 3, 2.6);
    ctx.fillStyle = "#1c1612"; // toynak
    ctx.beginPath();
    ctx.roundRect(fx - 2.1, fy - 1.1, 4.2, 2.6, 0.8);
    ctx.fill();
  };

  // Kuyruk (arka)
  const tailSw = Math.sin(time / (isMoving ? 120 : 520)) * (isMoving ? 4.5 : 1.6);
  ctx.fillStyle = MANE;
  ctx.beginPath();
  ctx.moveTo(-17, -24);
  ctx.bezierCurveTo(-25, -25 + tailSw * 0.3, -29 + tailSw, -16, -26 + tailSw * 1.3, -6);
  ctx.bezierCurveTo(-23 + tailSw, -14, -21, -17, -16, -19);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a2f20";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, -22);
  ctx.quadraticCurveTo(-24 + tailSw * 0.8, -15, -23 + tailSw * 1.1, -9);
  ctx.stroke();

  // Uzak taraf bacakları (koyu)
  leg(-12, Math.PI, COAT_D, "#4a2812", false);
  leg(11, 0, COAT_D, "#4a2812", true);

  // Gövde
  const body = ctx.createLinearGradient(0, -28, 0, -10);
  body.addColorStop(0, COAT_L);
  body.addColorStop(0.45, COAT);
  body.addColorStop(1, COAT_D);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-18, -20);
  ctx.bezierCurveTo(-19, -29, -8, -28.5, 0, -27.5);
  ctx.bezierCurveTo(8, -28.5, 16, -28, 18, -22);
  ctx.bezierCurveTo(20, -14, 14, -9, 6, -9.5);
  ctx.bezierCurveTo(-2, -8, -8, -9, -13, -10);
  ctx.bezierCurveTo(-18, -11.5, -19.5, -15, -18, -20);
  ctx.closePath();
  ctx.fill();
  // kalça/omuz kası vurgusu
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(-10, -21, 5.5, 3.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, -21.5, 4.6, 3.2, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Boyun
  const neck = ctx.createLinearGradient(10, -40, 18, -20);
  neck.addColorStop(0, COAT_L);
  neck.addColorStop(1, COAT);
  ctx.fillStyle = neck;
  ctx.beginPath();
  ctx.moveTo(10, -27);
  ctx.bezierCurveTo(12, -34, 15, -39, 19, -41);
  ctx.lineTo(25, -36);
  ctx.bezierCurveTo(22, -31, 20, -26, 19, -20);
  ctx.closePath();
  ctx.fill();

  // Yele (boynun üstünde dalgalanır)
  ctx.fillStyle = MANE;
  const mane = isMoving ? Math.sin(t * 1.3) * 1.8 : Math.sin(time / 700) * 0.5;
  ctx.beginPath();
  ctx.moveTo(10, -27);
  ctx.bezierCurveTo(9 - mane, -33, 11 - mane, -39, 17, -43);
  ctx.lineTo(19.5, -41);
  ctx.bezierCurveTo(14 - mane * 0.6, -37, 13 - mane, -32, 13, -26);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 1.8, -30 - i * 3.3);
    ctx.lineTo(6.5 + i * 1.6 - mane * (0.6 + i * 0.2), -29 - i * 3.3);
    ctx.lineTo(11 + i * 1.8, -27.8 - i * 3.3);
    ctx.fill();
  }

  // Kafa
  ctx.save();
  ctx.translate(23, -37);
  ctx.rotate(0.62 + (isMoving ? Math.sin(t) * 0.05 : idle * 0.03));
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.6, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COAT_L;
  ctx.beginPath();
  ctx.ellipse(-1, -1.5, 6.2, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // ağız/burun
  ctx.fillStyle = "#3b2214";
  ctx.beginPath();
  ctx.ellipse(7, 0.9, 3.2, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f0a07";
  ctx.beginPath();
  ctx.ellipse(8.2, -0.3, 0.7, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // alında beyaz çizgi
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.ellipse(1.4, -0.3, 5.6, 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  // göz
  ctx.fillStyle = "#0f0a07";
  ctx.beginPath();
  ctx.arc(-0.8, -1.4, 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-1.2, -1.9, 0.6, 0.6);
  // yular
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.lineTo(-3.4, 3.6);
  ctx.moveTo(4.6, -2.8);
  ctx.lineTo(4.8, 3.8);
  ctx.stroke();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-5, -3.6);
  ctx.lineTo(0.5, -4.2);
  ctx.stroke();
  ctx.restore();
  // kulaklar
  ctx.fillStyle = COAT_D;
  ctx.beginPath();
  ctx.moveTo(17.2, -41);
  ctx.lineTo(16.6, -46.6);
  ctx.lineTo(20.4, -42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.moveTo(19.6, -41.4);
  ctx.lineTo(20.2, -46.8);
  ctx.lineTo(22.4, -42);
  ctx.closePath();
  ctx.fill();

  // Eyer takımı: kırmızı-altın örtü, deri eyer, sıkma kayışı
  ctx.fillStyle = "#991b1b";
  ctx.beginPath();
  ctx.roundRect(-9.5, -28.4 - gallop * 0.1, 18, 8.4, 2);
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#7c2d12";
  ctx.beginPath();
  ctx.roundRect(-7.6, -31.2, 14, 5.2, [3, 3, 1.5, 1.5]);
  ctx.fill();
  ctx.fillStyle = "#9a3f1a";
  ctx.fillRect(-6.4, -30.8, 9, 1.4);
  ctx.strokeStyle = "#3f1d0c";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(1, -21);
  ctx.lineTo(1.6, -11.5);
  ctx.stroke();
  // üzengi
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(3, -24);
  ctx.lineTo(3.8, -16.6);
  ctx.stroke();
  ctx.strokeRect(2.2, -16.4, 3.2, 2.2);
  // dizgin
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(8.4, -30.4);
  ctx.quadraticCurveTo(18, -29 + gallop * 0.2, 28.6, -32.5);
  ctx.stroke();

  // Yakın taraf bacakları (açık)
  leg(-8, 0, COAT, "#6b3920", false);
  leg(15, Math.PI, COAT, "#6b3920", true);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Avatarlar & Gerçekçi Yürüme Animasyonu                              */
/* ------------------------------------------------------------------ */

let FACE_BACK = false;

/** Gözler: yüz hafifçe yürüyüş yönüne döner (ayna ile sola/sağa bakar); arkası dönükse göz yok. */
function drawEyes(ctx: Ctx, ay: number) {
  if (FACE_BACK) return;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-1, ay - 42, 2, 2);
  ctx.fillRect(4, ay - 42, 2, 2);
}

/** Oturan karakterin bacakları: uyluk öne, baldır dizden sallanır (zemine oturuşta düz uzanır). */
function drawSeatedLegs(ctx: Ctx, ay: number, legColor: string, onFloor: boolean, time: number) {
  [-1.5, 1.5].forEach((dy, i) => {
    ctx.fillStyle = legColor;
    if (onFloor) {
      const tap = Math.sin(time / 420 + i * 1.7) * 0.5;
      ctx.fillRect(-3, ay - 8 + dy, 16, 5);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(12 + tap, ay - 8 + dy, 3.5, 5);
    } else {
      ctx.fillRect(-3, ay - 13 + dy, 11.5, 5.5);
      ctx.save();
      ctx.translate(8.5, ay - 10.2 + dy);
      ctx.rotate(Math.sin(time / 360 + i * Math.PI) * 0.3);
      ctx.fillStyle = legColor;
      ctx.fillRect(-2.5, -2.5, 5, 14.5);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(-3, 10.5, 7.5, 2.8);
      ctx.restore();
    }
  });
}

const SEAT_AY: Record<string, number> = { sofa: 1, bench: -5, chair: -9, logseat: 5, beanbag: 1, lounger: 0 };

function drawAnimatedLegs(ctx: Ctx, ay: number, legColor: string, isMoving: boolean, time: number, width = 5) {
  const stride = isMoving ? Math.sin(time / 95) * 8 : 0;
  const liftL = isMoving ? Math.max(0, Math.sin(time / 95)) * 4 : 0;
  const liftR = isMoving ? Math.max(0, -Math.sin(time / 95)) * 4 : 0;

  ctx.fillStyle = legColor;
  ctx.fillRect(-width - 1 + stride * 0.45, ay - 14 - liftL, width, 14);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(-width - 1 + stride * 0.45, ay - 2.5 - liftL, width, 2.5);

  ctx.fillStyle = legColor;
  ctx.fillRect(1 - stride * 0.45, ay - 14 - liftR, width, 14);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(1 - stride * 0.45, ay - 2.5 - liftR, width, 2.5);
}

function drawVistekiis(ctx: Ctx, p: Player, ay: number, isMoving: boolean, time: number) {
  if (p.back) drawBack(ctx, p.back, ay, time, isMoving && !p.isSitting);
  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.roundRect(-11, ay - 46, 22, 26, 8);
  ctx.fill();

  if (!p.isSitting && !p.isRidingHorse) {
    drawAnimatedLegs(ctx, ay, "#18181b", isMoving, time, 4.2);
  }

  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.roundRect(-8, ay - 32, 16, 13, 3);
  ctx.fill();

  ctx.fillStyle = "#18181b";
  ctx.beginPath();
  ctx.moveTo(-8, ay - 20);
  ctx.lineTo(8, ay - 20);
  ctx.lineTo(11, ay - 12);
  ctx.lineTo(-11, ay - 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(-8, ay - 21, 16, 1.5);
  if (p.top) drawTop(ctx, p.top, ay, isMoving ? Math.sin(time / 95) * 6 : 0, "#09090b");

  ctx.fillStyle = p.skinColor || "#fed7aa";
  ctx.beginPath();
  ctx.arc(0, ay - 41, 8.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.arc(0, ay - 43, 9.2, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-10, ay - 43, 3.5, 19);
  ctx.fillRect(6.5, ay - 43, 3.5, 19);

  drawEyes(ctx, ay);
  if (p.glasses && !FACE_BACK) drawGlasses(ctx, p.glasses, ay);
  if (p.hat) drawHat(ctx, p.hat, ay);
}

function drawSevaastian(ctx: Ctx, p: Player, ay: number, isMoving: boolean, time: number) {
  if (p.back) drawBack(ctx, p.back, ay, time, isMoving && !p.isSitting);
  if (!p.isSitting && !p.isRidingHorse) {
    drawAnimatedLegs(ctx, ay, "#09090b", isMoving, time, 5);
  }

  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.roundRect(-9.5, ay - 32, 19, 20, 4);
  ctx.fill();

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, ay - 32);
  ctx.lineTo(0, ay - 25);
  ctx.lineTo(3, ay - 32);
  ctx.stroke();
  if (p.top) drawTop(ctx, p.top, ay, isMoving ? Math.sin(time / 95) * 6 : 0, "#09090b");

  ctx.fillStyle = p.skinColor || "#fed7aa";
  ctx.beginPath();
  ctx.arc(0, ay - 41, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.arc(0, ay - 43.5, 9.8, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.fillRect(-9.5, ay - 44, 2.5, 6);
  ctx.fillRect(7, ay - 44, 2.5, 6);

  ctx.fillStyle = "#09090b";
  ctx.fillRect(-7.5, ay - 43.5, 6.5, 4.5);
  ctx.fillRect(1, ay - 43.5, 6.5, 4.5);
  ctx.fillRect(-1, ay - 42.2, 2, 1.8);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-6.3, ay - 42.3, 4.1, 2.3);
  ctx.fillRect(2.2, ay - 42.3, 4.1, 2.3);
  if (p.glasses && !FACE_BACK) drawGlasses(ctx, p.glasses, ay);
  if (p.hat) drawHat(ctx, p.hat, ay);
}

function drawHat(ctx: Ctx, hat: string, ay: number) {
  switch (hat) {
    case "hat_beanie":
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(0, ay - 45, 10.5, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#be123c";
      ctx.fillRect(-10.5, ay - 46, 21, 3.5);
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.arc(0, ay - 56.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "hat_cap":
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(0, ay - 45, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(1, ay - 46, 14, 2.6);
      break;
    case "hat_tophat":
      ctx.fillStyle = "#111827";
      ctx.fillRect(-12, ay - 50, 24, 3);
      ctx.fillRect(-7.5, ay - 66, 15, 16);
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(-7.5, ay - 54, 15, 3);
      break;
    case "hat_cowboy":
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.ellipse(0, ay - 49, 15, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a16207";
      ctx.beginPath();
      ctx.roundRect(-7, ay - 61, 14, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#451a03";
      ctx.fillRect(-7, ay - 53, 14, 2.4);
      break;
    case "hat_crown":
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(-9, ay - 50);
      ctx.lineTo(-9, ay - 59);
      ctx.lineTo(-4.5, ay - 54);
      ctx.lineTo(0, ay - 61);
      ctx.lineTo(4.5, ay - 54);
      ctx.lineTo(9, ay - 59);
      ctx.lineTo(9, ay - 50);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(0, ay - 53, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "hat_headphones":
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, ay - 42, 11, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(-12.6, ay - 44, 4.4, 8, 2);
      ctx.roundRect(8.2, ay - 44, 4.4, 8, 2);
      ctx.fill();
      break;
    case "hat_beret":
      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.ellipse(-1.5, ay - 49, 12, 5.5, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6d28d9";
      ctx.fillRect(-0.5, ay - 56, 2, 3);
      break;
    case "hat_bucket":
      ctx.fillStyle = "#65a30d";
      ctx.beginPath();
      ctx.ellipse(0, ay - 48, 14, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#84cc16";
      ctx.beginPath();
      ctx.roundRect(-8.5, ay - 58, 17, 11, 3);
      ctx.fill();
      ctx.fillStyle = "#3f6212";
      ctx.fillRect(-8.5, ay - 51, 17, 2);
      break;
    case "hat_wizard":
      ctx.fillStyle = "#4338ca";
      ctx.beginPath();
      ctx.ellipse(0, ay - 49, 14, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8.5, ay - 49);
      ctx.lineTo(1.5, ay - 72);
      ctx.lineTo(8.5, ay - 49);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-8, ay - 53, 16, 2);
      ctx.beginPath();
      ctx.arc(-1, ay - 61, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "hat_pirate":
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.moveTo(-15, ay - 48);
      ctx.quadraticCurveTo(0, ay - 66, 15, ay - 48);
      ctx.quadraticCurveTo(0, ay - 53, -15, ay - 48);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(0, ay - 55, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3.4, ay - 52.5, 6.8, 1);
      break;
    case "hat_flower":
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = ["#f472b6", "#facc15", "#fb7185", "#a78bfa"][(i + 3) % 4];
        ctx.beginPath();
        ctx.arc(i * 3, ay - 49.5 - Math.abs(i) * 0.5 + (i === 0 ? -1.5 : 0), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(-10, ay - 48, 20, 1.6);
      break;
    case "hat_catears":
      ctx.fillStyle = "#1f2937";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 9, ay - 48);
        ctx.lineTo(sx * 8, ay - 59);
        ctx.lineTo(sx * 2.2, ay - 50);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#f9a8d4";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 7.6, ay - 50);
        ctx.lineTo(sx * 7.2, ay - 56);
        ctx.lineTo(sx * 4, ay - 50.5);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }
}

/** Üst giyim: gövde ve kolların üstüne çizilir (tişört rengi altta kalır) */
function drawTop(ctx: Ctx, top: string, ay: number, armSwing: number, shirt: string) {
  const L = () => {
    ctx.beginPath();
    ctx.roundRect(-9, ay - 32, 18, 20, 4);
  };
  const sleeves = (col: string, len: number) => {
    ctx.fillStyle = col;
    ctx.fillRect(-11.5, ay - 30 - armSwing * 0.5, 2.6, len);
    ctx.fillRect(8.9, ay - 30 + armSwing * 0.5, 2.6, len);
  };
  ctx.save();
  switch (top) {
    case "tp_hoodie":
      ctx.fillStyle = "#475569";
      L();
      ctx.fill();
      sleeves("#475569", 10);
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(-6, ay - 21, 12, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.arc(0, ay - 32, 7.5, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(-2.6, ay - 29, 1, 7);
      ctx.fillRect(1.6, ay - 29, 1, 7);
      break;
    case "tp_stripe":
      L();
      ctx.clip();
      ctx.fillStyle = "#f8fafc";
      for (let y = 0; y < 20; y += 5) ctx.fillRect(-9, ay - 32 + y, 18, 2.4);
      break;
    case "tp_suit":
      ctx.fillStyle = "#1f2937";
      L();
      ctx.fill();
      sleeves("#1f2937", 11);
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(-3.6, ay - 32);
      ctx.lineTo(3.6, ay - 32);
      ctx.lineTo(0, ay - 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(-1.2, ay - 31);
      ctx.lineTo(1.2, ay - 31);
      ctx.lineTo(1.8, ay - 23);
      ctx.lineTo(0, ay - 20.5);
      ctx.lineTo(-1.8, ay - 23);
      ctx.closePath();
      ctx.fill();
      break;
    case "tp_jersey": {
      ctx.fillStyle = "#16a34a";
      L();
      ctx.fill();
      sleeves("#16a34a", 6);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-9, ay - 32, 2.6, 20);
      ctx.fillRect(6.4, ay - 32, 2.6, 20);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, ay - 24, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(-0.6, ay - 27, 1.2, 6);
      break;
    }
    case "tp_overalls":
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.roundRect(-9, ay - 24, 18, 12, [0, 0, 4, 4]);
      ctx.fill();
      ctx.fillRect(-6.6, ay - 32, 2.4, 9);
      ctx.fillRect(4.2, ay - 32, 2.4, 9);
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(-4, ay - 27, 8, 5);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(-5.4, ay - 24.5, 1, 0, Math.PI * 2);
      ctx.arc(5.4, ay - 24.5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "tp_hawaii":
      ctx.fillStyle = "#0ea5e9";
      L();
      ctx.fill();
      sleeves("#0ea5e9", 6);
      ctx.fillStyle = "#fde047";
      for (const [x, y] of [[-5, 4], [2, 2], [5, 9], [-3, 12], [0, 7]]) {
        ctx.beginPath();
        ctx.arc(x, ay - 32 + y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(-6, ay - 32 + 9, 1.4, 0, Math.PI * 2);
      ctx.arc(4, ay - 32 + 14, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
  void shirt;
}

function drawGlasses(ctx: Ctx, glasses: string, ay: number) {
  switch (glasses) {
    case "gl_shades":
      ctx.fillStyle = "#020617";
      ctx.fillRect(-7, ay - 43.5, 6, 4.2);
      ctx.fillRect(1, ay - 43.5, 6, 4.2);
      ctx.fillRect(-1, ay - 42.4, 2, 1);
      break;
    case "gl_nerd":
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-6.6, ay - 43.6, 5.4, 4.6);
      ctx.strokeRect(1.2, ay - 43.6, 5.4, 4.6);
      ctx.beginPath();
      ctx.moveTo(-1.2, ay - 41.6);
      ctx.lineTo(1.2, ay - 41.6);
      ctx.stroke();
      break;
    case "gl_star":
      ctx.fillStyle = "#facc15";
      for (const cx of [-3.6, 3.6]) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 3.6 : 1.5;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const x = cx + Math.cos(a) * r;
          const y = ay - 41.6 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    case "gl_neon":
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 7;
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(-7, ay - 43.5, 6, 3.6);
      ctx.fillRect(1, ay - 43.5, 6, 3.6);
      ctx.shadowBlur = 0;
      break;
    case "gl_round":
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 1.2;
      for (const cx of [-3.8, 3.8]) {
        ctx.beginPath();
        ctx.arc(cx, ay - 41.4, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-0.8, ay - 41.6);
      ctx.lineTo(0.8, ay - 41.6);
      ctx.stroke();
      break;
    case "gl_heart":
      ctx.fillStyle = "#ec4899";
      for (const cx of [-3.8, 3.8]) {
        ctx.beginPath();
        ctx.moveTo(cx, ay - 38.6);
        ctx.bezierCurveTo(cx - 5, ay - 42, cx - 2.6, ay - 45, cx, ay - 42.4);
        ctx.bezierCurveTo(cx + 2.6, ay - 45, cx + 5, ay - 42, cx, ay - 38.6);
        ctx.fill();
      }
      break;
    case "gl_visor":
      ctx.shadowColor = "#a3e635";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#84cc16";
      ctx.fillRect(-9, ay - 43.6, 18, 3.4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#1a2e05";
      ctx.fillRect(-9, ay - 42.6, 18, 0.8);
      break;
  }
}

/** Sırt aksesuarları: gövdenin arkasında çizilir (kanatlar çırpar) */
function drawBack(ctx: Ctx, id: string, ay: number, time: number, moving: boolean) {
  const flap = Math.sin(time / (moving ? 110 : 420)) * (moving ? 0.32 : 0.14);
  const wing = (sx: number, col: string, edge: string, tall: number, wide: number) => {
    ctx.save();
    ctx.translate(sx * 7, ay - 27);
    ctx.scale(sx, 1);
    ctx.rotate(-flap - 0.15);
    ctx.fillStyle = col;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wide * 0.5, -tall * 1.05, wide * 1.15, -tall * 0.8, wide, -tall * 0.1);
    ctx.bezierCurveTo(wide * 0.95, tall * 0.1, wide * 0.5, tall * 0.2, wide * 0.3, tall * 0.55);
    ctx.bezierCurveTo(wide * 0.2, tall * 0.3, 0, tall * 0.2, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  switch (id) {
    case "bk_angel":
      wing(-1, "#ffffff", "#cbd5e1", 24, 27);
      wing(1, "#ffffff", "#cbd5e1", 24, 27);
      break;
    case "bk_devil":
      wing(-1, "#7f1d1d", "#1f0a0a", 21, 26);
      wing(1, "#7f1d1d", "#1f0a0a", 21, 26);
      break;
    case "bk_butterfly":
      wing(-1, "#f472b6", "#9d174d", 24, 25);
      wing(1, "#f472b6", "#9d174d", 24, 25);
      ctx.fillStyle = "#38bdf8aa";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * 21, ay - 40, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "bk_cape": {
      const sway = Math.sin(time / (moving ? 140 : 600)) * (moving ? 3 : 1);
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(-9, ay - 32);
      ctx.lineTo(9, ay - 32);
      ctx.lineTo(13 + sway, ay - 5);
      ctx.lineTo(-13 + sway, ay - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-9, ay - 33, 18, 2.4);
      break;
    }
    case "bk_backpack":
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.roundRect(-8, ay - 30, 16, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(-8, ay - 22, 16, 2);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-1.5, ay - 21.2, 3, 3);
      break;
  }
}

/** Emote sırasında sağ kol havaya kalkar: 👋 sallar, 👏/🎉 iki kol çırpar, ❤️😍 kalbe götürür */
function drawEmoteArm(ctx: Ctx, p: Player, ay: number, time: number) {
  const e = p.emoteAnim;
  if (!e || p.isSitting || p.isRidingHorse || p.path.length > 0) return;
  const cheer = e === "👏" || e === "🎉" || e === "😂";
  ctx.save();
  ctx.fillStyle = p.skinColor;
  const wave = Math.sin(time / 90);
  const arm = (x: number, ang: number) => {
    ctx.save();
    ctx.translate(x, ay - 30);
    ctx.rotate(ang);
    ctx.fillStyle = p.shirtColor;
    ctx.fillRect(-1.5, 0, 3, 5);
    ctx.fillStyle = p.skinColor;
    ctx.fillRect(-1.3, 4, 2.6, 8);
    ctx.restore();
  };
  if (cheer) {
    arm(-10, 2.7 + Math.abs(wave) * 0.35);
    arm(10, -2.7 - Math.abs(wave) * 0.35);
  } else arm(10, -2.5 + wave * 0.45);
  ctx.restore();
}

let LAYER_DIR = 0;
let LAYER_FLIP = 1;
let LAYER_SEATED = false;
function drawLayeredAvatar(ctx: Ctx, p: Player, ay: number, isMoving: boolean, time: number, legTint?: string): boolean {
  const standing = !p.isSitting && !p.isRidingHorse;
  const seatedPose = p.isSitting && !p.isRidingHorse && !isMoving && p.seatType !== "lounger";
  const specs = bodyLayers({
    skin: p.skinColor, shirt: p.shirtColor, hair: p.hairColor, hairStyle: p.hairStyle, legs: standing || seatedPose,
    faceFront: !FACE_BACK, top: p.top, hat: p.hat, glasses: p.glasses, back: p.back, legTint,
  });
  if (!layersReady(specs)) return false;
  if (p.back && !hasLayeredBack(p.back)) drawBack(ctx, p.back, ay, time, isMoving && !p.isSitting);
  const frame = seatedPose ? 7 : isMoving && standing ? 1 + (Math.floor(time / 110) % 6) : 0;
  // Sprite zaten 4 yönlü: dışarıdaki yatay çevirmeyi geri al
  ctx.save();
  if (LAYER_FLIP === -1) ctx.scale(-1, 1);
  for (const l of specs) drawLayer(ctx, l, frame, LAYER_DIR, ay);
  ctx.restore();
  LAYER_SEATED = seatedPose;
  if (p.top && !hasLayeredTop(p.top)) {
    const armSwing = isMoving && standing ? Math.sin(time / 95) * 6 : Math.sin(time / 700) * 0.6;
    drawTop(ctx, p.top, ay, armSwing, p.shirtColor);
  }
  drawEmoteArm(ctx, p, ay, time);
  if (p.glasses && !hasLayeredGlasses(p.glasses) && !FACE_BACK) drawGlasses(ctx, p.glasses, ay);
  if (p.hat && !hasLayeredHat(p.hat)) drawHat(ctx, p.hat, ay);
  return true;
}

function drawStandardAvatar(ctx: Ctx, p: Player, ay: number, isMoving: boolean, time: number) {
  if ((p.layered || p.isNpc) && drawLayeredAvatar(ctx, p, ay, isMoving, time)) return;
  if (p.back) drawBack(ctx, p.back, ay, time, isMoving && !p.isSitting);
  if (!p.isSitting && !p.isRidingHorse) {
    drawAnimatedLegs(ctx, ay, "#1e293b", isMoving, time, 5);
  }

  const armSwing = isMoving && !p.isSitting && !p.isRidingHorse ? Math.sin(time / 95) * 6 : Math.sin(time / 700) * 0.6;
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(-11.5, ay - 30 - armSwing * 0.5, 2.6, 11);
  ctx.fillRect(8.9, ay - 30 + armSwing * 0.5, 2.6, 11);

  ctx.fillStyle = p.shirtColor;
  ctx.beginPath();
  ctx.roundRect(-9, ay - 32, 18, 20, 4);
  ctx.fill();
  if (p.top) drawTop(ctx, p.top, ay, armSwing, p.shirtColor);

  ctx.fillStyle = p.hairColor;
  if (p.hairStyle === "hs_afro") {
    ctx.beginPath();
    ctx.arc(0, ay - 45, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, ay - 41, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.hairColor;
  if (p.hairStyle !== "hs_afro") {
    ctx.beginPath();
    ctx.arc(0, ay - 43, 9.5, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  if (p.hairStyle === "hs_long") {
    ctx.fillRect(-10, ay - 44, 3.6, 21);
    ctx.fillRect(6.4, ay - 44, 3.6, 21);
  } else if (p.hairStyle === "hs_spiky") {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4 - 2.4, ay - 50);
      ctx.lineTo(i * 4, ay - 58 + Math.abs(i) * 1.8);
      ctx.lineTo(i * 4 + 2.4, ay - 50);
      ctx.closePath();
      ctx.fill();
    }
  } else if (p.hairStyle === "hs_mohawk") {
    for (let i = -3; i <= 3; i++) {
      ctx.fillRect(i * 1.9 - 1, ay - 53 - (3 - Math.abs(i)) * 1.6, 2, 10 + (3 - Math.abs(i)) * 1.6);
    }
  } else if (p.hairStyle === "hs_pony") {
    ctx.beginPath();
    ctx.ellipse(8.5, ay - 41, 3.2, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.hairStyle === "hs_curly") {
    for (const [x, y] of [[-8, -42], [8, -42], [-5, -50], [5, -50], [0, -52], [-9.5, -36], [9.5, -36]]) {
      ctx.beginPath();
      ctx.arc(x, ay + y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.hairStyle === "hs_bun") {
    ctx.beginPath();
    ctx.arc(0, ay - 55, 4.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (FACE_BACK) {
    // Arkası dönük: yüz yerine saç görünür
    ctx.fillStyle = p.hairColor;
    ctx.beginPath();
    ctx.arc(0, ay - 42, 9.4, 0, Math.PI * 2);
    ctx.fill();
  }
  drawEyes(ctx, ay);

  drawEmoteArm(ctx, p, ay, time);
  if (p.glasses && !FACE_BACK) drawGlasses(ctx, p.glasses, ay);
  if (p.hat) drawHat(ctx, p.hat, ay);
}

/** Elde tutulan gazete (katlanmış, hafif eğik) */
function drawNewspaper(ctx: Ctx, ay: number, time: number) {
  const bob = Math.sin(time / 500) * 0.6;
  ctx.save();
  ctx.translate(11, ay - 20 + bob);
  ctx.rotate(-0.28);
  ctx.fillStyle = "#e7e5e4";
  ctx.fillRect(-6, -8, 12, 16);
  ctx.strokeStyle = "#57534e";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-6, -8, 12, 16);
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(-5, -7, 10, 3);
  ctx.fillStyle = "#78716c";
  for (let i = 0; i < 4; i++) ctx.fillRect(-5, -2 + i * 3, 4.2, 1.2);
  ctx.fillStyle = "#a8a29e";
  ctx.fillRect(0.5, -2, 4.5, 5);
  ctx.restore();
}

function drawFishingRod(ctx: Ctx, ay: number, isFishing: boolean, time: number) {
  const sway = isFishing ? Math.sin(time / 180) * 3 : 0;
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(6, ay - 22);
  ctx.lineTo(28, ay - 44 + sway);
  ctx.stroke();
  if (isFishing) {
    const bob = Math.sin(time / 140) * 3;
    ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, ay - 44 + sway);
    ctx.lineTo(36, 10 + bob);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(36, 10 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(36, 8.5 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRock(ctx: Ctx, gx: number, gy: number, l: Layout) {
  const { sx, sy } = gridToScreen(gx, gy, l);
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2);
  const s = Math.max(0.75, l.scale);
  ctx.scale(s, s);
  ctx.fillStyle = NO_SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b7280";
  ctx.beginPath();
  ctx.moveTo(-17, 0); ctx.lineTo(-10, -20); ctx.lineTo(2, -26); ctx.lineTo(15, -15); ctx.lineTo(18, 0); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9ca3af";
  ctx.beginPath();
  ctx.moveTo(-10, -20); ctx.lineTo(2, -26); ctx.lineTo(0, -10); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(6, -12, 3, 3);
  ctx.fillStyle = "#34d399";
  ctx.fillRect(-8, -8, 3, 3);
  ctx.restore();
}

export function drawFlag(ctx: Ctx, gx: number, gy: number, l: Layout, time: number) {
  const { sx, sy } = gridToScreen(gx, gy, l);
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2);
  const s = Math.max(0.75, l.scale);
  ctx.scale(s, s);
  const bob = Math.sin(time / 220) * 2;
  ctx.fillStyle = "rgba(250,204,21,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(-1, -34 + bob, 2, 36);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(1, -34 + bob); ctx.lineTo(18, -28 + bob + Math.sin(time / 150) * 2); ctx.lineTo(1, -21 + bob); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const roomRocks = (slug: string) => ROOM_ROCKS[slug] ?? [];

function drawNpcOutfit(ctx: Ctx, kind: NpcKind, ay: number) {
  if (kind === "stylist") {
    drawHat(ctx, "hat_beret", ay);
    ctx.fillStyle = "#f9a8d4";
    ctx.fillRect(-9, ay - 32, 18, 3);
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(-3, ay - 29, 6, 8);
    return;
  }
  if (kind === "barber") {
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.roundRect(-8, ay - 31, 16, 19, 4);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(5, ay - 26);
    ctx.lineTo(10, ay - 20);
    ctx.moveTo(10, ay - 26);
    ctx.lineTo(5, ay - 20);
    ctx.stroke();
    drawGlasses(ctx, "gl_round", ay);
    return;
  }
  if (kind === "realtor") {
    drawGlasses(ctx, "gl_nerd", ay);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-3, ay - 30, 6, 10);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(-1, ay - 29, 2, 9);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(5, ay - 27, 4, 3);
    return;
  }
  if (kind === "guide") {
    drawHat(ctx, "hat_headphones", ay);
    ctx.fillStyle = "#0ea5e9";
    ctx.save();
    ctx.rotate(0.45);
    ctx.fillRect(-12, ay - 16, 24, 4);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-5, ay - 27, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(-5.8, ay - 29, 1.6, 3);
    ctx.fillRect(-5.8, ay - 25, 1.6, 1.6);
    return;
  }
  if (kind === "furnisher") {
    drawHat(ctx, "hat_cap", ay);
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(-9, ay - 30, 18, 3);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(-9, ay - 24, 18, 2);
    return;
  }
  if (kind === "costume") {
    drawHat(ctx, "hat_tophat", ay);
    drawGlasses(ctx, "gl_star", ay);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-9, ay - 30, 18, 2);
    return;
  }
  if (kind === "accessory") {
    drawHat(ctx, "hat_flower", ay);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-9, ay - 30, 18, 2);
    ctx.fillStyle = "#e879f9";
    ctx.fillRect(-9, ay - 20, 18, 2);
    return;
  }
  if (kind === "lara") {
    // Parti şapkası, konfeti
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.moveTo(-8, ay - 47);
    ctx.lineTo(0, ay - 66);
    ctx.lineTo(8, ay - 47);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.fillRect(-8, ay - 49, 16, 3);
    ctx.beginPath();
    ctx.arc(0, ay - 67, 2.6, 0, Math.PI * 2);
    ctx.fill();
    const cols = ["#38bdf8", "#facc15", "#34d399", "#f87171"];
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(-14 + i * 9, ay - 52 - (i % 2) * 8, 2.5, 2.5);
    });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-9, ay - 22, 18, 2);
    return;
  }
  if (kind === "alper") {
    // Gazeteci: fötr şapka, PRESS kartı ve koltuk altında gazete
    ctx.fillStyle = "#57534e";
    ctx.fillRect(-12, ay - 41, 24, 3);
    ctx.fillStyle = "#44403c";
    ctx.fillRect(-8, ay - 49, 16, 9);
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(-8, ay - 42, 16, 2);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(-9, ay - 22, 7, 5);
    ctx.fillStyle = "#b91c1c";
    ctx.font = "bold 4px sans-serif";
    ctx.fillText("PRESS", -9, ay - 18);
    drawNewspaper(ctx, ay + 3, 0);
    return;
  }
  if (kind === "ali") {
    // Retro oyuncu: neon bandana ve düşen blok rozeti
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(-10.5, ay - 45, 21, 5);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(-10.5, ay - 41, 21, 1.6);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(10, ay - 44, 4, 8);
    const bl = ["#22d3ee", "#facc15", "#a855f7", "#22c55e"];
    bl.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(-8 + i * 4.4, ay - 28, 4, 4);
    });
    return;
  }
  if (kind === "demir") {
    // Kaptan kasketi ve rozet
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, ay - 46, 10.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-11, ay - 47, 22, 3);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-4, ay - 52, 8, 4);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-9, ay - 30, 18, 2);
    ctx.beginPath();
    ctx.arc(5, ay - 25, 2.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "oyunika") {
    ctx.fillStyle = "#db2777";
    ctx.beginPath();
    ctx.arc(0, ay - 46, 10.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-10.5, ay - 47, 21, 3);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-9, ay - 30, 3, 12);
    ctx.fillRect(6, ay - 30, 3, 12);
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(-9, ay - 22, 18, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(3, ay - 27, 5, 4);
    ctx.fillStyle = "#09090b";
    ctx.fillRect(-1, ay - 24, 2, 2);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, ay - 40, 10, Math.PI * 0.9, Math.PI * 0.1, true);
    ctx.stroke();
    return;
  }
  if (kind === "farmer") {
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.ellipse(0, ay - 47, 17, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, ay - 48, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "miner") {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(0, ay - 48, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10, ay - 48, 20, 3);
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, ay - 54, 2.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "dealer") {
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(0, ay - 27); ctx.lineTo(-6, ay - 31); ctx.lineTo(-6, ay - 23); ctx.closePath();
    ctx.moveTo(0, ay - 27); ctx.lineTo(6, ay - 31); ctx.lineTo(6, ay - 23); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.fillRect(-9, ay - 56, 18, 8);
    return;
  }
  ctx.fillStyle = kind === "fisher" ? "#facc15" : "#ffffff";
  if (kind === "fisher") {
    ctx.beginPath();
    ctx.ellipse(0, ay - 47, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, ay - 47, 8, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(-8, ay - 56, 16, 9);
    ctx.beginPath();
    ctx.arc(-4, ay - 57, 5, 0, Math.PI * 2);
    ctx.arc(4, ay - 57, 5, 0, Math.PI * 2);
    ctx.arc(0, ay - 59, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawAvatar(ctx: Ctx, p: Player, l: Layout, isMe: boolean, time: number) {
  const { sx, sy } = gridToScreen(p.gx, p.gy, l);
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2 - (p.lift ?? 0) * l.scale);
  const s = Math.max(0.75, l.scale) * CHAR_K;
  ctx.scale(s, s);

  const riding = p.isRidingHorse && canRideHorse(p.role);
  const isMoving = p.path.length > 0;
  const seated = p.isSitting && !riding && !isMoving;
  const lying = seated && p.seatType === "lounger";
  const sitSeatRot = (p.seatRot ?? 0) % 2 === 1 ? 1 : 0;
  // Oturan karakter eşyanın baktığı yöne döner (rot 0: güneydoğu, rot 1: güneybatı)
  const dir = seated && p.seatType ? (p.seatType === "lounger" ? sitSeatRot : ((p.seatRot ?? 0) % 4 + 4) % 4) : (p.dir ?? 1);
  const flip = dir === 1 || dir === 2 ? -1 : 1;
  FACE_BACK = !lying && (dir === 2 || dir === 3);
  LAYER_DIR = dir;
  LAYER_FLIP = lying ? 1 : flip;
  LAYER_SEATED = false;

  const danceBounce = p.isDancing ? Math.sin(time / 110) * 5 : 0;
  const walkBob = isMoving && !riding ? Math.abs(Math.sin(time / 95)) * 2.2 : 0;
  const seatAy = seated ? (p.seatType ? SEAT_AY[p.seatType] ?? 3 : 8) : 0;
  const ay = seatAy + (riding ? -21 : 0) - danceBounce - walkBob;
  const lower = p.name.trim().toLowerCase();
  const isStaff = p.role === "admin" || p.role === "suvari";

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  if (lying) ctx.ellipse(0, 3, 26, 9, flip * -0.45, 0, Math.PI * 2);
  else ctx.ellipse(0, 3, riding ? 22 : 12, riding ? 8 : 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gövde: yöne göre yatay çevirme, şezlongda eğik yatış
  ctx.save();
  if (lying) {
    const th = (sitSeatRot === 1 ? 1 : -1) * 1.107;
    const hx = Math.sin(th);
    const hy = -Math.cos(th);
    ctx.translate(-hx * 12, -hy * 12 - 7);
    ctx.rotate(th);
  } else {
    ctx.scale(flip, 1);
  }
  // Hareket animasyonu: yürürken sallanma, öne eğilme ve sıkışıp uzama; dururken nefes; dansta yalpalama
  if (isMoving && !riding) {
    const ph = time / 95;
    ctx.rotate(Math.sin(ph) * 0.06);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.scale(1 + Math.sin(ph * 2 + 1) * 0.02, 1 - Math.abs(Math.sin(ph)) * 0.035);
  } else if (p.isDancing) {
    ctx.rotate(Math.sin(time / 210) * 0.1);
    ctx.scale(1 + Math.sin(time / 105) * 0.04, 1 - Math.sin(time / 105) * 0.04);
  } else {
    ctx.scale(1, 1 + Math.sin(time / 520 + p.gx) * 0.014);
  }

  if (riding) {
    const hf = isMoving ? 1 + (Math.floor(time / 85) % 6) : 0;
    const hd = lying ? 0 : dir;
    if (drawHorseSprite(ctx, hf, hd, lying ? 1 : flip, "horse")) drawHorseSprite(ctx, 0, hd, lying ? 1 : flip, "rider_legs");
    else drawHorse(ctx, isMoving, time);
  }

  const walking = isMoving && !riding;
  const body: Player = lying ? { ...p, isSitting: false } : p;
  let legColor = "#1e293b";
  const special = p.role === "admin" && !p.isNpc ? lower : "";
  let nameColor: string;
  if (p.isNpc) {
    drawStandardAvatar(ctx, body, ay, false, time);
    if (p.npcKind) drawNpcOutfit(ctx, p.npcKind, ay);
    nameColor = "#34d399";
  } else if (special === "vistekiis") {
    legColor = "#18181b";
    // Kurucu görünümü artık 3D katmanlı karakterle: siyah kıyafet + uzun siyah saç (kozmetikler korunur)
    if (!(body.layered && drawLayeredAvatar(ctx, { ...body, shirtColor: "#09090b", hairColor: "#09090b", hairStyle: "hs_long" }, ay, walking, time, "#222228"))) drawVistekiis(ctx, body, ay, walking, time);
    nameColor = "#f472b6";
  } else if (special === "sevaastian") {
    legColor = "#1e1b4b";
    // Siyah takım elbise + koyu gözlük varsayılan; kıyafet/gözlük seçtiyse onlar geçerli
    if (!(body.layered && drawLayeredAvatar(ctx, { ...body, shirtColor: "#09090b", hairColor: "#09090b", hairStyle: "hs_short", top: body.top || "tp_suit", glasses: body.glasses || "gl_shades" }, ay, walking, time, "#222228"))) drawSevaastian(ctx, body, ay, walking, time);
    nameColor = "#38bdf8";
  } else {
    drawStandardAvatar(ctx, body, ay, walking, time);
    nameColor = isStaff ? "#fbbf24" : p.role === "vip" ? "#d8b4fe" : isMe ? "#38bdf8" : "#facc15";
  }
  if (seated && !lying && !LAYER_SEATED) drawSeatedLegs(ctx, ay, legColor, !p.seatType, time);

  if (p.tool === "fishing_rod" || p.isFishing) drawFishingRod(ctx, ay, Boolean(p.isFishing), time);
  else if (p.tool === "newspaper") drawNewspaper(ctx, ay, time);
  ctx.restore();
  FACE_BACK = false;

  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = nameColor;
  const NPC_ICON: Record<NpcKind, string> = { fisher: "🎣 ", chef: "👨‍🍳 ", farmer: "🌾 ", miner: "⛏️ ", dealer: "🎰 ", oyunika: "🎲 ", stylist: "👗 ", barber: "✂️ ", accessory: "🎀 ", furnisher: "🛋️ ", costume: "🎭 ", realtor: "🏡 ", guide: "🧭 ", lara: "🎉 ", demir: "🚀 ", ali: "🕹️ ", alper: "📰 " };
  const prefix = p.isNpc ? NPC_ICON[p.npcKind ?? "fisher"] : isStaff ? "⚔️ " : p.role === "vip" ? "💎 " : "";
  centerText(ctx, `${prefix}${p.name}`, 0, lying ? 4 : 16);
  if (p.status && !p.isNpc && !lying) {
    ctx.font = "italic 9px sans-serif";
    ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
    centerText(ctx, `“${p.status}”`, 0, 28);
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Sohbet baloncukları                                                 */
/* ------------------------------------------------------------------ */

export function drawBubble(
  ctx: Ctx,
  l: Layout,
  width: number,
  speaker: Player | undefined,
  sender: string,
  text: string,
  role: Player["role"],
  offsetY: number,
): number {
  if (!speaker) return 0;
  const { sx, sy } = gridToScreen(speaker.gx, speaker.gy, l);
  const horseBonus = speaker.isRidingHorse && canRideHorse(speaker.role) ? 21 * l.scale : 0;

  const isStaff = role === "admin" || role === "suvari";
  const isVip = role === "vip";
  const fontPx = width < 768 ? 11 : 12;
  const lineH = fontPx + 4;
  const padX = 9;
  const padY = 6;
  const maxTextW = Math.min(width - 24 - padX * 2, width < 768 ? 220 : 260);

  ctx.font = `bold ${fontPx}px sans-serif`;
  const lines = wrapText(ctx, `${sender}: ${text}`, maxTextW, 4);
  const textW = Math.max(...lines.map((ln) => ctx.measureText(ln).width));
  const boxW = textW + padX * 2;
  const boxH = lines.length * lineH + padY * 2 - 4;

  const bx = Math.max(boxW / 2 + 6, Math.min(width - boxW / 2 - 6, sx));
  const bottom = sy - 66 * l.scale - horseBonus - offsetY;
  const top = bottom - boxH;

  ctx.fillStyle = isStaff ? "rgba(254, 249, 195, 0.98)" : isVip ? "rgba(243, 232, 255, 0.98)" : "rgba(255, 255, 255, 0.96)";
  ctx.beginPath();
  ctx.roundRect(bx - boxW / 2, top, boxW, boxH, 9);
  ctx.fill();
  ctx.strokeStyle = isStaff ? "#eab308" : isVip ? "#a855f7" : "#0f172a";
  ctx.lineWidth = isStaff || isVip ? 2 : 1.5;
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  lines.forEach((ln, i) => ctx.fillText(ln, bx - boxW / 2 + padX, top + padY + fontPx - 1 + i * lineH));
  return boxH + 4;
}

export { getLayout };

const PET_COLORS: Record<string, string> = { pet_cat: "#f1f5f9", pet_dog: "#b45309", pet_duck: "#fde047", pet_fox: "#f97316" };

export function drawPet(ctx: Ctx, id: string, gx: number, gy: number, l: Layout, time: number, moving: boolean) {
  const { sx, sy } = gridToScreen(gx, gy, l);
  const s = Math.max(0.75, l.scale);
  const color = PET_COLORS[id] ?? "#cbd5e1";
  const hop = moving ? Math.abs(Math.sin(time / 90)) * 3 : 0;
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2 + 2 * s);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -7 - hop, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -12 - hop, 5, 0, Math.PI * 2);
  ctx.fill();
  if (id === "pet_duck") {
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(11, -12 - hop);
    ctx.lineTo(16, -11 - hop);
    ctx.lineTo(11, -9.5 - hop);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(4, -15 - hop);
    ctx.lineTo(5.5, -21 - hop);
    ctx.lineTo(8, -16 - hop);
    ctx.moveTo(8, -16 - hop);
    ctx.lineTo(10.5, -21 - hop);
    ctx.lineTo(11.5, -15 - hop);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-7, -8 - hop);
    ctx.quadraticCurveTo(-14, -14 - hop, -11, -18 - hop + Math.sin(time / 200) * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(9, -12.5 - hop, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Hain Avı: duvar, ceset ve görev işaretleri                          */
/* ------------------------------------------------------------------ */

export const roomWalls = (slug: string) => ROOM_WALLS[slug] ?? [];

/** Alçak metal gövde duvarı (izometrik kutu) */
export function drawHainWall(ctx: Ctx, gx: number, gy: number, l: Layout) {
  const { sx, sy } = gridToScreen(gx, gy, l);
  const hw = (l.tileW / 2);
  const hh = l.tileH / 2;
  const h = 34 * l.scale;
  const top = sy;
  ctx.save();
  // sol yüz
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(sx - hw, top + hh - h);
  ctx.lineTo(sx, top + 2 * hh - h);
  ctx.lineTo(sx, top + 2 * hh);
  ctx.lineTo(sx - hw, top + hh);
  ctx.closePath();
  ctx.fill();
  // sağ yüz
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(sx + hw, top + hh - h);
  ctx.lineTo(sx, top + 2 * hh - h);
  ctx.lineTo(sx, top + 2 * hh);
  ctx.lineTo(sx + hw, top + hh);
  ctx.closePath();
  ctx.fill();
  // üst
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(sx, top - h);
  ctx.lineTo(sx + hw, top + hh - h);
  ctx.lineTo(sx, top + 2 * hh - h);
  ctx.lineTo(sx - hw, top + hh - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(15,23,42,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // ışık şeridi
  ctx.fillStyle = "rgba(56,189,248,0.55)";
  ctx.fillRect(sx - hw * 0.5, top + hh * 1.4 - h * 0.55, hw * 0.25, 2 * l.scale);
  ctx.restore();
}

/** Elenmiş oyuncunun cesedi */
export function drawHainBody(ctx: Ctx, gx: number, gy: number, color: string, name: string, l: Layout, time: number) {
  const { sx, sy } = gridToScreen(gx, gy, l);
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2);
  const s = Math.max(0.75, l.scale);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -4, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fed7aa";
  ctx.beginPath();
  ctx.arc(-11, -6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.ellipse(3, 0, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // bone
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(6, -10, 12, 2.5);
  ctx.beginPath();
  ctx.arc(6, -9, 2.2, 0, Math.PI * 2);
  ctx.arc(18, -9, 2.2, 0, Math.PI * 2);
  ctx.fill();
  const pulse = 0.6 + 0.4 * Math.sin(time / 260);
  ctx.globalAlpha = pulse;
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fecaca";
  ctx.fillText("☠ " + name, 0, -22);
  ctx.restore();
}

/** Görev istasyonu işaretleri: yanıp sönen halka + ikon */
export function drawHainMark(ctx: Ctx, gx: number, gy: number, icon: string, done: boolean, l: Layout, time: number) {
  const { sx, sy } = gridToScreen(gx, gy, l);
  ctx.save();
  ctx.translate(sx, sy + l.tileH / 2);
  const s = Math.max(0.75, l.scale);
  ctx.scale(s, s);
  const pulse = 0.5 + 0.5 * Math.sin(time / 300 + gx);
  ctx.strokeStyle = done ? "rgba(74,222,128,0.8)" : `rgba(250,204,21,${0.5 + 0.5 * pulse})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.globalAlpha = done ? 0.55 : 1;
  ctx.fillText(done ? "✅" : icon, 0, -14 - pulse * 3);
  ctx.restore();
}

/** Parti Oyunu liderlik kürsüsü bloğu: neon çizgili mor gövde, madalya renkli üst plaka */
export const PODIUM_K = 1.4;
export const PODIUM_HEIGHTS = [46 * PODIUM_K, 32 * PODIUM_K, 22 * PODIUM_K];
export function podiumLift(gx: number, gy: number): number {
  for (let i = 0; i < PARTI_PODIUM.length; i++) {
    const q = PARTI_PODIUM[i];
    const dist = Math.hypot(gx - q.gx, gy - q.gy);
    if (dist < 0.75) return PODIUM_HEIGHTS[i] * Math.min(1, (0.75 - dist) / 0.4);
  }
  return 0;
}
export function drawPodiumBlock(ctx: Ctx, gx: number, gy: number, place: number, l: Layout, time: number) {
  const g0 = gridToScreen(gx, gy, l);
  const sx = 0;
  const sy = -l.tileH / 2;
  const H = (PODIUM_HEIGHTS[place - 1] / PODIUM_K) * l.scale;
  const hw = l.tileW / 2;
  const hh = l.tileH / 2;
  const slab = 5 * l.scale;
  const topCol = ["#facc15", "#e2e8f0", "#c2773a"][place - 1];
  const topDark = ["#ca8a04", "#94a3b8", "#8a4a1c"][place - 1];
  const accent = ["#f0abfc", "#67e8f9", "#fdba74"][place - 1];
  const slope = hh / hw;
  const poly = (pts: [number, number][], fill: string, stroke?: string) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2 * l.scale;
      ctx.stroke();
    }
  };
  ctx.save();
  ctx.translate(g0.sx, g0.sy + l.tileH / 2);
  ctx.scale(PODIUM_K, PODIUM_K);
  // Gövde: sol ve sağ yüz
  const T = sy - H; // üst yüz tepe noktası
  poly([[sx - hw, sy + hh], [sx, sy + l.tileH], [sx, T + l.tileH], [sx - hw, T + hh]], "#2f1a78", "#1b0f4a");
  poly([[sx + hw, sy + hh], [sx, sy + l.tileH], [sx, T + l.tileH], [sx + hw, T + hh]], "#43258f", "#1b0f4a");
  // Neon şeritler
  const pulse = 0.65 + 0.35 * Math.sin(time / 380 + place);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 8 * l.scale;
  ctx.lineWidth = 1.8 * l.scale;
  for (const [yy, col] of [[slab + 4 * l.scale, accent], [H - 5 * l.scale, "#38bdf8"]] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.beginPath();
    ctx.moveTo(sx - hw + 3 * l.scale, T + hh + yy - 3 * l.scale * slope);
    ctx.lineTo(sx - 1, T + l.tileH + yy);
    ctx.lineTo(sx + hw - 3 * l.scale, T + hh + yy - 3 * l.scale * slope);
    ctx.stroke();
  }
  ctx.restore();
  // Sol yüzeye sıra numarası (izometrik eğimle)
  ctx.save();
  ctx.translate(sx - hw / 2, T + hh + hh / 2 + H * 0.5);
  ctx.transform(1, slope, 0, 1, 0, 0);
  ctx.font = `900 ${Math.max(14, Math.min(H * 0.8, 24 * l.scale))}px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = topCol;
  ctx.shadowColor = topCol;
  ctx.shadowBlur = 6 * l.scale;
  ctx.fillText(String(place), 0, 0);
  ctx.restore();
  // Sağ yüze yıldız
  ctx.save();
  ctx.translate(sx + hw / 2, T + hh + hh / 2 + H * 0.5);
  ctx.transform(1, -slope, 0, 1, 0, 0);
  ctx.font = `${Math.max(9, 12 * l.scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = topCol;
  ctx.fillText("★", 0, 0);
  ctx.restore();
  // Üst plaka (kalın madalya kapak)
  poly([[sx - hw - 2, T + hh], [sx, T + l.tileH + 2], [sx, T + l.tileH + 2 + slab], [sx - hw - 2, T + hh + slab]], topDark, "#1b0f4a");
  poly([[sx + hw + 2, T + hh], [sx, T + l.tileH + 2], [sx, T + l.tileH + 2 + slab], [sx + hw + 2, T + hh + slab]], topDark, "#1b0f4a");
  poly([[sx, T - 2], [sx + hw + 2, T + hh], [sx, T + l.tileH + 2], [sx - hw - 2, T + hh]], topCol, "#1b0f4a");
  poly([[sx, T + 3 * l.scale], [sx + hw - 5 * l.scale, T + hh], [sx, T + l.tileH - 3 * l.scale], [sx - hw + 5 * l.scale, T + hh]], "rgba(255,255,255,0.22)");
  ctx.restore();
}
