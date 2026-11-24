import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme';
import { Stat } from '../components/Stat';
import {
  averagePace,
  formatDuration,
  formatKm,
  formatPace,
  formatSpeedKmh,
  paceFromSpeed,
} from '../geo';
import * as run from '../runStore';
import { ensureForegroundPermission, startTracking, stopTracking, TrackingMode } from '../tracker';
import { saveRun } from '../history';

function useRunState() {
  const [state, setState] = useState(run.getState());
  useEffect(() => {
    const unsub = run.subscribe(setState);
    run.hydrate().then(() => setState(run.getState()));
    return () => {
      unsub();
    };
  }, []);
  return state;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function RunScreen({ onSaved }: { onSaved: () => void }) {
  const state = useRunState();
  const now = useNow(state.status === 'running');
  const mapRef = useRef<MapView>(null);
  const [mode, setMode] = useState<TrackingMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [follow, setFollow] = useState(true);
  const restored = useRef(false);

  // Açılışta haritayı bulunduğun yere getir.
  useEffect(() => {
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) {
        const res = await ensureForegroundPermission();
        if (!res.ok) return;
      }
      const loc =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
      if (loc) {
        mapRef.current?.animateToRegion(
          { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 },
          500,
        );
      }
    })();
  }, []);

  // Uygulama koşu sürerken kapanmışsa takibi yeniden başlat.
  useEffect(() => {
    if (restored.current || state.status !== 'running') return;
    restored.current = true;
    startTracking().then(setMode).catch(() => {});
  }, [state.status]);

  // Koşarken harita seni takip etsin.
  const segments = state.segments.filter((s) => s.length > 0);
  const lastSeg = segments[segments.length - 1];
  const last = lastSeg?.[lastSeg.length - 1];
  useEffect(() => {
    if (follow && last && state.status === 'running') {
      mapRef.current?.animateCamera({ center: { latitude: last.latitude, longitude: last.longitude } }, { duration: 400 });
    }
  }, [last?.t, follow, state.status]);

  const elapsed = run.elapsedMs(state, now);
  const speed = run.currentSpeed(state, now);

  async function handleStart() {
    setBusy(true);
    try {
      const perm = await ensureForegroundPermission();
      if (!perm.ok) {
        Alert.alert('Konum gerekli', perm.message, [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      run.start();
      restored.current = true;
      setFollow(true);
      setMode(await startTracking());
    } catch (e) {
      run.finish();
      Alert.alert('Takip başlatılamadı', String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handlePause() {
    run.pause();
    await stopTracking();
  }

  async function handleResume() {
    setBusy(true);
    try {
      run.resume();
      setMode(await startTracking());
    } finally {
      setBusy(false);
    }
  }

  function handleFinish() {
    Alert.alert('Koşuyu bitir', 'Bu koşu kaydedilsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await stopTracking();
          run.finish();
          setMode(null);
        },
      },
      {
        text: 'Kaydet',
        onPress: async () => {
          await stopTracking();
          const final = run.finish();
          setMode(null);
          if (final.startedAt != null) {
            await saveRun({
              id: String(final.startedAt),
              startedAt: final.startedAt,
              durationMs: final.activeMs,
              distance: final.distance,
              maxSpeed: final.maxSpeed,
              segments: final.segments.filter((s) => s.length > 0),
            });
          }
          onSaved();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          showsUserLocation
          showsMyLocationButton={false}
          onPanDrag={() => setFollow(false)}
          initialRegion={{ latitude: 41.0082, longitude: 28.9784, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        >
          {segments.map((seg, i) =>
            seg.length > 1 ? (
              <Polyline key={i} coordinates={seg} strokeColor={colors.accent} strokeWidth={5} lineJoin="round" />
            ) : null,
          )}
        </MapView>
        {!follow && state.status !== 'idle' && (
          <Pressable style={styles.recenter} onPress={() => setFollow(true)}>
            <Text style={styles.recenterText}>Beni ortala</Text>
          </Pressable>
        )}
        {mode === 'foreground' && state.status === 'running' && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Arka plan takibi bu ortamda yok: koşu boyunca uygulamayı açık tut (ekran açık kalacak).
            </Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.time}>{formatDuration(elapsed)}</Text>
        <Text style={styles.timeLabel}>
          {state.status === 'paused' ? 'Duraklatıldı' : state.status === 'running' ? 'Süre' : 'Hazır'}
        </Text>

        <View style={styles.row}>
          <Stat label="Mesafe" value={formatKm(state.distance)} unit="km" />
          <Stat label="Hız" value={formatSpeedKmh(speed)} unit="km/sa" />
        </View>
        <View style={styles.row}>
          <Stat label="Tempo" value={formatPace(paceFromSpeed(speed))} unit="/km" />
          <Stat label="Ort. tempo" value={formatPace(averagePace(elapsed, state.distance))} unit="/km" />
        </View>

        <View style={styles.buttons}>
          {state.status === 'idle' && (
            <Btn label="Başlat" color={colors.accent} onPress={handleStart} disabled={busy} />
          )}
          {state.status === 'running' && <Btn label="Duraklat" color={colors.card} onPress={handlePause} />}
          {state.status === 'paused' && (
            <>
              <Btn label="Devam" color={colors.green} onPress={handleResume} disabled={busy} />
              <Btn label="Bitir" color={colors.danger} onPress={handleFinish} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Btn({ label, color, onPress, disabled }: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, { backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  mapWrap: { flex: 1 },
  panel: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  time: {
    color: colors.text,
    fontSize: 54,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: { color: colors.muted, textAlign: 'center', marginTop: -4, marginBottom: 6 },
  row: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: { flex: 1, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 19, fontWeight: '700' },
  recenter: {
    position: 'absolute',
    right: 12,
    bottom: 32,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  recenterText: { color: colors.text, fontWeight: '600' },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(25,28,34,0.92)',
    padding: 10,
    borderRadius: 12,
  },
  bannerText: { color: colors.text, fontSize: 13 },
});
