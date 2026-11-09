import { createEvoluDeps } from "@evolu/react-web";

/**
 * Evolu's platform dependencies, created once per page. The sync status store
 * lives here because React context only carries the Evolu instance.
 */
export const evoluDeps = createEvoluDeps();
export const syncState = evoluDeps.syncState;
export const evoluError = evoluDeps.evoluError;
