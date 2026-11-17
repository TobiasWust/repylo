/**
 * Swipe a card sideways to get rid of it. Only clearly horizontal moves count,
 * so vertical scrolling keeps working (the card needs `touch-action: pan-y`).
 * Pointers starting on `ignore` (e.g. a drag handle) are left alone, and the
 * click that ends a swipe is swallowed so it doesn't also tap the card.
 */
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

const threshold = 100;

export const useSwipe = (onSwipe: () => void, ignore = ".drag-handle") => {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const swallowClick = useRef(false);

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest(ignore)) return;
      start.current = { x: e.clientX, y: e.clientY, dragging: false };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s) return;
      const mx = e.clientX - s.x;
      if (!s.dragging && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(e.clientY - s.y) * 1.5) {
        s.dragging = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (s.dragging) setDx(mx);
    },
    onPointerUp: () => {
      const dragged = start.current?.dragging ?? false;
      start.current = null;
      if (!dragged) return;
      swallowClick.current = true;
      if (Math.abs(dx) > threshold) {
        setLeaving(true);
        setDx((d) => (d < 0 ? -600 : 600));
        setTimeout(onSwipe, 200);
      } else setDx(0);
    },
    onPointerCancel: () => {
      start.current = null;
      setDx(0);
    },
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };

  const style = dx
    ? { transform: `translateX(${dx}px)`, opacity: 1 - Math.min(Math.abs(dx) / 400, 0.7), transition: leaving ? undefined : "none" }
    : undefined;

  return { handlers, style, leaving, dragging: dx !== 0 };
};
