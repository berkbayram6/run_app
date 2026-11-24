// Bitmiş koşuların telefonda saklanması.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Point } from './geo';

export type SavedRun = {
  id: string;
  startedAt: number;
  durationMs: number;
  distance: number;
  maxSpeed: number;
  segments: Point[][];
};

const KEY = 'kosu:gecmis';

export async function listRuns(): Promise<SavedRun[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const runs: SavedRun[] = raw ? JSON.parse(raw) : [];
    return runs.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function saveRun(run: SavedRun): Promise<void> {
  const runs = await listRuns();
  await AsyncStorage.setItem(KEY, JSON.stringify([run, ...runs.filter((r) => r.id !== run.id)]));
}

export async function deleteRun(id: string): Promise<void> {
  const runs = await listRuns();
  await AsyncStorage.setItem(KEY, JSON.stringify(runs.filter((r) => r.id !== id)));
}
