import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EcoMap } from '@/components/EcoMap';
import { formatKg } from '@/lib/emissions';
import { haversineKm } from '@/lib/geo';
import { watch } from '@/lib/location';
import { useStore } from '@/lib/store';
import type { Step } from '@/lib/types';
import { Color, Elevation, Font, Radius, Space } from '@/theme';

function bearingDeg(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]));
  const x = Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) - Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function maneuverIcon(type: number): keyof typeof Feather.glyphMap {
  if (type === 10) return 'flag'; // arrive
  if (type === 11) return 'navigation-2'; // depart
  if ([0, 2, 4, 12].includes(type)) return 'corner-up-left';
  if ([1, 3, 5, 13].includes(type)) return 'corner-up-right';
  return 'arrow-up';
}

export default function Navigate() {
  const insets = useSafeAreaInsets();
  const { routes, selectedRouteId, origin, dest } = useStore();
  const route = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
  const geometry = route?.geometry ?? [];
  const steps: Step[] = route?.steps ?? [];

  const [idx, setIdx] = useState(0); // index along geometry
  const [pos, setPos] = useState<[number, number] | null>(geometry[0] ?? null);
  const [heading, setHeading] = useState(0);
  const [simulate, setSimulate] = useState(true);
  const subRef = useRef<{ remove: () => void } | null>(null);

  // Simulate drive: advance along the real road geometry for stationary testing.
  // Stride keeps total drive time even when OSRM returns hundreds of points.
  useEffect(() => {
    if (!simulate || geometry.length < 2) return;
    const stride = Math.max(1, Math.round(geometry.length / 45));
    const t = setInterval(() => {
      setIdx((i) => {
        const ni = Math.min(i + stride, geometry.length - 1);
        const here = geometry[ni];
        const nxt = geometry[Math.min(ni + stride, geometry.length - 1)];
        setPos(here);
        setHeading(bearingDeg(here, nxt));
        if (ni >= geometry.length - 1) clearInterval(t);
        return ni;
      });
    }, 550);
    return () => clearInterval(t);
  }, [simulate, geometry.length]);

  // Live GPS follow.
  useEffect(() => {
    if (simulate) {
      subRef.current?.remove();
      subRef.current = null;
      return;
    }
    let live = true;
    watch((coord, hd) => {
      if (!live) return;
      setPos(coord);
      if (hd != null && hd >= 0) setHeading(hd);
      // snap idx to nearest geometry point
      if (geometry.length) {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < geometry.length; i++) {
          const d = haversineKm(coord, geometry[i]);
          if (d < bestD) { bestD = d; best = i; }
        }
        setIdx(best);
      }
    }).then((s) => { if (s) subRef.current = s; });
    return () => { live = false; subRef.current?.remove(); subRef.current = null; };
  }, [simulate, geometry.length]);

  const frac = geometry.length > 1 ? idx / (geometry.length - 1) : 0;
  const remainingKm = route ? Math.max(0, route.distanceKm * (1 - frac)) : 0;
  const etaMin = route ? Math.max(0, Math.ceil(route.durationMin * (1 - frac))) : 0;
  const destCoord = dest?.coord ?? geometry[geometry.length - 1];
  const distToDestM = pos && destCoord ? Math.round(haversineKm(pos, destCoord) * 1000) : Infinity;
  const arrived = frac >= 0.999 || distToDestM < 40;

  const stepIdx = steps.length ? Math.min(steps.length - 1, Math.floor(frac * steps.length)) : 0;
  const step = steps[stepIdx];
  const distToStep = useMemo(() => {
    if (!pos || !step?.location) return 0;
    return Math.round(haversineKm(pos, step.location) * 1000);
  }, [pos, step]);

  if (!route) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTxt}>No active route.</Text>
        <Pressable style={styles.endBtn} onPress={() => router.replace('/routes')}>
          <Text style={styles.endTxt}>Plan a trip</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <EcoMap
          heat={[]}
          routes={[route]}
          selectedId={route.id}
          origin={origin}
          dest={dest}
          userLocation={pos}
          follow
          bearing={heading}
        />
      </View>

      {/* maneuver banner */}
      <View style={[styles.banner, { top: insets.top + Space.sm }]}>
        <View style={styles.maneuverIcon}>
          <Feather name={arrived ? 'flag' : maneuverIcon(step?.type ?? 6)} size={26} color={Color.accentOn} />
        </View>
        <View style={{ flex: 1 }}>
          {arrived ? (
            <Text style={styles.bannerMain}>You’ve arrived</Text>
          ) : (
            <>
              <Text style={styles.bannerDist}>{distToStep >= 1000 ? `${(distToStep / 1000).toFixed(1)} km` : `${distToStep} m`}</Text>
              <Text style={styles.bannerMain} numberOfLines={2}>{step?.instruction ?? 'Continue on route'}</Text>
            </>
          )}
        </View>
      </View>

      <Pressable style={[styles.exit, { top: insets.top + 96 }]} onPress={() => router.back()}>
        <Feather name="x" size={22} color={Color.fg} />
      </Pressable>
      <Pressable style={[styles.simToggle, { top: insets.top + 96 }]} onPress={() => setSimulate((s) => !s)}>
        <Ionicons name={simulate ? 'play' : 'navigate'} size={16} color={Color.accent} />
        <Text style={styles.simTxt}>{simulate ? 'Simulating' : 'Live GPS'}</Text>
      </Pressable>

      {/* bottom trip bar */}
      <View style={[styles.tripbar, { paddingBottom: insets.bottom + Space.lg }]}>
        <View>
          <Text style={styles.eta}>{arrived ? 'Arrived' : `${etaMin} min`}</Text>
          <Text style={styles.tripSub}>
            {remainingKm.toFixed(1)} km · {route.label} · {formatKg(route.kg)}
          </Text>
        </View>
        <Pressable style={styles.endBtn} onPress={() => router.replace('/')}>
          <Text style={styles.endTxt}>{arrived ? 'Done' : 'End'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const card = { backgroundColor: Color.bg, ...Elevation.card };

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.surfaceMap },
  banner: { position: 'absolute', left: Space.lg, right: Space.lg, backgroundColor: Color.accent, borderRadius: Radius.lg, padding: Space.lg, flexDirection: 'row', alignItems: 'center', gap: Space.md, ...Elevation.fab },
  maneuverIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bannerDist: { color: Color.accentOn, fontSize: Font.size.xl, fontWeight: Font.weight.bold },
  bannerMain: { color: Color.accentOn, fontSize: Font.size.sm, fontWeight: Font.weight.medium, opacity: 0.95 },
  exit: { position: 'absolute', left: Space.lg, ...card, width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  simToggle: { position: 'absolute', right: Space.lg, ...card, height: 44, borderRadius: Radius.pill, paddingHorizontal: Space.md, flexDirection: 'row', alignItems: 'center', gap: 6 },
  simTxt: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.fg },
  tripbar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Color.bg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Space.xl, paddingTop: Space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Elevation.sheet },
  eta: { fontSize: Font.size.xxl, fontWeight: Font.weight.bold, color: Color.fg },
  tripSub: { fontSize: Font.size.sm, color: Color.muted, marginTop: 2 },
  endBtn: { backgroundColor: Color.accent, borderRadius: Radius.md, paddingHorizontal: Space.xl, paddingVertical: Space.md },
  endTxt: { color: Color.accentOn, fontWeight: Font.weight.bold, fontSize: Font.size.base },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.lg, backgroundColor: Color.bg },
  emptyTxt: { color: Color.muted, fontSize: Font.size.base },
});
