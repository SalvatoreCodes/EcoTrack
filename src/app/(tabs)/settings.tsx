import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { health, type Health } from '@/lib/api';
import { Color, Font, Radius, Space } from '@/theme';

const PROVIDERS: { key: keyof Health['keys']; label: string }[] = [
  { key: 'ors', label: 'OpenRouteService · routing' },
  { key: 'waqi', label: 'WAQI · air quality' },
  { key: 'tomtom', label: 'TomTom · live traffic' },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const [h, setH] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferEco, setPreferEco] = useState(true);
  const [avoidAir, setAvoidAir] = useState(true);

  const refresh = () => {
    setLoading(true);
    health().then((r) => {
      setH(r);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.group}>APP</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.rowLabel}>Mode</Text>
            <View style={styles.statusWrap}>
              <View style={[styles.dot, { backgroundColor: Color.success }]} />
              <Text style={styles.muted}>On-device</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Assistant</Text>
            <Text style={styles.muted}>{loading ? 'Checking…' : (h?.model ?? '—')}</Text>
          </View>
        </View>

        <Text style={styles.group}>DATA PROVIDERS · bundled in app</Text>
        <View style={styles.card}>
          {PROVIDERS.map((p, i) => {
            const ok = !!h?.keys?.[p.key];
            return (
              <View key={p.key} style={[styles.row, i < PROVIDERS.length - 1 && styles.divider]}>
                <Text style={styles.rowLabel}>{p.label}</Text>
                <Text style={[styles.status, ok ? styles.ok : styles.no]}>{ok ? 'Live' : 'Sample'}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.group}>ROUTING</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.rowLabel}>Prefer lowest emission</Text>
            <Switch value={preferEco} onValueChange={setPreferEco} trackColor={{ true: Color.accent, false: Color.border }} thumbColor="#fff" />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Avoid poor-air zones</Text>
            <Switch value={avoidAir} onValueChange={setAvoidAir} trackColor={{ true: Color.accent, false: Color.border }} thumbColor="#fff" />
          </View>
        </View>

        <View style={styles.aboutRow}>
          <Feather name="info" size={14} color={Color.muted} />
          <Text style={styles.note}>
            EcoTrack runs on your device. Routing and air-quality data come straight from their providers; the assistant runs locally. Providers showing “Sample” fall back to built-in demo data until a key is bundled.
          </Text>
        </View>
        <Text style={styles.version}>EcoTrack v0.1 · Jabodetabek</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.bg },
  scrollContent: { paddingHorizontal: Space.lg, paddingBottom: Space.huge },
  header: { paddingHorizontal: Space.lg, paddingVertical: Space.md },
  title: { fontSize: Font.size.xl, fontWeight: Font.weight.semibold, color: Color.fg },
  group: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.muted, marginTop: Space.xl, marginBottom: Space.sm, paddingLeft: 2 },
  card: { backgroundColor: Color.surface, borderRadius: Radius.lg, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: Color.borderSoft },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Space.lg, gap: Space.md },
  rowLabel: { fontSize: Font.size.sm, fontWeight: Font.weight.medium, color: Color.fg, flexShrink: 1 },
  muted: { fontSize: Font.size.sm, color: Color.muted },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
  status: { fontSize: 10, fontWeight: Font.weight.bold, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill, overflow: 'hidden' },
  ok: { color: Color.success, backgroundColor: Color.ecoSoft },
  no: { color: Color.warn, backgroundColor: '#fdf0d8' },
  aboutRow: { flexDirection: 'row', gap: Space.sm, marginTop: Space.xl, alignItems: 'flex-start' },
  note: { fontSize: Font.size.xs, color: Color.muted, lineHeight: 17, flex: 1 },
  version: { fontSize: Font.size.xs, color: Color.muted, marginTop: Space.lg },
});
