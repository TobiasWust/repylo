/**
 * Appearance, chosen per device and stored in localStorage:
 * - the look (drawing style): <html data-look="…">
 * - the colour theme: <html data-theme="…">
 * Both default to the notepad look in the Fjord colours.
 */
export type Look = "classic" | "sketch";
export type Theme = "fjord" | "lagune" | "nacht";

const lookKey = "repylo.look";
const themeKey = "repylo.theme";
const themes: readonly Theme[] = ["fjord", "lagune", "nacht"];

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

export const getLook = (): Look => (read(lookKey) === "classic" ? "classic" : "sketch");

export const applyLook = (look: Look) => {
  document.documentElement.dataset.look = look;
  write(lookKey, look);
};

export const getTheme = (): Theme => {
  const stored = read(themeKey);
  return themes.find((theme) => theme === stored) ?? "fjord";
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  write(themeKey, theme);
  // Browser chrome (status bar, task switcher) follows the page background.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cssVar("--bg"));
};

/** Current value of a colour token, e.g. cssVar("--ink") → "#21161f". */
export const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Replaces var(--token) references with their current values (for canvas/images). */
export const resolveVars = (text: string): string => text.replace(/var\((--[\w-]+)\)/g, (_, name: string) => cssVar(name));
