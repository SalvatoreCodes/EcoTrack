import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRoutes } from '@/lib/api';
import { type Mode } from '@/lib/emissions';
import { SAMPLE_PLACES } from '@/lib/jakarta';
import { currentPlace } from '@/lib/location';
import { useStore } from '@/lib/store';
import type { Place } from '@/lib/types';
import { Color, Font, Radius, Space } from '@/theme';

const MODES: { mode: Mode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'car', icon: 'car', label: 'Car' },
  { mode: 'bike', icon: 'bicycle', label: 'Bike' },
  { mode: 'bus', icon: 'bus', label: 'Bus' },
  { mode: 'walk', icon: 'walk', label: 'Walk' },
];

export default function RouteSearch() {
  const insets = useSafeAreaInsets();
  const { origin, dest, mode, setOrigin, setDest, setMode, setRoutes } = useStore();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (origin) return;
    currentPlace().then((p) => setOrigin(p ?? SAMPLE_PLACES[0]));
  }, [origin, setOrigin]);

  const choose = async (place: Place) => {
    const from = origin ?? SAMPLE_PLACES[0];
    setDest(place);
    setBusy(true);
    try {
      const routes = await getRoutes(from, place, mode);
      setRoutes(routes);
      router.push('/compare');
    } catch {
      // surface a soft failure; keep user on screen
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan a trip</Text>
      </View>

      <View style={styles.ab}>
        <View style={styles.abRow}>
          <View style={[styles.marker, { backgroundColor: Color.muted }]} />
          <Text style={styles.abTxt}>{origin?.name ?? 'Current location'}</Text>
        </View>
        <View style={styles.abLink} />
        <View style={styles.abRow}>
          <View style={[styles.marker, styles.markerTo]} />
          <Text style={[styles.abTxt, !dest && styles.placeholder]}>{dest?.name ?? 'Choose destination'}</Text>
        </View>
      </View>

      <View style={styles.modes}>
        {MODES.map((m) => {
          const active = m.mode === mode;
          return (
            <Pressable key={m.mode} style={[styles.mode, active && styles.modeActive]} onPress={() => setMode(m.mode)}>
              <Ionicons name={m.icon} size={20} color={active ? Color.accentOn : Color.fg2} />
              <Text style={[styles.modeTxt, active && { color: Color.accentOn }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>RECENT</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: Space.huge }}>
        {SAMPLE_PLACES.map((p) => (
          <Pressable key={p.id} style={styles.place} onPress={() => choose(p)} disabled={busy}>
            <View style={styles.pic}>
              <Ionicons name="location-outline" size={18} color={Color.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName}>{p.name}</Text>
              {p.detail ? <Text style={styles.placeSub}>{p.detail}</Text> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {busy ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={Color.accent} size="large" />
          <Text style={styles.overlayTxt}>Comparing routes by emissions…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.bg },
  header: { paddingHorizontal: Space.lg, paddingVertical: Space.md },
  title: { fontSize: Font.size.xl, fontWeight: Font.weight.semibold, color: Color.fg },
  ab: { paddingHorizontal: Space.lg },
  abRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Color.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  marker: { width: 12, height: 12, borderRadius: 6 },
  markerTo: { backgroundColor: Color.accent, borderRadius: 3 },
  abLink: { width: 2, height: 14, backgroundColor: Color.border, marginLeft: Space.xl - 1, marginVertical: 2 },
  abTxt: { fontSize: Font.size.base, fontWeight: Font.weight.medium, color: Color.fg },
  placeholder: { color: Color.muted, fontWeight: Font.weight.regular },
  modes: { flexDirection: 'row', gap: Space.sm, padding: Space.lg },
  mode: {
    flex: 1,
    paddingVertical: Space.md,
    borderRadius: Radius.md,
    backgroundColor: Color.surface,
    alignItems: 'center',
    gap: 4,
  },
  modeActive: { backgroundColor: Color.accent },
  modeTxt: { fontSize: 11, fontWeight: Font.weight.semibold, color: Color.fg2 },
  section: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.xs, fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.muted },
  place: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  pic: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Color.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: Font.size.sm, fontWeight: Font.weight.semibold, color: Color.fg },
  placeSub: { fontSize: Font.size.xs, color: Color.muted, marginTop: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', gap: Space.md },
  overlayTxt: { color: Color.fg2, fontWeight: Font.weight.medium },
});
