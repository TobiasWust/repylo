import { useMemo, useState } from "react";
import { parseDay, today } from "../../domain/dates";
import { periodStart, positions, strengthIndex, type Period, type Position } from "../../domain/depot";
import { getExercise } from "../../domain/model";
import { formatDuration, formatNumber } from "../../domain/units";
import { LineChart, Segmented, Sparkline } from "../../ui/components";
import { useApp } from "../../ui/context";
import { Sticker } from "../../ui/stickers";
import { formatDate, plural } from "../../ui/text";

/**
 * Strength like a portfolio: an index that starts at 100 at the beginning
 * of the chosen period, and every exercise as a position with its change.
 */
export const DepotCard = () => {
  const { t, data, lang, open, exerciseName, weight } = useApp();
  const [period, setPeriod] = useState<Period>("1m");
  const from = periodStart(data, period);
  const to = today();
  const index = useMemo(() => strengthIndex(data, from, to), [data, from, to]);
  const list = useMemo(() => positions(data, from, to), [data, from, to]);

  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatNumber(Math.abs(n), lang, 1)} %`;
  const value = (p: Position) =>
    p.unit === "kg" ? `1RM ${weight(p.current)}` : p.unit === "seconds" ? formatDuration(p.current) : `${p.current} ${t("Wdh.", "reps")}`;

  return (
    <>
      <section className="card depot">
        <h2 className="card-title with-sticker">
          <Sticker name="chartUp" /> {t("Kraftindex", "Strength index")}
        </h2>
        <Segmented<Period>
          label={t("Zeitraum", "Period")}
          value={period}
          onChange={setPeriod}
          options={[
            { value: "1w", label: t("1 W", "1 W") },
            { value: "1m", label: t("1 M", "1 M") },
            { value: "3m", label: t("3 M", "3 M") },
            { value: "1y", label: t("1 J", "1 Y") },
            { value: "all", label: t("Alle", "All") },
          ]}
        />
        {index ? (
          <>
            <div className="depot-head">
              <strong className="depot-value">{formatNumber(index.points.at(-1)!.value, lang, 1)}</strong>
              <span className={`depot-change ${index.change >= 0 ? "up" : "down"}`}>
                {index.change >= 0 ? "▲" : "▼"} {signed(index.change)}
              </span>
            </div>
            <LineChart
              height={140}
              points={index.points.map((p) => ({ x: parseDay(p.date).getTime(), y: p.value, label: formatDate(p.date, lang) }))}
              format={(y) => formatNumber(y, lang, 1)}
            />
            <p className="hint">
              {t(
                "100 = Stand zu Beginn des Zeitraums. Der Index folgt der durchschnittlichen Veränderung aller Übungen, die du darin trainiert hast.",
                "100 = where you stood at the start of the period. The index follows the average change of every exercise you trained in it.",
              )}
            </p>
          </>
        ) : (
          <p className="hint">{t("In diesem Zeitraum gibt es noch nichts zu vergleichen.", "Nothing to compare in this period yet.")}</p>
        )}
      </section>

      <section>
        <h2 className="section-title">{t("Deine Übungen", "Your exercises")}</h2>
        <div className="stack">
          {list.map((p) => (
            <button key={p.key} className="card list-card" onClick={() => open({ type: "exercise", key: p.key })}>
              <span className="list-main">
                <strong>{exerciseName(getExercise(data, p.key))}</strong>
                <small>
                  {value(p)}
                  {p.sessions > 0 && ` · ${p.sessions} ${plural(p.sessions, t("Einheit", "session"), t("Einheiten", "sessions"))}`}
                </small>
              </span>
              <span className="trend">
                <Sparkline values={p.trend} />
                {p.change !== null ? (
                  <small className={p.change >= 0 ? "up" : "down"}>
                    {p.change >= 0 ? "▲" : "▼"} {signed(p.change)}
                  </small>
                ) : (
                  <small className="trend-since">{t("nicht trainiert", "not trained")}</small>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};
