# Değişiklik günlüğü

## v2.1 · Kasım 2026

Yeni
- **Seviye rekoru:** her seviyede en az araçla kazandığın sonuç yerel olarak kaydedilir (`arena.pamukkale.records`). Sonuç ekranı rekorunu gösterir, kırdığında "Yeni rekor" yazar; seviye listesinde düğmenin başlığında ve erişilebilir adında görünür.
- **Daha coşkulu zafer:** seviye bitince her havuzdan su parçacıkları fışkırır, dokunmatik cihazda kısa titreşim gelir. "Hareketi azalt" açıksa ya da kalite düşükse parçacık sayısı azalır.
- **Yenilikler penceresi ve sürüm etiketi:** ana menüde "Yenilikler" düğmesi (yeni sürümde nokta ile işaretlenir), menü altında "v2.1 · Kasım 2026" ve "Diğer oyunlar" bağlantısı. Escape ile kapanır.

Düzeltme
- Açıklama metni (description, Open Graph, Twitter) Türkçe ve İngilizce yazıldı; paylaşım kartına başlık, açıklama, görsel ve görsel metni eklendi.
- Boş (`data:,`) simge yerine gerçek bir SVG simge; `canonical` ve `theme-color` eklendi.
- Başlık ekranında boş "en iyi" hapı küçük bir leke gibi görünüyordu; gizlendi. Öğretici "Geç" düğmesi dokunmatik cihazda 44 px yüksekliğe çıkarıldı.
- Bulunamayan adresler için `404.html` eklendi.
- `tools/smoke.mjs` ve `tools/gate.mjs`: `PW_CHROMIUM` ortam değişkeniyle kurulu bir tarayıcı yolu verilebilir (CI davranışı değişmez).

Dokunulmayanlar: su simülasyonu, seviyeler, kayıt anahtarları (`arena.pamukkale.save`, `.settings`, `.best`) ve oyun adresi aynı. Eski kayıtla açılış denendi (bkz. `test/duman.mjs`).

## v2.0 · Kasım 2026

Yeniden tasarım (pastel traverten, kostikli su), 23 seviye, savak kapaklı "Kalsiyum Zamanı" bölgesi, günlük meydan okuma, erişilebilirlik paneli.
