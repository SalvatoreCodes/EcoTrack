import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CO2Badge } from '@/components/CO2Badge';
import { EcoMap } from '@/components/EcoMap';
import { type Mode } from '@/lib/emissions';
import { useStore } from '@/lib/store';
import { Color, Elevation, Font, Radius, Space } from '@/theme';

const MODE_ICON: Record<Mode, keyof typeof Ionicons.glyphMap> = {
  car: 'car',
  motorbike: 'bicycle',
  bus: 'bus',
  bike: 'bicycle',
  walk: 'walk',
};

export default function Compare() {
  const insets = useSafeAreaInsets();
  const { routes, selectedRouteId, origin, dest, selectRoute } = useStore();

  const selected = routes.find((r) => r.id === selectedRouteId);
  const fastest = routes.find((r) => r.id === 'fast');
  const saves = selected && fastest ? Math.max(0, Number((fastest.kg - selected.kg).toFixed(1))) : 0;

  if (!routes.length) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTxt}>No routes yet.</Text>
        <Pressable style={styles.go} onPress={() => router.replace('/routes')}>
          <Text style={styles.goTxt}>Plan a trip</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <EcoMap heat={[]} routes={routes} selectedId={selectedRouteId} origin={origin} dest={dest} fitToRoutes />
      </View>

      <Pressable style={[styles.back, { top: insets.top + Space.sm }]} onPress={() => router.back()}>
        <Feather name="chevron-left" size={24} color={Color.fg} />
      </Pressable>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Space.lg }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>
          {routes.length} routes <Text style={styles.sheetSub}>· {origin?.name?.split('·').pop()?.trim() ?? 'Start'} → {dest?.name?.split('·').pop()?.trim() ?? 'Destination'}</Text>
        </Text>

        <ScrollView style={{ maxHeight: 290 }} contentContainerStyle={{ gap: Space.md }}>
          {routes.map((r) => {
            const sel = r.id === selectedRouteId;
            return (
              <Pressable key={r.id} style={[styles.card, sel && styles.cardSel]} onPress={() => selectRoute(r.id)}>
                <View style={[styles.modeic, sel && styles.modeicSel]}>
                  <Ionicons name={MODE_ICON[r.mode]} size={20} color={sel ? Color.accentOn : Color.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{r.label}</Text>
                    {r.greenest ? <Text style={styles.tag}>GREENEST</Text> : null}
                  </View>
                  <View style={styles.subRow}>
                    <CO2Badge kg={r.kg} level={r.level} />
                    <Text style={styles.sub}>· {r.distanceKm} km{r.note ? ` · ${r.note}` : ''}</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.time}>{r.durationMin}</Text>
                  <Text style={styles.timeUnit}>min</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.why} onPress={() => router.push('/assistant')}>
          <Ionicons name="sparkles" size={18} color={Color.accent} />
          <Text style={styles.whyTxt}>Why this route? Ask the assistant</Text>
        </Pressable>
        <Pressable style={styles.start} onPress={() => router.push('/navigate')}>
          <Text style={styles.startTxt}>
            Start {selected?.label ?? 'route'}{saves > 0 ? ` · saves ${saves} kg CO₂` : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const cardShadow = { backgroundColor: Color.bg, ...Elevation.card };

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.surfaceMap },
  back: { position: 'absolute', left: Space.lg, ...cardShadow, width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Color.bg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Space.lg, gap: Space.md, ...Elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: Radius.pill, backgroundColor: Color.border, alignSelf: 'center' },
  sheetTitle: { fontSize: Font.size.lg, fontWeight: Font.weight.semibold, color: Color.fg },
  sheetSub: { fontSize: Font.size.sm, fontWeight: Font.weight.regular, color: Color.muted },
  card: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1.5, borderColor: Color.borderSoft, borderRadius: Radius.lg, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  cardSel: { borderColor: Color.accent, backgroundColor: Color.ecoSoft },
  modeic: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Color.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Color.border },
  modeicSel: { backgroundColor: Color.accent, borderColor: Color.accent },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: Font.size.sm, fontWeight: Font.weight.semibold, color: Color.fg },
  tag: { fontSize: 10, fontWeight: Font.weight.bold, color: Color.accent, backgroundColor: Color.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill, overflow: 'hidden', borderWidth: 1, borderColor: Color.border },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sub: { fontSize: Font.size.xs, color: Color.fg2 },
  time: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Color.fg, textAlign: 'right' },
  timeUnit: { fontSize: 10, color: Color.muted, textAlign: 'right' },
  why: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm, backgroundColor: Color.surface, borderRadius: Radius.md, padding: Space.md },
  whyTxt: { fontSize: Font.size.sm, fontWeight: Font.weight.semibold, color: Color.fg },
  start: { backgroundColor: Color.accent, borderRadius: Radius.md, padding: Space.lg, alignItems: 'center', ...Elevation.fab },
  startTxt: { color: Color.accentOn, fontWeight: Font.weight.bold, fontSize: Font.size.base },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.lg, backgroundColor: Color.bg },
  emptyTxt: { color: Color.muted, fontSize: Font.size.base },
  go: { backgroundColor: Color.accent, borderRadius: Radius.md, paddingHorizontal: Space.xl, paddingVertical: Space.md },
  goTxt: { color: Color.accentOn, fontWeight: Font.weight.bold },
});
