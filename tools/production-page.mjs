// La página de producción (v4.4.10): cuánto produce cada estación de cada zona, del nivel 1 al 100, con y sin su
// investigación ×2, lo que cuesta y lo que vale su producto. Sirve para ajustar el balance.
//   node tools/production-page.mjs [salida]   (por defecto docs/produccion.html; la plantilla es tools/production-page.html)
// Lleva la fuente de íconos del juego dentro de la página, para que se vean los íconos propios.
import fs from 'node:fs';
import { STATIONS } from '../src/data/stations.js';
import { PRODUCTS } from '../src/data/products.js';
import { RESEARCH } from '../src/data/research.js';
import { REGIONS } from '../src/data/regions.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { ROUTES_BY_ID } from '../src/data/routes.js';
import { LEVEL_SPEED_BONUS, MILESTONES, MILESTONE_MULTS } from '../src/sim/rules.js';
import pkg from '../package.json' with { type: 'json' };

// Encabezado para abrir la página como archivo suelto (al publicarla como artefacto se quita la primera línea).
const HEAD = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n';
const OUT = process.argv[2] ?? new URL('../docs/produccion.html', import.meta.url).pathname;
const name = (p) => PRODUCTS[p]?.name ?? p;
const icon = (p) => PRODUCTS[p]?.icon ?? '';

// La investigación que acelera cada estación (la ×2 de esa estación).
const speedUp = {};
for (const r of RESEARCH) if (r.effect?.type === 'stationSpeed') (speedUp[r.effect.target] ??= []).push({ name: r.name, mult: r.effect.mult, cost: r.cost });

const station = (s) => {
  const [out, outN] = Object.entries(s.out)[0];
  const inputs = [
    ...Object.entries(s.in ?? {}).map(([p, n]) => ({ n, icon: icon(p), name: name(p) })),
    ...(s.joins ?? []).map((j) => ({ n: j.perCycle, icon: icon(j.product), name: `${name(j.product)} (se junta)` })),
    ...(s.imports ?? []).map((imp) => ({ n: imp.perCycle, icon: icon(imp.product), name: `${name(imp.product)} (${ROUTES_BY_ID[imp.route]?.vehicle ?? 'ruta'})` })),
  ];
  const by = s.by ? Object.entries(s.by).map(([p, n]) => `${n} ${icon(p)} ${name(p)}`).join(', ') : null;
  return {
    id: s.id,
    name: s.name,
    icon: s.icon,
    cycle: s.cycle,
    outN,
    out: name(out),
    outIcon: icon(out),
    value: PRODUCTS[out]?.value ?? 0,
    inputs,
    by,
    source: !inputs.length,
    side: Boolean(s.side),
    unlockCost: s.unlockCost,
    upgradeBase: s.upgradeBase,
    research: (speedUp[s.id] ?? []).map((r) => r.name).join(' · ') || null,
    researchMult: (speedUp[s.id] ?? []).reduce((m, r) => m * r.mult, 1),
  };
};

const regions = REGIONS.map((r) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  hidden: Boolean(r.hidden || r.wip),
  // En Bogotá (v4.5), una tabla por barrio.
  zones: r.zones.flatMap((z) => {
    const zone = ZONES_BY_ID[z];
    const ids = [zone.farm.stationId, ...zone.plots.map((p) => p.stationId)];
    const list = STATIONS.filter((s) => s.zone === z).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (zone.groups) return zone.groups.map((g) => ({ id: g.id, name: `${zone.name} · ${g.name}`, icon: zone.icon ?? '', stations: list.filter((s) => g.stations.includes(s.id)).map(station) }));
    return [{ id: z, name: zone.name, icon: zone.icon ?? '', stations: list.map(station) }];
  }),
}));

const font = fs.readFileSync(new URL('../src/assets/mitierrita-icons.woff2', import.meta.url)).toString('base64');
const css = fs.readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const range = /MiTierrita Icons'[\s\S]*?unicode-range: ([^;]+);/.exec(css)[1];
const tpl = fs.readFileSync(new URL('./production-page.html', import.meta.url), 'utf8');
const data = { version: pkg.version, regions, milestones: MILESTONES, bonus: LEVEL_SPEED_BONUS, mults: MILESTONE_MULTS };
fs.writeFileSync(
  OUT,
  HEAD +
    tpl
    .replace('%FONT%', font)
    .replace('%RANGE%', range)
    .replace('%VERSION%', pkg.version)
    .replace('%DATA%', JSON.stringify(data).replace(/</g, '\\u003c')),
);
console.log(`${OUT}: ${regions.reduce((n, r) => n + r.zones.length, 0)} zonas, ${regions.reduce((n, r) => n + r.zones.reduce((k, z) => k + z.stations.length, 0), 0)} estaciones`);
