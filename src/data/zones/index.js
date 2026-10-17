// Zonas jugables, en orden. Las de docs/GDD.md §4b que aún no existen se añaden aquí al llegar.
import { ZONE1 } from './zone1_finca.js';
import { ZONE2 } from './zone2_trapiche.js';
import { ZONE3 } from './zone3_lecheria.js';
import { ZONE4 } from './zone4_cacaotal.js';

export const ZONE_LIST = [ZONE1, ZONE2, ZONE3, ZONE4];
export const ZONES_BY_ID = Object.fromEntries(ZONE_LIST.map((z) => [z.id, z]));
