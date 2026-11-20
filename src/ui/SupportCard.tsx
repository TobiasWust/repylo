import { useState } from "react";
import { Icon } from "./components";
import { useApp } from "./context";
import { KOFI_URL } from "./Legal";
import { Sticker } from "./stickers";

/** Training days before the card shows: late enough that repylo has proven itself. */
const AFTER_DAYS = 10;
const DISMISS_KEY = "repylo.supportDismissed";

const isDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

const dismiss = (): void => {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage unavailable (private mode): the card simply shows again next time.
  }
};

/**
 * A one-time "buy me a coffee" ask after ten training days. Closing it or
 * tapping the link hides it for good on this device.
 */
export const SupportCard = ({ trainedDays }: { trainedDays: number }) => {
  const { t } = useApp();
  const [hidden, setHidden] = useState(isDismissed);
  if (hidden || trainedDays < AFTER_DAYS) return null;

  const close = () => {
    dismiss();
    setHidden(true);
  };

  return (
    <section className="card support-card">
      <div className="suggestion-head">
        <Sticker name="coffee" size={34} />
        <h3>{t("Gefällt dir repylo?", "Enjoying repylo?")}</h3>
        <button className="icon-button small" onClick={close} aria-label={t("Schließen", "Close")}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <p>
        {t(
          "Es bleibt kostenlos und ohne Werbung. Wenn du magst, spendier mir einen Kaffee.",
          "It stays free and ad-free. If you like, buy me a coffee.",
        )}
      </p>
      <a className="button dark full" href={KOFI_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
        <span aria-hidden="true">☕</span> {t("Kaffee spendieren", "Buy me a coffee")}
      </a>
    </section>
  );
};
