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

---

## 3. v26 — Büyütme ve PNG'ye geçiş yol haritası

**Ne değişti:** Dünya yakınlaştırması `lib/iso.ts` başında (`WORLD_ZOOM_LARGE=1.4`, `WORLD_ZOOM_LARGE_MOBILE=1.05`, `WORLD_ZOOM_SMALL=1.4`),
karakter ek büyütmesi `CHAR_K=1.3`. Tek yerden ayarlanır; tüm kodla çizilen şeyler (cadde, zemin, bina, araç) `l.scale` ile birlikte büyür.
Tıklama/isabet testleri aynı ölçeği kullanır.

**Mevcut PNG durumu:** 48 eşya/araç/bina zaten PNG (`public/sprites`). Kodla çizilen kalan: `rug` (halı), zemin/duvar/yol karoları,
at, NPC kıyafet detayları, gazete/olta, arka-yön (kuzey) araba görünümü, karakterin tamamı (katmanlı sprite var ama varsayılan değil).

### Benden istenenler (öncelik sırasıyla)
1. **Karakter katmanları** (en önemli): 192 x 288 px kare (karakter 1.3x büyüdüğü için eskisinden %50 büyük çiz), alt-orta = ayak.
   Gri tonlamalı: `body`, `face`, `legs`, `shirt`, `hs_*` (saç, ön+arka `_b`), `top_*` (özel üstler). Eksik: ayakkabı (`shoe_*`),
   şapka (`hat_*`), gözlük (`glasses_*`), sırt (`back_*`), 4 yön x (idle 2, walk 6, sit 1) sprite sheet.
2. **Araçlar:** `car_red/blue/yellow` bugün tek yönlü; her biri için ikinci görsel (kuzey-batı yönü) `car_*_b.png`, 384x256 px, 2x1 taban.
   Yeni araç türleri: otobüs (3x1), taksi, polis, kamyonet.
3. **Zemin karoları (256x128, eşkenar dörtgen, dikişsiz):** `tile_stone`, `tile_wood`, `tile_grass`, `tile_road`, `tile_sand`, `tile_carpet`, `tile_snow`.
4. **Duvarlar:** `wall_*` 256 x 460 (sol/sağ duvar için ayrı), pencere/kapı varyantları.
5. **Eşya ayrıntısı:** `rug` (2x2, 512x256) ve ev eşyaları için 2. renk varyantları (`sofa_b`, `bed_b`, ...).
6. **Hayvan/at:** `horse_idle`, `horse_walk` (6 kare) 192 x 192.

