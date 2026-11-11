import { useLayoutEffect, useRef, type MouseEvent } from "react";

/**
 * Shows a <dialog> as a modal for as long as it is mounted. The browser then
 * keeps focus inside, makes the page behind inert, returns focus on close and
 * handles Escape / the back gesture, which call `onClose` (React unmounts it).
 * The dialog itself is an invisible full-screen shell: tapping it (rather
 * than the card inside) also closes.
 */
export const useModal = (onClose: () => void) => {
  const ref = useRef<HTMLDialogElement>(null);
  const latest = useRef(onClose);
  useLayoutEffect(() => {
    latest.current = onClose;
  });
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Escape and the back gesture fire `cancel`; let React do the closing.
    const onCancel = (e: Event) => {
      e.preventDefault();
      latest.current();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      // Close before React removes it: only close() hands focus back to the
      // button that opened the dialog; a removed dialog just drops it.
      if (dialog.open) dialog.close();
    };
  }, []);
  const onShellClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) latest.current();
  };
  return { ref, onClick: onShellClick };
};
