import { useMemo, useRef, useState } from "react";
import { getExercise } from "../domain/model";
import { monthlyReview, previousMonth, reviewMonths, type MonthlyReview } from "../domain/review";
import { formatNumber, toUnit } from "../domain/units";
import { Icon } from "../ui/components";
import { useApp, type App } from "../ui/context";
import { useFeedback } from "../ui/feedback";
import { cssVar, resolveVars } from "../ui/look";
import { Sticker, type StickerName } from "../ui/stickers";
import { monthName } from "../ui/text";

interface Tile {
  readonly sticker: StickerName;
  readonly label: string;
  readonly value: string;
  readonly color: string;
}

const tilesFor = (app: App, review: MonthlyReview): Tile[] => {
  const { t, lang, data, exerciseName } = app;
  const unit = data.settings.unit;
  const tiles: Tile[] = [
    { sticker: "dumbbell", label: t("Trainings", "Workouts"), value: String(review.workouts), color: "var(--yellow)" },
    {
      sticker: "flame",
      label: t("Wochenziel geschafft", "Weekly goal reached"),
      value: `${review.goalWeeks} / ${review.weeks}`,
      color: "var(--pink)",
    },
    { sticker: "chartUp", label: t("Sätze", "Sets"), value: String(review.sets), color: "var(--lavender)" },
  ];
  if (review.strength !== null)
    tiles.push({
      sticker: "muscle",
      label: t("Kraft im Schnitt", "Average strength"),
      value: `${review.strength >= 0 ? "+" : ""}${formatNumber(review.strength, lang, 1)} %`,
      color: "var(--mint)",
    });
  if (review.favorite)
    tiles.push({
      sticker: "medal",
      label: t("Lieblingsübung", "Favourite"),
      value: exerciseName(getExercise(data, review.favorite.exerciseKey)),
      color: "var(--sky)",
    });
  if (review.biggestGain)
    tiles.push({
      sticker: "trophy",
      label: t("Größter Fortschritt", "Biggest gain"),
      value: `${exerciseName(getExercise(data, review.biggestGain.exerciseKey))} +${formatNumber(review.biggestGain.percent, lang, 1)} %`,
      color: "var(--yellow)",
    });
  if (review.records > 0)
    tiles.push({ sticker: "party", label: t("Neue Bestwerte", "New bests"), value: String(review.records), color: "var(--pink)" });
  if (review.bodyWeightChange !== null)
    tiles.push({
      sticker: "scale",
      label: t("Körpergewicht", "Body weight"),
      value: `${review.bodyWeightChange >= 0 ? "+" : ""}${formatNumber(toUnit(review.bodyWeightChange, unit), lang, 1)} ${unit}`,
      color: "var(--lavender)",
    });
  return tiles;
};

