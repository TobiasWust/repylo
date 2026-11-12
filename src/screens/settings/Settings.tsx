import { useRef, useState } from "react";
import { createBackup, downloadJson, importBackup, parseBackup } from "../../db/backup";
import { today } from "../../domain/dates";
import { defaultRest, type Goal } from "../../domain/model";
import { repRange } from "../../domain/progression";
import { Icon, Segmented } from "../../ui/components";
import { useApp } from "../../ui/context";
import { useFeedback } from "../../ui/feedback";
import { InstallCard } from "../../ui/InstallCard";
import { LegalFooter } from "../../ui/Legal";
import { applyLook, applyTheme, getLook, getTheme } from "../../ui/look";
import { PlanSheet } from "../../ui/PlanSheet";
import { goalInfo, goalName, goalShort, plural } from "../../ui/text";
import { Sticker } from "../../ui/stickers";
import { ConnectSheet, ShowCodeSheet } from "./DeviceSheets";
import { SyncStatus } from "./SyncStatus";

export const Settings = () => {
  const { t, data, actions, lang, exerciseName } = useApp();
  const { toast, confirm, prompt } = useFeedback();
  const [sheet, setSheet] = useState<"share" | "connect" | null>(null);
  const [plan, setPlan] = useState(false);
  const [look, setLook] = useState(getLook);
  const [theme, setTheme] = useState(getTheme);
  const fileInput = useRef<HTMLInputElement>(null);
  const s = data.settings;
  const customExercises = [...data.exercises.values()].filter((e) => e.custom);

  return (
    <div className="screen">
      <h1 className="page-title">{t("Einstellungen", "Settings")}</h1>

      <section className="card mint-card">
        <div className="section-row">
          <h2 className="card-title">{t("Geräte & Sync", "Devices & sync")}</h2>
          <SyncStatus />
        </div>
        <p className="hint">
          {t(
            "Kein Konto nötig. Deine Daten liegen auf deinen Geräten und werden verschlüsselt zwischen ihnen abgeglichen – niemand sonst kann sie lesen.",
            "No account needed. Your data lives on your devices and syncs between them encrypted – nobody else can read it.",
          )}
        </p>
        <div className="action-grid">
          <button className="button" onClick={() => setSheet("share")}>
            <Icon name="upload" /> {t("Dieses Gerät teilen", "Share this device")}
          </button>
          <button className="button dark" onClick={() => setSheet("connect")}>
            <Icon name="camera" /> {t("Gerät verbinden", "Connect device")}
          </button>
        </div>
      </section>

      <InstallCard always />

      <section className="card">
        <h2 className="card-title">{t("Training", "Training")}</h2>
        <div className="field-label">
          {t("Ziel (bestimmt Wiederholungsbereich und Vorschläge)", "Goal (sets rep range and suggestions)")}
        </div>
        <Segmented<Goal>
          label={t("Trainingsziel", "Training goal")}
          value={s.goal}
          onChange={(goal) => actions.updateSettings({ goal, restSeconds: defaultRest[goal] })}
          options={(["strength", "hypertrophy", "endurance"] as const).map((g) => ({ value: g, label: goalShort(g, lang) }))}
        />
        <p className="hint" aria-live="polite">
          <strong>
            {goalName(s.goal, lang)}: {repRange[s.goal][0]}–{repRange[s.goal][1]} {t("Wdh.", "reps")}, {defaultRest[s.goal]} s{" "}
            {t("Pause", "rest")}.
          </strong>{" "}
          {goalInfo(s.goal, lang)}
        </p>
        <div className="field-label">{t("Wochenziel (Trainingstage pro Woche)", "Weekly goal (training days per week)")}</div>
        <Segmented
          label={t("Wochenziel (Trainingstage pro Woche)", "Weekly goal (training days per week)")}
          value={String(s.weeklyGoal)}
          onChange={(v) => actions.updateSettings({ weeklyGoal: Number(v) })}
          options={["1", "2", "3", "4", "5", "6", "7"].map((v) => ({ value: v, label: v }))}
        />
        <div className="field-label">{t("Neue Sätze vorbelegen mit", "Pre-fill new sets with")}</div>
        <Segmented
          label={t("Neue Sätze vorbelegen mit", "Pre-fill new sets with")}
          value={s.prefill}
          onChange={(prefill) => actions.updateSettings({ prefill })}
          options={[
            { value: "last", label: t("Letztes Mal", "Last time") },
            { value: "target", label: t("Ziel (Progression)", "Target (progression)") },
          ]}
        />
        <div className="field-label">{t("Kraft-Richtwerte", "Strength standards")}</div>
        <Segmented
          label={t("Kraft-Richtwerte", "Strength standards")}
          value={s.standards ?? ""}
          onChange={(v) => v && actions.updateSettings({ standards: v })}
          options={[
            { value: "male", label: t("Männer", "Men") },
            { value: "female", label: t("Frauen", "Women") },
          ]}
        />
        <div className="field-label">{t("Pausentimer", "Rest timer")}</div>
        <Segmented
          label={t("Pausentimer", "Rest timer")}
          value={String(s.restSeconds)}
          onChange={(v) => actions.updateSettings({ restSeconds: Number(v) })}
          options={["0", "60", "90", "120", "180", "240"].map((v) => ({
            value: v,
            label: v === "0" ? t("Aus", "Off") : `${Number(v) / 60 >= 1 && Number(v) % 60 === 0 ? `${Number(v) / 60} min` : `${v}s`}`,
          }))}
        />
      </section>

      <section className="card">
        <h2 className="card-title">{t("Vorlagen / Splits", "Templates / splits")}</h2>
        <p className="hint">
          {t("Die Reihenfolge bestimmt den Split-Rhythmus („Als Nächstes dran“).", "The order defines your split rotation (“Up next”).")}
        </p>
        <div className="stack tight">
          {data.templates.map((tpl, i) => (
            <div key={tpl.id} className="template-row">
              <span className="grow">
                <strong>{tpl.name}</strong>
                <small>
                  {" "}
                  · {tpl.items.length} {plural(tpl.items.length, t("Übung", "exercise"), t("Übungen", "exercises"))}
                </small>
              </span>
              <button
                className="mini-button"
                disabled={i === 0}
                onClick={() => {
                  const ids = data.templates.map((x) => x.id);
                  [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
                  actions.reorderTemplates(ids);
                }}
                aria-label={t("Hoch", "Up")}
              >
                <Icon name="up" size={16} />
              </button>
              <button
                className="mini-button"
                onClick={async () => {
                  const name = await prompt({
                    title: t("Vorlage umbenennen", "Rename template"),
                    initial: tpl.name,
                    confirmLabel: t("Speichern", "Save"),
                  });
                  if (name && name !== tpl.name) actions.renameTemplate(tpl.id, name);
                }}
                aria-label={t("Umbenennen", "Rename")}
              >
                <Icon name="pencil" size={16} />
              </button>
              <button
                className="mini-button ghost"
                onClick={async () => {
                  const ok = await confirm({
                    title: t(`Vorlage „${tpl.name}“ löschen?`, `Delete template “${tpl.name}”?`),
                    confirmLabel: t("Löschen", "Delete"),
                    danger: true,
                  });
                  if (ok) actions.deleteTemplate(tpl.id);
                }}
                aria-label={t("Löschen", "Delete")}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
        <button className="button full" onClick={() => setPlan(true)}>
          <Sticker name="calendar" size={22} /> {t("Trainingsplan oder Zirkel erstellen lassen", "Create a training plan or circuit")}
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">{t("Darstellung", "Display")}</h2>
        <div className="field-label">{t("Sprache", "Language")}</div>
        <Segmented
          label={t("Sprache", "Language")}
          value={lang}
          onChange={(language) => actions.updateSettings({ language })}
          options={[
            { value: "de", label: "Deutsch" },
            { value: "en", label: "English" },
          ]}
        />
        <div className="field-label">{t("Einheit", "Unit")}</div>
        <Segmented
          label={t("Einheit", "Unit")}
          value={s.unit}
          onChange={(unit) => actions.updateSettings({ unit, barWeight: unit === "kg" ? 20 : 20.41 })}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lbs" },
          ]}
        />
        <div className="field-label">{t("Stil", "Style")}</div>
        <Segmented
          label={t("Stil", "Style")}
          value={look}
          onChange={(next) => {
            applyLook(next, true);
            setLook(next);
          }}
          options={[
            { value: "classic", label: t("Klassisch", "Classic") },
            { value: "sketch", label: t("Notizblock", "Notepad") },
          ]}
        />
        <div className="field-label">{t("Farben", "Colours")}</div>
        <Segmented
          label={t("Farben", "Colours")}
          value={theme}
          onChange={(next) => {
            applyTheme(next, true);
            setTheme(next);
          }}
          options={[
            { value: "lagune", label: t("Lagune", "Lagoon") },
            { value: "fjord", label: "Fjord" },
            { value: "nacht", label: t("Nacht", "Night") },
          ]}
        />
      </section>

      {customExercises.length > 0 && (
        <section className="card">
          <h2 className="card-title">{t("Eigene Übungen", "Custom exercises")}</h2>
          <div className="stack tight">
            {customExercises.map((e) => (
              <div key={e.key} className="template-row">
                <span className="grow">{exerciseName(e)}</span>
                <button
                  className="mini-button ghost"
                  onClick={async () => {
                    const ok = await confirm({
                      title: t(`„${exerciseName(e)}“ löschen?`, `Delete “${exerciseName(e)}”?`),
                      message: t("Bisherige Einträge bleiben erhalten.", "Logged sets are kept."),
                      confirmLabel: t("Löschen", "Delete"),
                      danger: true,
                    });
                    if (ok) actions.deleteCustomExercise(e.key);
                  }}
                  aria-label={t("Löschen", "Delete")}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">{t("Backup", "Backup")}</h2>
        <p className="hint">{t("Zusätzliche Sicherung als Datei zum Aufbewahren.", "An extra copy of your data as a file to keep.")}</p>
        <div className="action-grid">
          <button className="button" onClick={() => downloadJson(`repylo-backup-${today()}.json`, createBackup(data))}>
            <Icon name="download" /> {t("Exportieren", "Export")}
          </button>
          <button className="button" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" /> {t("Importieren", "Import")}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const backup = parseBackup(await file.text());
            if (!backup) return toast(t("Keine gültige repylo-Sicherung", "Not a valid repylo backup"));
            const ok = await confirm({
              title: t(
                `${backup.workouts.length} ${plural(backup.workouts.length, "Training", "Trainings")} importieren?`,
                `Import ${backup.workouts.length} ${plural(backup.workouts.length, "workout", "workouts")}?`,
              ),
              message: t("Sie kommen zu den vorhandenen dazu.", "They’re added to the existing ones."),
              confirmLabel: t("Importieren", "Import"),
              sticker: "repeat",
            });
            if (!ok) return;
            importBackup(backup, actions, data);
            toast(t("Import abgeschlossen", "Import complete"));
          }}
        />
      </section>

      <p className="hint center about">
        <strong>repylo</strong> · Every rep counts.
        <br />
        {t("Keine Accounts, kein Tracking. Deine Daten gehören dir.", "No accounts, no tracking. Your data is yours.")}
        <br />
        {t(
          "Nur App-Aufrufe werden anonym gezählt (GoatCounter, ohne Cookies, ohne Trainingsdaten).",
          "Only app opens are counted anonymously (GoatCounter, no cookies, no workout data).",
        )}
      </p>

      <LegalFooter />

      {plan && <PlanSheet onClose={() => setPlan(false)} />}
      {sheet === "share" && <ShowCodeSheet onClose={() => setSheet(null)} />}
      {sheet === "connect" && <ConnectSheet onClose={() => setSheet(null)} />}
    </div>
  );
};
