# Sprite (PNG) hazırlama rehberi

## 1. Eşya / bina / araç görselleri (`public/sprites/*.png`)

**Izgara:** Oyunda bir kare (tile) 1x ölçekte **64 x 32 px** bir eşkenar dörtgendir (izometrik 2:1).

**Önerilen PNG boyutu:** Çalışma boyutu 4 kat → 1 karelik taban = **256 x 128 px**.
Çok kareli eşyanın taban genişliği = `(wTiles + hTiles) * 128` px.

| Eşya | Kaplama | Taban genişliği | Önerilen toplam görsel |
|---|---|---|---|
| Bank, saksı, lamba | 1x1 | 256 | ~300 x 300 |
| Araba | 2x1 | 384 | ~450 x 330 |
| Otobüs durağı, yemek aracı | 3x1 / 3x2 | 512 / 640 | ~600 x 450 |
| Saat kulesi | 2x2 | 512 | ~520 x 900 (uzun) |

- Arka plan **şeffaf PNG** olsun. Çevredeki boş kenarlar otomatik kırpılır (auto-trim), özenle kesmene gerek yok.
- 1248x832 gibi çok büyük görseller çalışır ama gereksizdir: oyun yüklerken zaten ekran boyutuna küçültür (kademeli, kaliteli küçültme v18'de eklendi). Net sonuç için ~4x yeterli, 8x+ sadece yükleme süresini uzatır.
- Işık sol-üstten gelsin, gölgeyi çizme (oyun yumuşak temas gölgesini kendisi ekler).
- Kameraya **izometrik açıdan** (yaklaşık 30° yüksek, 45° yatay) bakan, her zaman aynı açıda çizilmiş görseller kullan; tek tek farklı perspektifler hizayı bozar.

**Yön / döndürme (v18):**
- Görseli `rot = 0` hâli için çiz: eşyanın **uzun kenarı sağ-aşağı doğru (gx yönünde)** uzansın.
- Düzenle modundaki **döndür** düğmesi (`rot = 1`) görseli **otomatik aynalar** ve kapladığı kareleri **yer değiştirir** (2x1 → 1x2). Yani 2. bir görsel çizmene gerek yok; araba/otobüs/tezgah artık hem görünüş hem çarpışma olarak döner.
- Kendi içinde yazı/logo olan görsellerde aynalama yazıyı ters gösterir; yazıyı görsele gömme.

**Koda tanıtma:** `lib/sprites.ts` içindeki `FURNI_SPRITES` girdisi:
```ts
car_red: { src: "/sprites/car_red.png", wTiles: 2, hTiles: 1, drawW: 96, drawH: 74, offsetX: 0, offsetY: 8 }
```
- `wTiles/hTiles`: kapladığı kare (sunucudaki `_furni_w/_furni_h` ile aynı olmalı; `supabase/schema.sql`).
- `drawW`: ekranda çizilecek genişlik (1x ölçekte px). Başlangıç için `(wTiles + hTiles) * 32 + 8`.
- `drawH`: **kırpılmış görselin en-boy oranına göre** = `drawW * görselYüksekliği / görselGenişliği` (yoksa görsel sıkışır/gerilir).
- `offsetX/offsetY`: ince ayar (px). Görsel zemine gömülü görünüyorsa `offsetY`'yi artır.

## 2. Karakter (avatar) görselleri

Şu an karakterler kodla (canvas) çiziliyor (`drawStandardAvatar`). Sprite tabanlı karakter için önerilen yapı:

- **Katmanlı parçalar, hepsi aynı kare boyutunda ve aynı sabitleme noktasıyla:** gövde, kafa, saç, üst, alt, ayakkabı, şapka, gözlük, sırt. Katmanlar üst üste çizilir; böylece kıyafet/saç kombinasyonları oyunda birleşir.
- **Kare boyutu:** 128 x 192 px (1x ölçekte ~32 x 48; 4x çalışma boyutu). Ayak ortası karenin alt-orta noktası olsun.
- **Yönler:** 4 yön (GD, GB, KD, KB); sadece 2'sini çiz (GD ve KD), diğerlerini oyun aynalasın.
- **Animasyonlar:** `idle` (1–2 kare), `walk` (4 veya 6 kare), `sit` (1 kare). Her animasyon ayrı satır, her yön ayrı sütun grubu olan tek bir sprite sheet.
- **Renklendirme:** ten/saç/giysi rengi oyunda değişebilsin diye parçaları **gri tonlamalı** çizersen oyun rengi uygular.
- Dosya adı örneği: `public/sprites/avatar/body_01.png`, `hair_07.png`, `top_03.png` ...

**Telif notu:** Başka bir oyunun (ör. Habbo) sprite'larını ya da ekran/dosya dökümlerini kullanma. Hem telif hem hesap/yayın riski var. Kendi çizimin, kendi ürettiğin veya lisansı açıkça serbest olan (CC0 vb.) görselleri kullan.
