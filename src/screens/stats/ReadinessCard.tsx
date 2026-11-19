import { useMemo } from "react";
import { readinessEffect, type Readiness } from "../../domain/readiness";
import { formatNumber } from "../../domain/units";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";

/**
 * Does readiness (sleep + energy) change how strong you are? One sentence
 * with a takeaway, once two readiness levels have enough workouts to compare.
 */
export const ReadinessCard = () => {
  const { t, data, lang } = useApp();
  const effect = useMemo(() => readinessEffect(data), [data]);
  if (!effect) return null;
  const label: Record<Readiness, string> = {
    low: t("Schwache Tagesform", "Low readiness"),
    mid: t("Mittlere Tagesform", "Medium readiness"),
    high: t("Top-Tagesform", "High readiness"),
  };
  const pct = (n: number) => `${formatNumber(Math.abs(n), lang, 0)} %`;
  const low = effect.levels.find((l) => l.level === "low");
  const high = effect.levels.find((l) => l.level === "high");
  const verdict = !effect.matters
    ? t(
        "Deine Tagesform macht bei dir kaum einen Unterschied. Ein müder Tag ist kein Grund, das Training ausfallen zu lassen.",
        "Your readiness makes little difference for you. A tired day is no reason to skip training.",
      )
    : low && low.diff < 0
      ? t(
          `An müden Tagen bist du im Schnitt ${pct(low.diff)} schwächer als sonst. Trainier dann ruhig leichter – repylo schlägt automatisch weniger Gewicht vor.`,
          `On tired days you're ${pct(low.diff)} weaker than usual. Go lighter then – repylo suggests less weight automatically.`,
        )
      : high && high.diff > 0
        ? t(
            `An guten Tagen bist du im Schnitt ${pct(high.diff)} stärker als sonst. Nutz sie für schwere Sätze und neue Bestwerte.`,
            `On good days you're ${pct(high.diff)} stronger than usual. Use them for heavy sets and new records.`,
          )
        : t(
            "Deine Tagesform macht einen Unterschied, aber kein klares Muster. Achte darauf, wie du dich fühlst.",
            "Your readiness makes a difference, but without a clear pattern. Listen to how you feel.",
          );
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="scale" /> {t("Tagesform & Leistung", "Readiness & performance")}
      </h2>
      <p>{verdict}</p>
      <div className="stack tight">
        {effect.levels.map((l) => (
          <div key={l.level} className="pr-line">
            <span>
              {label[l.level]} <small>· {l.workouts}×</small>
            </span>
            <strong className={l.diff >= 0 ? "" : "negative"}>
              {l.diff >= 0 ? "+" : "−"}
              {pct(l.diff)}
            </strong>
            <span />
          </div>
        ))}
      </div>
      <p className="hint">
        {t("Gegenüber deinem Durchschnitt, Fortschritt herausgerechnet.", "Vs. your own average, progress taken out.")}
      </p>
    </section>
  );
};
