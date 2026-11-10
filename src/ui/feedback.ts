/**
 * Cross-screen feedback: the rest timer and PR celebrations. Kept outside the
 * data context so ticking the timer doesn't re-render every screen.
 */
import { createContext, use } from "react";

export interface Feedback {
  readonly startRest: (seconds: number) => void;
  readonly celebrate: (message: string) => void;
  readonly toast: (message: string) => void;
}

export const FeedbackContext = createContext<Feedback | null>(null);

export const useFeedback = (): Feedback => {
  const value = use(FeedbackContext);
  if (!value) throw new Error("FeedbackProvider missing");
  return value;
};
