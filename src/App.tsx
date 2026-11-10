import { useEffect, useRef, useState } from "react";
import { importBackup, parseBackup } from "./db/backup";
import { seedDemo } from "./db/demo";
import { parseMnemonic, takeConnectLink, takePendingImport } from "./db/owner";
import { useEvolu } from "./db/schema";
import { Body } from "./screens/Body";
import { ExerciseStats } from "./screens/ExerciseStats";
import { History } from "./screens/History";
import { Home } from "./screens/Home";
import { PlatesSheet } from "./screens/Plates";
import { ReviewScreen } from "./screens/Review";
import { ConnectSheet, Settings } from "./screens/Settings";
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

/** Opened via a connect link (QR code from another device): offer to connect. */
const ConnectFromLink = () => {
  const evolu = useEvolu();
  const { t } = useApp();
  const { toast } = useFeedback();
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    const value = takeConnectLink();
    if (!value) return;
    if (parseMnemonic(value) === evolu.appOwner.mnemonic) toast(t("Dieses Gerät ist bereits verbunden", "This device is already connected"));
    else setLink(value);
  }, [evolu, t, toast]);
  return link ? <ConnectSheet initialText={link} onClose={() => setLink(null)} /> : null;
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
  // Tells the boot watchdog in index.html that the app rendered.
  useEffect(() => {
    document.documentElement.dataset.ready = "1";
  }, []);
  const top = overlays.at(-1);
  // Full-screen overlays replace the tab content; sheets (plates) float above it.
  const screen = [...overlays].reverse().find((o) => o.type !== "plates");

  return (
    <>
      <PendingImport />
      <ConnectFromLink />
      <main className="app">
        {screen?.type === "workout" ? (
          <WorkoutScreen key={screen.id} id={screen.id} />
        ) : screen?.type === "review" ? (
          <ReviewScreen key={screen.month} month={screen.month} />
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
