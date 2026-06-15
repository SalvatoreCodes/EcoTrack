import { create } from 'zustand';

import type { Mode, Place, RouteOption } from './types';

interface AppState {
  // device location (GPS)
  userLocation: [number, number] | null;
  setUserLocation: (c: [number, number] | null) => void;

  // trip planning
  origin: Place | null;
  dest: Place | null;
  mode: Mode;
  routes: RouteOption[];
  selectedRouteId: string | null;
  setOrigin: (p: Place | null) => void;
  setDest: (p: Place | null) => void;
  setMode: (m: Mode) => void;
  setRoutes: (r: RouteOption[]) => void;
  selectRoute: (id: string) => void;
  resetTrip: () => void;
}

export const useStore = create<AppState>((set) => ({
  userLocation: null,
  setUserLocation: (c) => set({ userLocation: c }),

  origin: null,
  dest: null,
  mode: 'car',
  routes: [],
  selectedRouteId: null,

  setOrigin: (p) => set({ origin: p }),
  setDest: (p) => set({ dest: p }),
  setMode: (m) => set({ mode: m }),
  setRoutes: (r) =>
    set({ routes: r, selectedRouteId: r.find((x) => x.greenest)?.id ?? r[0]?.id ?? null }),
  selectRoute: (id) => set({ selectedRouteId: id }),
  resetTrip: () => set({ routes: [], selectedRouteId: null, dest: null }),
}));
