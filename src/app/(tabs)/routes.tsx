import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRoutes, searchPlaces } from '@/lib/api';
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (origin) return;
    currentPlace().then((p) => setOrigin(p ?? SAMPLE_PLACES[0]));
  }, [origin, setOrigin]);

  // Debounced geocode search.
  useEffect(() => {
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(() => {
      searchPlaces(q)
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const choose = async (place: Place) => {
    const from = origin ?? SAMPLE_PLACES[0];
    setDest(place);
    setBusy(true);
    try {
      const routes = await getRoutes(from, place, mode);
      setRoutes(routes);
      router.push('/compare');
    } catch {
      // soft failure; keep user on screen
    } finally {
      setBusy(false);
    }
  };

  const showResults = query.trim().length > 0;
  const list = showResults ? results : SAMPLE_PLACES;

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

      {/* search + pick-on-map */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Color.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destination"
            placeholderTextColor={Color.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Color.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.pickBtn} onPress={() => router.push('/pick')}>
          <Ionicons name="map-outline" size={20} color={Color.accent} />
        </Pressable>
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

      <View style={styles.sectionRow}>
        <Text style={styles.section}>{showResults ? 'RESULTS' : 'RECENT'}</Text>
        {searching ? <ActivityIndicator size="small" color={Color.muted} /> : null}
      </View>
      <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {list.map((p) => (
          <Pressable key={p.id} style={styles.place} onPress={() => choose(p)} disabled={busy}>
            <View style={styles.pic}>
              <Ionicons name="location-outline" size={18} color={Color.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName} numberOfLines={1}>{p.name}</Text>
              {p.detail ? <Text style={styles.placeSub} numberOfLines={1}>{p.detail}</Text> : null}
            </View>
          </Pressable>
        ))}
        {showResults && !searching && results.length === 0 ? (
          <Text style={styles.empty}>No places found. Try a different name, or pick on the map.</Text>
        ) : null}
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
  listContent: { paddingBottom: Space.huge },
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
  searchRow: { flexDirection: 'row', gap: Space.sm, paddingHorizontal: Space.lg, paddingTop: Space.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Color.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    height: 48,
  },
  searchInput: { flex: 1, color: Color.fg, fontSize: Font.size.base },
  pickBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.xs },
  section: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.muted },
  place: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  pic: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Color.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: Font.size.sm, fontWeight: Font.weight.semibold, color: Color.fg },
  placeSub: { fontSize: Font.size.xs, color: Color.muted, marginTop: 2 },
  empty: { paddingHorizontal: Space.lg, paddingTop: Space.lg, fontSize: Font.size.sm, color: Color.muted },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', gap: Space.md },
  overlayTxt: { color: Color.fg2, fontWeight: Font.weight.medium },
});
