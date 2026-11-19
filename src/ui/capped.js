// Counters shown with their cap (v5.9): once a counter reaches its maximum it reads as the number just
// below it followed by «++» (999Dc++, 99++, 9.999++).
import { CAPS, capped } from '../data/caps.js';
import { formatCount, formatDuration, formatNumber } from '../core/format.js';

export const cappedNumber = (value, max) => capped(value, max, formatNumber);
// Small counts (Renown, Prestige): exact, with thousands separators.
export const cappedCount = (value, max) => capped(value, max, formatCount);
export const cappedCoins = (value) => cappedNumber(value, CAPS.coins);
// (v5.12) A product in the current run (kind: sold or produced), and the whole game's products.
export const cappedRun = (kind, value) => cappedNumber(value, CAPS.run[kind]);
export const cappedTotal = (kind, value) => cappedNumber(value, CAPS.total[kind]);
export const cappedRenown = (value) => cappedCount(value, CAPS.renown);
export const cappedPrestige = (value) => cappedCount(value, CAPS.prestige);
// Time played: the usual duration, or «∞» from the cap on.
export const cappedPlayTime = (seconds) => (seconds / 3600 >= CAPS.playHours ? '∞' : formatDuration(seconds));
// (v5.10) Time of the current run of a region (Statistics and the ending screens): «∞» from 100 h.
export const cappedRunTime = (seconds) => (seconds / 3600 >= CAPS.runHours ? '∞' : formatDuration(seconds));
