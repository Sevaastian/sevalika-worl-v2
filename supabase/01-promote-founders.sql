-- Kurucu hesapları admin yap.
-- ÖNCE oyunda bu kullanıcı adlarıyla KAYIT OL, SONRA bunu SQL Editor'de çalıştır.
-- (Kendi nickini kimse senden önce alıp admin olamasın diye otomatik yükseltme yok;
--  kayıt olur olmaz bu dosyayı çalıştır.)
update public.profiles
   set role = 'admin',
       is_founder = true,
       coins = greatest(coins, 99999),
       inventory = case when 'suvari_ati' = any(inventory) then inventory else array_prepend('suvari_ati', inventory) end
 where lower(username) in ('sevaastian', 'vistekiis', 'vistekis');

select username, role, is_founder from public.profiles where is_founder;
