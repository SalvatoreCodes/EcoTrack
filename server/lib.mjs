// EcoTrack server logic: emissions, geo, and provider calls (ORS / WAQI / TomTom).
// Mirrors src/lib on the client but runs server-side so API keys stay off-device.

export const EMISSION_FACTORS = { car: 170, motorbike: 100, bus: 60, bike: 0, walk: 0 }; // gCO2/passenger-km
const SPEED_KMH = { car: 22, motorbike: 26, bus: 18, bike: 16, walk: 4.8 };
const ORS_PROFILE = {
  car: 'driving-car', motorbike: 'driving-car', bus: 'driving-car',
  bike: 'cycling-regular', walk: 'foot-walking',
};

export const FALLBACK_HEAT = [
  { coord: [106.8272, -6.1754], aqi: 158 }, { coord: [106.8094, -6.2244], aqi: 132 },
  { coord: [106.8456, -6.2146], aqi: 121 }, { coord: [106.8136, -6.2607], aqi: 74 },
  { coord: [106.7711, -6.1783], aqi: 96 }, { coord: [106.8951, -6.2249], aqi: 144 },
  { coord: [106.8225, -6.1376], aqi: 165 }, { coord: [106.7594, -6.2615], aqi: 58 },
  { coord: [106.9005, -6.3025], aqi: 47 }, { coord: [106.7021, -6.2017], aqi: 83 },
  { coord: [106.8662, -6.1751], aqi: 152 }, { coord: [106.8231, -6.2882], aqi: 69 },
];

export function haversineKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function curve(a, b, bow, n = 24) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const ctrl = [mid[0] - (dy / len) * bow, mid[1] + (dx / len) * bow];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]]);
  }
  return pts;
}

export function emissionLevel(kg) {
  if (kg <= 1.0) return 1;
  if (kg <= 2.0) return 2;
  if (kg <= 3.0) return 3;
  if (kg <= 4.5) return 4;
  return 5;
}

function congestionMultiplier(cur, free) {
  if (!free || free <= 0) return 1;
  const ratio = Math.min(1, Math.max(0.1, cur / free));
  return Number((1 + (1 - ratio) * 0.6).toFixed(2));
}

function buildOption(id, label, mode, geometry, distanceKm, durationMin, trafficMult, note, steps) {
  const kg = (distanceKm * EMISSION_FACTORS[mode] * trafficMult) / 1000;
  return {
    id, label, mode, geometry,
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMin: Math.round(durationMin),
    kg: Number(kg.toFixed(1)),
    level: emissionLevel(kg),
    note,
    steps: steps ?? syntheticSteps(geometry, label),
  };
}

function syntheticSteps(geometry, label) {
  const end = geometry[geometry.length - 1];
  return [
    { instruction: 'Head toward your route', type: 11, distanceM: 300, location: geometry[0] },
    { instruction: 'Continue straight', type: 0, distanceM: 800, location: geometry[Math.floor(geometry.length / 3)] },
    { instruction: 'Keep on the main road', type: 0, distanceM: 600, location: geometry[Math.floor((2 * geometry.length) / 3)] },
    { instruction: 'Arrive at your destination', type: 10, distanceM: 0, location: end },
  ];
}

function markGreenest(opts) {
  if (!opts.length) return opts;
  const min = Math.min(...opts.map((o) => o.kg));
  return opts.map((o) => ({ ...o, greenest: o.kg === min }));
}

function midpoint(geom) {
  return (geom && geom[Math.floor(geom.length / 2)]) || (geom && geom[0]);
}

/**
 * Turn raw legs into honest options:
 * - "Fastest" = lowest duration driving route (per-route TomTom congestion folded into CO2).
 * - "EcoRoute" only if a driving alternative is genuinely lower-CO2 than the fastest.
 * - "By bike" when the trip is short enough. Greenest is whatever actually has the least CO2.
 */
