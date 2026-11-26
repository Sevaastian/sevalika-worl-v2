# Sevalika World

Habbo tarzı izometrik, çok oyunculu sosyal oyun. **Next.js 16 + Tailwind 4 + Supabase** (Auth, Postgres, Realtime), canvas ile çizim.

## Hızlı başlangıç (Supabase olmadan, demo)

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` yoksa oyun **çevrimdışı demo** modunda açılır: giriş ekranında bir isim yaz, oyna. Her şey tarayıcıda çalışır, kaydedilmez, başka oyuncu görünmez. Yeni özellikleri denemek için idealdir (demo kullanıcı admin'dir).

## Gerçek kurulum (Supabase + Vercel)

### 1) Supabase projesi
1. [supabase.com](https://supabase.com) → yeni proje aç.
2. **Authentication → Providers → Email**: **"Confirm email" seçeneğini KAPAT** (oyuncular e-posta girmiyor; arka planda `kullaniciadi@sevalika.game` üretiliyor).
3. **SQL Editor**:
   - Eski (v1) projenden geliyorsan önce `supabase/00-legacy-cleanup.sql` dosyasını **bir kez** çalıştır (eski düz metin şifreli tabloları siler).
   - Sonra `supabase/schema.sql` dosyasının tamamını yapıştırıp **Run**. (Tekrar çalıştırılabilir; **v2'den yükseltiyorsan da aynen bunu çalıştır**, veri silmez.)
4. **Project Settings → API**: `Project URL` ve `anon public` anahtarını al.

### 2) Ortam değişkenleri
`.env.example` dosyasını `.env.local` olarak kopyala ve doldur:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

`npm run dev` ile aç, bir hesap oluştur.

### 3) Kurucu / admin hesabı
Kimsenin nick kapıp admin olamaması için **otomatik admin yok**. Oyunda `sevaastian` (ve istersen `vistekiis`) adıyla **kayıt ol**, sonra SQL Editor'de `supabase/01-promote-founders.sql` dosyasını çalıştır. Giriş yapınca 👑 Admin paneli görünür. Kurucuların rütbesi başkası tarafından değiştirilemez / kurucu oyundan atılamaz.

### 4) Vercel
Repoyu GitHub'a at → Vercel'de içe aktar → aynı iki ortam değişkenini **Settings → Environment Variables**'a ekle → Deploy.
`.env.local` dosyasını asla commit'leme (`.gitignore` zaten engelliyor).

## Sorun giderme
| Belirti | Çözüm |
|---|---|
| "Hesap oluşturuldu ama oturum açılmadı" | Authentication → Email → **Confirm email** kapalı olmalı. |
| "…sahte e-posta alan adını reddetti" | Supabase bazı alan adlarını reddedebilir (MX kaydı yoksa). Sahip olduğun bir alan adını `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` olarak ver (e-posta gönderilmediği için gerçek posta kutusu gerekmez, ama alan adının MX kaydı olmalı). **Not:** Bu davranışı gerçek bir Supabase projesinde test edemedim. |
| Oda eşyaları/duyurular canlı gelmiyor | `schema.sql` en altında `rooms`, `admin_events`, `messages` ve `user_events` Realtime yayınına eklenir; Dashboard → Database → Replication'dan kontrol et. |
| "Eski (v1) tablolar bulundu" | Önce `00-legacy-cleanup.sql`. |

## Oyun rehberi
- Yere tıkla → yürür. Parlayan **🚪 kapı karelerine** basınca odalar arası geçersin. Odalar: Cadde 1, VIP Çatı Katı (VIP+), Monako Kulüp, **Sahil İskelesi**, **Sahil Restoranı** ve herkesin kendi odası (**🏠 Evim**).
- **Sohbet** sunucuda doğrulanır (gönderen taklit edilemez; 1 sn aralık, tekrar/spam engeli, susturma). Komutlar: `/dans`, `/otur`, `/zar`, `/ev`, `/el`, `/kalp`, `/gul`, `/alkis`, `/yardim`; VIP+: `/pm nick mesaj` (gerçekten özel); Admin: `/duyuru`, `/kick`, `/herkesdans`, `/dansdurdur`.
- **👥 Arkadaşlar**: nick ile istek gönder/kabul et, çevrimiçi arkadaşın odasına veya evine git. Kendi odanın girişini *Herkes / Arkadaşlar / Sadece ben* diye ayarla.
- **🎁 Hediye**: bir oyuncuya tıkla → Sanil veya eşya gönder. **🚩 Şikayet** de aynı kartta.
- **👕 Mağaza** (avatar panelinden): şapka, gözlük, saç stilleri. Sunucu satın almayı ve sahipliği doğrular.
- **🎣 Balık tutma**: İskele'de Balıkçı Hasan'a tıkla → olta al (200 Sanil) → çantandan *Kuşan* → denize tıkla. Balık sunucuda rastgele seçilir (en az 2,5 sn arayla). Restorandaki Şef Kemal'e satarsın (çizme 5 … batık hazine 250 Sanil).
- **🎯 Bilgi yarışması** (admin): soru + gizli cevap + ödül; ilk doğru bilen kazanır, cevap istemciden okunamaz.
- Emoji tepkileri, **gece/gündüz** tonlaması (yerel saate göre) ve odaya göre değişen **ortam müziği** (Müzik düğmesi; tarayıcılar kendiliğinden ses başlatmaz).
- **🛠️ Düzenle**: Yerleştir / Kaldır, `R` ile döndür. Kendi odanda her şeyi, ortak odalarda kendi eşyanı kaldırırsın.
- Admin paneli: duyuru, rütbe, Sanil, at, **sustur, yasakla (süreli/süresiz)**, yarışma, **şikayetler** ve **yönetim kayıtları**.
- Demo modunda gezinen bot (Cemre) ve örnek arkadaşlar (Cemre, Deniz) bulunur; mute/ban/kick demo'da kullanılamaz.

## v4 yenilikleri

- **Günlük görevler** (📜): her gün 5 görev, ödülü Sanil + XP. Gece yarısı yenilenir.
- **XP / seviye / başarımlar**: 9 başarım, seviye atlayınca bildirim.
- **Pazar yeri** (🏪): eşya/balık ilanı ver, %5 komisyon; belirli kişiye özel ilan (takas) mümkün. Eşya ilan süresince sunucuda emanette durur.
- **Balık turnuvası**: Admin > Yarışma sekmesinden başlatılır; en çok değerde balık tutan 500/250/100 Sanil kazanır.
- **Evcil hayvan** (Mağaza > Evcil): sahibini takip eder, diğer oyuncular da görür.
- **Profil kartı**: oyuncu kartında 👤 Profil.
- **Hava durumu** (otomatik / yağmur / kar / kapalı) ve **ses efektleri**.
- **Kaldığın odadan devam**: giriş yapınca son odana dönersin.

> v4 için `supabase/schema.sql` dosyasını SQL Editor'de **tekrar çalıştır** (güvenli, tekrar çalıştırılabilir) ve yeniden deploy et.

## v5 yenilikleri

- **`/yardim`**: oyunu tanıtan ve özellikleri sayan metin + komut listesi.
- **Yeni odalar**: Restoran → **Çiftlik** → **Taş Ocağı Madeni**.
- **Madencilik** (Madenci Recep): kazma al (300 S), kayalara yaklaşıp kaz; kömür/demir/altın/zümrüt, madende satılır.
- **Çiftlik** (Çiftçi Ayşe): 6 tarla, buğday/domates/kabak; süre gerçek zamanlı (2/5/10 dk, demoda 1/10'u).
- **Aşçılık** (Şef Kemal): balık + ekin = yemek, ham maddeden çok daha pahalı.
- **Lonca** (🛡️): 1000 S ile kur, katıl/ayrıl/çıkar, kasaya bağış → lonca seviyesi → üyelere %5/seviye XP bonusu (max %25) ve üye kapasitesi.
- **Masalar** (Monako Kulüp, Krupiye Selim): zar düellosu ve blackjack (bahis 10–500, sonuçlar sunucuda).
- **Mini oyunlar** (admin başlatır): 🚩 bayrak kapma (bayrağa yaklaşıp butona bas), 🙈 ebelemece (rastgele ebe, yakaladığı kişiyi etiketler).
- **Sunucu tarafı konum doğrulama**: istemci konumunu 4 sn'de bir bildirir; sunucu ışınlanmayı/hız ihlalini reddeder. Balık, kazı, satış, çiftlik, masa, bayrak ve ebe işlemleri artık **doğru odada ve yakınlıkta** olmayı gerektirir.
- 5 yeni başarım (toplam 14).

> v5 için `supabase/schema.sql` dosyasını SQL Editor'de **tekrar çalıştır** (tekrar çalıştırılabilir) ve yeniden deploy et. Önceki sürümden gelen eski bir istemciyle çalışmaz (konum bildirimi gerekir).

## Mimari
```
app/                   Next.js sayfa + layout
components/Game.tsx    Ana glue (durum, olaylar, sohbet, balık, NPC)
components/            App, AuthScreen, TopBar, Panels, SocialPanels, AdminPanel, ChatUI, RoleBadge
lib/engine.ts          Canvas motoru: hareket, çizim döngüsü, gece tonu, emote
lib/draw.ts            Oda, deniz, eşya, avatar (saç/şapka/gözlük/olta/NPC), baloncuk
lib/pathfinding.ts     BFS yol bulma
lib/network.ts         Realtime kanalı: konum, animasyon, emote (yalnızca görsel veri)
lib/backend.ts         Tüm sunucu çağrıları (Supabase RPC + abonelikler) + çevrimdışı demo
lib/music.ts           WebAudio ortam müziği
lib/constants.ts       Odalar, NPC'ler, eşya/kozmetik/balık kataloğu, rütbeler
supabase/schema.sql    Tablolar, RLS, güvenli RPC fonksiyonları
```

### Güvenlik modeli
- Şifreler Supabase Auth ile hash'lenir; istemci tablolara **doğrudan yazamaz** (RLS + yazma politikası yok).
- Sanil, envanter, rütbe, eşya, kozmetik, balık, hediye, arkadaşlık, sohbet, moderasyon yalnızca **`SECURITY DEFINER` RPC'leriyle** yapılır (`search_path` boş, `anon`'a kapalı).
- Aynı kullanıcının eşzamanlı istekleri `_me()` içindeki satır kilidiyle sıralanır (Sanil/eşya kopyalama yarışı engellenir).
- Sohbet `messages` tablosuna yazılır, gönderen sunucuda belirlenir; fısıltılar RLS ile yalnızca gönderen ve alıcıya görünür.
- Yarışma cevabı `quiz_state` tablosundadır; istemci okuyamaz.
- Rütbe rozeti presence'tan değil sunucudaki `public_profiles` görünümünden gelir.

### Bilinen sınırlar
1. Avatarın **görünen adı ve konumu** presence'ta istemci beyanıdır; kötü niyetli biri başka birinin adıyla *avatar* gösterebilir (sohbet mesajları ise doğrulanmıştır, rozet de sunucudan gelir). Para/rütbe/eşya etkilenmez.
2. Oda erişimi `enter_room` ile **istemci çağırdığında** denetlenir; hileli bir istemci çağırmadan kanala girebilir. Eşya koyma/alma ise her zaman sunucuda denetlenir.
3. Konum **sunucuda hız/ışınlanma sınırıyla** doğrulanır ama yürünebilir kare/engel kontrolü sunucuda yok; hileli istemci duvar/mobilya içinden geçmiş gibi görünebilir (para etkilenmez, yakınlık kuralları geçerli kalır). Diğer oyuncuların ekranındaki hareket yine istemci beyanıdır.
4. Ebelemece "rastgele ebe" seçimi ve bayrak yeri sunucudadır; ama oyuncuların \"odada\" sayılması son konum raporuna (60 sn) dayanır.
5. Gerçek Supabase Realtime tarafı (`postgres_changes` filtreleri, arkadaş çevrimiçi durumu) yalnızca yerel Postgres + demo arayüzüyle test edildi; canlı projede ilk denemede kontrol et.

## v6 düzeltmeleri (kayma / ışınlanma hatası)
- **Kök neden:** sunucudaki konum doğrulaması hâlâ eski 12x12 harita ve eski doğma noktalarını kullanıyordu. Büyük odalarda karakter her girişte eski noktaya geri çekiliyor, gx>11 olan hareketler sessizce reddediliyordu.
- `rooms` tablosuna `cols/rows/spawn_x/spawn_y` eklendi; sunucu artık `lib/constants.ts` ile aynı boyutları kullanır. `sahil-kasabasi` ve `oyunika` odaları sunucuya eklendi.
- Yerleştirme doğrulaması: oda sınırı, su karesi (iskele/sahil), çok kareli eşya ayak izi çakışması; tüm yeni eşyaların fiyatı eklendi.
- Varsayılan oda eşyaları artık sunucuda tohumlanır (ilk çalıştırmada kamusal odaların eşyaları sıfırlanır, sonraki çalıştırmalarda oyuncu eşyalarına dokunulmaz).
- `schema.sql` tekrar çalıştırılınca `admin_events_kind_check` hatası verebilen eski kısım düzeltildi.
- İstemci: eski odadan gelen gecikmiş konum yanıtı artık karakteri çekmez; Oyunika odasına çekme yalnızca lobideki oyuncular için çalışır.
- **Bilinen sınırlar:** Oyunika istemci otoritelidir (zar/durum taklit edilebilir, para yok); sunucu hareket için çarpışma değil hız/ışınlanma kontrol eder; canlı Supabase Realtime burada test edilmedi.
> `supabase/schema.sql` dosyasını SQL Editor'de **tekrar çalıştır** ve yeniden deploy et.

## v7: mekan tasarımı yenilendi
- Habbo tarzı sıcak/canlı görünüm: parlak zemin desenleri (kaldırım taşı, asfalt, çimen+çiçek, ahşap, kum, halı, mermer, taş), taç silmeli/lambrili duvarlar, kalın zemin kenarı.
- Her oda için yeni renk teması ve temaya uygun eşya yerleşimi (Monako'dan sahil DJ'i çıkarıldı, restoran/VIP/çiftlik/cadde/Oyunika dekoru artırıldı).
- Gece karartması hafifletildi (en fazla %22).
- Üst çubukta açılır "🗺️ Mekanlar" menüsü.
- `rooms.layout_v` eklendi: kamusal oda eşyaları yalnızca düzen sürümü artınca bir kez sıfırlanır.
> `supabase/schema.sql` dosyasını SQL Editor'de **tekrar çalıştır** (kamusal odaların eşyaları yeni düzene döner).

## v8: piksel-art sprite'lar
- Eklenen sprite'lar (public/sprites): sofa, chair, table, counter, casinotable, bin, bookshelf, tv, plant, lamp, logseat, beanbag, surfboard, fountain. Mevcut `streetlight.png` de artık kullanılıyor.
- Hepsi `tools/gen-sprites.py` ile (Python + Pillow) çiziliyor; `python3 tools/gen-sprites.py` çalıştırınca yeniden üretir. Yerine kendi PNG'ni koyarsan (aynı ad) sistem onu kullanır; `lib/sprites.ts` içindeki boyut/ofset değerlerini görsele göre ayarla.

## v9: büyük sahne parçaları
- Yeni çok kareli eşyalar: `casino_bar` (4x2, Monako), `kitchen_block` (4x2, Restoran), `barn` (4x3, Çiftlik). Mağazada da satılır (900/700/1200 Sanil).
- Kaynak: `tools/gen-sprites-big.py`. Sunucu tarafı (`furni_price`, `_furni_w/_furni_h`) güncellendi; oda düzeni sürümü 8 olduğundan kamusal odaların eşyaları schema.sql yeniden çalışınca bir kez yeni düzene döner.

## v10: yön, oturma, uzanma + yeni sahne parçaları
- Karakterler yürürken gittikleri yöne bakar (güneydoğu/güneybatı: yüzü görünür ve yöne döner; kuzeye giderken arkası dönük, saç görünür).
- Oturma: bank/koltuk/sandalye/kütük/armut koltukta uyluk öne, baldır aşağı doğru oturur, eşyanın baktığı yöne döner (rot=1 olan oturaklar yatay çevrilir). Zemine `/otur` ile oturunca bacaklar öne uzanır.
- Şezlongda sırtüstü uzanır (baş sırt dayama tarafında).
- Yeni sprite'lar: fish_hut (İskele), mine_entrance + ore_cart (Maden), bus_stop + phone_booth (Cadde). Casino masaları %50 büyütüldü.
- Kaynak: `tools/gen-sprites-scene.py`. Test için tarayıcıda `/?debug=1` açılırsa `window.__sw` motoru erişilebilir.
> `supabase/schema.sql` dosyasını SQL Editor'de tekrar çalıştır (kamusal oda düzeni sürümü 9).

## v11: animasyon + yerleşim düzeltmeleri
- Yürüme: daha geniş adım/kol salınımı, sallanma, öne eğilme, sıkışıp uzama; duran karakter nefes alır; dans yalpalar.
- Oturma: bacaklar dizden sallanır (zeminde ayak ucu oynar); şezlongta uzanan karakter artık şezlongun üstünde çizilir (derinlik düzeltildi).
- Çiftlik: ağaç/ambar/büfe iç içe geçmeleri giderildi. Sahil ve iskele: sudaki dekor palmiyeleri kara tarafına alındı.
> `supabase/schema.sql` dosyasını tekrar çalıştır (oda düzeni sürümü 10).

## v12 — Sevalika AVM, kıyafet mağazası, ev başlangıç eşyaları
- **🛍️ Sevalika AVM** (`avm`, 28x20): girişi Cadde 1'in kuzey kaldırımındaki parlayan kapı karesi (11,0). Mağaza cepheleri (moda/teknoloji/yemek), mankenler, çeşme, banklar. Gelecekte yeni dükkân/kat eklemek için sağ ve alt alan boş.
- **Stilist Defne** (AVM'de NPC): tıkla → kıyafet mağazası. Satın alma sunucuda `buy_cosmetic` ile **yalnızca AVM odasındayken** yapılabilir (`_in_room('avm')`).
- Profil panelindeki **Gardırop** sadece sahip olduklarını gösterir, tak/çıkar.
- Yeni: 6 şapka, 3 gözlük, **yeni "Üst" slotu** (6 giysi, `profiles.top_style`), 3 saç stili. Fiyatlar `cosmetic_price` içinde.
- Ev odası: bed/bookshelf/tv/lamp başlangıç eşyaları; mevcut (≤3 eşyalı) evlere bir kez eklenir.
- Yeni eşya tipleri: store_fashion/tech/food (4x2), mannequin, bed (2x1).
- **supabase/schema.sql yeniden çalıştırılmalı.**

## v13 — AVM 2. kat, takas, ev dekoru, Sanalika tarzı özellikler
- **AVM 2. Kat** (`avm-kat2`, 26x18): AVM'nin sağ kenarındaki "⬆️ 2. Kat" okundan. **Kuaför Selin** (saç stilleri) ve **Aksesuarcı Mina** (sırt aksesuarı + evcil hayvan). Zemin kattaki Stilist Defne şapka/gözlük/üst giyim satar. Satın alma sunucuda sadece `avm` veya `avm-kat2` odasındayken çalışır.
- **Sırt slotu** (`profiles.back_style`, `bk_` önekli): sırt çantası, pelerin, melek/kelebek/şeytan kanatları (yürürken çırpar).
- **Kıyafet takası:** Pazar'da artık satın alınmış kıyafetler de ilan edilebilir (`market_list_item/market_buy/market_cancel` kıyafet dalı; satılan kıyafet satıcının üzerinden çıkar, alıcının gardırobuna gider, %5 komisyon).
- **Ev dekoru:** Arkadaşlar panelinde "Oda Dekoru": 7 duvar + 7 zemin (`rooms.wall_style/floor_style`, `set_home_style`, ücretli, admin ücretsiz). Zemin dokusu da değişir.
- **Beğeni:** başkalarının evinde "❤️ Odayı Beğen" (`like_home`, kişi başı 1 kez, `rooms.like_count`).
- **Durum mesajı:** avatar panelinde, isim altında ve profil kartında görünür (`set_status`, 40 karakter).
- **📸 Fotoğraf Çek:** avatar panelinden oda görüntüsünü PNG olarak indirir.
- Portal okları tüm odalarda zemin oku olarak çizilir (üzerine gelince isim kutusu).
- **supabase/schema.sql yeniden çalıştırılmalı.** (Sınırlama: ev büyütme yok; canlı Supabase Realtime test edilmedi.)

## v14 — Büyük Cadde 1 + AVM paket dükkanları
- **Cadde 1 (34x22)**: saat kulesi, büyük havuz, yeşil parklar, çiçeklikler, pazar tezgahları, yemek kamyonu, dev ekran, arabalar, otobüs durağı, telefon kulübesi; yer okları ile geçişler.
- **AVM yeni dükkanlar**: 🎭 Kostüm Evi Lale (6 kombin seti, %20 indirimli, sahip olunanlar tekrar ödenmez) ve 🛋️ Mobilyacı Kerem (5 eşya paketi → çanta, çanta limiti 60).
- Sunucu: `buy_bundle(p_id)` (+ `_bundle_items`), AVM odasında olma kontrolü, fiyat sunucuda.
- **Uygulama**: `supabase/schema.sql` dosyasını tekrar çalıştır (cadde-1 yeniden kurulur) ve yeniden deploy et.

## v15 — Emlak sistemi, Rehber Yağmur
- **Evsiz başlangıç:** yeni oyuncuların evi yok. Cadde 1'in alt kenarındaki 🏡 ok → **Emlak Ofisi** odası → Emlakçı Orhan: 4x4 (500), 6x6 (1200), 8x8 (2500), 10x10 (4500), 12x12 (7000) Sanil. Boyuta uygun başlangıç eşyaları verilir.
- **Evi genişlet:** kendi evinde Düzenle modu → "Evi Genişlet" (14x14 ve 16x16 sadece buradan). Ücret = fiyat farkı + %10 tadilat. Eşyalar yerinde kalır.
- Sunucu: `buy_home`, `expand_home`, `home_price`, `claim_guide_gift`; `ensure_home` artık ev oluşturmaz. Mevcut evler (12x12) aynen kalır.
- **Rehber Yağmur** (Cadde 1, spawn yanı): oyun rehberi + tek seferlik 300 Sanil hoş geldin hediyesi.
- **Arena Görevlisi Mert:** yeni üniforma + danışma tezgahı ve lambalar.
- Uygulama: `supabase/schema.sql` yeniden çalıştır + redeploy.

## v16 — Sürüklenebilir profil + Rozet sistemi
- Başka oyuncuya tıklayıp **Profil** açılınca pencere başlığından tutup sürüklenebilir (fare + dokunmatik). Altında **Rozetler** vitrini var.
- **Rozetler** (üst çubuk 🎖️): Başarım (kademeli ★★★), Mağaza (mevsim vb., satın alınır), Özel (olaya bağlı).
- Kademeli rozetler: Balıkçı 1/100/1000, Madenci, Çiftçi, Aşçı, Tüccar, Alışverişkolik, Bilge, Şampiyon, Sosyal Kelebek, Gönül Fatihi, Sadık Oyuncu. Her yıldızda Sanil: 50 / 250 / 1000. Mevcut balık sayıları ilk kez rozete işlenir (ödülsüz).
- Eski başarımlar artık +50 Sanil veriyor.
- Sunucu: `badge_progress`, `user_badges`, `_badge_add`, `_badge_grant`, `get_badges`, `buy_badge`, `badge_price`; `get_profile_card` rozetleri döndürür.
- Uygulama: `supabase/schema.sql` yeniden çalıştır + redeploy.

## v17 — Popüler Evler
- Emlak Ofisi'nde Emlakçı Orhan'ın panelinde yeni **🔥 Popüler Evler** sekmesi: en çok beğenilen 10 açık ev, **Ziyaret** düğmesiyle ışınlanma.
- Sunucu: `popular_homes()` (sadece `access = 'open'` evler).
- Uygulama: `supabase/schema.sql` yeniden çalıştır + redeploy.

- v17 düzeltme: eski şemalı `friendships` tablosu (requester sütunu yok) otomatik `friendships_old_backup` olarak yedeklenip yeniden kurulur (profil kartındaki "column f.requester does not exist" hatası).

## v18 — Sprite kalitesi, döndürme, rehber
- Büyük PNG'ler yüklenirken ekran boyutuna kademeli küçültülür (daha net), çizimde `imageSmoothingQuality = "high"`.
- **Döndürme:** `rot = 1` artık görseli aynalar ve çok kareli eşyanın kapladığı kareleri yer değiştirir (istemci + sunucu `_fw/_fh`, `_tile_free/_check_place` p_rot).
- Sprite meta değerleri (saat kulesi 2x2, yemek aracı 3x2, tezgah, durak, kulübe) kullanıcının ayarlarıyla eşitlendi; sunucu boyutları güncellendi.
- **Düzeltme:** Admin "tüm eşyaları kaldır" sonrası odanın varsayılan yerleşimi geri gelmiyor (boş satır artık geçerli).
- `docs/SPRITE-REHBERI.md`: görsel boyutları, yön, kod tanıtma, karakter katmanları.

## v19 — Serbest yerleştirme (✋ Hizala)
- Düzenleme modunda yeni **✋ Hizala** aracı: bir eşyayı tutup kareye bağlı kalmadan istediğin piksele sürükle; bırakınca otomatik kaydedilir.
- Fare tekerleği veya **+ / −**: boyut (%50–%200). **0**: konum ve boyutu sıfırla.
- Eşyaya `ox, oy, sc` alanları eklenir (kayma piksel, ölçek yüzde); çarpışma/kaplanan kareler değişmez, sadece görsel kayar.
- Sunucu: `nudge_furni(p_room, p_id, p_ox, p_oy, p_sc)` — sahiplik kontrolü pickup ile aynı, değerler ±200 / 50–200 aralığına kısılır.
- **schema.sql'i yeniden çalıştır** ve yeniden deploy et.

### v19 ek: kaybolma düzeltmeleri, kare yapışması, katmanlı karakter
- **Eşyaya değince kaybolma:** üstünden geçilebilen eşyalar (bank, koltuk vb.) artık en arka köşesine göre çizilir; karakter eşyanın altında kalıp görünmez olmaz.
- **Bir süre sonra kaybolma:** `RoomNetwork` kopan kanalı otomatik yeniden bağlar (üstel bekleme), presence'ı 20 sn'de bir ve sekme öne gelince tazeler; oyuncu listeden düşse bile 10 sn tolerans tanınır.
- **✋ Hizala:** bırakınca eşya en yakın kareye geçer (kaplanan kare = göründüğü yer), geçersizse eski yerine döner. `nudge_furni` artık `p_gx, p_gy` alır ve sunucuda sınır/su/çakışma doğrular.
- **Katmanlı karakter:** `public/sprites/avatar/` (legs, body, shirt, face, hs_* ve hs_*_b). 5 kareli sheet, kare 160x240. Soldaki panelde "🎨 Karakter" ile açılır; seçim diğer oyunculara presence ile yansır. Parçaları `python3 tools/gen_avatar_layers.py` üretir; kendi PNG'lerinle aynı adla değiştirebilirsin.
- Şapka/gözlük/sırt/üst kıyafetler katmanlı modda mevcut vektör çizimle üstüne biner.
- schema.sql'i yeniden çalıştır ve deploy et.

### v19 ek 2: Cadde 1 yeniden düzenlendi (layout_v 15)
- Kafe terası (4 masa takımı), gazete büfeleri, yol kenarı bankları, meydanda çeşme etrafı 8 bank, batı/doğu parklarda kamp ateşi + kütük oturaklar + piknik masaları, doğu kafe, ek arabalar. 116 eşya, kapılar ve NPC kareleri boş.
- **Dikkat:** layout_v arttığı için schema.sql çalışınca Cadde 1'deki elle yapılan düzenlemeler sıfırlanır.

### v19 ek 3: Sevaastian/Vistekiis eşyaları + Şans Çarkı
- Admin özel karakterleri (Sevaastian, Vistekiis) artık şapka, gözlük, üst kıyafet ve sırt eşyalarını gösterir; ten rengi uygulanır. İmza siyah kıyafet/saç korunur.
- 🎡 **Günlük Şans Çarkı:** üst çubukta "Çark". 24 saatte bir, ağırlıklı sunucu çekilişi (20–1000 Sanil). RPC: `wheel_status()`, `spin_wheel()`; `profiles.last_spin`.

### v19 ek 4: Yuvarlak zemin gölgeleri kaldırıldı
- Eşya/nesnelerin altındaki yuvarlak gölgeler (PNG sprite, vektör çizim ve kayalar) kapatıldı; nesneler havada durmuyor, zemine oturuyor. Geri açmak için `lib/draw.ts` içindeki `NO_SHADOW` sabitini yarı saydam siyaha çevir. Karakter gölgesi kaldı.

### v19 ek 5: Atmosfer güncellemesi (ışık, gölge, hareket, mevsim, Kış Köyü)
- **Işık:** gün boyu saatlere göre ton: şafak pembesi, öğlen berrak, altın saat turuncusu, alacakaranlık moru, gece laciverti. Lambalar/ateş karardıkça parlar (`lib/ambience.ts`).
- **Yönlü gölge:** eşya silüeti güneşin yönüne göre yatar (sabah batıya, akşam doğuya), öğlen kısa; geceleri yok. Büyük binalara gölge verilmez.
- **Hareket:** ağaç/palmiye/bitki rüzgârda sallanır; gündüz kuş sürüleri geçer; Cadde 1'de iki süs aracı yavaşça gider (önlerinde yaya varsa durur).
- **Mevsimler:** sonbaharda yaprak, ilkbaharda yaprak/çiçek parçacıkları (yağmur yokken); kışın kar zaten vardı.
- **Karakter:** emote sırasında kol animasyonu (👋 sallama, 👏/🎉/😂 iki kol). Katmanlı modda 6 üst kıyafetin PNG'si (`top_tp_*.png`).
- **Arayüz:** cam efektli paneller, açılış animasyonu, basma efekti, dokunmatikte büyük dokunma alanı, tuvalde `touch-action: none`.
- **Yeni oda: ❄️ Kış Köyü** (Cadde 1'in doğu parkındaki kapıdan, (33,17)): buz pateni pisti, kamp ateşi, sıcak içecek köşesi, sürekli kar. Sunucuya `kis-koyu` eklendi.
- schema.sql'i yeniden çalıştır ve deploy et.

### v19 ek 6: Etkinlik sistemi + profesyonel süvari atı
- **🎉 Etkinlikler:** üst çubuktaki panelden admin etkinlik başlatır (ad, açıklama, tema, Sanil çarpanı x1–x5, tek seferlik ödül, süre, gecikmeli başlangıç). Oyuncular üstte canlı geri sayımlı şerit görür, ödülü bir kez alır, 🎉 "Şenlik Ruhu" rozeti ilerler.
- **Sanil çarpanı** (sunucuda): günlük ödül, Şans Çarkı, görev ödülü, başarım, balık/maden satışı. Kumar ve takas etkilenmez.
- **Temalar:** konfeti, havai fişek, fener, balon, kar (yalnız açık hava odalarında).
- RPC: `active_events`, `claim_event_reward`, `admin_create_event`, `admin_end_event`, `_event_mult`; tablolar `events`, `event_claims` (RLS kapalı erişim).
- **Süvari atı:** kestane renkli, gölgeli, eklemli bacaklı, akan yele/kuyruklu, eyer takımlı yeni at; dörtnalda toz. Hız 5.4 → 6.4 kare/sn (yürüme 3.4). Sunucu limiti (7 kare/sn + tolerans) içinde.
- Üst çubukta etiketler dar ekranda gizlenir, çubuk kaydırılabilir.

### v19 ek 7 — Paneller, giriş ekranı, Cadde geçişi
- Tüm paneller (sağ ve sol dock) üst şeritlerinden sürüklenebilir (çift tık = sıfırla), ekrana sığmazsa kaydırılır, ince scrollbar, cam/gradyan/gölge ile yeni görünüm (`components/usePanelDock.ts`, `.sw-dock` CSS).
- Giriş ekranı yeniden tasarlandı (marka alanı, özellikler, ikonlu alanlar, şifre göster/gizle).
- Cadde/Mekan hızlı geçiş butonları ve arkadaş "git" kısayolu yalnızca admin'e açık (sadece arayüz kısıtı; sunucu tarafı portal denetimi yok).
- Yükleme perdesi (`components/RoomLoader.tsx`): oyuna girişte ~3,4 sn, oda değişiminde ~2,2 sn; ilerleme çubuğu, oda adı, rastgele ipucu. Süreler dosyanın başındaki `total` değerinden ayarlanır.
- Cadde trafiği tek yönlü (+x): ters yön için arka görünüm sprite'ı yok (v19 ek 8).

### v19 ek 9 — Sahil Kasabası yenilendi (layout_v 11)
- Yeni yerleşim: Sörf standı, balıkçı kulübesi (iskele yanında), yemek aracı, dondurma büfesi, çiçeklikler, ek şezlonglar, banklar, fenerler. Voleybol sahası ve DJ pisti korundu.
- Koddan çizilen dekor: havlular, deniz yıldızları, kabuklar, kum kalesi, ayak izleri, şamandıralar, süzülen yelkenli, iskele fenerleri, uçan martılar.
- Oda boyutu ve su kuralı aynı (20x16). `supabase/schema.sql` yeniden çalıştırılmalı: odanın eşyaları sıfırlanır.

## v20 — Güvenlik, moderasyon ve cila
**Sunucu (supabase/schema.sql — yeniden çalıştırın):**
- `send_chat`: 10 sn'de en fazla 6 mesaj, küfür maskeleme (`_clean_chat`), bağlantı (http/www/.com…) engeli, 6+ tekrar eden harf sıkıştırma. Admin muaf.
- Oyuncu engelleme: `user_blocks`, `block_user`, `unblock_user`, `my_blocks`. Engelleme arkadaşlığı kaldırır; engelli kişiye /pm ve arkadaş isteği gidemez.
- `report_player`: günlük 15 şikâyet, aynı kişiye açık şikâyet varken tekrar yok.
- `enter_room`: sabit odalar arası geçişte sunucudaki son konum kapıya ≤6 kare olmalı (`_portal_ok`, portallar constants.ts'ten üretildi). Admin, kişisel odadan çıkış, Oyunika ve 5 dk'dan eski konum muaf. Yeni portal eklerseniz `_portal_ok` listesini güncelleyin.
**İstemci:**
- ⚙️ Ayarlar paneli: efekt/müzik aç-kapa + ses seviyesi, düşük kalite modu (parçacık, kuş, yönlü gölge kapalı), katmanlı karakter, engellenenler listesi, çıkış. Ayarlar tarayıcıda saklanır.
- Oyuncu kartında 🚫 Engelle; engelli oyuncunun mesajları görünmez.
- Yeni sesler (kapı, panel açma, bildirim) ve Sahil/Kış Köyü/AVM/Oyunika/Çiftlik/Maden/Emlak için oda müzikleri.

## v21 — Giriş serisi ve ilk giriş rehberi
- 7 günlük giriş serisi: ödüller 500/550/650/750/900/1100/2000 (`DAILY_REWARDS` ↔ SQL `_streak_reward`). 48 saatten uzun ara serisi sıfırlar; 7. günden sonra başa döner. Etkinlik çarpanı geçerli. Üst bardaki 🎁/🔥 butonu takvim panelini açar.
- `schema.sql` yeniden çalıştırılmalı (profiles.daily_streak sütunu, claim_daily, get_my_profile).
- İlk girişte 5 adımlı rehber (`components/Tour.tsx`); Ayarlar'dan tekrar açılır. Tamamlanma durumu tarayıcıda (`sw_tour_done`).

## v22 — Oyunika Salonu, Parti Oyunu ve Hain Avı
- **Cadde 1 → 🎮 Oyunika** kapısı (üst sokak, 20,0) artık bir mekâna açılıyor: içinde **Parti Lara** 🎉 ve **Komutan Demir** 🚀 NPC'leri var.
- **Parti Oyunu** (eski Oyunika): mantık aynı (1-5 kişi, çift zar, kare efektleri). Parkur 59 kareye uzadı, yılan şeklinde 4 sıra; yeni kareler: ⚡ Hız Kuşağı (+5) ve ⏪ Geri Sar (−6). Lara'ya tıkla → lobi → başlat.
- **Hain Avı** (Among Us tarzı; marka adı olduğu için bu isimle): 3-8 oyuncu, uzay gemisi haritası (28x18, 8 görev istasyonu, duvarlı odalar). Roller gizli dağıtılır, mürettebat görev yapar, hain ele (öldürme, 20 sn bekleme), ceset ihbarı / acil toplantı → tartışma → oylama → gönderme, kazanma kontrolleri, hayalet modu.
- Yönetici test modu: Demir'de "Mürettebat/Hain olarak" ile 3 botla tek başına dene.
- SQL: `supabase/schema.sql` yeniden çalıştırılmalı (3 oda satırı + `_portal_ok` + `enter_room` istisnaları).

**Bilinen sınırlar:** oyun durumu istemci tabanlı (kurucu = host), roller devtools ile görülebilir; menzil/süre kontrolleri istemcide; kanal başına tek tur; host ayrılırsa tur iptal; toplantıda ışınlanma yok (sadece sohbet/oylama). Cadde 1 yerleşimi sıfırlanmaz (kapı/NPC'ler sabit).

## v22 ek — Parti Oyunu büyük harita
- Salon 31x27; 60 kareli parkur 6 sıra halinde kıvrılıyor, kareler arası bağlantı yolu var (oyuncular yoldan 2x hızla yürür).
- **Liderlik kürsüsü** (altta): 1., 2., 3. bitiren otomatik kürsüye yürür; ilk 3 (veya oyuncu sayısı <3 ise hepsi) bitirince oyun biter. Bitirenler sıradan çıkar.
- **Zar süresi:** sıra gelince 10 sn, etrafında yeşil→turuncu→kırmızı dönen halka; süre dolunca otomatik atılır (oyuncu yoksa kurucu 3,5 sn sonra atar). Yürüyüş animasyonu süresi sayaca eklenmez.
- SQL: `parti-oyunu` odası layout_v 13, portal (0,26) — schema.sql'i yeniden çalıştır.
- **Kürsü modeli:** 1-2-3 blokları 3B izometrik çizilir (neon çizgili mor gövde, altın/gümüş/bronz kalın üst plaka, sıra numarası + yıldız); kazananlar bloğun üstüne çıkar (`Player.lift`).
- **Hain Avı görüş alanı (sis):** oyun sırasında herkes yalnızca yakınını görür (mürettebat 5,5 kare, hain 7,5 kare), duvarlar görüşü keser; uzaktaki oyuncular ve cesetler çizilmez. Toplantıda ve hayaletken görüş sınırsız.

## v23 — Blok Rüzgârı (Tetris) 🧱
- Oyunika'da 3. NPC **Oyuncu Ali** → "Arenaya Gir" → **Blok Rüzgârı Arenası** odası (portal geri: Oyunika).
- **Tek kişilik:** klasik oyun (7'li torba, hayalet blok, tut, kombo/back-to-back, seviye hızlanması). Her 1.000 puana 25 Sanil, günlük en fazla 800.
- **Düello (2-4 kişi):** kurucu başlatır, herkes aynı blok sırasını alır (ortak tohum), 2/3/4 satır silince rakibe çöp satır gider, son ayakta kalan kazanır (+200 Sanil). Rakip tahtaları canlı küçük önizleme; oyuna katılmayanlar izleyebilir.
- Kontroller: ← → / ↑ X / Z / ↓ / Boşluk / C; telefonda ekran tuşları.
- Sunucu: `tetris_scores` tablosu, `tetris_submit` (süre/skor/satır makullük kontrolü, gönderimler arası bekleme, günlük sınır) ve `tetris_board` (liderlik). schema.sql'i yeniden çalıştır.
- Sınırlar: oyun istemcide oynanır; skor kontrolü sadece makullük sınırlarına bakar (hile tamamen engellenmez, günlük tavan zararı sınırlar). Düello galibini istemci bildirir. Düello ağ gecikmesi gerçek kullanımda denenmeli. "Tetris" marka olduğu için oyun adı Blok Rüzgârı.

## v24 — Gazeteci Alper ve elde tutulan gazete 📰
- **Gazeteci Alper** (Cadde 1, Rehber Yağmur'un yanı): tıklayınca "Sevalika Günlüğü" açılır. İçerik günlük döner: manşet (aktif etkinlik varsa o), Blok Rüzgârı rekorları, en beğenilen evler, Alper'in köşesi (oyun ipuçları), burç yorumu, günün bulmacası, küçük ilanlar.
- **"Gazeteyi Elime Al":** karakter gazeteyi elinde taşır, herkes görür (`tool = newspaper`, `equip_tool` artık bunu da kabul eder; ücretsiz). Elde tutarken sol panelde "📰 Gazeteyi Oku" butonu çıkar.
- SQL: `equip_tool` güncellendi → schema.sql'i yeniden çalıştır.
- Meslek sistemi (Süvari, Rehber, Gazeteci, Yönetmen, Sanatçı…) için bu ilk adım: NPC + mesleğe özel eşya. Sonraki adım: profilde meslek seçimi, meslek rozeti/etiketi ve her mesleğe özel görevler.

## v25 — Eşyayı yerinde çevir ↻
- Düzenleme panelinde yeni **↻ Çevir** aracı: eşyaya tıkla, yönü değişir (çantaya alıp tekrar koymaya gerek yok).
- Sunucu: `rotate_furni(oda, id)` — sahibi/admin; yeni kaplanan kareler sınır ve çakışma için doğrulanır (çok kareli eşyalarda yer yoksa reddeder). schema.sql'i yeniden çalıştır.
- Demo modunda çok kareli eşya çakışma kontrolü sunucuyla aynı hale getirildi (dikdörtgen kesişim).

## v26 — Büyütme
- Karakterler `CHAR_K=1.3` büyüdü; dünya yakınlaştırması 1.05 → 1.4 (mobil 0.85 → 1.05). Küçük odalar ekrana sığdığı kadar büyür.
- Ayarlar `lib/iso.ts` başında. PNG yol haritası: `docs/SPRITE-REHBERI.md` bölüm 3.
- Şema değişikliği yok; sadece yeniden deploy.

## v27 — PNG karakter
- Karakter 3D'den üretilmiş, 4 yönlü, yürüme (6 kare) + oturma kareli katmanlı PNG sistemine geçti (`public/sprites/avatar3`).
- Saç (8), şapka (12), gözlük (7), sırt eşyası (5), üst kıyafet (6) hepsi PNG; NPC'ler de aynı sistemi kullanır.
- Üretici araçlar: `tools/gen_char3d.py`. Ayrıntı: `docs/SPRITE-REHBERI.md` bölüm 4. Şema değişikliği yok.

## v28 — Araçlar
- Cadde 1 trafiği iki yönlü ve 4 yönlü PNG araçlarla (araba x2, taksi, polis, pikap, otobüs). `tools/gen_vehicle3d.py`, `docs/SPRITE-REHBERI.md` bölüm 5. Şema değişikliği yok.

## v29 — Zemin ve duvar PNG
- Zemin (10 tür x 4 varyant) ve duvar (6 tür) dokuları PNG, tema rengiyle boyanır. `tools/gen_tiles.py`, `lib/tiles.ts`, `docs/SPRITE-REHBERI.md` bölüm 6. Şema değişikliği yok.

## v30 — Süvari atı
- Süvari atı 4 yönlü PNG (dörtnala animasyonlu) ve binici bacaklarıyla. `tools/gen_horse3d.py`, `lib/horse.ts`, `docs/SPRITE-REHBERI.md` bölüm 7. Şema değişikliği yok.
- v31: 4 yönlü 3D eşyalar (bench, chair, sofa, lounger, tv, bookshelf, bed, logseat). f3 ayarı, rot 0-3, schema rotate_furni.
- v32: 15 yeni 4 yönlü 3D eşya (toplam 23): beanbag, plant, lamp, streetlight, table, counter, casinotable, bin, umbrella, campfire, mannequin, surfboard, phone_booth, kiosk, ore_cart.
- v33: 8 çok karolu 4 yönlü 3D eşya (tezgâhlar, çiçeklik, durak, pano, saat kulesi, büyük çeşme, yemek aracı); toplam 31 tür.
- v34 (performans): ekran dışı karo/duvar/eşya/araç çizilmiyor (lib/view.ts), büyük sprite sheet'leri için küçültülmüş kopya + kare önbelleği (lib/mip.ts). Kare başına JS çizim süresi ~2 ms.
- v35: bank 1.3x, karakter boyama kare bazlı (bellek), yavaş cihazda otomatik düşük kalite.
- v36: ?fps teşhis göstergesi (adres sonuna ?fps ekle): fps, güncelle/çiz ms, en kötü kare, oyuncu/eşya sayısı, kalite modu.
- v37: park halindeki arabalar (car_red/blue/yellow) 4 yönlü 3D araç sheet'iyle; FURNI_DIRS + rotate_furni güncellendi (toplam 34 tür).
- v38: ağaç, palmiye, 11 büyük yapı 4 yönlü 3D (toplam 47 tür); billboard/bus_stop yönü düzeltildi.
- v39: zeminler neon/metal/snow, PNG su (animasyonlu), Cadde mağaza cepheleri PNG duvar dokusu.
- v40: PNG tabela levhaları (ampullü), duvar binaları eğik/dokulu.
- v41: Sevaastian ve Vistekiis artık 3D katmanlı karakterle çiziliyor (4 yön, yürüme, oturma); siyah kıyafet, Sevaastian varsayılan takım elbise + koyu gözlük, Vistekiis uzun siyah saç. Kozmetikleri korunur; katman yüklenmezse eski vektör çizim yedek.


## v42 — Meslek sistemi
- 6 meslek: 🐎 Süvari (rütbeye bağlı), 🧭 Rehber, 🎨 Sanatçı, 🎶 Müzisyen, 📰 Gazeteci, 🎬 Yönetmen. Admin oyuncu kartından atar (`admin_set_profession`); Süvari rütbesi = Süvari mesleği.
- İsim etiketinin solunda meslek rozeti; her mesleğe özel el eşyası (sancak, pusula, palet, gitar, kamera, klaket) ve aktif düğme (Meslek paneli, sol üst).
- Efektler odadaki herkese yayınlanır (`fx` broadcast): flaş, toplanma işareti, klaket geri sayımı, müzik notaları (yakındakiler dans eder), sancak, tablo parıltısı.
- Sunucu doğrulamalı işlemler: `guide_reward`, `prof_cheer`, `tip_player`, `paint_artwork` (tablo = `art_*` eşya, katalogdan alınamaz), `submit_news`/`news_list`/`admin_delete_news`, `shoot_invite`/`shoot_respond`/`shoot_finish`.
- Şema değişti: `supabase/schema.sql` yeniden çalıştırılmalı.


## v43-v44
- v43: kasma için otomatik çizim çözünürlüğü (gfx.res, localStorage `sw_res`); `?fps` overlay'inde "çöz" değeri.
- v44: Bildirim merkezi. Üst çubukta 🔔 + okunmamış sayısı; son 40 kişisel olay (arkadaş, hediye, rozet, başarım, seviye, turnuva, pazar, meslek...). Çevrimdışıyken gelenler de görünür (user_events 14 gün saklanır, kişi başı 150). Şema: `profiles.notif_seen_id`, `my_notifications()`, `notif_mark_read()` -> schema.sql yeniden çalıştırılmalı.

## v45 — Mobil cila
- Telefonda üst çubuk: 🎒 🔔 🎁 + ☰ Menü (tüm paneller büyük dokunmatik kutular, rozetli); admin mekan seçici menüde. Masaüstü çubuğu aynen.
- Sohbet telefonda kapalı başlar, açılınca daha kısa (h-24).
- `viewportFit: cover` + güvenli alan (çentik / ana ekran çubuğu) boşlukları.
- Şema değişmedi.

## v46 – Cadde 2 (test odası, resimli stil)
- Yeni oda `cadde-2` (26×18): zemin + binalar tek PNG (`public/sprites/rooms/cadde-2.png`), `tools/gen_backdrop_cadde2.py` ile üretilir.
- `lib/backdrop.ts`: odaya özel arka plan katmanı (ızgara yalnızca yürüme/hover için kalır). `ROOM_BLOCK` (constants.ts) binaların yürünemez karelerini tanımlar.
- Cadde 1'den (33,8) kapısıyla girilir; dönüş kapısı Cadde 2 (0,9). Cadde 1 düzenine dokunulmadı.
- Şema: rooms satırı + `_portal_ok` kapıları eklendi (schema.sql'i baştan çalıştır).
