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
