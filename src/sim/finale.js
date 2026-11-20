// Grand finale (v5.9): it opens once every achievement of every released region is at its last tier. It plays
// by itself the first time (`profile.grandFinaleSeen`), and can be watched again from the menu or the
// achievements tab.
import { GRAN_FINAL_LOGRO, LOGROS } from '../data/logros.js';
import { gainRenown } from './renown.js';
import { REGIONS, REGIONS_BY_ID } from '../data/regions.js';

// Achievements that count: those of released regions (a hidden, work-in-progress or developer-only region
// would make the finale impossible).
const counted = () => LOGROS.filter((l) => {
  const r = REGIONS_BY_ID[l.region];
  return r && !r.hidden && !r.wip && !r.devOnly;
});

// How many achievements are complete (every tier), out of how many.
export function finaleProgress(profile) {
  const list = counted();
  const have = list.filter((l) => (profile?.logros?.[l.id] ?? 0) >= l.tiers.length).length;
  return { have, total: list.length, ready: have === list.length };
}

export const finaleUnlocked = (profile) => finaleProgress(profile).ready;

// Whether its side button shows (v5.16): once the special zone is finished (its second ending, or a restart of it,
// so the button does not go away with the new run), which is where the game tells how the finale is reached; and
// in any case once the finale is unlocked.
export function finaleButtonShown(root) {
  const profile = root.profile;
  if (finaleUnlocked(profile)) return true;
  const special = REGIONS.find((r) => r.special);
  const st = special && root.regions?.[special.id];
  return Boolean(st && (st.mastered || st.keep?.resets > 0));
}

// Whether it is due to play by itself: unlocked and not seen yet.
export const finaleDue = (profile) => !profile?.grandFinaleSeen && finaleUnlocked(profile);

// Pays the grand finale achievement once everything else is complete. Returns what was earned, in the
// shape of checkLogros ([{ logro, tier, reward }]).
export function checkFinaleLogro(profile) {
  profile.logros ??= {};
  const l = GRAN_FINAL_LOGRO;
  if ((profile.logros[l.id] ?? 0) >= l.tiers.length || !finaleUnlocked(profile)) return [];
  profile.logros[l.id] = l.tiers.length;
  gainRenown(profile, l.reward[0]);
  return [{ logro: l, tier: 1, reward: l.reward[0] }];
}
