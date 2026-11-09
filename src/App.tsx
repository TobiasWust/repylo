import { useEffect, useRef } from "react";
import { importBackup, parseBackup } from "./db/backup";
import { seedDemo } from "./db/demo";
import { takePendingImport } from "./db/owner";
import { Body } from "./screens/Body";
import { ExerciseStats } from "./screens/ExerciseStats";
import { History } from "./screens/History";
import { Home } from "./screens/Home";
import { PlatesSheet } from "./screens/Plates";
import { Settings } from "./screens/Settings";
import { Stats } from "./screens/Stats";
import { WorkoutScreen } from "./screens/Workout";
import { Icon, type IconName } from "./ui/components";
import { AppProvider, useApp, type Tab } from "./ui/context";
import { FeedbackProvider, useFeedback } from "./ui/feedback";

/** After joining another device, import the data this device had before. */
const PendingImport = () => {
  const { data, actions, t } = useApp();
  const { toast } = useFeedback();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (location.hash === "#demo") {
      history.replaceState(null, "", location.pathname);
      seedDemo(actions, data);
      toast(t("Demo-Daten geladen", "Demo data loaded"));
      return;
    }
    const backup = parseBackup(takePendingImport() ?? "");
    if (!backup) return;
    importBackup(backup, actions, data);
    toast(t("Verbunden – deine bisherigen Trainings wurden übernommen", "Connected – your previous workouts were brought along"));
  }, [actions, data, t, toast]);
  return null;
};

const tabs: { tab: Tab; icon: IconName; de: string; en: string }[] = [
  { tab: "home", icon: "home", de: "Start", en: "Home" },
  { tab: "history", icon: "calendar", de: "Verlauf", en: "History" },
  { tab: "stats", icon: "chart", de: "Statistik", en: "Stats" },
  { tab: "body", icon: "scale", de: "Körper", en: "Body" },
  { tab: "settings", icon: "gear", de: "Mehr", en: "More" },
];

const Shell = () => {
  const { tab, setTab, overlays, t, back } = useApp();
  const top = overlays.at(-1);
  // Full-screen overlays replace the tab content; sheets (plates) float above it.
  const screen = [...overlays].reverse().find((o) => o.type !== "plates");

  return (
    <>
      <PendingImport />
      <main className="app">
        {screen?.type === "workout" ? (
          <WorkoutScreen key={screen.id} id={screen.id} />
        ) : screen?.type === "exercise" ? (
          <ExerciseStats key={screen.key} exerciseKey={screen.key} />
        ) : tab === "home" ? (
          <Home />
        ) : tab === "history" ? (
          <History />
        ) : tab === "stats" ? (
          <Stats />
        ) : tab === "body" ? (
          <Body />
        ) : (
          <Settings />
        )}
      </main>
      {!screen && (
        <nav className="tabbar">
          {tabs.map((x) => (
            <button key={x.tab} className={tab === x.tab ? "active" : ""} onClick={() => setTab(x.tab)}>
              <span className="tab-icon">
                <Icon name={x.icon} />
              </span>
              <span>{t(x.de, x.en)}</span>
            </button>
          ))}
        </nav>
      )}
      {top?.type === "plates" && <PlatesSheet initialWeight={top.weight} onClose={back} />}
    </>
  );
};

const Feedback = ({ children }: { children: React.ReactNode }) => {
  const { t } = useApp();
  return <FeedbackProvider labels={{ rest: t("Pause", "Rest"), skip: t("Weiter", "Skip") }}>{children}</FeedbackProvider>;
};

export const App = () => (
  <AppProvider>
    <Feedback>
      <Shell />
    </Feedback>
  </AppProvider>
);
