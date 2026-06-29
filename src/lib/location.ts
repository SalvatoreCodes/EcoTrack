import * as Location from 'expo-location';

import type { Place } from './types';

export type Coord = [number, number]; // [lng, lat]

async function requestAndGet(): Promise<{ coord: Coord; heading: number | null } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { coord: [pos.coords.longitude, pos.coords.latitude], heading: pos.coords.heading ?? null };
  } catch {
    return null;
  }
}

export async function currentPlace(): Promise<Place | null> {
  const r = await requestAndGet();
  if (!r) return null;
  return { id: 'current', name: 'Current location', detail: 'Your GPS position', coord: r.coord };
}

/** Live position stream for navigation. Returns a subscription with .remove(). */
export async function watch(
  cb: (coord: Coord, heading: number | null, speed: number | null) => void,
): Promise<Location.LocationSubscription | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    return await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 4, timeInterval: 1500 },
      (p) => cb([p.coords.longitude, p.coords.latitude], p.coords.heading ?? null, p.coords.speed ?? null),
    );
  } catch {
    return null;
  }
}
