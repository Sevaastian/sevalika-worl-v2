"use client";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

/** Başlık çubuğundan sürüklenebilir sabit konumlu pencere (fare + dokunmatik). */
export function useDrag(width = 320) {
  const [pos, setPos] = useState(() => ({
    x: typeof window === "undefined" ? 40 : Math.max(8, window.innerWidth - width - 24),
    y: 76,
  }));
  const start = useRef<{ dx: number; dy: number } | null>(null);

  const handleProps = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s) return;
      const x = Math.min(Math.max(0, e.clientX - s.dx), window.innerWidth - 100);
      const y = Math.min(Math.max(0, e.clientY - s.dy), window.innerHeight - 50);
      setPos({ x, y });
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      start.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* yoksay */
      }
    },
    style: { cursor: "grab", touchAction: "none", userSelect: "none" } as CSSProperties,
  };
  const style: CSSProperties = { position: "fixed", left: pos.x, top: pos.y, zIndex: 60 };
  return { style, handleProps };
}
