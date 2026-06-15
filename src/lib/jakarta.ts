import type { Place, HeatPoint } from './types';

/** Default map view: Greater Jakarta (Jabodetabek). */
export const JAKARTA_CENTER: [number, number] = [106.8272, -6.2255]; // [lng, lat]
export const JAKARTA_ZOOM = 11.2;

/** Seed places for recents / quick demo. */
export const SAMPLE_PLACES: Place[] = [
  { id: 'home', name: 'Home · Kemang', detail: 'Jl. Kemang Raya No.12', coord: [106.8136, -6.2607] },
  { id: 'scbd', name: 'Office · SCBD', detail: 'Sudirman Central Business District', coord: [106.8094, -6.2244] },
  { id: 'gi', name: 'Grand Indonesia', detail: 'Jl. M.H. Thamrin No.1', coord: [106.8216, -6.1951] },
  { id: 'manggarai', name: 'Stasiun Manggarai', detail: 'KRL interchange', coord: [106.8506, -6.2102] },
  { id: 'monas', name: 'Monas', detail: 'Gambir, Jakarta Pusat', coord: [106.8272, -6.1754] },
  { id: 'kota', name: 'Kota Tua', detail: 'Jakarta Barat', coord: [106.8133, -6.1376] },
];

/**
 * Offline fallback air-quality grid for Jabodetabek, used when no WAQI key is set
 * so the heatmap is never empty in a demo. Replaced by live WAQI data when available.
 */
export const FALLBACK_HEAT: HeatPoint[] = [
  { coord: [106.8272, -6.1754], aqi: 158 }, // Monas / central
  { coord: [106.8094, -6.2244], aqi: 132 }, // SCBD
  { coord: [106.8456, -6.2146], aqi: 121 }, // Tebet
  { coord: [106.8136, -6.2607], aqi: 74 }, // Kemang
  { coord: [106.7711, -6.1783], aqi: 96 }, // Grogol
  { coord: [106.8951, -6.2249], aqi: 144 }, // Jatinegara
  { coord: [106.8225, -6.1376], aqi: 165 }, // Kota Tua
  { coord: [106.7594, -6.2615], aqi: 58 }, // Pondok Indah
  { coord: [106.9005, -6.3025], aqi: 47 }, // Depok edge
  { coord: [106.7021, -6.2017], aqi: 83 }, // Kebon Jeruk
  { coord: [106.8662, -6.1751], aqi: 152 }, // Pulo Gadung
  { coord: [106.8231, -6.2882], aqi: 69 }, // Cilandak
];
