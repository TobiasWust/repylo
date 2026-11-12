import { useState } from "react";
import { daysBetween, parseDay, today } from "../domain/dates";
import { bodyWeightTrend } from "../domain/stats";
import { formatNumber, fromUnit, toUnit } from "../domain/units";
import { Empty, Icon, LineChart, NumberField } from "../ui/components";
import { useApp } from "../ui/context";
import { useFeedback } from "../ui/feedback";
import { formatDate } from "../ui/text";
import { DateField } from "../ui/DateField";
import { BodyMapCard } from "./BodyMapCard";

export const Body = () => {
  const { t, data, actions, lang, weight } = useApp();
  const { toast } = useFeedback();
  const unit = data.settings.unit;
  const latest = data.bodyWeights.at(-1);
  const [date, setDate] = useState(today());
  const [value, setValue] = useState<number | null>(latest ? Math.round(toUnit(latest.weight, unit) * 10) / 10 : null);
  const trend = bodyWeightTrend(data);

  const save = () => {
    if (value == null || value <= 0) return;
    actions.setBodyWeight(date, fromUnit(value, unit));
    toast(t("Gewicht gespeichert", "Weight saved"));
  };

  // Change over ~30 days, based on the smoothed trend rather than single weigh-ins.
  const last = trend.at(-1);
  const monthAgo = last ? [...trend].reverse().find((p) => daysBetween(p.date, last.date) >= 28) : undefined;
  const change = last && monthAgo ? last.trend - monthAgo.trend : null;

  return (
    <div className="screen">
      <h1 className="page-title">{t("Körper", "Body")}</h1>

      <BodyMapCard />

      <section className="card hero">
        <div className="hero-label">{t("Körpergewicht eintragen", "Log body weight")}</div>
        <div className="row gap">
          <NumberField label={unit} value={value} onCommit={setValue} className="big-input" placeholder="75" />
          <span className="unit-label">{unit}</span>
        </div>
        <DateField label={t("Datum", "Date")} value={date} max={today()} onChange={setDate} />
        <button className="button dark full" onClick={save} disabled={value == null}>
          <Icon name="check" /> {t("Speichern", "Save")}
        </button>
        <p className="hint">
          {t("Am besten morgens nüchtern wiegen. Ein Eintrag pro Tag.", "Best weighed in the morning before eating. One entry per day.")}
        </p>
      </section>

      {trend.length === 0 ? (
        <Empty sticker="scale">
          {t("Trag dein Gewicht ein, um Trend und relative Kraft zu sehen.", "Log your weight to see the trend and relative strength.")}
        </Empty>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-tile yellow">
              <span>{t("Aktuell", "Current")}</span>
              <strong>{weight(trend.at(-1)!.weight)}</strong>
            </div>
            <div className="stat-tile pink">
              <span>{t("Trend (7 Tage Ø)", "Trend (7-day avg)")}</span>
              <strong>{weight(trend.at(-1)!.trend)}</strong>
            </div>
            {change !== null && (
              <div className="stat-tile lavender">
                <span>{t("Veränderung 30 Tage", "30-day change")}</span>
                <strong>
                  {change >= 0 ? "+" : ""}
                  {formatNumber(toUnit(change, unit), lang, 1)} {unit}
                </strong>
              </div>
            )}
          </div>
          <section className="card">
            <h2 className="card-title">{t("Verlauf", "Progress")}</h2>
            <LineChart
              points={trend.map((p) => ({ x: parseDay(p.date).getTime(), y: toUnit(p.weight, unit), label: formatDate(p.date, lang) }))}
              secondary={
                trend.length > 2
                  ? trend.map((p) => ({ x: parseDay(p.date).getTime(), y: toUnit(p.trend, unit), label: formatDate(p.date, lang) }))
                  : undefined
              }
              format={(y) => formatNumber(y, lang, 1)}
            />
            {trend.length > 2 && (
              <p className="hint">{t("Pink: geglätteter Trend · gestrichelt: Messwerte", "Pink: smoothed trend · dashed: weigh-ins")}</p>
            )}
          </section>
          <section>
            <h2 className="section-title">{t("Einträge", "Entries")}</h2>
            <div className="stack tight">
              {[...data.bodyWeights]
                .reverse()
                .slice(0, 30)
                .map((b) => (
                  <div key={b.id} className="card list-card static">
                    <span className="list-main">
                      <strong>{weight(b.weight)}</strong>
                      <small>{formatDate(b.date, lang, "long")}</small>
                    </span>
                    <button
                      className="mini-button ghost"
                      onClick={() => actions.deleteBodyWeight(b.id)}
                      aria-label={t("Löschen", "Delete")}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
