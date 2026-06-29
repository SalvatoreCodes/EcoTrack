import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EcoMap } from '@/components/EcoMap';
import { getRoutes, reverseGeocode } from '@/lib/api';
import { SAMPLE_PLACES } from '@/lib/jakarta';
import { useStore } from '@/lib/store';
import type { Place } from '@/lib/types';
import { Color, Elevation, Font, Radius, Space } from '@/theme';

export default function PickOnMap() {
  const insets = useSafeAreaInsets();
  const { origin, mode, userLocation, setDest, setRoutes, addRecent } = useStore();
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);

  const pinPlace: Place | null = pin ? { id: 'picked', name: 'Selected point', coord: pin } : null;

  const confirm = async () => {
    if (!pin || busy) return;
    setBusy(true);
    try {
      const name = await reverseGeocode(pin);
      const dest: Place = { id: `pick-${pin[0].toFixed(4)},${pin[1].toFixed(4)}`, name, detail: 'Picked on map', coord: pin };
      setDest(dest);
      addRecent(dest);
      const from = origin ?? SAMPLE_PLACES[0];
      const routes = await getRoutes(from, dest, mode);
      setRoutes(routes);
      router.replace('/compare');
    } catch {
      setBusy(false);
    }
  };

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <EcoMap
          heat={[]}
          origin={origin}
          dest={pinPlace}
          userLocation={userLocation}
          centerOnUser
          onMapClick={(c) => setPin(c)}
        />
      </View>

      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + Space.sm }]} pointerEvents="box-none">
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Color.fg} />
        </Pressable>
        <View style={styles.hint}>
          <Text style={styles.hintTxt}>{pin ? 'Tap again to move the pin' : 'Tap the map to drop your destination'}</Text>
        </View>
      </View>

      {/* confirm */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + Space.lg }]} pointerEvents="box-none">
        <Pressable
          style={[styles.confirm, !pin && styles.confirmOff]}
          onPress={confirm}
          disabled={!pin || busy}>
          {busy ? (
            <ActivityIndicator color={Color.accentOn} />
          ) : (
            <>
              <Feather name="navigation" size={18} color={Color.accentOn} />
              <Text style={styles.confirmTxt}>Use this point</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.surfaceMap },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.lg },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: Color.bg, alignItems: 'center', justifyContent: 'center', ...Elevation.card },
  hint: { flex: 1, backgroundColor: Color.bg, borderRadius: Radius.pill, paddingHorizontal: Space.lg, paddingVertical: 10, ...Elevation.card },
  hintTxt: { fontSize: Font.size.xs, fontWeight: Font.weight.medium, color: Color.fg2 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Space.lg },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm, height: 54, borderRadius: Radius.lg, backgroundColor: Color.accent, ...Elevation.fab },
  confirmOff: { backgroundColor: Color.muted, opacity: 0.6 },
  confirmTxt: { color: Color.accentOn, fontSize: Font.size.base, fontWeight: Font.weight.semibold },
});
