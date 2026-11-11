import type { StickerName } from "./stickers";

/**
 * Cross-screen feedback: the rest timer, PR celebrations, toasts and the
 * in-app confirm/prompt dialogs that replace the browser's native ones. Kept outside the
 * data context so ticking the timer doesn't re-render every screen.
 */
import { createContext, use } from "react";

export interface Feedback {
  readonly startRest: (seconds: number) => void;
  readonly celebrate: (message: string) => void;
  readonly toast: (message: string) => void;
  /** Resolves true when the user confirms, false on cancel, Escape or backdrop tap. */
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the trimmed text, or null when cancelled or left empty. */
  readonly prompt: (options: PromptOptions) => Promise<string | null>;
}

export interface ConfirmOptions {
  readonly title: string;
  readonly message?: string;
  readonly confirmLabel: string;
  /** Destructive actions get a red confirm button and focus on "cancel". */
  readonly danger?: boolean;
  readonly sticker?: StickerName;
}

export interface PromptOptions {
  readonly title: string;
  readonly initial?: string;
  readonly placeholder?: string;
  readonly confirmLabel: string;
}

export const FeedbackContext = createContext<Feedback | null>(null);

export const useFeedback = (): Feedback => {
  const value = use(FeedbackContext);
  if (!value) throw new Error("FeedbackProvider missing");
  return value;
};
