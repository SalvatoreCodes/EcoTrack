/**
 * Emission model + heat scales. See DESIGN.md / PRODUCT.md.
 * Route CO2 = distance_km * mode_factor * traffic_multiplier.
 */

export type Mode = 'car' | 'motorbike' | 'bus' | 'bike' | 'walk';
export type HeatLevel = 1 | 2 | 3 | 4 | 5;

/** grams CO2 per passenger-km (well-to-wheel, rough Indonesian fleet averages). */
export const EMISSION_FACTORS: Record<Mode, number> = {
  car: 170,
  motorbike: 100,
  bus: 60,
  bike: 0,
  walk: 0,
};

export const MODE_LABEL: Record<Mode, string> = {
  car: 'Car',
  motorbike: 'Motorbike',
  bus: 'Bus',
  bike: 'Bike',
  walk: 'Walk',
};

/** Heat level for a route badge, by absolute trip kg CO2 (lower = greener). */
export function emissionLevel(kg: number): HeatLevel {
  if (kg <= 1.0) return 1;
  if (kg <= 2.0) return 2;
  if (kg <= 3.0) return 3;
  if (kg <= 4.5) return 4;
  return 5;
}

/** Heat level from a US-EPA-style AQI value (used for the spatial heatmap). */
export function aqiLevel(aqi: number): HeatLevel {
  if (aqi <= 50) return 1;
  if (aqi <= 100) return 2;
  if (aqi <= 150) return 3;
  if (aqi <= 200) return 4;
  return 5;
}

export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy (sensitive)';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

/** Traffic congestion ratio (currentSpeed/freeFlowSpeed) -> emission multiplier. */
export function congestionMultiplier(currentSpeed: number, freeFlowSpeed: number): number {
  if (!freeFlowSpeed || freeFlowSpeed <= 0) return 1;
  const ratio = Math.min(1, Math.max(0.1, currentSpeed / freeFlowSpeed));
  // idling/stop-go burns more fuel per km: slow traffic -> up to ~1.6x
  return Number((1 + (1 - ratio) * 0.6).toFixed(2));
}

export function formatKg(kg: number): string {
  return `${kg.toFixed(kg < 10 ? 1 : 0)} kg CO₂`;
}
