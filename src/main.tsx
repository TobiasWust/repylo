import "@fontsource-variable/lexend";
import { AppName } from "@evolu/common";
import { createEvolu } from "@evolu/common/local-first";
import { createRun } from "@evolu/web";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { getTransports, loadOrCreateOwner } from "./db/owner";
import { EvoluContext, Schema } from "./db/schema";
import { App } from "./App";
import { evoluDeps } from "./ui/evoluDeps";
import "./styles.css";

const run = createRun(evoluDeps);

const evolu = await run.ok(
  createEvolu(Schema, {
    appName: AppName.orThrow("repylo"),
    appOwner: loadOrCreateOwner(),
    transports: getTransports(),
    indexes: (create) => [
      create("workoutSetWorkoutId").on("workoutSet").column("workoutId"),
      create("workoutExerciseWorkoutId").on("workoutExercise").column("workoutId"),
    ],
  }),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EvoluContext value={evolu}>
      <Suspense fallback={<div className="splash">repylo</div>}>
        <App />
      </Suspense>
    </EvoluContext>
  </StrictMode>,
);
