import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  label: { color: colors.muted, fontSize: 13, marginBottom: 2 },
  value: { color: colors.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { color: colors.muted, fontSize: 14, fontWeight: '500' },
});