### Kuralların özeti
- Hepsi şeffaf PNG, izometrik 2:1, ışık sol-üstten, gölge yok (oyun ekliyor), 4x çalışma boyutu (1 kare = 256x128).
- Dosya adları yukarıdaki gibi küçük harf + alt çizgi; ben `lib/sprites.ts` içine tanıtmayı yaparım (boyutlar doğruysa `drawW/drawH`'ı otomatik hesaplarım).
- **Hepsini ben de üretebilirim:** kodla piksel-sanat (v8/v9'daki gibi) üretip PNG'ye dökebilirim; ama senin çizdirdiğin/lisanslı görseller her zaman daha özgün ve detaylı olur. Hangisini istediğini söylemen yeterli.


---

## 4. v27 — 3D'den üretilmiş 4 yönlü karakter (public/sprites/avatar3)

Karakterin tüm parçaları artık PNG katmanıdır ve oyunun varsayılanıdır (ayarlardan "Katmanlı karakter" kapatılırsa eski vektör çizime döner).
Üretici: `tools/gen_char3d.py` (+ `tools/r3d.py` ışın izleyici, `tools/char3d.py` model tanımları). Çalıştırma: `python3 tools/gen_char3d.py hepsi` (numpy, scipy, Pillow gerekir; ~10 dk).

**Sheet düzeni:** 8 sütun x 4 satır, kare 224x304 px (1 birim = 4 px), ayak noktası kare alt-ortasının 8 px üstü.
Sütun: 0 duruş, 1–6 yürüyüş, 7 oturuş. Satır (yön): 0 güneydoğu, 1 güneybatı, 2 kuzeybatı, 3 kuzeydoğu.

**Katmanlar (çizim sırası):** `bk_*` (sırt) → `legs` → `shoes` → `body` (ten rengiyle çarpılır) → `shirt` (tişört rengi) → `tp_*` (kıyafet) → `face` → `hs_*` (saç rengi) → `hat_*` → `gl_*`.
- Renkle çarpılanlar gri tonlu: body, shirt, hs_*. Diğerleri kendi renginde.
- Her katman yalnızca gövdenin önünde görünen pikselleri içerir; bu yüzden katmanlar birbirinin üstüne sorunsuz biner.
- **Kendi PNG'ni koymak:** aynı ad ve aynı sheet düzeniyle `public/sprites/avatar3/` içine at; oyun otomatik kullanır.
- **Yeni parça eklemek:** `tools/char3d.py` içine tanımla (hat/glasses/back/hair/top fonksiyonları), `gen_char3d.py` listesine ve `lib/avatarLayers.ts` listelerine ekle.

Sırada (v28 planı): araçlar (4 yönlü), zemin/duvar karoları, eşyaların 4 yönlü sürümleri, at.

---

## 5. v28 — 4 yönlü araçlar (public/sprites/veh)

Üretici: `python3 tools/gen_vehicle3d.py [ad]` (araç modelleri aynı dosyada). Araçlar: `car_red, car_blue, car_yellow (taksi), police, pickup, bus`.
**Sheet:** 4 sütun (0 güneydoğu, 1 güneybatı, 2 kuzeybatı, 3 kuzeydoğu) x 1 satır, kare 480x360, araç merkezi (zemin) karede (240, 240). 1 birim = 4 px.
Cadde 1 trafiği artık iki yönlü: şerit 8 güneydoğuya, şerit 7 kuzeybatıya akar ve doğru yöne bakan sprite çizilir (ayna yok). Kendi aracını eklemek için aynı ad/düzenle PNG koy; yeni tür için `lib/vehicles.ts` listesine ve `engine.ts` trafik listesine ekle.
Park halindeki arabalar (yerleştirilebilir eşya) hâlâ kendi AI görsellerin; 4 yönlü araçlar şimdilik yalnız trafikte.

---

## 6. v29 — PNG zemin karoları ve duvarlar (public/sprites/tiles)

Üretici: `python3 tools/gen_tiles.py [zemin|duvar|hepsi]` (numpy, scipy, Pillow). Dokular gri tonludur; oyun tema rengiyle çarpar (`lib/tiles.ts`), bu yüzden renk değişince PNG değişmesi gerekmez.
- **Zemin:** `floor_<tür>.png`, türler: wood, sand, grass, brick, asphalt, soil, stone, marble, carpet, plain. 4 varyant yan yana (her biri 256x128 eşkenar dörtgen), dikişsiz; karoya göre varyant seçilir.
- **Duvar:** `wall_<tür>.png`, türler: plaster, brick, wood, tile, metal, stone. 180x440 düz doku (bir kare uzunluğu x duvar yüksekliği), yatayda dikişsiz; taç silme, süpürgelik ve lambri dokunun içindedir.
- Oda → duvar türü eşlemesi `wallKindFor` (lib/tiles.ts); zemin türü `tileStyle` (lib/draw.ts) içindeki `kind`.
- Kendi dokunu koymak için aynı ad ve ölçüyle PNG'yi değiştir. Doku yüklenemezse eski kodla çizim otomatik devreye girer.

---

## 7. v30 — 4 yönlü süvari atı (public/sprites/horse)

Üretici: `python3 tools/gen_horse3d.py` (~15 dk; at modeli aynı dosyada). İki sheet: `horse.png` (at, kareler: 0 duruş, 1–6 dörtnala) ve `rider_legs.png` (binicinin bacak+ayakkabısı).
Düzen: 8 sütun x 4 satır (satır = yön: 0 güneydoğu, 1 güneybatı, 2 kuzeybatı, 3 kuzeydoğu), kare 320x304 px, 1 birim = 4 px, ayak noktası kare alt-ortasının 8 px üstü. Oyunda 1.2x büyütülür (`HORSE_K`, lib/horse.ts).
Çizim sırası: at → binici bacakları → karakter katmanları (bacak/ayakkabı olmadan). Kendi at PNG'ni aynı adla koyarsan oyun onu kullanır; yüklenemezse eski vektör at çizilir.

## 8. v31 — 4 yönlü 3D eşyalar
- `tools/gen_furni3d.py` → `public/sprites/f3/<tür>.png` (4 sütun = rot 0..3) + `lib/furni3d.ts`.
- Türler: bench, chair, sofa, lounger, tv, bookshelf, bed, logseat.
- rot 2 ve 3 her zaman 3D çizilir; rot 0-1 yalnız Ayarlar > "3D eşyalar (tüm yönler)" açıkken.
- `rotate_furni` bu türlerde 4 adım döner (schema.sql güncellendi, tekrar çalıştır).

## 9. v32 — 15 eşya daha (toplam 23 tür, 4 yönlü)
Yeni: beanbag, plant, lamp, streetlight, table, counter, casinotable, bin, umbrella, campfire, mannequin, surfboard, phone_booth, kiosk, ore_cart.
- Üretim: `python3 tools/gen_furni3d.py <tür...>`; yeni tür için modeli ve `ITEMS` satırını ekle, türü `lib/constants.ts` `FURNI_DIRS` ve `supabase/schema.sql` rotate_furni listesine yaz.
- Çok karolu büyük eşyalar (tezgâhlar, mağazalar, çiçeklik, otobüs durağı, pano) hâlâ eski PNG; sıradaki iş.

## 10. v33 — çok karolu büyük eşyalar (toplam 31 tür)
Yeni: stall_red, stall_blue, flower_bed, bus_stop, billboard, clock_tower, fountain_big, food_truck.
- Modelde z ekseni = wTiles, x ekseni = hTiles (45 birim/karo); çerçeve boyutu ≈ (w+h)*127+40 px genişlik.
- Hâlâ eski PNG: mağazalar, casino barı, sahil kafesi, DJ, tiki bar, balıkçı kulübesi, maden girişi, mutfak, ambar, arabalar, ağaç/palmiye.

## 11. v35 — bank büyüdü, bellek ve otomatik düşük kalite
- Bank 3D modeli 1.3x büyütüldü (tools/gen_furni3d.py `SCALE`), oturma yüksekliği `SEAT_AY.bench = -5`.
- Renkli karakter parçaları artık tüm sheet yerine yalnız kullanılan kare için boyanıyor (yüzlerce MB bellek tasarrufu).
- Ortalama fps ~30'un altına düşerse oyun kendiliğinden düşük kaliteye geçer (parçacık yok, çözünürlük 1x).
