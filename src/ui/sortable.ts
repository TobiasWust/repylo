/**
 * Drag-to-reorder for a vertical list, grabbed by a handle.
 *
 * Only the handle starts a drag (it has `touch-action: none`), so the rest of
 * the card keeps scrolling and tapping as usual. While dragging, the grabbed
 * item follows the finger and the others slide aside; the page scrolls when
 * the finger nears the top or bottom edge. Arrow keys on the handle move an
 * item by one step for keyboard users.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

type Drag = {
  id: string;
  from: number;
  to: number;
  dy: number;
  /** Page-relative tops and heights of all items when the drag started. */
  tops: number[];
  heights: number[];
  gap: number;
  startY: number;
  startScroll: number;
  pointerY: number;
};

const EDGE = 72;

export const useSortable = (ids: readonly string[], onReorder: (ids: string[]) => void) => {
  const elements = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // The new order until the database hands it back, so nothing jumps after a drop.
  const [pending, setPending] = useState<string[] | null>(null);
  const key = ids.join();
  useEffect(() => setPending(null), [key]);
  const order = pending && pending.length === ids.length && pending.every((id) => ids.includes(id)) ? pending : [...ids];

  const commit = (next: string[]) => {
    setPending(next);
    onReorder(next);
  };

  const update = (pointerY: number) => {
    const d = dragRef.current;
    if (!d) return;
    const { from, tops, heights } = d;
    const last = tops.length - 1;
    // Keep the grabbed item within the list.
    const min = tops[0]! - tops[from]!;
    const max = tops[last]! + heights[last]! - heights[from]! - tops[from]!;
    const dy = Math.min(max, Math.max(min, pointerY - d.startY + (scrollY - d.startScroll)));
    const center = tops[from]! + heights[from]! / 2 + dy;
    let to = from;
    tops.forEach((top, i) => {
      const middle = top + heights[i]! / 2;
      if (i < from && center < middle) to = Math.min(to, i);
      if (i > from && center > middle) to = Math.max(to, i);
    });
    dragRef.current = { ...d, dy, to, pointerY };
    setDrag(dragRef.current);
  };

  // Scrolls the page while the finger rests near an edge.
  useEffect(() => {
    if (!drag) return;
    let frame = requestAnimationFrame(function tick() {
      const d = dragRef.current;
      if (!d) return;
      const speed =
        d.pointerY < EDGE ? -(EDGE - d.pointerY) / 4 : d.pointerY > innerHeight - EDGE ? (d.pointerY - innerHeight + EDGE) / 4 : 0;
      if (speed) {
        scrollBy(0, speed);
        update(d.pointerY);
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // Only (re)start when a drag begins or ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag === null]);

  const end = (drop: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || !drop || d.to === d.from) return;
    const next = [...order];
    next.splice(d.to, 0, ...next.splice(d.from, 1));
    commit(next);
  };

  const handle = (id: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || order.length < 2) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rects = order.map((x) => elements.current.get(x)?.getBoundingClientRect());
      if (rects.some((r) => !r)) return;
      const tops = rects.map((r) => r!.top + scrollY);
      const heights = rects.map((r) => r!.height);
      const from = order.indexOf(id);
      dragRef.current = {
        id,
        from,
        to: from,
        dy: 0,
        tops,
        heights,
        gap: tops.length > 1 ? tops[1]! - tops[0]! - heights[0]! : 0,
        startY: e.clientY,
        startScroll: scrollY,
        pointerY: e.clientY,
      };
      setDrag(dragRef.current);
      navigator.vibrate?.(8);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => update(e.clientY),
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const step = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      const from = order.indexOf(id);
      if (!step || !order[from + step]) return;
      e.preventDefault();
      const next = [...order];
      [next[from], next[from + step]] = [next[from + step]!, next[from]!];
      commit(next);
    },
  });

  const item = (id: string): { ref: (el: HTMLElement | null) => void; style?: CSSProperties; className: string } => {
    const ref = (el: HTMLElement | null) => {
      if (el) elements.current.set(id, el);
      else elements.current.delete(id);
    };
    if (!drag) return { ref, className: "sortable-item" };
    if (drag.id === id) return { ref, className: "sortable-item dragging", style: { transform: `translateY(${drag.dy}px)` } };
    const i = order.indexOf(id);
    const shift = drag.heights[drag.from]! + drag.gap;
    const offset = drag.from < i && i <= drag.to ? -shift : drag.to <= i && i < drag.from ? shift : 0;
    return { ref, className: "sortable-item shifting", style: offset ? { transform: `translateY(${offset}px)` } : undefined };
  };

  return { order, item, handle, dragging: drag !== null };
};
