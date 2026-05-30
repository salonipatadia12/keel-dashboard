// Dashboard-wide feature flags. Each flag is a single source of truth that
// every consumer reads directly — no prop drilling, no per-section toggles.

// Show the middle "Optimized IVR" tier across the entire dashboard.
//
// Background: the original 3-column design pitched (today → optimized IVR
// → voice agent) implies we'd help clients re-engineer their digit menu.
// We don't actually offer that service — the deliverable is "keep what you
// have or move to a voice agent". With this flag off, every surface
// collapses to a clean two-column today-vs-voice-agent comparison.
//
// Compute for the optimized IVR tier still runs (buildRecommendedTree,
// brandRecommended) so flipping this flag back to true restores the column
// everywhere with zero data work.
export const SHOW_OPTIMIZED_IVR = false;
