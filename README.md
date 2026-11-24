# Koşu

Koştuğun güzergahı haritada çizen, süreni, mesafeni, anlık hızını ve temponu canlı gösteren telefon uygulaması. Tek kod tabanı hem Android hem iPhone'da çalışır (Expo / React Native).

## Neler var

- **Canlı takip:** Başlat, Duraklat, Devam, Bitir. Güzergah haritada turuncu çizgiyle çizilir, harita seninle birlikte kayar.
- **Ekranda:** süre, mesafe (km), anlık hız (km/sa), anlık tempo ve ortalama tempo (dk/km).
- **Ekran kilitliyken takip:** Kendi derlenmiş uygulamada (aşağıdaki 2. yol) telefon cebindeyken de konum alınır. Android'de bildirim çubuğunda "Koşu kaydediliyor" görünür.
- **GPS hatası süzme:** Doğruluğu 30 m'den kötü ölçümler, 43 km/sa'ten hızlı görünen sıçramalar ve yerinde dururken oluşan küçük titreşimler mesafeye eklenmez.
- **Geçmiş:** Biten koşu kaydedilir. "Geçmiş" sekmesinde listelenir, dokununca güzergahı haritada ve özetiyle açılır, silinebilir.
- Uygulama koşu sırasında kapanırsa, açıldığında koşu kaldığı yerden devam eder.

## 1. yol: Hızlıca telefonda denemek (Expo Go)

Bilgisayarda Node.js (20 veya üstü) kurulu olmalı.

```bash
git clone https://github.com/berkbayram6/run_app.git
cd run_app
npm install
npx expo start
```

Telefonuna **Expo Go** uygulamasını kur (App Store / Google Play). Ekranda çıkan QR kodu Android'de Expo Go ile, iPhone'da kamerayla okut. Telefon ve bilgisayar aynı Wi‑Fi'de olmalı (değilse `npx expo start --tunnel`).

Expo Go'da arka plan konumu çalışmaz: uygulama bunu fark eder, ekranı açık tutar ve üstte bir uyarı gösterir. Koşu boyunca uygulamayı önde tut.

## 2. yol: Kendi uygulamanı derlemek (ekran kilitliyken takip)

Ücretsiz bir [Expo hesabı](https://expo.dev/signup) aç, sonra:

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

Derleme bitince verilen bağlantıdan APK'yı telefona indirip kur. iPhone için `--platform ios` gerekir ve bunun için Apple Developer hesabı (yıllık 99 $) şart.

Kurulumda konum izni sorulduğunda **"Her zaman izin ver"** seçeneğini seç, yoksa ekran kilitliyken takip olmaz.

### Android'de harita için Google Maps anahtarı

Expo Go'da harita anahtarsız çalışır. Kendi derlediğin Android uygulamasında haritanın görünmesi için ücretsiz bir Google Maps Android API anahtarı gerekir: [Google Cloud Console](https://console.cloud.google.com/)'da "Maps SDK for Android"ı açıp bir anahtar oluştur, sonra `app.json` içinde `plugins` listesine ekle:

```json
["react-native-maps", { "androidGoogleMapsApiKey": "ANAHTARIN" }]
```

iPhone'da Apple Haritalar kullanılır, anahtar gerekmez.

## Kod yapısı

| Dosya | Görevi |
| --- | --- |
| `index.ts` | Giriş noktası, arka plan konum görevini uygulamadan önce yükler |
| `App.tsx` | Alt sekmeler (Koşu / Geçmiş) |
| `src/tracker.ts` | Konum izni, arka plan / ön plan takibi |
| `src/runStore.ts` | Aktif koşunun durumu, mesafe ve hız hesabı, yarım koşuyu kaydetme |
| `src/geo.ts` | Mesafe formülü, GPS süzme, süre / tempo biçimlendirme |
| `src/history.ts` | Bitmiş koşuları telefonda saklama |
| `src/screens/RunScreen.tsx` | Canlı takip ekranı |
| `src/screens/HistoryScreen.tsx` | Geçmiş koşular ve detay |

## Sonraki adımlar için fikirler

- Kilometre başına ara süreler ve tempo grafikleri
- Sesli bildirim ("1 kilometre, tempo 5:30")
- Koşuyu GPX olarak dışa aktarma
