import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RunScreen } from './src/screens/RunScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { colors } from './src/theme';

type Tab = 'run' | 'history';

export default function App() {
  const [tab, setTab] = useState<Tab>('run');
  // Geçmiş ekranı her açılışta yeniden yüklensin diye anahtar.
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.body}>
          {/* Koşu ekranı sekme değişse de açık kalır, takip kesilmez. */}
          <View style={[styles.body, tab !== 'run' && styles.hidden]}>
            <RunScreen
              onSaved={() => {
                setHistoryKey((k) => k + 1);
                setTab('history');
              }}
            />
          </View>
          {tab === 'history' && <HistoryScreen key={historyKey} />}
        </View>
        <View style={styles.tabs}>
          <TabButton label="Koşu" active={tab === 'run'} onPress={() => setTab('run')} />
          <TabButton
            label="Geçmiş"
            active={tab === 'history'}
            onPress={() => {
              setHistoryKey((k) => k + 1);
              setTab('history');
            }}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  hidden: { display: 'none' },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: colors.muted, fontSize: 16, fontWeight: '700' },
});
