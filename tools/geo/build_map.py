# Mapa de Colombia para el selector de zonas (v3.60): los departamentos (MGN 2018 del DANE, ya simplificados),
# cada uno con la región del juego a la que pertenece, proyectados a un plano (x: longitud, y: latitud, en
# unidades de 1/40 de grado) y escritos en src/data/colombiaMap.js.
# Uso: python3 tools/geo/build_map.py [ruta al geojson]; sin ruta, lo descarga de SOURCE.
import json, os, sys, urllib.request

SOURCE = 'https://raw.githubusercontent.com/caticoa3/colombia_mapa/master/co_2018_MGN_DPTO_POLITICO.geojson'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'colombiaMap.js')
K = 40  # unidades por grado
LON0, LAT0 = -79.1, 12.6  # esquina de arriba a la izquierda (San Andrés queda fuera)

# Código DANE del departamento → región del juego (los que no están, se ven en gris).
REGION = {
    '17': 'cafetero', '63': 'cafetero', '66': 'cafetero', '05': 'cafetero',
    '68': 'santander', '54': 'santander',
    '08': 'costa', '13': 'costa', '20': 'costa', '23': 'costa', '44': 'costa', '47': 'costa', '70': 'costa',
    '15': 'boyaca',
    '50': 'llanos', '81': 'llanos', '85': 'llanos', '99': 'llanos',
    '27': 'pacifico', '76': 'pacifico', '19': 'pacifico', '52': 'pacifico',
    '91': 'amazonas', '18': 'amazonas', '86': 'amazonas', '95': 'amazonas', '94': 'amazonas', '97': 'amazonas',
}
SKIP = {'88'}  # San Andrés: muy lejos de la costa para este mapa


def proj(lon, lat):
    return round((lon - LON0) * K, 1), round((LAT0 - lat) * K, 1)


def ring_path(ring):
    pts = [proj(*p[:2]) for p in ring]
    return 'M' + 'L'.join(f'{x:g},{y:g}' for x, y in pts) + 'Z'


def main():
    if len(sys.argv) > 1:
        data = json.load(open(sys.argv[1], encoding='utf-8'))
    else:
        with urllib.request.urlopen(SOURCE) as r:
            data = json.load(r)
    depts = []
    for f in data['features']:
        code = f['properties']['DPTO_CCDGO']
        if code in SKIP:
            continue
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        d = ''.join(ring_path(ring) for poly in polys for ring in poly)
        name = f['properties']['DPTO_CNMBR'].title().replace(' De ', ' de ').replace(' Del ', ' del ').replace(', D.C.', '')
        depts.append({'id': code, 'name': name, 'region': REGION.get(code), 'd': d})
    depts.sort(key=lambda x: x['id'])
    lines = [
        '// Mapa de Colombia (v3.60): los departamentos con la región del juego a la que pertenecen (null: ninguna),',
        '// en unidades de 1/40 de grado (x crece al oriente, y al sur). Generado por tools/geo/build_map.py con',
        '// el Marco Geoestadístico Nacional 2018 del DANE; no se edita a mano.',
        f'export const MAP_SCALE = {K};',
        f'export const MAP_ORIGIN = [{LON0}, {LAT0}]; // [longitud, latitud] de la esquina de arriba a la izquierda',
        'export const DEPARTMENTS = [',
    ]
    for d in depts:
        region = f"'{d['region']}'" if d['region'] else 'null'
        lines.append(f"  {{ id: '{d['id']}', name: '{d['name']}', region: {region}, d: '{d['d']}' }},")
    lines.append('];')
    open(OUT, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(OUT, len(depts), 'departamentos', os.path.getsize(OUT), 'bytes')


main()
