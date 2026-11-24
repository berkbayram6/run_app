// Konum hesapları ve biçimlendirme. React Native'e bağımlı değil, böylece test edilebilir.

export type Point = {
  latitude: number;
  longitude: number;
  /** Zaman damgası (ms) */
  t: number;
};

const EARTH_RADIUS_M = 6371000;

/** İki nokta arasındaki mesafe (metre), haversine formülü. */
export function distanceMeters(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bundan kötü doğruluktaki (metre) GPS ölçümleri yok sayılır. */
export const MAX_ACCURACY_M = 30;
/** Bundan hızlı (m/s, ~43 km/sa) görünen sıçramalar GPS hatası sayılır. */
export const MAX_SPEED_MS = 12;
/** Bundan kısa hareketler (metre) yerinde dururken oluşan titreşim sayılır. */
export const MIN_STEP_M = 3;

export type StepResult =
  | { accepted: false }
  | { accepted: true; meters: number; speed: number | null };

/**
 * Yeni bir ölçümün güzergaha eklenip eklenmeyeceğine karar verir.
 * `prev` null ise bu, bölümün ilk noktasıdır.
 */
export function evaluateStep(prev: Point | null, next: Point, accuracy: number | null): StepResult {
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return { accepted: false };
  if (!prev) return { accepted: true, meters: 0, speed: null };
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0) return { accepted: false };
  const meters = distanceMeters(prev, next);
  if (meters < MIN_STEP_M) return { accepted: false };
  const speed = meters / dt;
  if (speed > MAX_SPEED_MS) return { accepted: false };
  return { accepted: true, meters, speed };
}

/** 754000 ms -> "12:34", 3754000 -> "1:02:34" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Metre -> "3,42" (km, Türkçe ondalık virgül) */
export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(2).replace('.', ',');
}

/** m/s -> "10,8" (km/sa) */
export function formatSpeedKmh(speedMs: number | null): string {
  if (speedMs == null || !isFinite(speedMs)) return '0,0';
  return (speedMs * 3.6).toFixed(1).replace('.', ',');
}

/** Saniye/km -> "5:32". Anlamsız değerlerde "–:––". */
export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm == null || !isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) {
    return '–:––';
  }
  const rounded = Math.round(secondsPerKm);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Hızdan (m/s) tempo (sn/km). Çok yavaşsa (yürüme altı) null. */
export function paceFromSpeed(speedMs: number | null): number | null {
  if (speedMs == null || speedMs < 0.5) return null;
  return 1000 / speedMs;
}

/** Ortalama tempo (sn/km). */
export function averagePace(elapsedMs: number, meters: number): number | null {
  if (meters < 10) return null;
  return elapsedMs / 1000 / (meters / 1000);
}

/** Koordinatları kapsayan harita bölgesi. */
export function regionForPoints(points: { latitude: number; longitude: number }[]) {
  if (points.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.005, (maxLat - minLat) * 1.4),
    longitudeDelta: Math.max(0.005, (maxLon - minLon) * 1.4),
  };
}
