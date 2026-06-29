/**
 * On-device provider logic: routing (ORS / OSRM keyless) + air quality (WAQI).
 * Ported from the old server/lib.mjs so the app needs no backend.
 * Free-tier keys (ORS / TomTom / WAQI) are bundled via EXPO_PUBLIC_*; no Anthropic key
 * on device — chat uses the local explainer instead.
 */
import { ORS_KEY, TOMTOM_KEY, WAQI_TOKEN } from './config';
import { EMISSION_FACTORS, congestionMultiplier, emissionLevel } from './emissions';
import { curve, haversineKm } from './geo';
import { FALLBACK_HEAT, JAKARTA_CENTER, SAMPLE_PLACES } from './jakarta';
import type { HeatPoint, Mode, Place, RouteOption, Step } from './types';

type LngLat = [number, number];
type Leg = { geometry: LngLat[]; distanceKm: number; durationMin: number; steps?: Step[] };

const SPEED_KMH: Record<Mode, number> = { car: 22, motorbike: 26, bus: 18, bike: 16, walk: 4.8 };
const ORS_PROFILE: Record<Mode, string> = {
  car: 'driving-car', motorbike: 'driving-car', bus: 'driving-car',
  bike: 'cycling-regular', walk: 'foot-walking',
};

function syntheticSteps(geometry: LngLat[]): Step[] {
  const end = geometry[geometry.length - 1];
  return [
    { instruction: 'Head toward your route', type: 11, distanceM: 300, location: geometry[0] },
    { instruction: 'Continue straight', type: 0, distanceM: 800, location: geometry[Math.floor(geometry.length / 3)] },
    { instruction: 'Keep on the main road', type: 0, distanceM: 600, location: geometry[Math.floor((2 * geometry.length) / 3)] },
    { instruction: 'Arrive at your destination', type: 10, distanceM: 0, location: end },
  ];
}

function buildOption(
  id: string, label: string, mode: Mode, geometry: LngLat[],
  distanceKm: number, durationMin: number, trafficMult: number, note?: string, steps?: Step[],
): RouteOption {
  const kg = (distanceKm * EMISSION_FACTORS[mode] * trafficMult) / 1000;
  return {
    id, label, mode, geometry,
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMin: Math.round(durationMin),
    kg: Number(kg.toFixed(1)),
    level: emissionLevel(kg),
    note,
    steps: steps ?? syntheticSteps(geometry),
  };
}

function markGreenest(opts: RouteOption[]): RouteOption[] {
  if (!opts.length) return opts;
  const min = Math.min(...opts.map((o) => o.kg));
  return opts.map((o) => ({ ...o, greenest: o.kg === min }));
}

function midpoint(geom: LngLat[]): LngLat {
  return geom[Math.floor(geom.length / 2)] || geom[0];
}

// ---- TomTom traffic: congestion multiplier near a point ----
async function trafficMult(point: LngLat, key: string): Promise<number> {
  if (!key) return 1.4; // assume moderate congestion when no key
  try {
    const [lng, lat] = point;
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return 1.4;
    const j: any = await r.json();
    const s = j.flowSegmentData;
    return s ? congestionMultiplier(s.currentSpeed, s.freeFlowSpeed) : 1.4;
  } catch {
    return 1.4;
  }
}

/**
 * Turn raw legs into honest options:
 * - "Fastest" = lowest-duration driving route (per-route TomTom congestion folded into CO2).
 * - "EcoRoute" only if a driving alternative is genuinely lower-CO2 than the fastest.
 * - "By bike" when the trip is short enough. Greenest = whatever actually has least CO2.
 */
async function assemble(drivingLegs: Leg[], bikeLeg: Leg | null, mode: Mode, tomtomKey: string): Promise<RouteOption[]> {
  const slow = mode === 'bike' || mode === 'walk';
  const cands = await Promise.all(
    (drivingLegs || []).map(async (leg) => {
      const mult = slow ? 1 : await trafficMult(midpoint(leg.geometry), tomtomKey);
      return { leg, mult, kg: (leg.distanceKm * EMISSION_FACTORS[mode] * mult) / 1000 };
    }),
  );
  cands.sort((a, b) => a.leg.durationMin - b.leg.durationMin);
  const opts: RouteOption[] = [];
  const fastest = cands[0];
  if (fastest) {
    opts.push(buildOption('fast', slow ? (mode === 'bike' ? 'By bike' : 'On foot') : 'Fastest', mode,
      fastest.leg.geometry, fastest.leg.distanceKm, fastest.leg.durationMin, fastest.mult,
      slow ? undefined : 'fastest', fastest.leg.steps));
  }
  const eligible = cands.slice(1).filter((c) => c.kg < (fastest?.kg ?? Infinity) * 0.96);
  const greener = eligible.length ? eligible.reduce((min, c) => (c.kg < min.kg ? c : min)) : undefined;
  if (greener) {
    opts.push(buildOption('eco', 'EcoRoute', mode, greener.leg.geometry, greener.leg.distanceKm,
      greener.leg.durationMin, greener.mult, 'lower-emission route', greener.leg.steps));
  }
  if (bikeLeg && !slow) {
    opts.push(buildOption('bike', 'By bike', 'bike', bikeLeg.geometry, bikeLeg.distanceKm,
      (bikeLeg.distanceKm / 16) * 60, 1, undefined, bikeLeg.steps));
  }
  return markGreenest(opts);
}

