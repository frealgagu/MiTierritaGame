import { warehouseSpace } from './transport.js';

// Persistent alerts: when balanced, goods travel in batches so a yard briefly filling up,
// a station waiting for the next mule, or a trip diverting to the warehouse is normal.
// That isn't a fault. A warning (map icon and panel text) only shows if
// the issue lasts at least half of the last 10 game s, and clears below a
// fifth (to prevent flicker).
export const ALERT_WINDOW = 10; // game s
const BUCKET = 1; // s per window bucket
const ON = 0.5;
const OFF = 0.2;
export const DIVERT_TIME = 3; // s counted as «diverting» after a diverted trip to warehouse
// «Waiting» only counts long streaks without arrivals: a station faster than the
// previous one (Hornilla with bagazo) waits briefly between batches, which is fine.
export const STARVED_IDLE = 8; // consecutive s without input

const KINDS = ['blocked', 'starved', 'diverting', 'full'];
const empty = () => ({ time: 0, blocked: 0, starved: 0, diverting: 0, full: 0 });
// Per station and per zone (the save's object): not persisted with the save.
const tracks = new WeakMap();
// Full warehouse checks twice per second (computing its space is costlier).
const ZONE_SAMPLE = 0.5;
const zoneTime = new WeakMap();

function track(obj, dt, flags) {
  let t = tracks.get(obj);
  // sum: running total of window buckets (updated as each enters and leaves).
  if (!t) tracks.set(obj, (t = { buckets: [], cur: empty(), sum: empty(), on: {}, waiting: null }));
  const c = t.cur;
  c.time += dt;
  for (const kind of KINDS) if (flags[kind]) c[kind] += dt;
  if (c.time < BUCKET) return t;
  const add = (b, sign) => {
    t.sum.time += sign * b.time;
    for (const kind of KINDS) t.sum[kind] += sign * b[kind];
  };
  t.buckets.push(c);
  add(c, 1);
  t.cur = empty();
  while (t.buckets.length > 1 && t.sum.time - t.buckets[0].time >= ALERT_WINDOW) add(t.buckets.shift(), -1);
  // On startup (or after load) window isn't full yet: treated as clear.
  const time = Math.max(ALERT_WINDOW, t.sum.time);
  for (const kind of KINDS) {
    const frac = t.sum[kind] / time;
    if (frac >= ON) t.on[kind] = true;
    else if (frac <= OFF) t.on[kind] = false;
  }
  return t;
}

export function stepAlerts(state, dt) {
  for (const st of Object.values(state.stations)) {
    const t = track(st, dt, {
      blocked: st.status === 'blocked',
      starved: st.status === 'starved' && st.idle > STARVED_IDLE,
      diverting: st.lastDiverted !== undefined && state.playTime - st.lastDiverted < DIVERT_TIME,
    });
    // Why yard is filling up (mules or warehouse): last observed cause.
    if (st.status === 'blocked') t.waiting = st.waiting;
  }
  const since = (zoneTime.get(state) ?? 0) + dt;
  if (since < ZONE_SAMPLE) return void zoneTime.set(state, since);
  zoneTime.set(state, 0);
  for (const [id, zone] of Object.entries(state.zones)) {
    if (zone.unlocked) track(zone, since, { full: warehouseSpace(state, id) <= 0 });
  }
}

// { blocked, starved, diverting, full, waiting }: persistent warnings of a station or zone.
export function alerts(obj) {
  const t = obj && tracks.get(obj);
  return { blocked: false, starved: false, diverting: false, full: false, ...t?.on, waiting: t?.waiting ?? null };
}
