import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { colors } from '../theme';
import { Stat } from '../components/Stat';
import { averagePace, formatDuration, formatKm, formatPace, formatSpeedKmh, regionForPoints } from '../geo';
import { deleteRun, listRuns, SavedRun } from '../history';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function HistoryScreen() {
  const [runs, setRuns] = useState<SavedRun[] | null>(null);
  const [selected, setSelected] = useState<SavedRun | null>(null);

  const load = useCallback(() => {
    listRuns().then(setRuns);
  }, []);
  useEffect(load, [load]);

  if (selected) {
    return (
      <RunDetail
        run={selected}
        onBack={() => setSelected(null)}
        onDelete={async () => {
          await deleteRun(selected.id);
          setSelected(null);
          load();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Koşularım</Text>
      <FlatList
        data={runs ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          runs ? <Text style={styles.empty}>Henüz kayıtlı koşu yok. İlk koşunu "Koşu" sekmesinden başlat.</Text> : undefined
        }
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]} onPress={() => setSelected(item)}>
            <Text style={styles.date}>{dateFmt.format(item.startedAt)}</Text>
            <View style={styles.cardRow}>
              <Text style={styles.big}>{formatKm(item.distance)} km</Text>
              <Text style={styles.small}>{formatDuration(item.durationMs)}</Text>
              <Text style={styles.small}>{formatPace(averagePace(item.durationMs, item.distance))} /km</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function RunDetail({ run, onBack, onDelete }: { run: SavedRun; onBack: () => void; onDelete: () => void }) {
  const region = regionForPoints(run.segments.flat());
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.link}>‹ Geri</Text>
        </Pressable>
        <Pressable
          hitSlop={12}
          onPress={() =>
            Alert.alert('Koşuyu sil', 'Bu koşu kalıcı olarak silinsin mi?', [
              { text: 'İptal', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: onDelete },
            ])
          }
        >
          <Text style={[styles.link, { color: colors.danger }]}>Sil</Text>
        </Pressable>
      </View>
      <Text style={styles.detailDate}>{dateFmt.format(run.startedAt)}</Text>
      <View style={styles.map}>
        {region ? (
          <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
            {run.segments.map((seg, i) =>
              seg.length > 1 ? <Polyline key={i} coordinates={seg} strokeColor={colors.accent} strokeWidth={5} /> : null,
            )}
          </MapView>
        ) : (
          <Text style={styles.empty}>Bu koşuda güzergah kaydı yok.</Text>
        )}
      </View>
      <View style={styles.statsRow}>
        <Stat label="Mesafe" value={formatKm(run.distance)} unit="km" />
        <Stat label="Süre" value={formatDuration(run.durationMs)} />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Ort. tempo" value={formatPace(averagePace(run.durationMs, run.distance))} unit="/km" />
        <Stat label="En yüksek hız" value={formatSpeedKmh(run.maxSpeed)} unit="km/sa" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14 },
  date: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  big: { color: colors.text, fontSize: 22, fontWeight: '700' },
  small: { color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  link: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  detailDate: { color: colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  map: { height: 320, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