// ---- ORS routing ----
async function orsLegs(profile: string, a: LngLat, b: LngLat, key: string, alternatives: boolean): Promise<Leg[]> {
  const body: any = { coordinates: [a, b], instructions: true };
  if (alternatives) body.alternative_routes = { target_count: 2, share_factor: 0.6, weight_factor: 1.6 };
  const r = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ORS ${r.status}`);
  const j: any = await r.json();
  return (j.features ?? []).map((f: any): Leg => {
    const coords: LngLat[] = f.geometry.coordinates;
    const steps: Step[] = (f.properties.segments ?? []).flatMap((seg: any) =>
      (seg.steps ?? []).map((st: any) => ({
        instruction: st.instruction,
        type: st.type,
        distanceM: Math.round(st.distance),
        location: coords[st.way_points?.[0] ?? 0],
      })),
    );
    return { geometry: coords, distanceKm: f.properties.summary.distance / 1000, durationMin: f.properties.summary.duration / 60, steps };
  });
}

function syntheticRoutes(origin: LngLat, dest: LngLat, mode: Mode): RouteOption[] {
  const base = Math.max(0.5, haversineKm(origin, dest));
  const slow = mode === 'bike' || mode === 'walk';
  const opts = [
    buildOption('fast', 'Fastest', mode, curve(origin, dest, -0.008), base * 1.0, (base / SPEED_KMH[mode]) * 60, slow ? 1 : 1.45, 'heavy traffic'),
    buildOption('eco', 'EcoRoute', mode, curve(origin, dest, 0.016), base * 1.12, ((base * 1.12) / SPEED_KMH[mode]) * 60, slow ? 1 : 1.05, 'avoids poor-air zone'),
  ];
  if (mode !== 'bike' && base <= 12) {
    opts.push(buildOption('bike', 'By bike', 'bike', curve(origin, dest, -0.02), base * 1.03, ((base * 1.03) / SPEED_KMH.bike) * 60, 1));
  }
  return markGreenest(opts);
}

// ---- OSRM public router: real road geometry + steps, no API key ----
function osrmType(m: any): number {
  if (m.type === 'arrive') return 10;
  if (m.type === 'depart') return 11;
  const mod = m.modifier || '';
  if (mod.includes('left')) return 0;
  if (mod.includes('right')) return 1;
  return 6;
}

function osrmInstruction(s: any): string {
  const m = s.maneuver;
  const name = s.name && s.name.trim() ? s.name : '';
  const onto = name ? ` onto ${name}` : '';
  switch (m.type) {
    case 'depart': return `Head ${m.modifier || 'out'}${name ? ` on ${name}` : ''}`;
    case 'arrive': return 'Arrive at your destination';
    case 'turn': return `Turn ${m.modifier || 'ahead'}${onto}`;
    case 'continue': case 'new name': return `Continue${name ? ` on ${name}` : ''}`;
    case 'merge': return `Merge${onto}`;
    case 'fork': return `Keep ${m.modifier || 'straight'}${onto}`;
    case 'roundabout': case 'rotary': return `Take the roundabout${name ? ` to ${name}` : ''}`;
    case 'end of road': return `Turn ${m.modifier || 'ahead'}${onto}`;
    default: return `Keep ${m.modifier || 'straight'}${onto}`;
  }
}

async function osrmLegs(a: LngLat, b: LngLat, alternatives: boolean): Promise<Leg[]> {
  const coords = `${a[0]},${a[1]};${b[0]},${b[1]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives ? 'true' : 'false'}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OSRM ${r.status}`);
  const j: any = await r.json();
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error(`OSRM ${j.code}`);
  return j.routes.map((rt: any): Leg => ({
    geometry: rt.geometry.coordinates,
    distanceKm: rt.distance / 1000,
    durationMin: rt.duration / 60,
    steps: (rt.legs ?? []).flatMap((l: any) =>
      (l.steps ?? []).map((s: any) => ({
        instruction: osrmInstruction(s),
        type: osrmType(s.maneuver),
        distanceM: Math.round(s.distance),
        location: s.maneuver.location,
      })),
    ),
  }));
}

async function osrmRoutes(origin: LngLat, dest: LngLat, mode: Mode): Promise<RouteOption[]> {
  try {
    const slow = mode === 'bike' || mode === 'walk';
    const legs = await osrmLegs(origin, dest, !slow);
    const bikeLeg = !slow && legs[0] && haversineKm(origin, dest) <= 12 ? legs[0] : null;
    const opts = await assemble(legs, bikeLeg, mode, TOMTOM_KEY); // OSRM has no TomTom; key still used if present
    return opts.length ? opts : syntheticRoutes(origin, dest, mode);
  } catch {
    return syntheticRoutes(origin, dest, mode);
  }
}

/** Emission-ranked routes A->B. Uses ORS when a key is bundled, else keyless OSRM, else synthetic. */
export async function computeRoutes(origin: LngLat, dest: LngLat, mode: Mode): Promise<RouteOption[]> {
  if (!ORS_KEY) return osrmRoutes(origin, dest, mode);
  try {
    const slow = mode === 'bike' || mode === 'walk';
    const legs = await orsLegs(ORS_PROFILE[mode], origin, dest, ORS_KEY, !slow);
    let bikeLeg: Leg | null = null;
    if (!slow && haversineKm(origin, dest) <= 12) {
      try { bikeLeg = (await orsLegs('cycling-regular', origin, dest, ORS_KEY, false))[0] || null; } catch {}
    }
    const opts = await assemble(legs, bikeLeg, mode, TOMTOM_KEY);
    return opts.length ? opts : syntheticRoutes(origin, dest, mode);
  } catch {
    return syntheticRoutes(origin, dest, mode);
  }
}

/**
 * Jakarta has very few WAQI stations, so blend live station(s) over the modeled seed grid:
 * live wins within 3 km, seed fills the rest. Returns { points, source } for honest labeling.
 */
export async function fetchAir(): Promise<{ points: HeatPoint[]; source: 'live' | 'sample' }> {
  if (!WAQI_TOKEN) return { points: FALLBACK_HEAT, source: 'sample' };
  try {
    const r = await fetch(`https://api.waqi.info/map/bounds/?latlng=-6.9,106.3,-5.8,107.2&token=${WAQI_TOKEN}`);
    const j: any = await r.json();
    if (j.status !== 'ok' || !Array.isArray(j.data)) return { points: FALLBACK_HEAT, source: 'sample' };
    const live: HeatPoint[] = (j.data as any[]).reduce((acc: HeatPoint[], s: any) => {
      const p: HeatPoint = { coord: [Number(s.lon), Number(s.lat)] as LngLat, aqi: Number(s.aqi) };
      if (Number.isFinite(p.aqi) && Number.isFinite(p.coord[0])) acc.push(p);
      return acc;
    }, [] as HeatPoint[]);
    if (!live.length) return { points: FALLBACK_HEAT, source: 'sample' };
    const keptSeed = FALLBACK_HEAT.filter((sp) => !live.some((lp) => haversineKm(sp.coord, lp.coord) < 3));
    return { points: [...keptSeed, ...live], source: 'live' };
  } catch {
    return { points: FALLBACK_HEAT, source: 'sample' };
  }
}

