import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EcoMap } from '@/components/EcoMap';
import { getAir } from '@/lib/api';
import { aqiLabel, aqiLevel } from '@/lib/emissions';
import { FALLBACK_HEAT } from '@/lib/jakarta';
import { EMISSION_ROADS } from '@/lib/roads';
import { currentPlace } from '@/lib/location';
import { useStore } from '@/lib/store';
import type { HeatPoint } from '@/lib/types';
import { Color, Elevation, Font, Heat, Radius, Space } from '@/theme';

export default function MapHome() {
  const insets = useSafeAreaInsets();
  const userLocation = useStore((s) => s.userLocation);
  const setUserLocation = useStore((s) => s.setUserLocation);
  const setOrigin = useStore((s) => s.setOrigin);
  const [heat, setHeat] = useState<HeatPoint[]>(FALLBACK_HEAT);
  const [source, setSource] = useState<'live' | 'sample'>('sample');
  const [recenter, setRecenter] = useState(0);
  const [overlay, setOverlay] = useState<'air' | 'emissions'>('air');

  const loadAir = () =>
    getAir()
      .then((r) => {
        setHeat(r.points);
        setSource(r.source);
      })
      .catch(() => {});

  useEffect(() => {
    loadAir();
    currentPlace().then((p) => {
      if (p) {
        setUserLocation(p.coord);
        setOrigin(p);
      }
    });
  }, [setUserLocation, setOrigin]);

  const aqi = heat.length ? Math.round(heat.reduce((s, p) => s + p.aqi, 0) / heat.length) : 0;
  const lvl = aqiLevel(aqi);

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <EcoMap
          heat={heat}
          emissionRoads={EMISSION_ROADS}
          overlay={overlay}
          userLocation={userLocation}
          centerOnUser
          recenterNonce={recenter}
        />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + Space.sm }]} pointerEvents="box-none">
        <Pressable style={styles.pill} onPress={() => router.push('/routes')}>
          <Feather name="search" size={20} color={Color.accent} />
          <Text style={styles.pillTxt}>Where to?</Text>
        </Pressable>
        <View style={styles.aqiChip}>
          <View style={[styles.dot, { backgroundColor: Heat[lvl - 1] }]} />
          <Text style={styles.aqiTxt}>
            Air now · {aqi} AQI · {aqiLabel(aqi)}
          </Text>
        </View>
        <View style={styles.seg}>
          <Pressable style={[styles.segBtn, overlay === 'air' && styles.segActive]} onPress={() => setOverlay('air')}>
            <Text style={[styles.segTxt, overlay === 'air' && styles.segTxtActive]}>Air quality</Text>
          </Pressable>
          <Pressable style={[styles.segBtn, overlay === 'emissions' && styles.segActive]} onPress={() => setOverlay('emissions')}>
            <Text style={[styles.segTxt, overlay === 'emissions' && styles.segTxtActive]}>Road emissions</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Space.sm }]} pointerEvents="box-none">
        <View style={styles.fabs}>
          <Pressable style={styles.fab} onPress={loadAir}>
            <Feather name="refresh-cw" size={20} color={Color.fg2} />
          </Pressable>
          <Pressable
            style={styles.fab}
            onPress={async () => {
              const p = await currentPlace();
              if (p) {
                setUserLocation(p.coord);
                setOrigin(p);
              }
              setRecenter((n) => n + 1);
            }}>
            <Feather name="crosshair" size={20} color={Color.fg2} />
          </Pressable>
          <Pressable style={[styles.fab, styles.fabPrimary]} onPress={() => router.push('/routes')}>
            <Feather name="navigation" size={20} color={Color.accentOn} />
          </Pressable>
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>
            {overlay === 'air'
              ? `Air quality · ${source === 'live' ? 'live + modeled' : 'sample data'}`
              : 'Road emissions · modeled traffic'}
          </Text>
          <View style={styles.ramp}>
            {Heat.map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
          <View style={styles.rampLabels}>
            <Text style={styles.rampLbl}>{overlay === 'air' ? 'Cleaner' : 'Low emissions'}</Text>
            <Text style={styles.rampLbl}>{overlay === 'air' ? 'More polluted' : 'High emissions'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const card = { backgroundColor: Color.bg, ...Elevation.card };

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.surfaceMap },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Space.lg, gap: Space.md },
  pill: { ...card, flexDirection: 'row', alignItems: 'center', gap: Space.md, height: 52, paddingHorizontal: Space.lg, borderRadius: Radius.pill },
  pillTxt: { color: Color.muted, fontSize: Font.size.base, fontWeight: Font.weight.medium },
  aqiChip: { ...card, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: 8, paddingHorizontal: Space.md, borderRadius: Radius.pill },
  seg: { ...card, flexDirection: 'row', padding: 4, borderRadius: Radius.pill, gap: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
  segActive: { backgroundColor: Color.accent },
  segTxt: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.fg2 },
  segTxtActive: { color: Color.accentOn },
  dot: { width: 10, height: 10, borderRadius: 5 },
  aqiTxt: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.fg },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Space.lg, gap: Space.md },
  fabs: { alignSelf: 'flex-end', gap: Space.md, alignItems: 'flex-end' },
  fab: { ...card, width: 50, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  fabPrimary: { backgroundColor: Color.accent, ...Elevation.fab },
  legend: { ...card, borderRadius: Radius.lg, padding: Space.md, gap: Space.sm },
  legendTitle: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.muted },
  ramp: { flexDirection: 'row', height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  rampLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rampLbl: { fontSize: 10, color: Color.muted },
});
