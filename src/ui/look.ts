/**
 * Visual style of the app, chosen per device (to compare looks side by side).
 * Stored in localStorage; the stylesheet keys off <html data-look="…">.
 */
export type Look = "classic" | "sketch";

const key = "repylo.look";

export const getLook = (): Look => {
  try {
    return localStorage.getItem(key) === "sketch" ? "sketch" : "classic";
  } catch {
    return "classic";
  }
};

export const applyLook = (look: Look) => {
  document.documentElement.dataset.look = look;
  try {
    localStorage.setItem(key, look);
  } catch {
    // Private mode: the look still applies for this visit.
  }
};
