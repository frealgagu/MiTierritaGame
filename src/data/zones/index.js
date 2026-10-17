// Zonas jugables, en orden. Las de docs/GDD.md §4b que aún no existen se añaden aquí al llegar.
import { ZONE1 } from './zone1_finca.js';
import { ZONE2 } from './zone2_trapiche.js';

export const ZONE_LIST = [ZONE1, ZONE2];
export const ZONES_BY_ID = Object.fromEntries(ZONE_LIST.map((z) => [z.id, z]));
