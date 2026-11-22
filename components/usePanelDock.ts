"use client";
import { useEffect, type RefObject } from "react";

/**
 * Bir "dock" kabının doğrudan çocuklarını (panelleri) üst ~46px şeritlerinden
 * sürüklenebilir yapar. Konum, eleman yaşadığı sürece korunur; panel kapanıp
 * açılınca yeni eleman olduğu için varsayılan yere döner. Çift tık = sıfırla.
 */
export function usePanelDock(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const offs = new WeakMap<HTMLElement, { x: number; y: number }>();
    let drag: { el: HTMLElement; sx: number; sy: number; ox: number; oy: number; id: number } | null = null;
    const apply = (el: HTMLElement, x: number, y: number) => {
      offs.set(el, { x, y });
      el.style.transform = x || y ? `translate(${x}px, ${y}px)` : "";
      el.style.zIndex = x || y ? "40" : "";
    };
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      let el: HTMLElement | null = t;
      while (el && el.parentElement !== root) el = el.parentElement;
      if (!el) return;
      if (t.closest("button,input,select,textarea,a,label,[data-nodrag]")) return;
      const r = el.getBoundingClientRect();
      if (e.clientY - r.top > 46) return;
      const o = offs.get(el) ?? { x: 0, y: 0 };
      drag = { el, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
      el.classList.add("sw-dragging");
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      apply(drag.el, drag.ox + e.clientX - drag.sx, drag.oy + e.clientY - drag.sy);
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      drag.el.classList.remove("sw-dragging");
      try { drag.el.releasePointerCapture(e.pointerId); } catch { /* yoksay */ }
      // ekran dışına taşmayı engelle
      const r = drag.el.getBoundingClientRect();
      const o = offs.get(drag.el) ?? { x: 0, y: 0 };
      let { x, y } = o;
      if (r.right < 80) x += 80 - r.right;
      if (r.left > window.innerWidth - 80) x -= r.left - (window.innerWidth - 80);
      if (r.top < 0) y -= r.top;
      if (r.top > window.innerHeight - 60) y -= r.top - (window.innerHeight - 60);
      apply(drag.el, x, y);
      drag = null;
    };
    const dbl = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      let el: HTMLElement | null = t;
      while (el && el.parentElement !== root) el = el.parentElement;
      if (!el || t.closest("button,input,select,textarea")) return;
      if (e.clientY - el.getBoundingClientRect().top <= 46) apply(el, 0, 0);
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("dblclick", dbl);
    return () => {
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("dblclick", dbl);
    };
  }, [ref]);
}
