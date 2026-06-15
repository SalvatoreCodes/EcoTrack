import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { formatKg, type HeatLevel } from '@/lib/emissions';
import { Heat, HeatInk, Font, Radius } from '@/theme';

export function CO2Badge({ kg, level }: { kg: number; level: HeatLevel }) {
  const bg = Heat[level - 1];
  const ink = HeatInk[level - 1];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name="leaf" size={11} color={ink} />
      <Text style={[styles.txt, { color: ink }]}>{formatKg(kg)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  txt: { fontSize: 11, fontWeight: Font.weight.bold },
});
