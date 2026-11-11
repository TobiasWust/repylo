import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FeedbackContext, type ConfirmOptions, type PromptOptions } from "./feedback";
import { useModal } from "./modal";
import { Sticker } from "./stickers";

const beep = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio is a nice-to-have; vibration and the UI still signal the end.
  }
};

const confettiColors = ["var(--yellow)", "var(--pink)", "var(--lavender)", "var(--brand)", "var(--ink)", "var(--sky)"];

const Confetti = () => {
  // Random layout is created once; the provider re-renders while the timer ticks.
  const [pieces] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      background: confettiColors[i % confettiColors.length],
      animationDelay: `${Math.random() * 0.4}s`,
      animationDuration: `${1.6 + Math.random() * 1.4}s`,
      rotate: `${Math.random() * 360}deg`,
    })),
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  );
};

/**
 * The toast is a manual popover so it shows above an open sheet or dialog
 * (those sit in the browser's top layer). Without popover support it stays
 * a plain fixed element.
 */
const Toast = ({ message }: { message: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    try {
      ref.current?.showPopover?.();
    } catch {
      // Already shown, or popovers unsupported: it is visible either way.
    }
  }, []);
  return (
    <div ref={ref} popover="manual" className="toast">
      {message}
    </div>
  );
};

type DialogRequest =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (text: string | null) => void };

/** Centered card dialog, the app's own take on confirm() and prompt(). */
const Dialog = ({ request, cancelLabel, onDone }: { request: DialogRequest; cancelLabel: string; onDone: () => void }) => {
  const { options } = request;
  const [text, setText] = useState(request.kind === "prompt" ? (request.options.initial ?? "") : "");
  const danger = request.kind === "confirm" && request.options.danger;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = (ok: boolean) => {
    if (request.kind === "confirm") request.resolve(ok);
    else request.resolve(ok && text.trim() ? text.trim() : null);
    onDone();
  };

  // Escape, the back gesture and a tap beside the card all cancel. As the
  // newest modal it sits above an open sheet and only it closes.
  const modal = useModal(() => finish(false));

  useEffect(() => {
    // Destructive actions start on "cancel" so a stray Enter can't delete anything.
    if (inputRef.current) inputRef.current.select();
    else (danger ? cancelRef : confirmRef).current?.focus();
  }, [danger]);

  return (
    <dialog
      className="modal-shell dialog-shell"
      role={request.kind === "confirm" ? "alertdialog" : undefined}
      aria-labelledby="dialog-title"
      aria-describedby={request.kind === "confirm" && request.options.message ? "dialog-message" : undefined}
      {...modal}
    >
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          finish(true);
        }}
      >
        {request.kind === "confirm" && (
          <Sticker name={request.options.sticker ?? (danger ? "warn" : "note")} size={44} className="dialog-sticker" />
        )}
        <h2 id="dialog-title">{options.title}</h2>
        {request.kind === "confirm" && request.options.message && (
          <p id="dialog-message" className="dialog-message">
            {request.options.message}
          </p>
        )}
        {request.kind === "prompt" && (
          <input
            ref={inputRef}
            className="text-input"
            value={text}
            placeholder={request.options.placeholder}
            aria-label={options.title}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="button grow" onClick={() => finish(false)}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="submit"
            className={`button grow ${danger ? "danger" : "dark"}`}
            disabled={request.kind === "prompt" && !text.trim()}
          >
            {options.confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export const FeedbackProvider = ({ children, labels }: { children: ReactNode; labels: { rest: string; skip: string; cancel: string } }) => {
  // The timer stores its end time, not a countdown, so it stays correct when
  // the phone locks or the tab is throttled in the background.
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [celebration, setCelebration] = useState<{ id: number; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ id: number; message: string } | null>(null);
  const finished = useRef(false);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  useEffect(() => {
    if (restEnd === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEnd]);

  const remaining = restEnd === null ? 0 : Math.max(0, Math.ceil((restEnd - now) / 1000));
  useEffect(() => {
    if (restEnd === null || remaining > 0 || finished.current) return;
    finished.current = true;
    navigator.vibrate?.([250, 120, 250]);
    beep();
    const id = setTimeout(() => setRestEnd(null), 2500);
    return () => clearTimeout(id);
  }, [remaining, restEnd]);

  const startRest = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    finished.current = false;
    setRestTotal(seconds);
    setNow(Date.now());
    setRestEnd(Date.now() + seconds * 1000);
  }, []);

  // Toasts and celebrations are only seen, so screen readers get them read out:
  // via ariaNotify() where available, else through a polite live region.
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback((message: string) => {
    const doc = document as Document & { ariaNotify?: (message: string) => void };
    if (doc.ariaNotify) return doc.ariaNotify(message);
    // The same text twice in a row would not be read again; vary it invisibly.
    setAnnouncement((previous) => (previous === message ? `${message}\u00a0` : message));
  }, []);

  const celebrate = useCallback(
    (message: string) => {
      navigator.vibrate?.([60, 40, 60, 40, 120]);
      setCelebration({ id: Date.now(), message });
      announce(message);
    },
    [announce],
  );
  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(id);
  }, [celebration]);

  const toast = useCallback(
    (message: string) => {
      setToastMessage({ id: Date.now(), message });
      announce(message);
    },
    [announce],
  );
  useEffect(() => {
    if (!toastMessage) return;
    const id = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(id);
  }, [toastMessage]);

  // A new dialog replaces an open one; the old caller just gets "cancelled".
  const dialogRef = useRef<DialogRequest | null>(null);
  const openDialog = useCallback((request: DialogRequest) => {
    const open = dialogRef.current;
    if (open?.kind === "confirm") open.resolve(false);
    else open?.resolve(null);
    dialogRef.current = request;
    setDialog(request);
  }, []);
  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => openDialog({ kind: "confirm", options, resolve })),
    [openDialog],
  );
  const prompt = useCallback(
    (options: PromptOptions) => new Promise<string | null>((resolve) => openDialog({ kind: "prompt", options, resolve })),
    [openDialog],
  );
  const closeDialog = useCallback(() => {
    dialogRef.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => ({ startRest, celebrate, toast, confirm, prompt }), [startRest, celebrate, toast, confirm, prompt]);
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <FeedbackContext value={value}>
      {children}
      {restEnd !== null && (
        <div className={`rest-timer ${remaining === 0 ? "rest-done" : ""}`} role="timer">
          <div className="rest-progress" style={{ width: `${(remaining / Math.max(restTotal, 1)) * 100}%` }} />
          <span className="rest-label">{labels.rest}</span>
          <strong className="rest-time">
            {mm}:{ss}
          </strong>
          <button className="chip" onClick={() => setRestEnd((end) => (end ?? Date.now()) - 15_000)}>
            −15
          </button>
          <button className="chip" onClick={() => setRestEnd((end) => (end ?? Date.now()) + 15_000)}>
            +15
          </button>
          <button className="chip chip-dark" onClick={() => setRestEnd(null)}>
            {labels.skip}
          </button>
        </div>
      )}
      {celebration && (
        <div key={celebration.id}>
          <Confetti />
          <div className="celebration">
            <Sticker name="trophy" size={40} />
            {celebration.message}
          </div>
        </div>
      )}
      {dialog && <Dialog key={dialog.options.title} request={dialog} cancelLabel={labels.cancel} onDone={closeDialog} />}
      {toastMessage && <Toast key={toastMessage.id} message={toastMessage.message} />}
      <div className="sr-only" role="status">
        {announcement}
      </div>
    </FeedbackContext>
  );
};
