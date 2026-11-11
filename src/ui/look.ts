/**
 * Appearance, chosen per device and stored in localStorage:
 * - the look (drawing style): <html data-look="…">
 * - the colour theme: <html data-theme="…">
 * Both default to the classic look in the Lagune colours.
 */
export type Look = "classic" | "sketch";
export type Theme = "lagune" | "fjord" | "nacht";

// Only explicit choices are stored. The keys were renamed after a short phase in
// which every app start stored the then-default notepad/Fjord appearance, so
// devices that never chose anything fall back to the defaults again.
const lookKey = "repylo.look.v2";
const themeKey = "repylo.theme.v2";
const themes: readonly Theme[] = ["lagune", "fjord", "nacht"];

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice still applies for this visit.
  }
};

export const getLook = (): Look => (read(lookKey) === "sketch" ? "sketch" : "classic");

/** Shows a look; with save, also remembers it as this device's choice. */
export const applyLook = (look: Look, save = false) => {
  document.documentElement.dataset.look = look;
  if (save) write(lookKey, look);
};

export const getTheme = (): Theme => {
  const stored = read(themeKey);
  return themes.find((theme) => theme === stored) ?? "lagune";
};

/** Shows a colour theme; with save, also remembers it as this device's choice. */
export const applyTheme = (theme: Theme, save = false) => {
  document.documentElement.dataset.theme = theme;
  if (save) write(themeKey, theme);
  // Browser chrome (status bar, task switcher) follows the page background.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cssVar("--bg"));
};

/** Current value of a colour token, e.g. cssVar("--ink") → "#21161f". */
export const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Replaces var(--token) references with their current values (for canvas/images). */
export const resolveVars = (text: string): string => text.replace(/var\((--[\w-]+)\)/g, (_, name: string) => cssVar(name));
