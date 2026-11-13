import { useMemo, useState } from "react";
import { parseDay } from "../../domain/dates";
import { fitnessSeries } from "../../domain/fitness";
import { formatNumber } from "../../domain/units";
import { LineChart } from "../../ui/components";
import { useApp } from "../../ui/context";
import { formatDate } from "../../ui/text";

/**
 * Training level at a glance, like a portfolio value: rolling sets per week
 * that climb with every workout and sink slowly in breaks, with the change
 * over 30 days and a 90-day curve.
 */
export const FitnessCard = () => {
  const { t, data, lang } = useApp();
  // The clock is read once per mount; render must stay pure.
  const [now] = useState(Date.now);
  const series = useMemo(() => fitnessSeries(data, 90, now), [data, now]);
  const latest = series.at(-1);
  if (!latest || latest.level < 1) return null;
  const monthAgo = series.at(-31);
  const change = monthAgo && monthAgo.level >= 1 ? ((latest.level - monthAgo.level) / monthAgo.level) * 100 : null;

  return (
    <section className="card fitness-card">
      <div className="hero-label">{t("Trainingsstand", "Training level")}</div>
      <div className="fitness-value">
        {formatNumber(latest.level, lang, 0)}
        <small>{t(" Sätze pro Woche", " sets per week")}</small>
        {change !== null && (
          <span className={`depot-change ${change >= 0 ? "up" : "down"}`}>
            {change >= 0 ? "▲" : "▼"} {formatNumber(Math.abs(change), lang, 0)} % {t("in 30 Tagen", "in 30 days")}
          </span>
        )}
      </div>
      <LineChart
        height={110}
        points={series.map((d) => ({ x: parseDay(d.date).getTime(), y: d.level, label: formatDate(d.date, lang) }))}
        format={(y) => formatNumber(y, lang, 0)}
      />
      <p className="hint">
        {t(
          "Wie viel du im Schnitt trainierst: steigt mit jedem Training, sinkt in Pausen nur langsam.",
          "How much you train on average: rises with every workout, sinks only slowly in breaks.",
        )}
      </p>
    </section>
  );
};
