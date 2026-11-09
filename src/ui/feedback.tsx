/**
 * Cross-screen feedback: the rest timer and PR celebrations. Kept outside the
 * data context so ticking the timer doesn't re-render every screen.
 */
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sticker } from "./stickers";

interface Feedback {
  readonly startRest: (seconds: number) => void;
  readonly celebrate: (message: string) => void;
  readonly toast: (message: string) => void;
}

const FeedbackContext = createContext<Feedback | null>(null);

export const useFeedback = (): Feedback => {
  const value = use(FeedbackContext);
  if (!value) throw new Error("FeedbackProvider missing");
  return value;
};

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

const confettiColors = ["#ffd96a", "#ff7b7b", "#c9c3ff", "#2ed3b7", "#111111", "#7cc4ff"];

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

export const FeedbackProvider = ({ children, labels }: { children: ReactNode; labels: { rest: string; skip: string } }) => {
  // The timer stores its end time, not a countdown, so it stays correct when
  // the phone locks or the tab is throttled in the background.
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [celebration, setCelebration] = useState<{ id: number; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ id: number; message: string } | null>(null);
  const finished = useRef(false);

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

  const celebrate = useCallback((message: string) => {
    navigator.vibrate?.([60, 40, 60, 40, 120]);
    setCelebration({ id: Date.now(), message });
  }, []);
  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(id);
  }, [celebration]);

  const toast = useCallback((message: string) => setToastMessage({ id: Date.now(), message }), []);
  useEffect(() => {
    if (!toastMessage) return;
    const id = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(id);
  }, [toastMessage]);

  const value = useMemo(() => ({ startRest, celebrate, toast }), [startRest, celebrate, toast]);
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
      {toastMessage && (
        <div key={toastMessage.id} className="toast">
          {toastMessage.message}
        </div>
      )}
    </FeedbackContext>
  );
};
