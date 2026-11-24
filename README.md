# Koşu

Koştuğun güzergahı haritada çizen, süreni, mesafeni, anlık hızını ve temponu canlı gösteren telefon uygulaması. Tek kod tabanı hem Android hem iPhone'da çalışır (Expo / React Native).

## Neler var

- **Canlı takip:** Başlat, Duraklat, Devam, Bitir. Güzergah haritada turuncu çizgiyle çizilir, harita seninle birlikte kayar.
- **Ekranda:** süre, mesafe (km), anlık hız (km/sa), anlık tempo ve ortalama tempo (dk/km).
- **Ekran kilitliyken takip:** Uygulama olarak kurulduğunda (aşağıdaki 2. yol) telefon cebindeyken de konum alınır. Android'de bildirim çubuğunda "Koşu kaydediliyor" görünür.
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

## 2. yol: Uygulama olarak kurmak (ekran kilitliyken takip)

Ekran kilitliyken takip yalnızca telefona kurulan kendi uygulamanda çalışır, Expo Go'da çalışmaz. Derlemeyi Expo'nun bulut sunucuları (EAS) yapar, bilgisayarına Xcode veya Android Studio kurman gerekmez.

### Hazırlık (bir kez)

1. Bilgisayarda proje klasörüne gir ve en son kodu al:
   ```bash
   cd run_app
   git pull
   npm install
   ```
2. EAS aracını kur ve Expo hesabınla giriş yap:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Projeyi Expo hesabına bağla (soru sorarsa **Y** de):
   ```bash
   eas init
   ```

### iPhone için

iPhone'a kendi uygulamanı kurmak için **Apple Developer Program** üyeliği gerekir (yıllık 99 $, [developer.apple.com/programs](https://developer.apple.com/programs/)). Üyelik onayı birkaç saat ile bir gün sürebilir.

1. iPhone'unu tanıt. Komut bir QR kod / bağlantı verir, iPhone'da açıp profili yükle:
   ```bash
   eas device:create
   ```
2. iPhone'da **Ayarlar > Gizlilik ve Güvenlik > Geliştirici Modu**'nu aç (telefon yeniden başlar).
3. Derlemeyi başlat. Apple hesabınla giriş yapmanı ister, sertifikaları kendisi oluşturur (sorulara **Y** de):
   ```bash
   eas build --profile preview --platform ios
   ```
4. 10 ila 20 dakika sonra bir bağlantı ve QR kod verir. iPhone'da açıp **Yükle**'ye bas.

**Ücretsiz seçenek (Mac gerekir):** Mac'in varsa Xcode'u kurup ücretsiz Apple kimliğinle telefona doğrudan yükleyebilirsin: iPhone'u kabloyla bağla, `npx expo run:ios --device` çalıştır. Bu yolla kurulan uygulama 7 gün sonra açılmaz olur, tekrar yüklemek gerekir.

### Android için

Ücretsizdir, Google hesabı gerekmez.

1. Derlemeyi başlat (sorulara **Y** de):
   ```bash
   eas build --profile preview --platform android
   ```
2. 10 ila 20 dakika sonra bir bağlantı ve QR kod verir. Telefonda açıp APK'yı indir ve kur ("Bilinmeyen kaynaklara izin ver" sorulursa izin ver).

Kendi derlenmiş Android uygulamasında haritanın görünmesi için Google Maps anahtarı gerekir (aşağıya bak).

### İlk açılışta izinler

- Konum izni sorulduğunda önce **"Uygulamayı Kullanırken"** seç.
- Koşuyu başlatınca ikinci kez sorar: iPhone'da **"Her Zaman İzin Ver"**, Android'de **"Her zaman izin ver"** seç. Bunu seçmezsen ekran kilitliyken takip olmaz.
- Android bildirim izni isterse ver: koşu sürerken bildirim çubuğunda "Koşu kaydediliyor" görünür.

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
