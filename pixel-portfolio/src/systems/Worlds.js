/** Pure world-progression rules (no imports, so Node unit tests can load it). */
export const WORLD_COUNT = 7;

/** World n is playable when it is world 1, the previous world is cleared, it is already cleared, or Recruiter Mode is on. */
export function isWorldUnlocked(id, completed, recruiter) {
  return recruiter || id === 1 || completed.has(id) || completed.has(id - 1);
}

/** First unlocked world that is not cleared yet (falls back to the last world). */
export function nextWorldToPlay(completed, recruiter, count = WORLD_COUNT) {
  for (let id = 1; id <= count; id++) if (isWorldUnlocked(id, completed, recruiter) && !completed.has(id)) return id;
  return count;
}
