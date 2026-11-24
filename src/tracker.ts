// Telefondan konum alma. Mümkünse arka planda (ekran kilitliyken) çalışır,
// değilse (ör. Expo Go içinde) ön planda izler ve ekranı açık tutar.
//
// Bu dosya index.ts içinde uygulamadan önce içe aktarılmalı: arka plan görevi
// en üst seviyede tanımlanmak zorunda.

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { addLocations, LocationInput } from './runStore';

export const LOCATION_TASK = 'kosu-konum-takibi';
const KEEP_AWAKE_TAG = 'kosu';

export type TrackingMode = 'background' | 'foreground';

function toInput(loc: Location.LocationObject): LocationInput {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    timestamp: loc.timestamp,
    accuracy: loc.coords.accuracy ?? null,
    speed: loc.coords.speed ?? null,
  };
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations) return;
  addLocations(data.locations.map(toInput));
});

let foregroundSub: Location.LocationSubscription | null = null;

const accuracyOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 2,
};

export type PermissionResult = { ok: true } | { ok: false; message: string };

export async function ensureForegroundPermission(): Promise<PermissionResult> {
  if (!(await Location.hasServicesEnabledAsync())) {
    return { ok: false, message: 'Telefonun konum servisi kapalı. Ayarlardan konumu aç.' };
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, message: 'Koşunu kaydedebilmek için konum iznine ihtiyaç var. Ayarlardan izin verebilirsin.' };
  }
  return { ok: true };
}

/** Konum takibini başlatır ve hangi kipte çalıştığını döndürür. */
export async function startTracking(): Promise<TrackingMode> {
  await stopTracking();

  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status === 'granted' && (await TaskManager.isAvailableAsync())) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        ...accuracyOptions,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Koşu kaydediliyor',
          notificationBody: 'Güzergahın ve hızın takip ediliyor.',
          notificationColor: '#FF5A1F',
          killServiceOnDestroy: false,
        },
      });
      return 'background';
    }
  } catch {
    // Expo Go gibi arka plan konumunu desteklemeyen ortamlar: ön plana düş.
  }

  foregroundSub = await Location.watchPositionAsync(accuracyOptions, (loc) => addLocations([toInput(loc)]));
  await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
  return 'foreground';
}

export async function stopTracking(): Promise<void> {
  foregroundSub?.remove();
  foregroundSub = null;
  deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    // Görev hiç başlamamış olabilir.
  }
}
