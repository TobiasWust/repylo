import { useState } from "react";
import { Icon } from "./components";
import { useApp } from "./context";
import { useFeedback } from "./feedback";
import { dismissInstall, isInstallDismissed, promptInstall, useInstallMode } from "./install";
import { Sticker } from "./stickers";

/**
 * Asks to install repylo as an app. On Chromium it opens the native dialog;
 * on iPhone and Firefox (no install API) it explains the two taps instead.
 * `always` is for settings, where it shows regardless of "not now".
 */
export const InstallCard = ({ always = false }: { always?: boolean }) => {
  const { t } = useApp();
  const { toast } = useFeedback();
  const mode = useInstallMode();
  const [hidden, setHidden] = useState(() => !always && isInstallDismissed());
  if (hidden || mode === "installed" || mode === "unsupported") return null;

  const later = (days: number) => {
    dismissInstall(days);
    setHidden(true);
  };

  return (
    <section className="card install-card">
      <div className="suggestion-head">
        <Sticker name="phone" size={34} />
        <h3>{t("repylo als App installieren?", "Install repylo as an app?")}</h3>
        {!always && (
          <button className="icon-button small" onClick={() => later(14)} aria-label={t("Später", "Later")}>
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <p>
        {t(
          "Liegt dann auf deinem Startbildschirm, startet schneller und läuft im Vollbild – auch offline.",
          "It then sits on your home screen, starts faster and runs full screen – offline too.",
        )}
      </p>
      {mode === "prompt" && (
        <div className="action-grid">
          {!always && (
            <button className="button" onClick={() => later(14)}>
              {t("Später", "Later")}
            </button>
          )}
          <button
            className={`button dark ${always ? "full" : ""}`}
            style={always ? { gridColumn: "1 / -1" } : undefined}
            onClick={async () => {
              if (await promptInstall()) toast(t("repylo wird installiert", "Installing repylo"));
            }}
          >
            <Icon name="download" /> {t("Installieren", "Install")}
          </button>
        </div>
      )}
      {mode === "ios" && (
        <p className="hint">
          {t(
            "In Safari unten auf „Teilen“ tippen und dann „Zum Home-Bildschirm“ wählen.",
            "In Safari, tap “Share” at the bottom, then choose “Add to Home Screen”.",
          )}
        </p>
      )}
      {mode === "firefox" && (
        <p className="hint">
          {t(
            "Oben rechts auf das Menü (⋮) tippen und „Installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.",
            "Tap the menu (⋮) at the top right, then “Install” or “Add to Home screen”.",
          )}
        </p>
      )}
      {(mode === "ios" || mode === "firefox") && !always && (
        <button className="button full" onClick={() => later(60)}>
          {t("Verstanden", "Got it")}
        </button>
      )}
    </section>
  );
};
