// Aktif koşunun durumu. Hem ekran hem de arka plan konum görevi buraya yazar.
// Uygulama kapanıp yeniden açılırsa koşu telefondaki kayıttan geri yüklenir.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluateStep, Point } from './geo';

export type RunStatus = 'idle' | 'running' | 'paused';

export type RunState = {
  status: RunStatus;
  /** Her duraklatma yeni bir bölüm başlatır, böylece haritada düz çizgi çekilmez. */
  segments: Point[][];
  distance: number;
  /** Son "devam"dan önce birikmiş koşu süresi (ms). */
  activeMs: number;
  /** Koşu sürüyorsa son başlatma/devam anı. */
  resumedAt: number | null;
  startedAt: number | null;
  /** Anlık hız (m/s), yumuşatılmış. */
  speed: number | null;
  /** Son hız ölçümünün zamanı. */
  speedAt: number | null;
  maxSpeed: number;
};

export type LocationInput = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
  speed: number | null;
};

const ACTIVE_KEY = 'kosu:aktif';

const initialState: RunState = {
  status: 'idle',
  segments: [],
  distance: 0,
  activeMs: 0,
  resumedAt: null,
  startedAt: null,
  speed: null,
  speedAt: null,
  maxSpeed: 0,
};

let state: RunState = initialState;
let hydrated = false;
let hydrating: Promise<void> | null = null;
let queued: LocationInput[] = [];
const listeners = new Set<(s: RunState) => void>();

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(immediate = false) {
  const write = () => {
    saveTimer = null;
    const data = state.status === 'idle' ? null : JSON.stringify(state);
    (data ? AsyncStorage.setItem(ACTIVE_KEY, data) : AsyncStorage.removeItem(ACTIVE_KEY)).catch(() => {});
  };
  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    write();
  } else if (!saveTimer) {
    saveTimer = setTimeout(write, 5000);
  }
}

function setState(next: RunState, persistNow = false) {
  state = next;
  listeners.forEach((l) => l(state));
  persist(persistNow);
}

export function getState(): RunState {
  return state;
}

export function subscribe(listener: (s: RunState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Yarım kalmış koşuyu telefondaki kayıttan yükler. Birden çok çağrılabilir. */
export function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!hydrating) {
    hydrating = AsyncStorage.getItem(ACTIVE_KEY)
      .then((raw) => {
        if (raw && state.status === 'idle') {
          state = { ...initialState, ...JSON.parse(raw) };
        }
      })
      .catch(() => {})
      .finally(() => {
        hydrated = true;
        const pending = queued;
        queued = [];
        listeners.forEach((l) => l(state));
        if (pending.length) addLocations(pending);
      });
  }
  return hydrating;
}

export function elapsedMs(s: RunState, now = Date.now()): number {
  return s.activeMs + (s.resumedAt != null ? now - s.resumedAt : 0);
}

/** Son birkaç saniyede ölçüm yoksa anlık hız 0 kabul edilir. */
export function currentSpeed(s: RunState, now = Date.now()): number | null {
  if (s.status !== 'running' || s.speed == null || s.speedAt == null) return null;
  return now - s.speedAt > 8000 ? 0 : s.speed;
}

export function start() {
  const now = Date.now();
  setState({ ...initialState, status: 'running', startedAt: now, resumedAt: now, segments: [[]] }, true);
}

export function pause() {
  if (state.status !== 'running') return;
  const now = Date.now();
  setState(
    { ...state, status: 'paused', activeMs: elapsedMs(state, now), resumedAt: null, speed: null, speedAt: null },
    true,
  );
}

export function resume() {
  if (state.status !== 'paused') return;
  setState({ ...state, status: 'running', resumedAt: Date.now(), segments: [...state.segments, []] }, true);
}

/** Koşuyu bitirir ve son halini döndürür. Durum sıfırlanır. */
export function finish(): RunState {
  const now = Date.now();
  const final: RunState = { ...state, activeMs: elapsedMs(state, now), resumedAt: null, status: 'idle' };
  setState(initialState, true);
  return final;
}

export function addLocations(locations: LocationInput[]) {
  if (!hydrated) {
    queued.push(...locations);
    hydrate();
    return;
  }
  if (state.status !== 'running' || locations.length === 0) return;

  const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
  const segments = state.segments.length ? [...state.segments] : [[]];
  let current = [...segments[segments.length - 1]];
  let { distance, speed, speedAt, maxSpeed } = state;

  for (const loc of sorted) {
    // Duraklatma sırasında alınmış (ama geç gelmiş) ölçümleri atla.
    if (state.resumedAt != null && loc.timestamp < state.resumedAt - 2000) continue;
    const point: Point = { latitude: loc.latitude, longitude: loc.longitude, t: loc.timestamp };
    const prev = current.length ? current[current.length - 1] : null;
    const step = evaluateStep(prev, point, loc.accuracy);
    if (!step.accepted) continue;

    current.push(point);
    distance += step.meters;

    const measured = loc.speed != null && loc.speed >= 0 ? loc.speed : step.speed;
    if (measured != null) {
      speed = speed == null ? measured : speed * 0.4 + measured * 0.6;
      speedAt = loc.timestamp;
      maxSpeed = Math.max(maxSpeed, speed);
    }
  }

  segments[segments.length - 1] = current;
  setState({ ...state, segments, distance, speed, speedAt, maxSpeed });
}
