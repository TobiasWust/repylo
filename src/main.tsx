import "@fontsource-variable/lexend";
import "@fontsource-variable/shantell-sans";
import { AppName } from "@evolu/common";
import { createEvolu } from "@evolu/common/local-first";
import { createRun } from "@evolu/web";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { getTransports, loadOrCreateOwner } from "./db/owner";
import { EvoluContext, Schema } from "./db/schema";
import { App } from "./App";
import { applyLook, applyTheme, getLook, getTheme } from "./ui/look";
import { evoluDeps } from "./ui/evoluDeps";
// Imported early: the browser may offer installation before React renders.
import "./ui/install";
import "./styles.css";

applyLook(getLook());
// Firefox on iOS needs extra room below the page for the tab bar (see styles.css).
if (navigator.userAgent.includes("FxiOS")) document.documentElement.dataset.browser = "fxios";
applyTheme(getTheme());

// Surface Evolu's errors (plain objects) to the boot watchdog in index.html.
evoluDeps.evoluError.subscribe(() => {
  window.__repyloEvoluError = evoluDeps.evoluError.get();
});

const run = createRun(evoluDeps);

const evolu = await run
  .ok(
    createEvolu(Schema, {
      appName: AppName.orThrow("repylo"),
      appOwner: loadOrCreateOwner(),
      transports: getTransports(),
      indexes: (create) => [
        create("workoutSetWorkoutId").on("workoutSet").column("workoutId"),
        create("workoutExerciseWorkoutId").on("workoutExercise").column("workoutId"),
      ],
    }),
  )
  .catch((error: unknown) => {
    window.__repyloBootError = error;
    throw error;
  });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EvoluContext value={evolu}>
      <Suspense fallback={<div className="splash">repylo</div>}>
        <App />
      </Suspense>
    </EvoluContext>
  </StrictMode>,
);
