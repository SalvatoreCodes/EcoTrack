import type { HeatLevel } from './emissions';

/**
 * Modeled traffic-emission corridors for Greater Jakarta. Each road is an
 * approximate centerline of a known arterial, with a `level` (1 = light/clean,
 * 5 = chronically congested = highest CO2 per km). Used to paint the
 * "Road emissions" overlay so heat sits on the road network instead of on
 * scattered points. Levels are modeled from typical congestion, not live —
 * the route screen blends live TomTom traffic for the specific trip.
 */
export interface EmissionRoad {
  name: string;
  level: HeatLevel;
  /** [lng, lat][] centerline. */
  coords: [number, number][];
}

export const EMISSION_ROADS: EmissionRoad[] = [
  {
    name: 'Sudirman–Thamrin',
    level: 5,
    coords: [
      [106.8228, -6.1830],
      [106.8230, -6.1950],
      [106.8210, -6.2080],
      [106.8160, -6.2180],
      [106.8085, -6.2245],
      [106.8030, -6.2270],
    ],
  },
  {
    name: 'Gatot Subroto',
    level: 5,
    coords: [
      [106.8030, -6.2270],
      [106.8200, -6.2350],
      [106.8380, -6.2410],
      [106.8560, -6.2455],
      [106.8700, -6.2480],
    ],
  },
  {
    name: 'Inner Ring Road (Cawang–Grogol)',
    level: 5,
    coords: [
      [106.8700, -6.2480],
      [106.8500, -6.2330],
      [106.8260, -6.2260],
      [106.8030, -6.2120],
      [106.7920, -6.1950],
      [106.7895, -6.1830],
    ],
  },
  {
    name: 'HR Rasuna Said (Kuningan)',
    level: 4,
    coords: [
      [106.8300, -6.2185],
      [106.8320, -6.2270],
      [106.8330, -6.2360],
    ],
  },
  {
    name: 'Casablanca',
    level: 4,
    coords: [
      [106.8330, -6.2235],
      [106.8470, -6.2238],
      [106.8620, -6.2245],
      [106.8740, -6.2250],
    ],
  },
  {
    name: 'S. Parman (Slipi–Grogol)',
    level: 4,
    coords: [
      [106.7990, -6.2080],
      [106.7920, -6.1930],
      [106.7895, -6.1800],
      [106.7885, -6.1700],
    ],
  },
  {
    name: 'MT Haryono–Cawang',
    level: 4,
    coords: [
      [106.8560, -6.2455],
      [106.8620, -6.2520],
      [106.8665, -6.2575],
    ],
  },
  {
    name: 'Gajah Mada–Hayam Wuruk',
    level: 3,
    coords: [
      [106.8135, -6.1380],
      [106.8155, -6.1530],
      [106.8170, -6.1650],
      [106.8180, -6.1720],
    ],
  },
  {
    name: 'Ahmad Yani (Bypass)',
    level: 4,
    coords: [
      [106.8660, -6.1760],
      [106.8720, -6.1880],
      [106.8760, -6.2000],
      [106.8770, -6.2120],
    ],
  },
  {
    name: 'TB Simatupang (South Ring)',
    level: 4,
    coords: [
      [106.7600, -6.2920],
      [106.7950, -6.2955],
      [106.8300, -6.2950],
      [106.8650, -6.2920],
      [106.8850, -6.2880],
    ],
  },
  {
    name: 'Daan Mogot',
    level: 3,
    coords: [
      [106.7885, -6.1700],
      [106.7600, -6.1660],
      [106.7300, -6.1620],
    ],
  },
  {
    name: 'Mampang–Warung Buncit',
    level: 3,
    coords: [
      [106.8310, -6.2360],
      [106.8290, -6.2520],
      [106.8270, -6.2680],
    ],
  },
  {
    name: 'Matraman–Pramuka',
    level: 3,
    coords: [
      [106.8520, -6.2010],
      [106.8580, -6.1900],
      [106.8620, -6.1790],
    ],
  },
  {
    name: 'Pondok Indah–Lebak Bulus',
    level: 2,
    coords: [
      [106.7840, -6.2650],
      [106.7820, -6.2820],
      [106.7800, -6.2960],
    ],
  },
];
