// pe-fitness/tools/build-all.mjs — regenerate every /pe-fitness/ page. Run from the repo root:
//   node pe-fitness/tools/build-all.mjs
// Order: lessons (+ rollout) → overview (imports lesson data) → benchmarks → leaderboards. No npm dependencies.
await import('./build-lessons.mjs');
await import('./build-overview.mjs');
await import('./build-benchmarks.mjs');
await import('./build-leaderboards.mjs');
