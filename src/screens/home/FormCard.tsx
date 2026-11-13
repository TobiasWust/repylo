import { useMemo, useState } from "react";
import { formLevel, formSeries, type FormLevel } from "../../domain/form";
import { formatNumber } from "../../domain/units";
import { Sparkline } from "../../ui/components";
import { useApp } from "../../ui/context";

const signed = (n: number, lang: "de" | "en") => `${n >= 0 ? "+" : "−"}${formatNumber(Math.abs(n), lang, 1)}`;

/**
 * Today's form at a glance, like a portfolio value: it moves every day –
 * down after training, up on rest days – with yesterday's change and a
 * 30-day curve.
 */
export const FormCard = () => {
  const { t, data, lang } = useApp();
  // The clock is read once per mount; render must stay pure.
  const [now] = useState(Date.now);
  const series = useMemo(() => formSeries(data, 30, now), [data, now]);
  const today = series.at(-1);
  const yesterday = series.at(-2);
  if (!today || !yesterday || today.fitness < 0.5) return null;

  const change = today.form - yesterday.form;
  const fitnessChange = today.fitness - yesterday.fitness;
  const level = formLevel(today);
  const levelText: Record<FormLevel, string> = {
    fresh: t("Frisch – ein guter Tag für Bestwerte", "Fresh – a good day for records"),
    balanced: t("Ausgeglichen", "Balanced"),
    building: t("Im Aufbau – du trainierst produktiv", "Building – productive training"),
    strained: t("Stark belastet – Erholung einplanen", "Strained – plan some recovery"),
  };

  return (
    <section className="card form-card">
      <div className="form-top">
        <div>
          <div className="hero-label">{t("Form heute", "Form today")}</div>
          <div className="form-value">
            {signed(today.form, lang)}
            <small className={change >= 0 ? "up" : "down"}>
              {change >= 0 ? "▲" : "▼"} {formatNumber(Math.abs(change), lang, 1)}
            </small>
          </div>
          <div className="form-level">{levelText[level]}</div>
        </div>
        <Sparkline values={series.map((d) => d.form)} width={110} height={44} />
      </div>
      <p className="hint">
        {t("Fitness", "Fitness")} {formatNumber(today.fitness, lang, 1)} ({signed(fitnessChange, lang)}) · {t("Ermüdung", "Fatigue")}{" "}
        {formatNumber(today.fatigue, lang, 1)} ·{" "}
        {t("Form = Fitness − Ermüdung, steigt an Ruhetagen", "Form = fitness − fatigue, rises on rest days")}
      </p>
    </section>
  );
};
