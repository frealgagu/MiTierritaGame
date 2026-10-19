// Zonas jugables, en orden. Las de docs/GDD.md §4b que aún no existen se añaden aquí al llegar.
import { ZONE1 } from './zone1_finca.js';
import { ZONE2 } from './zone2_trapiche.js';
import { ZONE3 } from './zone3_lecheria.js';
import { ZONE4 } from './zone4_cacaotal.js';
import { ZONE5 } from './zone5_maizal.js';
import { ZONE6 } from './zone6_pueblo.js';
import { ZONE7 } from './zone7_guayabera.js';
import { ZONE8 } from './zone8_tabacal.js';
import { ZONE9 } from './zone9_fiquera.js';

// Todas las regiones (cada zona dice la suya; sin `region`, es del Eje Cafetero).
export const ZONE_LIST = [ZONE1, ZONE2, ZONE3, ZONE4, ZONE5, ZONE6, ZONE7, ZONE8, ZONE9];
export const ZONES_BY_ID = Object.fromEntries(ZONE_LIST.map((z) => [z.id, z]));
