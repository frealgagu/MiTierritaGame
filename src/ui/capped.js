// Counters shown with their cap (v5.9): once a counter reaches its maximum it reads «max++».
import { CAPS, capped } from '../data/caps.js';
import { formatDuration, formatNumber } from '../core/format.js';

export const cappedNumber = (value, max) => capped(value, max, formatNumber);
export const cappedCoins = (value) => cappedNumber(value, CAPS.coins);
export const cappedStat = (value) => cappedNumber(value, CAPS.stat);
export const cappedRenown = (value) => cappedNumber(value, CAPS.renown);
export const cappedPrestige = (value) => cappedNumber(value, CAPS.prestige);
// Time played: the usual duration, or «9,999 h++» from the cap on.
export const cappedPlayTime = (seconds) => (seconds / 3600 >= CAPS.playHours ? `${formatNumber(CAPS.playHours)} h++` : formatDuration(seconds));
