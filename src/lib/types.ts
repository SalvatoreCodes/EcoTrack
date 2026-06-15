import type { Mode, HeatLevel } from './emissions';

export interface Place {
  id: string;
  name: string;
  detail?: string;
  /** [lng, lat] — GeoJSON order, matches MapLibre/ORS. */
  coord: [number, number];
}

export interface HeatPoint {
  coord: [number, number];
  aqi: number;
}

export interface Step {
  instruction: string;
  type: number; // ORS maneuver type
  distanceM: number;
  location: [number, number];
}

export interface RouteOption {
  id: string;
  label: string; // "EcoRoute", "Fastest", "By bike"
  mode: Mode;
  /** GeoJSON LineString coordinates [lng,lat][]. */
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
  kg: number; // CO2
  level: HeatLevel;
  greenest?: boolean;
  note?: string; // "heavy traffic"
  steps?: Step[];
}

export type { Mode, HeatLevel };