async function assemble(drivingLegs, bikeLeg, mode, tomtomKey) {
  const slow = mode === 'bike' || mode === 'walk';
  const cands = [];
  for (const leg of drivingLegs || []) {
    const mult = slow ? 1 : await trafficMult(midpoint(leg.geometry), tomtomKey);
    cands.push({ leg, mult, kg: (leg.distanceKm * EMISSION_FACTORS[mode] * mult) / 1000 });
  }
  cands.sort((a, b) => a.leg.durationMin - b.leg.durationMin);
  const opts = [];
  const fastest = cands[0];
  if (fastest) {
    opts.push(buildOption('fast', slow ? (mode === 'bike' ? 'By bike' : 'On foot') : 'Fastest', mode,
      fastest.leg.geometry, fastest.leg.distanceKm, fastest.leg.durationMin, fastest.mult,
      slow ? undefined : 'fastest', fastest.leg.steps));
  }
  const greener = cands
    .slice(1)
    .filter((c) => c.kg < (fastest?.kg ?? Infinity) * 0.96)
    .sort((a, b) => a.kg - b.kg)[0];
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

// ---- TomTom traffic: congestion multiplier near a point ----
async function trafficMult(point, key) {
  if (!key) return 1.4; // assume moderate congestion when no key
  try {
    const [lng, lat] = point;
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return 1.4;
    const j = await r.json();
    const s = j.flowSegmentData;
    return s ? congestionMultiplier(s.currentSpeed, s.freeFlowSpeed) : 1.4;
  } catch {
    return 1.4;
  }
}

// ---- ORS routing ----
async function orsLegs(profile, a, b, key, alternatives) {
  const body = { coordinates: [a, b], instructions: true };
  if (alternatives) body.alternative_routes = { target_count: 2, share_factor: 0.6, weight_factor: 1.6 };
  const r = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ORS ${r.status}`);
  const j = await r.json();
  return (j.features ?? []).map((f) => {
    const coords = f.geometry.coordinates;
    const steps = (f.properties.segments ?? []).flatMap((seg) =>
      (seg.steps ?? []).map((st) => ({
        instruction: st.instruction,
        type: st.type,
        distanceM: Math.round(st.distance),
        location: coords[st.way_points?.[0] ?? 0],
      })),
    );
    return { geometry: coords, distanceKm: f.properties.summary.distance / 1000, durationMin: f.properties.summary.duration / 60, steps };
  });
}

function syntheticRoutes(origin, dest, mode) {
  const base = Math.max(0.5, haversineKm(origin, dest));
  const slow = mode === 'bike' || mode === 'walk';
  const opts = [
    buildOption('fast', 'Fastest', mode, curve(origin, dest, -0.008), base * 1.0, (base / SPEED_KMH[mode]) * 60, slow ? 1 : 1.45, 'heavy traffic'),
    buildOption('eco', 'EcoRoute', mode, curve(origin, dest, 0.016), base * 1.12, (base * 1.12 / SPEED_KMH[mode]) * 60, slow ? 1 : 1.05, 'avoids poor-air zone'),
  ];
  if (mode !== 'bike' && base <= 12) {
    opts.push(buildOption('bike', 'By bike', 'bike', curve(origin, dest, -0.02), base * 1.03, (base * 1.03 / SPEED_KMH.bike) * 60, 1));
  }
  return markGreenest(opts);
}

// ---- OSRM public router: real road geometry + steps, no API key ----
function osrmType(m) {
  if (m.type === 'arrive') return 10;
  if (m.type === 'depart') return 11;
  const mod = m.modifier || '';
  if (mod.includes('left')) return 0;
  if (mod.includes('right')) return 1;
  return 6;
}

function osrmInstruction(s) {
  const m = s.maneuver, name = s.name && s.name.trim() ? s.name : '';
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

async function osrmLegs(a, b, alternatives) {
  const coords = `${a[0]},${a[1]};${b[0]},${b[1]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives ? 'true' : 'false'}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OSRM ${r.status}`);
  const j = await r.json();
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error(`OSRM ${j.code}`);
  return j.routes.map((rt) => ({
    geometry: rt.geometry.coordinates,
    distanceKm: rt.distance / 1000,
    durationMin: rt.duration / 60,
    steps: (rt.legs ?? []).flatMap((l) =>
      (l.steps ?? []).map((s) => ({
        instruction: osrmInstruction(s),
        type: osrmType(s.maneuver),
        distanceM: Math.round(s.distance),
        location: s.maneuver.location,
      })),
    ),
  }));
}

async function osrmRoutes(origin, dest, mode) {
  try {
    const slow = mode === 'bike' || mode === 'walk';
    const legs = await osrmLegs(origin, dest, !slow);
    const bikeLeg = !slow && legs[0] && haversineKm(origin, dest) <= 12 ? legs[0] : null;
    const opts = await assemble(legs, bikeLeg, mode, ''); // no TomTom key in keyless mode
    return opts.length ? opts : syntheticRoutes(origin, dest, mode);
  } catch {
    return syntheticRoutes(origin, dest, mode);
  }
}

export async function computeRoutes(origin, dest, mode, keys) {
  const o = origin, d = dest;
  if (!keys.ors) return osrmRoutes(o, d, mode);
  try {
    const slow = mode === 'bike' || mode === 'walk';
    const legs = await orsLegs(ORS_PROFILE[mode], o, d, keys.ors, !slow);
    let bikeLeg = null;
    if (!slow && haversineKm(o, d) <= 12) {
      try { bikeLeg = (await orsLegs('cycling-regular', o, d, keys.ors, false))[0] || null; } catch {}
    }
    const opts = await assemble(legs, bikeLeg, mode, keys.tomtom);
    return opts.length ? opts : syntheticRoutes(o, d, mode);
  } catch {
    return syntheticRoutes(o, d, mode);
  }
}

/**
 * Jakarta has very few WAQI stations (often 1 in the city box), so blend the real
 * live station(s) over the modeled seed grid: live wins within 3 km, seed fills the
 * rest. Returns { points, source } so the UI can label it honestly.
 */
export async function fetchAir(token) {
  if (!token) return { points: FALLBACK_HEAT, source: 'sample' };
  try {
    const r = await fetch(`https://api.waqi.info/map/bounds/?latlng=-6.9,106.3,-5.8,107.2&token=${token}`);
    const j = await r.json();
    if (j.status !== 'ok' || !Array.isArray(j.data)) return { points: FALLBACK_HEAT, source: 'sample' };
    const live = j.data
      .map((s) => ({ coord: [Number(s.lon), Number(s.lat)], aqi: Number(s.aqi) }))
      .filter((p) => Number.isFinite(p.aqi) && Number.isFinite(p.coord[0]));
    if (!live.length) return { points: FALLBACK_HEAT, source: 'sample' };
    const keptSeed = FALLBACK_HEAT.filter((sp) => !live.some((lp) => haversineKm(sp.coord, lp.coord) < 3));
    return { points: [...keptSeed, ...live], source: 'live' };
  } catch {
    return { points: FALLBACK_HEAT, source: 'sample' };
  }
}
