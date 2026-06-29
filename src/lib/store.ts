import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Mode, Place, RouteOption } from './types';

const RECENTS_MAX = 8;

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

  // this user's own recent destinations (persisted locally on the device)
  recents: Place[];
  addRecent: (p: Place) => void;
  clearRecents: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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

      recents: [],
      // Skip the synthetic "current location" pin; newest first, deduped, capped.
      addRecent: (p) =>
        set((s) =>
          p.id === 'current'
            ? s
            : { recents: [p, ...s.recents.filter((r) => r.id !== p.id)].slice(0, RECENTS_MAX) },
        ),
      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'ecotrack-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist what is genuinely user-owned across launches.
      partialize: (s) => ({ recents: s.recents, mode: s.mode }),
    },
  ),
);
