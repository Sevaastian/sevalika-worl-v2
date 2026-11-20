-- =====================================================================
-- SADECE BİR KEZ, ESKİ (v1) PROJENDEN GEÇERKEN ÇALIŞTIR.
--
-- v1'de şifreler "players" tablosunda DÜZ METİN saklanıyordu ve herkes
-- (anon anahtarıyla) okuyabiliyordu. Bu yüzden:
--   * Eski tablolar silinir (eski hesaplar ve oda eşyaları gider),
--   * Oyuncuların yeni sistemde (Supabase Auth) yeniden kayıt olması gerekir,
--   * Eski şifrelerin sızmış olabileceğini varsay: aynı şifreyi başka yerde kullandıysan DEĞİŞTİR.
-- Yeni projeyle sıfırdan başlıyorsan bu dosyaya gerek yok.
-- =====================================================================
drop table if exists public.players cascade;
drop table if exists public.rooms cascade;