/** Serializes a rendered sticker <svg> so the canvas can draw it as an image. */
const loadSvg = (svg: SVGSVGElement): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(resolveVars(new XMLSerializer().serializeToString(svg)))}`;
  });

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  ctx.fillStyle = cssVar("--shade");
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 10, w, h, r);
  ctx.fill();
  ctx.fillStyle = resolveVars(fill);
  ctx.lineWidth = 6;
  ctx.strokeStyle = cssVar("--ink");
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
};

/** Writes text on one line, shrinking it until it fits (then truncating). */
const fitText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, weight: number, size: number) => {
  let fontSize = size;
  const font = () => `${weight} ${fontSize}px "Lexend Variable", sans-serif`;
  ctx.font = font();
  while (ctx.measureText(text).width > maxWidth && fontSize > 22) {
    fontSize -= 2;
    ctx.font = font();
  }
  let shown = text;
  while (ctx.measureText(shown).width > maxWidth && shown.length > 4) shown = `${shown.slice(0, -2)}…`;
  ctx.fillText(shown, x, y);
};

/** Draws the review as a 1080×1350 story-style image in the app's look. */
const renderImage = async (title: string, tiles: readonly Tile[], stickers: HTMLElement): Promise<Blob> => {
  await document.fonts.load('800 60px "Lexend Variable"');
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = cssVar("--bg");
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = cssVar("--dots");
  for (let x = 16; x < 1080; x += 32) for (let y = 16; y < 1350; y += 32) ctx.fillRect(x, y, 3, 3);

  ctx.fillStyle = cssVar("--ink");
  ctx.font = '800 92px "Lexend Variable", sans-serif';
  ctx.fillText("repylo", 70, 150);
  ctx.font = '600 36px "Lexend Variable", sans-serif';
  ctx.fillText("Every rep counts.", 74, 200);
  ctx.font = '800 64px "Lexend Variable", sans-serif';
  ctx.fillText(title, 70, 310);

  const svgs = [...stickers.querySelectorAll("svg")];
  const cols = 2,
    gap = 32,
    w = (1080 - 140 - gap) / cols;
  const rows = Math.ceil(tiles.length / cols);
  const h = Math.min(230, (1350 - 370 - 70 - gap * (rows - 1)) / rows);
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const x = 70 + (i % cols) * (w + gap);
    const y = 370 + Math.floor(i / cols) * (h + gap);
    roundRect(ctx, x, y, w, h, 34, tile.color);
    const svg = svgs[i];
    if (svg) ctx.drawImage(await loadSvg(svg), x + 28, y + 22, 64, 64);
    ctx.fillStyle = cssVar("--ink");
    fitText(ctx, tile.label, x + 28, y + h - 78, w - 56, 700, 28);
    fitText(ctx, tile.value, x + 28, y + h - 30, w - 56, 800, 44);
  }
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
};

export const ReviewScreen = ({ month: initialMonth }: { month: string }) => {
  const app = useApp();
  const { t, data, lang, back } = app;
  const { toast } = useFeedback();
  const months = useMemo(() => reviewMonths(data), [data]);
  const [month, setMonth] = useState(initialMonth);
  const review = useMemo(() => monthlyReview(data, month), [data, month]);
  const tiles = tilesFor(app, review);
  const stickerRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const title = `${monthName(month, lang)} ${month.slice(0, 4)}`;
  const index = months.indexOf(month);

  const share = async () => {
    if (!stickerRef.current) return;
    setSharing(true);
    try {
      const blob = await renderImage(title, tiles, stickerRef.current);
      const file = new File([blob], `repylo-${month}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `repylo · ${title}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast(t("Bild gespeichert", "Image saved"));
      }
    } catch (error) {
      // Cancelling the share sheet is not an error worth showing.
      if (!(error instanceof DOMException && error.name === "AbortError")) toast(t("Teilen hat nicht geklappt", "Sharing failed"));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="screen overlay-screen">
      <header className="overlay-header">
        <button className="icon-button" onClick={back} aria-label={t("Zurück", "Back")}>
          <Icon name="back" />
        </button>
        <div className="overlay-title">
          <h1>{t("Monatsrückblick", "Monthly review")}</h1>
          <small>{title}</small>
        </div>
      </header>

      <div className="row gap">
        <button
          className="button small"
          disabled={index < 0 || index >= months.length - 1}
          onClick={() => setMonth(months[index + 1] ?? previousMonth(month))}
        >
          <Icon name="back" size={16} /> {t("Früher", "Earlier")}
        </button>
        <span className="grow center">
          <strong>{title}</strong>
        </span>
        <button className="button small" disabled={index <= 0} onClick={() => setMonth(months[index - 1] ?? month)}>
          {t("Später", "Later")} <Icon name="forward" size={16} />
        </button>
      </div>

      {review.workouts === 0 ? (
        <div className="card muted-card with-sticker">
          <Sticker name="calendar" size={34} /> {t("In diesem Monat gibt es keine Trainings.", "No workouts this month.")}
        </div>
      ) : (
        <>
          <div className="review-grid" ref={stickerRef}>
            {tiles.map((tile) => (
              <div key={tile.label} className="review-tile" style={{ background: tile.color }}>
                <Sticker name={tile.sticker} size={40} />
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </div>
            ))}
          </div>
          <button className="button dark big full" onClick={share} disabled={sharing}>
            <Icon name="upload" /> {sharing ? t("Wird erstellt …", "Creating …") : t("Als Bild teilen", "Share as image")}
          </button>
        </>
      )}
    </div>
  );
};