// ---- Geocoding (ORS / Pelias). Falls back to filtering the seed places. ----
function localSearch(q: string): Place[] {
  const s = q.toLowerCase();
  return SAMPLE_PLACES.filter((p) => p.name.toLowerCase().includes(s) || (p.detail ?? '').toLowerCase().includes(s));
}

/** Forward geocode a free-text query, biased to Greater Jakarta / Indonesia. */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];
  if (!ORS_KEY) return localSearch(q);
  try {
    const url =
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}` +
      `&text=${encodeURIComponent(q)}&boundary.country=ID` +
      `&focus.point.lon=${JAKARTA_CENTER[0]}&focus.point.lat=${JAKARTA_CENTER[1]}&size=8`;
    const r = await fetch(url);
    if (!r.ok) return localSearch(q);
    const j: any = await r.json();
    const places: Place[] = ((j.features ?? []) as any[]).reduce((acc: Place[], f: any) => {
      if (!Array.isArray(f?.geometry?.coordinates)) return acc;
      acc.push({
        id: f.properties?.id ?? `geo-${acc.length}`,
        name: f.properties?.name ?? f.properties?.label ?? 'Unknown place',
        detail: f.properties?.label,
        coord: [Number(f.geometry.coordinates[0]), Number(f.geometry.coordinates[1])],
      });
      return acc;
    }, [] as Place[]);
    return places.length ? places : localSearch(q);
  } catch {
    return localSearch(q);
  }
}

/** Reverse geocode a coordinate to a readable name (for map-picked points). */
export async function reverseGeocode(coord: LngLat): Promise<string> {
  if (!ORS_KEY) return 'Dropped pin';
  try {
    const url =
      `https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_KEY}` +
      `&point.lon=${coord[0]}&point.lat=${coord[1]}&size=1`;
    const r = await fetch(url);
    if (!r.ok) return 'Dropped pin';
    const j: any = await r.json();
    return j.features?.[0]?.properties?.name || j.features?.[0]?.properties?.label || 'Dropped pin';
  } catch {
    return 'Dropped pin';
  }
}
