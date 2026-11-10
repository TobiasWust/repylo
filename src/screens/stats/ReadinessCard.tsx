import { useMemo } from "react";
import { formatNumber } from "../../domain/units";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";
import { readinessInsights } from "../../domain/readiness";

/** How readiness (sleep + energy) relates to performance, once there is enough data. */
export const ReadinessCard = () => {
  const { t, data, lang } = useApp();
  const insights = useMemo(() => readinessInsights(data), [data]);
  if (insights.reduce((n, i) => n + i.workouts, 0) < 3) return null;
  const label = { low: t("Schwache Tagesform", "Low readiness"), mid: t("Mittlere Tagesform", "Medium readiness"), high: t("Top-Tagesform", "High readiness") };
  return (
    <section className="card">
      <h2 className="card-title with-sticker">
        <Sticker name="scale" /> {t("Tagesform & Leistung", "Readiness & performance")}
      </h2>
      <p className="hint">{t("Durchschnittliche Veränderung deines 1RM gegenüber dem jeweils letzten Mal.", "Average change of your 1RM compared with the previous session.")}</p>
      <div className="stack tight">
        {insights.map((i) => (
          <div key={i.level} className="pr-line">
            <span>
              {label[i.level]} <small>· {i.workouts}×</small>
            </span>
            <strong className={i.change >= 0 ? "" : "negative"}>
              {i.change >= 0 ? "+" : ""}
              {formatNumber(i.change, lang, 1)} %
            </strong>
            <span />
          </div>
        ))}
      </div>
    </section>
  );
};
