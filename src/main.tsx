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
import { applyLook, getLook } from "./ui/look";
import { evoluDeps } from "./ui/evoluDeps";
// Imported early: the browser may offer installation before React renders.
import "./ui/install";
import "./styles.css";

applyLook(getLook());

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
