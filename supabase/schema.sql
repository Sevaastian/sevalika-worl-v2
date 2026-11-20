-- =====================================================================
-- SEVALIKA WORLD — Supabase şeması (v3)
-- Supabase Dashboard > SQL Editor'e komple yapıştırıp "Run" demen yeterli.
-- Tekrar çalıştırılabilir (idempotent): v2'den yükseltmek için de aynen çalıştır.
--
-- Güvenlik modeli:
--  * Giriş/kayıt Supabase Auth ile yapılır (şifreler hash'lenir).
--  * İstemci tablolara DOĞRUDAN YAZAMAZ. Tüm yazma işlemleri aşağıdaki
--    SECURITY DEFINER fonksiyonlarından (RPC) geçer ve sunucuda doğrulanır.
--  * Admin işlemleri (rütbe, Sanil, kick, duyuru) sadece admin rolü olan
--    hesaplar tarafından çağrılabilir; broadcast ile taklit edilemez.
-- =====================================================================

-- ---------- Eski sürüm koruması ----------------------------------------
-- v1'de "rooms" tablosu room_slug sütunuyla, "players" tablosu düz metin şifreyle çalışıyordu.
-- Eski tablolar duruyorsa önce 00-legacy-cleanup.sql dosyasını bir kez çalıştır.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rooms' and column_name = 'room_slug')
     or exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'players') then
    raise exception 'Eski (v1) tablolar bulundu. Önce supabase/00-legacy-cleanup.sql dosyasını çalıştır, sonra bu şemayı tekrar çalıştır.';
  end if;
end $$;

-- ---------- Tablolar ----------------------------------------------------

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text not null check (username ~ '^[A-Za-z0-9_]{3,15}$'),
  role             text not null default 'user' check (role in ('user','vip','suvari','admin')),
  is_founder       boolean not null default false,
  coins            integer not null default 1250 check (coins >= 0),
  shirt_color      text not null default '#2563eb' check (shirt_color ~ '^#[0-9a-fA-F]{6}$'),
  hair_color       text not null default '#1e293b' check (hair_color  ~ '^#[0-9a-fA-F]{6}$'),
  skin_color       text not null default '#fed7aa' check (skin_color  ~ '^#[0-9a-fA-F]{6}$'),
  inventory        text[] not null default '{}',
  last_daily_claim timestamptz,
  kicked_until     timestamptz,
  created_at       timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.rooms (
  slug       text primary key,
  name       text not null,
  min_role   text not null default 'user' check (min_role in ('user','vip','suvari','admin')),
  furni      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
-- v6: oda boyutu ve doğma noktası artık sunucuda da tutuluyor (kişisel odalar 12x12, doğma noktası yok)
alter table public.rooms add column if not exists cols int not null default 12;
alter table public.rooms add column if not exists rows int not null default 12;
alter table public.rooms add column if not exists spawn_x int;
alter table public.rooms add column if not exists spawn_y int;
alter table public.rooms add column if not exists layout_v int not null default 0;

create table if not exists public.admin_events (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('announce','kick','gift','role','dance','clear_room')),
  room        text,
  target      text,
  payload     jsonb not null default '{}'::jsonb,
  by_username text not null,
  created_at  timestamptz not null default now()
);

-- ---------- v3: yeni sütunlar ---------------------------------------------

alter table public.profiles add column if not exists hat text check (hat is null or hat ~ '^hat_[a-z]+$');
alter table public.profiles add column if not exists glasses text check (glasses is null or glasses ~ '^gl_[a-z]+$');
alter table public.profiles add column if not exists hair_style text not null default 'hs_short' check (hair_style ~ '^hs_[a-z]+$');
alter table public.profiles add column if not exists top_style text check (top_style is null or top_style ~ '^tp_[a-z]+$');
alter table public.profiles add column if not exists wardrobe text[] not null default '{}';
alter table public.profiles add column if not exists muted_until timestamptz;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists current_room text;
alter table public.profiles add column if not exists last_quiz_try timestamptz;

alter table public.rooms add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.rooms add column if not exists access text not null default 'open' check (access in ('open','friends','closed'));

-- ---------- v3: yeni tablolar ---------------------------------------------

-- Sohbet (sunucu doğrulamalı gönderici). kind=whisper olanlar sadece gönderen/alıcı tarafından okunur.
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('chat','whisper')),
  room       text,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  sender     text not null,
  target_id  uuid references public.profiles(id) on delete cascade,
  target     text,
  text       text not null check (char_length(text) between 1 and 140),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx   on public.messages (room, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

-- Kişiye özel bildirimler (hediye, arkadaşlık isteği, susturma...)
create table if not exists public.user_events (
  id         bigint generated always as identity primary key,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_events_target_idx on public.user_events (target_id, created_at desc);

create table if not exists public.friendships (
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Bilgi yarışması (cevap gizlidir; tabloya istemci erişemez)
create table if not exists public.quiz_state (
  id          int primary key check (id = 1),
  question    text,
  answer_norm text,
  reward      int,
  ends_at     timestamptz,
  active      boolean not null default false,
  winner      text
);
insert into public.quiz_state (id) values (1) on conflict do nothing;

create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  reporter   text not null,
  target     text not null,
  reason     text not null,
  room       text,
  context    jsonb not null default '[]'::jsonb,
  status     text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_log (
  id         bigint generated always as identity primary key,
  admin      text not null,
  action     text not null,
  target     text,
  detail     text,
  created_at timestamptz not null default now()
);

alter table public.admin_events drop constraint if exists admin_events_kind_check;
alter table public.admin_events add constraint admin_events_kind_check
  check (kind in ('announce','kick','gift','role','dance','clear_room','quiz','quiz_end')) not valid;

-- Başlangıç odaları (varsayılan eşyalar: sahipsiz, sadece admin kaldırabilir)
insert into public.rooms (slug, name, min_role, furni) values
  ('cadde-1', 'Cadde 1 - Meydan Kafe', 'user', '[
    {"id":"d1","type":"rug","gx":5,"gy":5,"rot":0,"owner":null},
    {"id":"d2","type":"sofa","gx":4,"gy":4,"rot":0,"owner":null},
    {"id":"d3","type":"table","gx":5,"gy":5,"rot":0,"owner":null},
    {"id":"d4","type":"lamp","gx":3,"gy":4,"rot":0,"owner":null},
    {"id":"d5","type":"plant","gx":8,"gy":3,"rot":0,"owner":null}
  ]'::jsonb),
  ('vip-cati-kati', 'VIP Çatı Katı', 'vip', '[
    {"id":"d1","type":"rug","gx":6,"gy":6,"rot":0,"owner":null},
    {"id":"d2","type":"sofa","gx":5,"gy":7,"rot":0,"owner":null},
    {"id":"d3","type":"fountain","gx":6,"gy":3,"rot":0,"owner":null},
    {"id":"d4","type":"lamp","gx":3,"gy":3,"rot":0,"owner":null}
  ]'::jsonb),
  ('monako-kulup', 'Monako Kulüp', 'user', '[
    {"id":"d1","type":"rug","gx":5,"gy":5,"rot":0,"owner":null},
    {"id":"d2","type":"tv","gx":9,"gy":2,"rot":0,"owner":null},
    {"id":"d3","type":"sofa","gx":3,"gy":8,"rot":0,"owner":null},
    {"id":"d4","type":"plant","gx":2,"gy":2,"rot":0,"owner":null}
  ]'::jsonb)
on conflict (slug) do nothing;

-- ---------- Yardımcı fonksiyonlar --------------------------------------

create or replace function public.role_rank(p_role text) returns int
language sql immutable set search_path = '' as $$
  select case p_role when 'admin' then 3 when 'suvari' then 2 when 'vip' then 1 else 0 end
$$;

create or replace function public.furni_price(p_type text) returns int
language sql immutable set search_path = '' as $$
  select case p_type
    when 'sofa' then 150
    when 'chair' then 70
    when 'bench' then 110
    when 'lounger' then 130
    when 'logseat' then 95
    when 'beanbag' then 145
    when 'campfire' then 240
    when 'umbrella' then 115
    when 'surfboard' then 125
    when 'lamp' then 80
    when 'streetlight' then 140
    when 'plant' then 60
    when 'tree' then 180
    when 'palm' then 210
    when 'table' then 100
    when 'counter' then 160
    when 'casinotable' then 280
    when 'bin' then 40
    when 'kiosk' then 320
    when 'rug' then 50
    when 'bookshelf' then 120
    when 'tv' then 200
    when 'fountain' then 250
    when 'beach_cafe' then 950
    when 'dj_booth' then 850
    when 'tiki_bar' then 650
    when 'casino_bar' then 900 when 'kitchen_block' then 700 when 'barn' then 1200
    when 'fish_hut' then 600 when 'mine_entrance' then 1000 when 'ore_cart' then 250 when 'bus_stop' then 500 when 'phone_booth' then 300
    when 'store_fashion' then 1500 when 'store_tech' then 1500 when 'store_food' then 1500 when 'mannequin' then 90 when 'bed' then 220
    else null end
$$;

-- v6: çok kareli eşyalar (sol-üst köşe + genişlik/yükseklik)
create or replace function public._furni_w(p_type text) returns int
language sql immutable set search_path = '' as $$
  select case p_type when 'beach_cafe' then 4 when 'dj_booth' then 3 when 'tiki_bar' then 2 when 'casino_bar' then 4 when 'kitchen_block' then 4 when 'barn' then 4 when 'fish_hut' then 3 when 'mine_entrance' then 4 when 'bus_stop' then 3 when 'store_fashion' then 4 when 'store_tech' then 4 when 'store_food' then 4 when 'bed' then 2 else 1 end $$;
create or replace function public._furni_h(p_type text) returns int
language sql immutable set search_path = '' as $$
  select case p_type when 'beach_cafe' then 3 when 'dj_booth' then 2 when 'tiki_bar' then 2 when 'casino_bar' then 2 when 'kitchen_block' then 2 when 'barn' then 3 when 'fish_hut' then 2 when 'mine_entrance' then 2 when 'bus_stop' then 1 when 'store_fashion' then 2 when 'store_tech' then 2 when 'store_food' then 2 else 1 end $$;

-- v6: sunucu tarafı su karesi kuralı (lib/constants.ts isWaterTile ile aynı)
create or replace function public._is_water(p_room text, p_gx int, p_gy int) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when p_room = 'iskele' then p_gx >= 9
    when p_room = 'sahil-kasabasi' then case
      when p_gx < 16 then false
      when p_gy in (5, 8) and p_gx <= 18 then false
      else true end
    else false end $$;

-- Çağıran kişinin profilini döndürür, yoksa hata verir
create or replace function public._me() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  -- FOR UPDATE: aynı kullanıcının eşzamanlı istekleri sırayla çalışır (eşya/Sanil kopyalama yarışını önler)
  select * into me from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Profil bulunamadı.'; end if;
  return me;
end $$;

create or replace function public._require_admin() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  if me.role <> 'admin' then raise exception 'Bu işlem için admin yetkisi gerekli.'; end if;
  return me;
end $$;

create or replace function public._emit_event(p_kind text, p_room text, p_target text, p_payload jsonb, p_by text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.admin_events where created_at < now() - interval '1 hour';
  insert into public.admin_events (kind, room, target, payload, by_username)
  values (p_kind, p_room, p_target, coalesce(p_payload, '{}'::jsonb), p_by);
end $$;

-- ---------- Kayıt tetikleyicisi ----------------------------------------
-- Yeni auth kullanıcısı oluşunca otomatik profil açar.
-- NOT: Herkes 'user' olarak başlar. Kurucu hesaplar aşağıdaki SQL ile
-- elle yükseltilir (README'ye bak) — böylece nick kapma ile admin olunamaz.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uname text;
begin
  uname := new.raw_user_meta_data ->> 'username';
  if uname is null or uname !~ '^[A-Za-z0-9_]{3,15}$' then
    raise exception 'Geçersiz kullanıcı adı.';
  end if;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Genel RPC'ler ----------------------------------------------

create or replace function public.username_available(p_username text) returns boolean
language sql security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(p_username))
$$;

-- Oturum açınca kendi profilini + kick durumunu getirir
create or replace function public.get_my_profile() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  return jsonb_build_object(
    'id', me.id, 'username', me.username, 'role', me.role, 'is_founder', me.is_founder,
    'coins', me.coins, 'shirt_color', me.shirt_color, 'hair_color', me.hair_color,
    'skin_color', me.skin_color, 'hat', me.hat, 'glasses', me.glasses, 'top_style', me.top_style, 'hair_style', me.hair_style,
    'wardrobe', to_jsonb(me.wardrobe), 'inventory', to_jsonb(me.inventory),
    'can_claim_daily', (me.last_daily_claim is null or me.last_daily_claim <= now() - interval '24 hours'),
    'kicked_until', me.kicked_until, 'muted_until', me.muted_until, 'tool', me.tool,
    'xp', me.xp, 'pet', me.pet, 'room', me.current_room
  );
end $$;

create or replace function public.claim_daily() returns int
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; reward constant int := 500; new_coins int;
begin
  me := public._me();
  if me.last_daily_claim is not null and me.last_daily_claim > now() - interval '24 hours' then
    raise exception 'Günlük ödülü zaten aldın.';
  end if;
  update public.profiles set coins = coins + reward, last_daily_claim = now()
   where id = me.id returning coins into new_coins;
  return new_coins;
end $$;

create or replace function public.set_look(p_shirt text, p_hair text, p_skin text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  if p_shirt !~ '^#[0-9a-fA-F]{6}$' or p_hair !~ '^#[0-9a-fA-F]{6}$' or p_skin !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Geçersiz renk.';
  end if;
  update public.profiles set shirt_color = p_shirt, hair_color = p_hair, skin_color = p_skin where id = me.id;
end $$;

-- ---------- Oda / eşya RPC'leri ----------------------------------------

-- Ortak: eşya yerleştirme doğrulaması. Aynı karede (rug hariç) tek eşya olabilir.
create or replace function public._tile_free(p_furni jsonb, p_type text, p_gx int, p_gy int) returns boolean
language sql immutable set search_path = '' as $$
  -- v6: kapladığı tüm kareler çakışma için kontrol edilir (halı yalnızca halıyla çakışır)
  select not exists (
    select 1 from jsonb_array_elements(p_furni) f
    where (f->>'gx')::int < p_gx + public._furni_w(p_type)
      and p_gx < (f->>'gx')::int + public._furni_w(f->>'type')
      and (f->>'gy')::int < p_gy + public._furni_h(p_type)
      and p_gy < (f->>'gy')::int + public._furni_h(f->>'type')
      and ((f->>'type' = 'rug') = (p_type = 'rug'))
  )
$$;

-- v6: yerleştirme doğrulaması: oda sınırı (kaplanan tüm kareler), su, çakışma
create or replace function public._check_place(p_room text, p_furni jsonb, p_type text, p_gx int, p_gy int) returns void
language plpgsql stable set search_path = '' as $$
declare c int; r int; x int; y int;
begin
  select cols, rows into c, r from public.rooms where slug = p_room;
  if c is null then raise exception 'Oda bulunamadı.'; end if;
  if p_gx is null or p_gy is null or p_gx < 0 or p_gy < 0
     or p_gx + public._furni_w(p_type) > c or p_gy + public._furni_h(p_type) > r then
    raise exception 'Geçersiz kare.';
  end if;
  for x in p_gx .. p_gx + public._furni_w(p_type) - 1 loop
    for y in p_gy .. p_gy + public._furni_h(p_type) - 1 loop
      if public._is_water(p_room, x, y) then raise exception 'Denize eşya konamaz.'; end if;
    end loop;
  end loop;
  if not public._tile_free(p_furni, p_type, p_gx, p_gy) then raise exception 'Bu kare dolu.'; end if;
end $$;

-- Eşya satın al ve odaya koy. Admin için ücretsiz.
create or replace function public.buy_and_place_furni(p_room text, p_type text, p_gx int, p_gy int, p_rot int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles; r public.rooms; price int; new_coins int; new_item jsonb;
begin
  me := public._me();
  price := public.furni_price(p_type);
  if price is null then raise exception 'Bilinmeyen eşya.'; end if;
  select * into r from public.rooms where slug = p_room for update;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  if public.role_rank(me.role) < public.role_rank(r.min_role) then raise exception 'Bu odaya erişimin yok.'; end if;
  if r.owner_id is not null and r.owner_id <> me.id and me.role <> 'admin' then raise exception 'Bu oda sana ait değil.'; end if;
  if jsonb_array_length(r.furni) >= 80 then raise exception 'Oda dolu (en fazla 80 eşya).'; end if;
  perform public._check_place(p_room, r.furni, p_type, p_gx, p_gy);

  if me.role = 'admin' then
    new_coins := me.coins;
  else
    update public.profiles set coins = coins - price where id = me.id and coins >= price returning coins into new_coins;
    if new_coins is null then raise exception 'Yeterli Sanilin yok.'; end if;
  end if;

  new_item := jsonb_build_object('id', gen_random_uuid()::text, 'type', p_type, 'gx', p_gx, 'gy', p_gy,
                                 'rot', case when p_rot = 1 then 1 else 0 end, 'owner', me.id);
  update public.rooms set furni = furni || new_item, updated_at = now() where slug = p_room;
  return jsonb_build_object('coins', new_coins);
end $$;

-- Çantadaki eşyayı odaya koy
create or replace function public.place_from_bag(p_room text, p_type text, p_gx int, p_gy int, p_rot int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles; r public.rooms; idx int; new_inv text[]; new_item jsonb;
begin
  me := public._me();
  if public.furni_price(p_type) is null then raise exception 'Bu eşya yerleştirilemez.'; end if;
  idx := array_position(me.inventory, p_type);
  if idx is null then raise exception 'Bu eşya çantanda yok.'; end if;
  select * into r from public.rooms where slug = p_room for update;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  if public.role_rank(me.role) < public.role_rank(r.min_role) then raise exception 'Bu odaya erişimin yok.'; end if;
  if r.owner_id is not null and r.owner_id <> me.id and me.role <> 'admin' then raise exception 'Bu oda sana ait değil.'; end if;
  if jsonb_array_length(r.furni) >= 80 then raise exception 'Oda dolu (en fazla 80 eşya).'; end if;
  perform public._check_place(p_room, r.furni, p_type, p_gx, p_gy);

  new_inv := me.inventory[1:idx-1] || me.inventory[idx+1:array_length(me.inventory,1)];
  update public.profiles set inventory = coalesce(new_inv, '{}') where id = me.id;
  new_item := jsonb_build_object('id', gen_random_uuid()::text, 'type', p_type, 'gx', p_gx, 'gy', p_gy,
                                 'rot', case when p_rot = 1 then 1 else 0 end, 'owner', me.id);
  update public.rooms set furni = furni || new_item, updated_at = now() where slug = p_room;
  return jsonb_build_object('inventory', to_jsonb(coalesce(new_inv, '{}')));
end $$;

-- Eşyayı kaldırıp çantaya al. Sadece sahibi veya admin.
create or replace function public.pickup_furni(p_room text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; r public.rooms; item jsonb; new_inv text[];
begin
  me := public._me();
  select * into r from public.rooms where slug = p_room for update;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  select f into item from jsonb_array_elements(r.furni) f where f->>'id' = p_id;
  if item is null then raise exception 'Eşya bulunamadı.'; end if;
  if me.role <> 'admin' and r.owner_id is distinct from me.id and (item->>'owner') is distinct from me.id::text then
    raise exception 'Bu eşya sana ait değil.';
  end if;
  update public.rooms
     set furni = (select coalesce(jsonb_agg(f), '[]'::jsonb) from jsonb_array_elements(furni) f where f->>'id' <> p_id),
         updated_at = now()
   where slug = p_room;
  update public.profiles set inventory = inventory || (item->>'type') where id = me.id
    returning inventory into new_inv;
  return jsonb_build_object('inventory', to_jsonb(new_inv));
end $$;

-- ---------- Admin RPC'leri ---------------------------------------------

create or replace function public.admin_set_role(p_username text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles; inv text[];
begin
  me := public._require_admin();
  if p_role not in ('user','vip','suvari','admin') then raise exception 'Geçersiz rütbe.'; end if;
  select * into t from public.profiles where lower(username) = lower(p_username);
  if not found then raise exception 'Bu kullanıcı adına sahip hesap bulunamadı.'; end if;
  if t.is_founder then raise exception 'Kurucu rütbesi değiştirilemez.'; end if;

  inv := t.inventory;
  if p_role in ('suvari','admin') then
    if not ('suvari_ati' = any(inv)) then inv := array_prepend('suvari_ati', inv); end if;
  else
    inv := array_remove(inv, 'suvari_ati');
  end if;
  update public.profiles set role = p_role, inventory = inv where id = t.id;
  perform public._emit_event('role', null, t.username, jsonb_build_object('role', p_role), me.username);
  perform public._log(me.username, 'role', t.username, p_role);
end $$;

create or replace function public.admin_gift(p_username text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._require_admin();
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then raise exception 'Miktar 1 ile 1.000.000 arasında olmalı.'; end if;
  select * into t from public.profiles where lower(username) = lower(p_username);
  if not found then raise exception 'Bu kullanıcı adına sahip hesap bulunamadı.'; end if;
  update public.profiles set coins = least(coins::bigint + p_amount, 2000000000)::int where id = t.id;
  perform public._emit_event('gift', null, t.username, jsonb_build_object('amount', p_amount), me.username);
  perform public._log(me.username, 'gift', t.username, p_amount::text);
end $$;

create or replace function public.admin_kick(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._require_admin();
  select * into t from public.profiles where lower(username) = lower(p_username);
  if not found then raise exception 'Bu kullanıcı adına sahip hesap bulunamadı.'; end if;
  if t.is_founder or t.id = me.id then raise exception 'Bu hesap uzaklaştırılamaz.'; end if;
  update public.profiles set kicked_until = now() + interval '5 minutes' where id = t.id;
  perform public._emit_event('kick', null, t.username, '{}'::jsonb, me.username);
  perform public._log(me.username, 'kick', t.username, null);
end $$;

create or replace function public.admin_announce(p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; msg text;
begin
  me := public._require_admin();
  msg := left(btrim(coalesce(p_text, '')), 140);
  if msg = '' then raise exception 'Duyuru boş olamaz.'; end if;
  perform public._emit_event('announce', null, null, jsonb_build_object('text', msg), me.username);
end $$;

create or replace function public.admin_dance(p_room text, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._require_admin();
  perform public._emit_event('dance', p_room, null, jsonb_build_object('on', p_on), me.username);
end $$;

create or replace function public.admin_clear_room(p_room text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._require_admin();
  update public.rooms set furni = '[]'::jsonb, updated_at = now() where slug = p_room;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  perform public._emit_event('clear_room', p_room, null, '{}'::jsonb, me.username);
  perform public._log(me.username, 'clear_room', p_room, null);
end $$;

-- ---------- v3: yardımcılar ------------------------------------------------

create or replace function public._norm(p text) returns text
language sql immutable set search_path = '' as $$
  select lower(translate(btrim(coalesce(p, '')), 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc'))
$$;

create or replace function public._log(p_admin text, p_action text, p_target text, p_detail text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.admin_log where created_at < now() - interval '30 days';
  insert into public.admin_log (admin, action, target, detail) values (p_admin, p_action, p_target, p_detail);
end $$;

create or replace function public._emit_user_event(p_target uuid, p_kind text, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.user_events where created_at < now() - interval '1 day';
  insert into public.user_events (target_id, kind, payload) values (p_target, p_kind, coalesce(p_payload, '{}'::jsonb));
end $$;

create or replace function public._find_user(p_username text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare t public.profiles;
begin
  select * into t from public.profiles where lower(username) = lower(btrim(coalesce(p_username, '')));
  if not found then raise exception 'Bu kullanıcı adına sahip hesap bulunamadı.'; end if;
  return t;
end $$;

-- ---------- v3: sohbet (sunucu doğrulamalı) --------------------------------

create or replace function public.send_chat(p_room text, p_text text, p_target text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; r public.rooms; t public.profiles; txt text;
begin
  me := public._me();
  if me.kicked_until is not null and me.kicked_until > now() then raise exception 'Hesabın uzaklaştırıldı.'; end if;
  if me.muted_until is not null and me.muted_until > now() then raise exception 'Susturuldun, şu an mesaj yazamazsın.'; end if;
  txt := btrim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]', '', 'g'));
  if char_length(txt) < 1 or char_length(txt) > 140 then raise exception 'Mesaj 1-140 karakter olmalı.'; end if;

  if me.role <> 'admin' then
    if exists (select 1 from public.messages where sender_id = me.id and created_at > now() - interval '1 second') then
      raise exception 'Çok hızlı yazıyorsun, biraz bekle.';
    end if;
    if exists (select 1 from public.messages where sender_id = me.id and text = txt and created_at > now() - interval '15 seconds') then
      raise exception 'Aynı mesajı tekrar tekrar gönderemezsin (spam).';
    end if;
  end if;

  if p_target is null then
    select * into r from public.rooms where slug = p_room;
    if not found then raise exception 'Oda bulunamadı.'; end if;
    insert into public.messages (kind, room, sender_id, sender, text) values ('chat', p_room, me.id, me.username, txt);
    perform public._progress(me.id, 'chat_5', 1);
  else
    if public.role_rank(me.role) < 1 then raise exception 'Özel mesaj (/pm) sadece VIP ve üstü içindir.'; end if;
    t := public._find_user(p_target);
    if t.id = me.id then raise exception 'Kendine fısıldayamazsın.'; end if;
    insert into public.messages (kind, room, sender_id, sender, target_id, target, text)
    values ('whisper', null, me.id, me.username, t.id, t.username, txt);
  end if;

  if random() < 0.02 then delete from public.messages where created_at < now() - interval '3 days'; end if;
end $$;

-- Sunucuda atılan adil zar
create or replace function public.roll_dice(p_room text) returns int
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; n int;
begin
  me := public._me();
  n := 1 + floor(random() * 6)::int;
  perform public.send_chat(p_room, '🎲 zar attı: ' || n, null);
  return n;
end $$;

-- Her ~25 sn'de çağrılır: çevrimiçi durumu günceller, uzaklaştırma/susturma durumunu döner
create or replace function public.heartbeat(p_room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  perform public._close_tournaments();
  update public.profiles set last_seen = now(), current_room = left(p_room, 60) where id = me.id;
  return jsonb_build_object('kicked_until', me.kicked_until, 'muted_until', me.muted_until);
end $$;

-- ---------- v3: arkadaşlar -------------------------------------------------

create or replace function public.friend_request(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles; f public.friendships;
begin
  me := public._me();
  t := public._find_user(p_username);
  if t.id = me.id then raise exception 'Kendini arkadaş ekleyemezsin.'; end if;
  select * into f from public.friendships
   where (requester = me.id and addressee = t.id) or (requester = t.id and addressee = me.id);
  if found then
    if f.status = 'accepted' then raise exception 'Zaten arkadaşsınız.'; end if;
    if f.requester = me.id then raise exception 'İstek zaten gönderildi.'; end if;
    update public.friendships set status = 'accepted' where requester = t.id and addressee = me.id;
    perform public._emit_user_event(t.id, 'friend_accepted', jsonb_build_object('from', me.username));
    return;
  end if;
  insert into public.friendships (requester, addressee) values (me.id, t.id);
  perform public._emit_user_event(t.id, 'friend_request', jsonb_build_object('from', me.username));
end $$;

create or replace function public.friend_respond(p_username text, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._me();
  t := public._find_user(p_username);
  if p_accept then
    update public.friendships set status = 'accepted' where requester = t.id and addressee = me.id and status = 'pending';
    if not found then raise exception 'Bekleyen istek bulunamadı.'; end if;
    perform public._emit_user_event(t.id, 'friend_accepted', jsonb_build_object('from', me.username));
  else
    delete from public.friendships where requester = t.id and addressee = me.id and status = 'pending';
  end if;
end $$;

create or replace function public.friend_remove(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._me();
  t := public._find_user(p_username);
  delete from public.friendships
   where (requester = me.id and addressee = t.id) or (requester = t.id and addressee = me.id);
end $$;

create or replace function public.get_friends() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  return coalesce((
    select jsonb_agg(x order by x->>'username')
    from (
      select jsonb_build_object(
        'username', p.username,
        'role', p.role,
        'relation', case when f.status = 'accepted' then 'friend' when f.requester = me.id then 'outgoing' else 'incoming' end,
        'online', (f.status = 'accepted' and coalesce(p.last_seen > now() - interval '70 seconds', false)),
        'room', case when f.status = 'accepted' and coalesce(p.last_seen > now() - interval '70 seconds', false) then p.current_room end,
        'home', (select r.slug from public.rooms r where r.owner_id = p.id limit 1)
      ) as x
      from public.friendships f
      join public.profiles p on p.id = case when f.requester = me.id then f.addressee else f.requester end
      where f.requester = me.id or f.addressee = me.id
    ) t
  ), '[]'::jsonb);
end $$;

-- ---------- v3: hediye -----------------------------------------------------

create or replace function public.gift_coins(p_username text, p_amount int) returns int
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles; left_coins int;
begin
  me := public._me();
  t := public._find_user(p_username);
  if t.id = me.id then raise exception 'Kendine hediye gönderemezsin.'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then raise exception 'Geçersiz miktar.'; end if;
  if me.role <> 'admin' then
    update public.profiles set coins = coins - p_amount where id = me.id and coins >= p_amount returning coins into left_coins;
    if left_coins is null then raise exception 'Yeterli Sanilin yok.'; end if;
  else
    left_coins := me.coins;
  end if;
  update public.profiles set coins = least(coins::bigint + p_amount, 2000000000)::int where id = t.id;
  perform public._emit_user_event(t.id, 'gift_coins', jsonb_build_object('from', me.username, 'amount', p_amount));
  perform public._progress(me.id, 'gift_1', 1);
  return left_coins;
end $$;

create or replace function public.gift_item(p_username text, p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles; idx int; new_inv text[];
begin
  me := public._me();
  t := public._find_user(p_username);
  if t.id = me.id then raise exception 'Kendine hediye gönderemezsin.'; end if;
  if p_item = 'suvari_ati' or public.furni_price(p_item) is null then raise exception 'Bu eşya hediye edilemez.'; end if;
  idx := array_position(me.inventory, p_item);
  if idx is null then raise exception 'Bu eşya çantanda yok.'; end if;
  new_inv := me.inventory[1:idx-1] || me.inventory[idx+1:array_length(me.inventory, 1)];
  update public.profiles set inventory = coalesce(new_inv, '{}') where id = me.id;
  update public.profiles set inventory = inventory || p_item where id = t.id;
  perform public._emit_user_event(t.id, 'gift_item', jsonb_build_object('from', me.username, 'item', p_item));
  perform public._progress(me.id, 'gift_1', 1);
  return jsonb_build_object('inventory', to_jsonb(coalesce(new_inv, '{}')));
end $$;

-- ---------- v3: kozmetik mağazası -----------------------------------------

create or replace function public.cosmetic_price(p_id text) returns int
language sql immutable set search_path = '' as $$
  select case p_id
    when 'hat_beanie' then 100 when 'hat_cap' then 120 when 'hat_cowboy' then 250
    when 'hat_tophat' then 300 when 'hat_crown' then 600 when 'hat_headphones' then 180
    when 'gl_nerd' then 80 when 'gl_shades' then 90 when 'gl_neon' then 200 when 'gl_star' then 160
    when 'pet_cat' then 250 when 'pet_dog' then 250 when 'pet_duck' then 150 when 'pet_fox' then 400
    when 'hs_long' then 100 when 'hs_spiky' then 100 when 'hs_bun' then 120 when 'hs_afro' then 150
    when 'hat_beret' then 140 when 'hat_bucket' then 130 when 'hat_wizard' then 350 when 'hat_pirate' then 320
    when 'hat_flower' then 160 when 'hat_catears' then 200
    when 'gl_round' then 110 when 'gl_heart' then 170 when 'gl_visor' then 240
    when 'tp_hoodie' then 180 when 'tp_stripe' then 140 when 'tp_suit' then 400 when 'tp_jersey' then 220
    when 'tp_overalls' then 200 when 'tp_hawaii' then 160
    when 'hs_mohawk' then 160 when 'hs_pony' then 130 when 'hs_curly' then 140
    when 'hs_short' then 0
    else null end
$$;

create or replace function public.buy_cosmetic(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; price int; new_coins int; new_wardrobe text[];
begin
  me := public._me();
  perform public._in_room(me, 'avm');
  price := public.cosmetic_price(p_id);
  if price is null or price = 0 then raise exception 'Bilinmeyen ürün.'; end if;
  if p_id = any(me.wardrobe) then raise exception 'Bu ürüne zaten sahipsin.'; end if;
  if me.role = 'admin' then
    new_coins := me.coins;
  else
    update public.profiles set coins = coins - price where id = me.id and coins >= price returning coins into new_coins;
    if new_coins is null then raise exception 'Yeterli Sanilin yok.'; end if;
  end if;
  update public.profiles set wardrobe = wardrobe || p_id where id = me.id returning wardrobe into new_wardrobe;
  return jsonb_build_object('coins', new_coins, 'wardrobe', to_jsonb(new_wardrobe));
end $$;

create or replace function public.equip_cosmetic(p_slot text, p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; prefix text;
begin
  me := public._me();
  if p_slot not in ('hat', 'glasses', 'top', 'hair', 'pet') then raise exception 'Geçersiz bölüm.'; end if;
  prefix := case p_slot when 'hat' then 'hat_' when 'glasses' then 'gl_' when 'top' then 'tp_' when 'pet' then 'pet_' else 'hs_' end;
  if p_id is null then
    if p_slot = 'hair' then update public.profiles set hair_style = 'hs_short' where id = me.id;
    elsif p_slot = 'hat' then update public.profiles set hat = null where id = me.id;
    elsif p_slot = 'pet' then update public.profiles set pet = null where id = me.id;
    elsif p_slot = 'top' then update public.profiles set top_style = null where id = me.id;
    else update public.profiles set glasses = null where id = me.id; end if;
    return;
  end if;
  if left(p_id, length(prefix)) <> prefix or public.cosmetic_price(p_id) is null then raise exception 'Geçersiz ürün.'; end if;
  if p_id <> 'hs_short' and not (p_id = any(me.wardrobe)) then raise exception 'Bu ürüne sahip değilsin.'; end if;
  if p_slot = 'hair' then update public.profiles set hair_style = p_id where id = me.id;
  elsif p_slot = 'hat' then update public.profiles set hat = p_id where id = me.id;
  elsif p_slot = 'pet' then update public.profiles set pet = p_id where id = me.id;
  elsif p_slot = 'top' then update public.profiles set top_style = p_id where id = me.id;
  else update public.profiles set glasses = p_id where id = me.id; end if;
end $$;

-- ---------- v3: kendi odan --------------------------------------------------

create or replace function public.ensure_home() returns text
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; s text;
begin
  me := public._me();
  s := 'home-' || lower(me.username);
  insert into public.rooms (slug, name, min_role, owner_id, furni) values (
    s, me.username || ' Odası', 'user', me.id,
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'rug',   'gx', 5, 'gy', 5, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'sofa',  'gx', 4, 'gy', 4, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'plant', 'gx', 2, 'gy', 2, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'bed',       'gx', 1, 'gy', 1, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'bookshelf', 'gx', 4, 'gy', 0, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'tv',        'gx', 7, 'gy', 0, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'lamp',      'gx', 9, 'gy', 1, 'rot', 0, 'owner', me.id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'plant',     'gx', 1, 'gy', 10, 'rot', 0, 'owner', me.id)
    )
  ) on conflict (slug) do nothing;
  return s;
end $$;

create or replace function public.set_home_access(p_access text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  if p_access not in ('open', 'friends', 'closed') then raise exception 'Geçersiz erişim türü.'; end if;
  update public.rooms set access = p_access where owner_id = me.id;
  if not found then raise exception 'Önce odanı oluştur.'; end if;
end $$;

create or replace function public.enter_room(p_slug text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; r public.rooms;
begin
  me := public._me();
  select * into r from public.rooms where slug = p_slug;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  perform public._progress(me.id, 'room_3', 1);
  if r.owner_id is null then
    if public.role_rank(me.role) < public.role_rank(r.min_role) then raise exception 'Bu odaya erişimin yok.'; end if;
    return;
  end if;
  if r.owner_id = me.id or me.role = 'admin' or r.access = 'open' then return; end if;
  if r.access = 'friends' and exists (
       select 1 from public.friendships f where f.status = 'accepted'
         and ((f.requester = me.id and f.addressee = r.owner_id) or (f.requester = r.owner_id and f.addressee = me.id))
     ) then return; end if;
  raise exception 'Bu oda sadece sahibinin %.', case when r.access = 'friends' then 'arkadaşlarına açık' else 'kendisine açık' end;
end $$;

-- ---------- v3: bilgi yarışması -------------------------------------------

create or replace function public.admin_start_quiz(p_question text, p_answer text, p_reward int, p_seconds int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; ends timestamptz;
begin
  me := public._require_admin();
  if btrim(coalesce(p_question, '')) = '' or public._norm(p_answer) = '' then raise exception 'Soru ve cevap boş olamaz.'; end if;
  if p_reward is null or p_reward < 1 or p_reward > 100000 then raise exception 'Ödül 1 ile 100.000 Sanil arasında olmalı.'; end if;
  p_seconds := least(greatest(coalesce(p_seconds, 60), 10), 600);
  ends := now() + make_interval(secs => p_seconds);
  update public.quiz_state
     set question = left(btrim(p_question), 140), answer_norm = public._norm(p_answer),
         reward = p_reward, ends_at = ends, active = true, winner = null
   where id = 1;
  perform public._emit_event('quiz', null, null,
    jsonb_build_object('question', left(btrim(p_question), 140), 'reward', p_reward, 'ends_at', ends), me.username);
  perform public._log(me.username, 'quiz', null, left(btrim(p_question), 60));
end $$;

create or replace function public.answer_quiz(p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; q public.quiz_state; won int;
begin
  me := public._me();
  if me.last_quiz_try is not null and me.last_quiz_try > now() - interval '2 seconds' then
    raise exception 'Çok hızlı deniyorsun, 2 saniye bekle.';
  end if;
  update public.profiles set last_quiz_try = now() where id = me.id;
  select * into q from public.quiz_state where id = 1;
  if not q.active or q.ends_at is null or q.ends_at <= now() then raise exception 'Şu an aktif bir yarışma yok.'; end if;
  if public._norm(p_text) <> q.answer_norm then return jsonb_build_object('correct', false); end if;

  update public.quiz_state set active = false, winner = me.username
   where id = 1 and active and ends_at > now() returning reward into won;
  if won is null then return jsonb_build_object('correct', false); end if;
  update public.profiles set coins = least(coins::bigint + won, 2000000000)::int where id = me.id;
  perform public._add_xp(me.id, 50);
  perform public._ach(me.id, 'quiz_win');
  perform public._emit_event('quiz_end', null, null,
    jsonb_build_object('winner', me.username, 'reward', won, 'answer', btrim(p_text)), me.username);
  return jsonb_build_object('correct', true, 'reward', won);
end $$;

-- ---------- v3: moderasyon -------------------------------------------------

create or replace function public.admin_mute(p_username text, p_minutes int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._require_admin();
  t := public._find_user(p_username);
  if t.is_founder or t.id = me.id then raise exception 'Bu hesap susturulamaz.'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 10080 then raise exception 'Süre 1 dakika ile 7 gün arasında olmalı.'; end if;
  update public.profiles set muted_until = now() + make_interval(mins => p_minutes) where id = t.id;
  perform public._emit_user_event(t.id, 'muted', jsonb_build_object('minutes', p_minutes, 'by', me.username));
  perform public._log(me.username, 'mute', t.username, p_minutes || ' dk');
end $$;

create or replace function public.admin_unmute(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._require_admin();
  t := public._find_user(p_username);
  update public.profiles set muted_until = null where id = t.id;
  perform public._log(me.username, 'unmute', t.username, null);
end $$;

-- p_hours = 0 → süresiz
create or replace function public.admin_ban(p_username text, p_hours int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._require_admin();
  t := public._find_user(p_username);
  if t.is_founder or t.id = me.id then raise exception 'Bu hesap yasaklanamaz.'; end if;
  if p_hours is null or p_hours < 0 or p_hours > 8760 then raise exception 'Süre 0 (süresiz) ile 8760 saat arasında olmalı.'; end if;
  update public.profiles
     set kicked_until = case when p_hours = 0 then 'infinity'::timestamptz else now() + make_interval(hours => p_hours) end
   where id = t.id;
  perform public._emit_event('kick', null, t.username, '{}'::jsonb, me.username);
  perform public._log(me.username, 'ban', t.username, case when p_hours = 0 then 'süresiz' else p_hours || ' saat' end);
end $$;

create or replace function public.admin_unban(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._require_admin();
  t := public._find_user(p_username);
  update public.profiles set kicked_until = null where id = t.id;
  perform public._log(me.username, 'unban', t.username, null);
end $$;

create or replace function public.report_player(p_username text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles; ctx jsonb;
begin
  me := public._me();
  t := public._find_user(p_username);
  if t.id = me.id then raise exception 'Kendini şikayet edemezsin.'; end if;
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'Şikayet nedeni seç.'; end if;
  if exists (select 1 from public.reports where reporter = me.username and created_at > now() - interval '1 minute') then
    raise exception 'Çok sık şikayet ediyorsun, biraz bekle.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('text', m.text, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
    into ctx
    from (select * from public.messages where sender_id = t.id and created_at > now() - interval '30 minutes'
           order by created_at desc limit 8) m;
  insert into public.reports (reporter, target, reason, room, context)
  values (me.username, t.username, left(btrim(p_reason), 200), me.current_room, ctx);
end $$;

create or replace function public.admin_list_reports() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.id desc)
                     from (select * from public.reports where status = 'open' order by id desc limit 30) r), '[]'::jsonb);
end $$;

create or replace function public.admin_close_report(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._require_admin();
  update public.reports set status = 'closed' where id = p_id;
  perform public._log(me.username, 'close_report', p_id::text, null);
end $$;

create or replace function public.admin_get_log() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  return coalesce((select jsonb_agg(to_jsonb(l) order by l.id desc)
                     from (select * from public.admin_log order by id desc limit 30) l), '[]'::jsonb);
end $$;


-- ---------- v3.1: olta, balık tutma, iskele & restoran ---------------------
alter table public.profiles add column if not exists tool text;
alter table public.profiles add column if not exists last_fish timestamptz;
alter table public.profiles drop constraint if exists profiles_tool_check;
alter table public.profiles add constraint profiles_tool_check check (tool is null or tool = 'fishing_rod');

insert into public.rooms (slug, name, min_role, furni) values
  ('iskele', 'Sahil İskelesi', 'user', '[
    {"id":"d1","type":"lamp","gx":2,"gy":2,"rot":0,"owner":null},
    {"id":"d2","type":"lamp","gx":2,"gy":9,"rot":0,"owner":null}
  ]'::jsonb),
  ('restoran', 'Sahil Restoranı', 'user', '[
    {"id":"d1","type":"table","gx":7,"gy":4,"rot":0,"owner":null},
    {"id":"d2","type":"table","gx":7,"gy":6,"rot":0,"owner":null},
    {"id":"d3","type":"chair","gx":6,"gy":4,"rot":0,"owner":null},
    {"id":"d4","type":"chair","gx":6,"gy":6,"rot":0,"owner":null},
    {"id":"d5","type":"plant","gx":1,"gy":1,"rot":0,"owner":null}
  ]'::jsonb)
on conflict (slug) do nothing;

create or replace function public.fish_price(p_item text) returns int
language sql immutable set search_path = '' as $$
  select case p_item
    when 'fish_boot' then 5 when 'fish_hamsi' then 15 when 'fish_cipura' then 30
    when 'fish_levrek' then 55 when 'fish_shark' then 120 when 'fish_treasure' then 250
    else null end
$$;

create or replace function public.buy_fishing_rod() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; price constant int := 200; new_coins int; new_inv text[];
begin
  me := public._me();
  if 'fishing_rod' = any(me.inventory) then raise exception 'Zaten bir oltan var.'; end if;
  if me.role = 'admin' then
    new_coins := me.coins;
  else
    update public.profiles set coins = coins - price where id = me.id and coins >= price returning coins into new_coins;
    if new_coins is null then raise exception 'Yeterli Sanilin yok (olta 200 Sanil).'; end if;
  end if;
  update public.profiles set inventory = array_append(inventory, 'fishing_rod'::text), tool = 'fishing_rod'
   where id = me.id returning inventory into new_inv;
  return jsonb_build_object('coins', new_coins, 'inventory', to_jsonb(new_inv), 'tool', 'fishing_rod');
end $$;

create or replace function public.equip_tool(p_tool text) returns text
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  if p_tool is not null then
    if p_tool <> 'fishing_rod' then raise exception 'Geçersiz alet.'; end if;
    if not ('fishing_rod' = any(me.inventory)) then raise exception 'Oltan yok.'; end if;
  end if;
  update public.profiles set tool = p_tool where id = me.id;
  return p_tool;
end $$;

-- Sonuç sunucuda çekilir (istemci hangi balığı tuttuğunu seçemez); en az 2,5 sn arayla.
create or replace function public.catch_fish(p_room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; roll int; item text; new_inv text[];
begin
  me := public._me();
  if p_room is distinct from 'iskele' then raise exception 'Burada balık tutamazsın; iskeleye git.'; end if;
  if me.tool is distinct from 'fishing_rod' or not ('fishing_rod' = any(me.inventory)) then
    raise exception 'Önce oltanı kuşan.';
  end if;
  if me.last_fish is not null and me.last_fish > now() - interval '2500 milliseconds' then
    raise exception 'Olta henüz hazır değil.';
  end if;
  if coalesce(array_length(me.inventory, 1), 0) >= 60 then raise exception 'Çantan dolu; balıkları sat.'; end if;
  roll := floor(random() * 100)::int;
  item := case when roll < 15 then 'fish_boot' when roll < 45 then 'fish_hamsi' when roll < 70 then 'fish_cipura'
               when roll < 88 then 'fish_levrek' when roll < 96 then 'fish_shark' else 'fish_treasure' end;
  update public.profiles set inventory = inventory || item, last_fish = now()
   where id = me.id returning inventory into new_inv;
  update public.profiles set fish_caught = fish_caught + 1 where id = me.id;
  perform public._close_tournaments();
  perform public._tournament_add(me.id, me.username, public.fish_price(item));
  perform public._progress(me.id, 'fish_5', 1);
  perform public._add_xp(me.id, case item when 'fish_boot' then 2 when 'fish_hamsi' then 5 when 'fish_cipura' then 8
                                          when 'fish_levrek' then 12 when 'fish_shark' then 30 else 60 end);
  perform public._ach(me.id, 'first_fish');
  if item = 'fish_shark' then perform public._ach(me.id, 'shark'); end if;
  if item = 'fish_treasure' then perform public._ach(me.id, 'treasure'); end if;
  if me.fish_caught + 1 >= 50 then perform public._ach(me.id, 'fish_50'); end if;
  return jsonb_build_object('item', item, 'value', public.fish_price(item), 'inventory', to_jsonb(new_inv));
end $$;

-- p_item boşsa bütün balıklar, doluysa o türden tek balık satılır.
create or replace function public.sell_fish(p_item text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; it text; kept text[] := '{}'; sold int := 0; earned int := 0; removed boolean := false; new_coins int;
begin
  me := public._me();
  foreach it in array me.inventory loop
    if public.fish_price(it) is not null and (p_item is null or (it = p_item and not removed)) then
      earned := earned + public.fish_price(it);
      sold := sold + 1;
      if p_item is not null then removed := true; end if;
    else
      kept := kept || it;
    end if;
  end loop;
  if sold = 0 then raise exception 'Satacak balığın yok.'; end if;
  update public.profiles set inventory = kept, coins = coins + earned where id = me.id returning coins into new_coins;
  perform public._progress(me.id, 'sell_1', 1);
  perform public._add_xp(me.id, greatest(1, earned / 10));
  return jsonb_build_object('earned', earned, 'sold', sold, 'coins', new_coins, 'inventory', to_jsonb(kept));
end $$;


-- ---------- v4: XP, görevler, başarımlar, pazar, turnuva, evcil -------------
alter table public.profiles add column if not exists xp int not null default 0 check (xp >= 0);
alter table public.profiles add column if not exists fish_caught int not null default 0 check (fish_caught >= 0);
alter table public.profiles add column if not exists pet text;
alter table public.profiles drop constraint if exists profiles_pet_check;
alter table public.profiles add constraint profiles_pet_check check (pet is null or pet ~ '^pet_[a-z]+$');

alter table public.admin_events drop constraint if exists admin_events_kind_check;
alter table public.admin_events add constraint admin_events_kind_check
  check (kind in ('announce','kick','gift','role','dance','clear_room','quiz','quiz_end','tournament','tournament_end')) not valid;

create table if not exists public.quest_progress (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  day      date not null,
  key      text not null,
  progress int  not null default 0,
  claimed  boolean not null default false,
  primary key (user_id, day, key)
);

create table if not exists public.achievements (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  key        text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.listings (
  id          bigint generated always as identity primary key,
  seller_id   uuid not null references public.profiles(id) on delete cascade,
  seller      text not null,
  item        text not null,
  price       int  not null check (price between 1 and 100000),
  for_user_id uuid references public.profiles(id) on delete cascade,
  for_user    text,
  created_at  timestamptz not null default now()
);
create index if not exists listings_seller_idx on public.listings (seller_id);

create table if not exists public.tournament (
  id         bigint generated always as identity primary key,
  started_by text not null,
  ends_at    timestamptz not null,
  closed     boolean not null default false
);

create table if not exists public.tournament_scores (
  tournament_id bigint not null references public.tournament(id) on delete cascade,
  user_id       uuid   not null references public.profiles(id) on delete cascade,
  username      text   not null,
  score         int    not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

alter table public.quest_progress    enable row level security;
alter table public.achievements      enable row level security;
alter table public.listings          enable row level security;
alter table public.tournament        enable row level security;
alter table public.tournament_scores enable row level security;
revoke all on public.quest_progress, public.achievements, public.listings, public.tournament, public.tournament_scores from anon, authenticated;

create or replace function public._level(p_xp int) returns int
language sql immutable set search_path = '' as $$ select floor(sqrt(p_xp / 50.0))::int + 1 $$;

create or replace function public._ach(p_uid uuid, p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.achievements (user_id, key) values (p_uid, p_key) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then perform public._emit_user_event(p_uid, 'achievement', jsonb_build_object('key', p_key)); end if;
end $$;

create or replace function public._add_xp(p_uid uuid, p_xp int) returns void
language plpgsql security definer set search_path = '' as $$
declare old_xp int; new_xp int; lo int; ln int;
begin
  if p_xp is null or p_xp <= 0 then return; end if;
  select xp into old_xp from public.profiles where id = p_uid;
  if old_xp is null then return; end if;
  new_xp := least(old_xp::bigint + p_xp, 100000000)::int;
  update public.profiles set xp = new_xp where id = p_uid;
  lo := public._level(old_xp); ln := public._level(new_xp);
  if ln > lo then
    perform public._emit_user_event(p_uid, 'level_up', jsonb_build_object('level', ln));
    if ln >= 5 then perform public._ach(p_uid, 'lvl_5'); end if;
    if ln >= 10 then perform public._ach(p_uid, 'lvl_10'); end if;
  end if;
end $$;

create or replace function public._quest_goal(p_key text) returns int
language sql immutable set search_path = '' as $$
  select case p_key when 'fish_5' then 5 when 'sell_1' then 1 when 'chat_5' then 5 when 'gift_1' then 1 when 'room_3' then 3 end $$;
create or replace function public._quest_coins(p_key text) returns int
language sql immutable set search_path = '' as $$
  select case p_key when 'fish_5' then 150 when 'sell_1' then 60 when 'chat_5' then 50 when 'gift_1' then 100 when 'room_3' then 40 end $$;
create or replace function public._quest_xp(p_key text) returns int
language sql immutable set search_path = '' as $$
  select case p_key when 'fish_5' then 40 when 'sell_1' then 20 when 'chat_5' then 15 when 'gift_1' then 30 when 'room_3' then 10 end $$;

create or replace function public._progress(p_uid uuid, p_key text, p_n int) returns void
language plpgsql security definer set search_path = '' as $$
declare g int := public._quest_goal(p_key);
begin
  if g is null then return; end if;
  insert into public.quest_progress (user_id, day, key, progress)
  values (p_uid, (now() at time zone 'Europe/Istanbul')::date, p_key, least(p_n, g))
  on conflict (user_id, day, key)
  do update set progress = least(g, public.quest_progress.progress + p_n)
  where not public.quest_progress.claimed;
end $$;

create or replace function public.get_quests() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; today date := (now() at time zone 'Europe/Istanbul')::date; res jsonb;
begin
  me := public._me();
  select coalesce(jsonb_agg(jsonb_build_object(
      'key', t.k, 'goal', public._quest_goal(t.k), 'progress', coalesce(q.progress, 0),
      'claimed', coalesce(q.claimed, false), 'coins', public._quest_coins(t.k), 'xp', public._quest_xp(t.k)
    ) order by t.ord), '[]'::jsonb)
    into res
    from unnest(array['fish_5','sell_1','chat_5','gift_1','room_3']) with ordinality as t(k, ord)
    left join public.quest_progress q on q.user_id = me.id and q.day = today and q.key = t.k;
  return res;
end $$;

create or replace function public.claim_quest(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g int; ok boolean; new_coins int; new_xp int;
begin
  me := public._me();
  g := public._quest_goal(p_key);
  if g is null then raise exception 'Geçersiz görev.'; end if;
  update public.quest_progress set claimed = true
   where user_id = me.id and day = (now() at time zone 'Europe/Istanbul')::date and key = p_key and progress >= g and not claimed
   returning true into ok;
  if ok is null then raise exception 'Görev tamamlanmadı ya da ödül zaten alındı.'; end if;
  update public.profiles set coins = least(coins::bigint + public._quest_coins(p_key), 2000000000)::int
   where id = me.id returning coins into new_coins;
  perform public._add_xp(me.id, public._quest_xp(p_key));
  select xp into new_xp from public.profiles where id = me.id;
  return jsonb_build_object('coins', new_coins, 'xp', new_xp);
end $$;

create or replace function public.get_profile_card(p_username text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._me();
  t := public._find_user(p_username);
  return jsonb_build_object(
    'username', t.username, 'role', t.role, 'xp', t.xp, 'level', public._level(t.xp),
    'fish_caught', t.fish_caught, 'joined', t.created_at,
    'friends', (select count(*) from public.friendships f where f.status = 'accepted' and (f.requester = t.id or f.addressee = t.id)),
    'achievements', coalesce((select jsonb_agg(a.key order by a.created_at) from public.achievements a where a.user_id = t.id), '[]'::jsonb)
  );
end $$;

-- ----- pazar / takas -----
create or replace function public._inv_remove(a text[], it text) returns text[]
language plpgsql immutable set search_path = '' as $$
declare i int := array_position(a, it);
begin
  if i is null then return a; end if;
  return coalesce(a[1:i-1], '{}') || coalesce(a[i+1:array_length(a, 1)], '{}');
end $$;

create or replace function public.market_list_item(p_item text, p_price int, p_for text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles; new_inv text[];
begin
  me := public._me();
  if p_item = 'suvari_ati' or (public.furni_price(p_item) is null and public.fish_price(p_item) is null) then
    raise exception 'Bu eşya satılamaz.';
  end if;
  if p_price is null or p_price < 1 or p_price > 100000 then raise exception 'Fiyat 1 ile 100.000 Sanil arasında olmalı.'; end if;
  if not (p_item = any(me.inventory)) then raise exception 'Bu eşya çantanda yok.'; end if;
  if (select count(*) from public.listings where seller_id = me.id) >= 10 then raise exception 'En fazla 10 ilanın olabilir.'; end if;
  if p_for is not null and btrim(p_for) <> '' then
    t := public._find_user(p_for);
    if t.id = me.id then raise exception 'Kendine satış yapamazsın.'; end if;
  end if;
  new_inv := public._inv_remove(me.inventory, p_item);
  update public.profiles set inventory = new_inv where id = me.id;
  insert into public.listings (seller_id, seller, item, price, for_user_id, for_user)
  values (me.id, me.username, p_item, p_price, t.id, t.username);
  if t.id is not null then
    perform public._emit_user_event(t.id, 'market_offer', jsonb_build_object('from', me.username, 'item', p_item, 'price', p_price));
  end if;
  return jsonb_build_object('inventory', to_jsonb(new_inv));
end $$;

create or replace function public.market_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; res jsonb;
begin
  me := public._me();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'seller', l.seller, 'item', l.item, 'price', l.price,
      'mine', l.seller_id = me.id, 'for_user', l.for_user) order by l.id desc), '[]'::jsonb)
    into res
    from (select * from public.listings
           where for_user_id is null or for_user_id = me.id or seller_id = me.id
           order by id desc limit 100) l;
  return res;
end $$;

create or replace function public.market_cancel(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; l public.listings; new_inv text[];
begin
  me := public._me();
  select * into l from public.listings where id = p_id and seller_id = me.id for update;
  if not found then raise exception 'İlan bulunamadı.'; end if;
  delete from public.listings where id = l.id;
  update public.profiles set inventory = inventory || l.item where id = me.id returning inventory into new_inv;
  return jsonb_build_object('inventory', to_jsonb(new_inv));
end $$;

create or replace function public.market_buy(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; l public.listings; new_coins int; new_inv text[]; fee int;
begin
  me := public._me();
  select * into l from public.listings where id = p_id for update;
  if not found then raise exception 'İlan artık yok (satılmış olabilir).'; end if;
  if l.seller_id = me.id then raise exception 'Kendi ilanını alamazsın; iptal et.'; end if;
  if l.for_user_id is not null and l.for_user_id <> me.id then raise exception 'Bu ilan başkasına özel.'; end if;
  if coalesce(array_length(me.inventory, 1), 0) >= 60 then raise exception 'Çantan dolu.'; end if;
  update public.profiles set coins = coins - l.price where id = me.id and coins >= l.price returning coins into new_coins;
  if new_coins is null then raise exception 'Yeterli Sanilin yok.'; end if;
  fee := floor(l.price * 0.05)::int;
  update public.profiles set coins = least(coins::bigint + (l.price - fee), 2000000000)::int where id = l.seller_id;
  update public.profiles set inventory = inventory || l.item where id = me.id returning inventory into new_inv;
  delete from public.listings where id = l.id;
  perform public._emit_user_event(l.seller_id, 'market_sold',
    jsonb_build_object('from', me.username, 'item', l.item, 'price', l.price - fee));
  perform public._add_xp(me.id, 10);
  perform public._add_xp(l.seller_id, 10);
  perform public._ach(me.id, 'first_trade');
  perform public._ach(l.seller_id, 'first_trade');
  return jsonb_build_object('coins', new_coins, 'inventory', to_jsonb(new_inv));
end $$;

-- ----- balık turnuvası -----
create or replace function public._tournament_add(p_uid uuid, p_name text, p_val int) returns void
language plpgsql security definer set search_path = '' as $$
declare tid bigint;
begin
  select id into tid from public.tournament where not closed and ends_at > now() order by id desc limit 1;
  if tid is null then return; end if;
  insert into public.tournament_scores (tournament_id, user_id, username, score)
  values (tid, p_uid, p_name, p_val)
  on conflict (tournament_id, user_id)
  do update set score = public.tournament_scores.score + p_val, updated_at = now();
end $$;

create or replace function public._close_tournaments() returns void
language plpgsql security definer set search_path = '' as $$
declare t record; w record; i int; prize int; winner text; wscore int;
begin
  for t in select * from public.tournament where not closed and ends_at <= now() order by id for update skip locked loop
    update public.tournament set closed = true where id = t.id;
    i := 0; winner := null; wscore := null;
    for w in select user_id, username, score from public.tournament_scores
              where tournament_id = t.id and score > 0 order by score desc, updated_at asc limit 3 loop
      i := i + 1;
      prize := case i when 1 then 500 when 2 then 250 else 100 end;
      update public.profiles set coins = least(coins::bigint + prize, 2000000000)::int where id = w.user_id;
      perform public._add_xp(w.user_id, case i when 1 then 100 when 2 then 50 else 25 end);
      perform public._emit_user_event(w.user_id, 'tournament_prize', jsonb_build_object('place', i, 'prize', prize));
      if i = 1 then
        winner := w.username; wscore := w.score;
        perform public._ach(w.user_id, 'tournament_win');
      end if;
    end loop;
    perform public._emit_event('tournament_end', null, null, jsonb_build_object('winner', winner, 'score', wscore), 'Sistem');
  end loop;
end $$;

create or replace function public.get_tournament() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.tournament; top jsonb; mine int;
begin
  me := public._me();
  perform public._close_tournaments();
  select * into t from public.tournament where not closed and ends_at > now() order by id desc limit 1;
  if not found then return jsonb_build_object('active', false); end if;
  select coalesce(jsonb_agg(jsonb_build_object('username', s.username, 'score', s.score) order by s.score desc, s.updated_at), '[]'::jsonb)
    into top from (select * from public.tournament_scores where tournament_id = t.id and score > 0
                    order by score desc, updated_at limit 10) s;
  select score into mine from public.tournament_scores where tournament_id = t.id and user_id = me.id;
  return jsonb_build_object('active', true, 'ends_at', t.ends_at, 'top', top, 'me', coalesce(mine, 0));
end $$;

create or replace function public.admin_start_tournament(p_minutes int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; ends timestamptz;
begin
  me := public._require_admin();
  perform public._close_tournaments();
  if exists (select 1 from public.tournament where not closed and ends_at > now()) then
    raise exception 'Zaten aktif bir turnuva var.';
  end if;
  p_minutes := least(greatest(coalesce(p_minutes, 10), 1), 120);
  ends := now() + make_interval(mins => p_minutes);
  insert into public.tournament (started_by, ends_at) values (me.username, ends);
  perform public._emit_event('tournament', null, null, jsonb_build_object('ends_at', ends, 'minutes', p_minutes), me.username);
  perform public._log(me.username, 'tournament', null, p_minutes || ' dk');
end $$;

-- ---------- v5: lonca, maden/çiftlik/aşçılık, masalar, mini oyunlar, konum doğrulama ----------
alter table public.profiles add column if not exists pos_room text;
alter table public.profiles add column if not exists pos_x int;
alter table public.profiles add column if not exists pos_y int;
alter table public.profiles add column if not exists pos_at timestamptz;
alter table public.profiles add column if not exists last_work timestamptz;

alter table public.admin_events drop constraint if exists admin_events_kind_check;
alter table public.admin_events add constraint admin_events_kind_check
  check (kind in ('announce','kick','gift','role','dance','clear_room','quiz','quiz_end','tournament','tournament_end',
                  'flag','flag_end','hide','hide_end'));

insert into public.rooms (slug, name, min_role, furni) values
  ('ciftlik', 'Sevalika Çiftliği', 'user', '[
    {"id":"d1","type":"plant","gx":2,"gy":2,"rot":0,"owner":null},
    {"id":"d2","type":"plant","gx":9,"gy":2,"rot":0,"owner":null},
    {"id":"d3","type":"lamp","gx":2,"gy":9,"rot":0,"owner":null}
  ]'::jsonb),
  ('maden', 'Taş Ocağı Madeni', 'user', '[
    {"id":"d1","type":"lamp","gx":1,"gy":1,"rot":0,"owner":null},
    {"id":"d2","type":"lamp","gx":10,"gy":1,"rot":0,"owner":null}
  ]'::jsonb)
on conflict (slug) do nothing;

-- ----- Sunucu tarafı konum doğrulama -----
-- Odaya girişte yalnızca giriş noktası (spawn) civarı kabul edilir; sonra hız sınırı uygulanır.
-- v6: sabit odaların boyut/doğma noktası/varsayılan eşyaları (lib/constants.ts ile aynı).
-- Eşyalar yalnızca oda boyutu değişirken (ilk çalıştırma) sıfırlanır; sonraki çalıştırmalarda oyuncu eşyalarına dokunulmaz.
insert into public.rooms (slug, name, min_role, cols, rows, spawn_x, spawn_y, furni, layout_v) values
('cadde-1', 'Cadde 1 - Meydan Bulvarı', 'user', 22, 14, 10, 6, '[{"id":"c1","type":"streetlight","gx":3,"gy":2,"rot":0,"owner":null},{"id":"c2","type":"streetlight","gx":9,"gy":2,"rot":0,"owner":null},{"id":"c3","type":"streetlight","gx":15,"gy":2,"rot":0,"owner":null},{"id":"c4","type":"streetlight","gx":20,"gy":2,"rot":0,"owner":null},{"id":"c5","type":"table","gx":5,"gy":1,"rot":0,"owner":null},{"id":"c6","type":"chair","gx":4,"gy":1,"rot":0,"owner":null},{"id":"c7","type":"chair","gx":6,"gy":1,"rot":0,"owner":null},{"id":"c8","type":"bin","gx":7,"gy":2,"rot":0,"owner":null},{"id":"c9","type":"kiosk","gx":2,"gy":0,"rot":0,"owner":null},{"id":"c10","type":"fountain","gx":11,"gy":10,"rot":0,"owner":null},{"id":"c11","type":"bench","gx":4,"gy":10,"rot":1,"owner":null},{"id":"c12","type":"bench","gx":14,"gy":10,"rot":1,"owner":null},{"id":"c13","type":"tree","gx":2,"gy":11,"rot":0,"owner":null},{"id":"c14","type":"tree","gx":6,"gy":12,"rot":0,"owner":null},{"id":"c15","type":"tree","gx":16,"gy":12,"rot":0,"owner":null},{"id":"c16","type":"tree","gx":19,"gy":10,"rot":0,"owner":null},{"id":"c17","type":"streetlight","gx":7,"gy":9,"rot":0,"owner":null},{"id":"c18","type":"streetlight","gx":15,"gy":9,"rot":0,"owner":null},{"id":"c19","type":"bin","gx":12,"gy":9,"rot":0,"owner":null},{"id":"c20","type":"bench","gx":12,"gy":2,"rot":0,"owner":null},{"id":"c21","type":"bench","gx":18,"gy":2,"rot":0,"owner":null},{"id":"c22","type":"plant","gx":1,"gy":2,"rot":0,"owner":null},{"id":"c23","type":"plant","gx":8,"gy":0,"rot":0,"owner":null},{"id":"c25","type":"plant","gx":17,"gy":0,"rot":0,"owner":null},{"id":"c26","type":"tree","gx":10,"gy":12,"rot":0,"owner":null},{"id":"c27","type":"tree","gx":13,"gy":12,"rot":0,"owner":null},{"id":"c28","type":"tree","gx":3,"gy":12,"rot":0,"owner":null},{"id":"c29","type":"tree","gx":20,"gy":12,"rot":0,"owner":null},{"id":"c30","type":"plant","gx":9,"gy":10,"rot":0,"owner":null},{"id":"c31","type":"plant","gx":13,"gy":10,"rot":0,"owner":null},{"id":"c32","type":"bench","gx":18,"gy":10,"rot":1,"owner":null},{"id":"caz1","type":"bus_stop","gx":14,"gy":0,"rot":0,"owner":null},{"id":"caz2","type":"phone_booth","gx":20,"gy":9,"rot":0,"owner":null}]'::jsonb, 10),
  ('sahil-kasabasi', '🌴 Sahil Kasabası', 'user', 20, 16, 2, 9, '[{"id":"sk_cafe","type":"beach_cafe","gx":2,"gy":0,"rot":0,"owner":null},{"id":"sk_bar","type":"tiki_bar","gx":0,"gy":3,"rot":0,"owner":null},{"id":"sk4","type":"table","gx":7,"gy":2,"rot":0,"owner":null},{"id":"sk5","type":"chair","gx":6,"gy":2,"rot":0,"owner":null},{"id":"sk6","type":"chair","gx":8,"gy":2,"rot":0,"owner":null},{"id":"sk7","type":"umbrella","gx":7,"gy":1,"rot":0,"owner":null},{"id":"sk8","type":"palm","gx":0,"gy":1,"rot":0,"owner":null},{"id":"sk9","type":"palm","gx":0,"gy":7,"rot":0,"owner":null},{"id":"sk11","type":"lounger","gx":3,"gy":6,"rot":0,"owner":null},{"id":"sk12","type":"umbrella","gx":4,"gy":6,"rot":0,"owner":null},{"id":"sk13","type":"lounger","gx":5,"gy":6,"rot":0,"owner":null},{"id":"sk15","type":"lounger","gx":3,"gy":9,"rot":0,"owner":null},{"id":"sk17","type":"umbrella","gx":4,"gy":9,"rot":0,"owner":null},{"id":"sk16","type":"lounger","gx":5,"gy":9,"rot":0,"owner":null},{"id":"sk18","type":"bench","gx":6,"gy":4,"rot":0,"owner":null},{"id":"sk19","type":"streetlight","gx":8,"gy":3,"rot":0,"owner":null},{"id":"sk20","type":"streetlight","gx":1,"gy":6,"rot":0,"owner":null},{"id":"sk21","type":"campfire","gx":4,"gy":13,"rot":0,"owner":null},{"id":"sk22","type":"logseat","gx":3,"gy":12,"rot":0,"owner":null},{"id":"sk23","type":"logseat","gx":5,"gy":12,"rot":1,"owner":null},{"id":"sk24","type":"logseat","gx":3,"gy":14,"rot":0,"owner":null},{"id":"sk25","type":"logseat","gx":5,"gy":14,"rot":1,"owner":null},{"id":"sk26","type":"palm","gx":1,"gy":11,"rot":0,"owner":null},{"id":"sk27","type":"palm","gx":7,"gy":12,"rot":0,"owner":null},{"id":"sk_dj","type":"dj_booth","gx":10,"gy":0,"rot":0,"owner":null},{"id":"sk29","type":"palm","gx":9,"gy":1,"rot":0,"owner":null},{"id":"sk30","type":"palm","gx":15,"gy":3,"rot":0,"owner":null},{"id":"sk31","type":"bench","gx":15,"gy":6,"rot":0,"owner":null},{"id":"sk32","type":"streetlight","gx":14,"gy":6,"rot":0,"owner":null},{"id":"sk33","type":"beanbag","gx":12,"gy":12,"rot":0,"owner":null},{"id":"sk34","type":"beanbag","gx":14,"gy":12,"rot":1,"owner":null},{"id":"sk35","type":"beanbag","gx":13,"gy":13,"rot":0,"owner":null},{"id":"sk36","type":"table","gx":13,"gy":12,"rot":0,"owner":null},{"id":"sk37","type":"palm","gx":15,"gy":11,"rot":0,"owner":null}]'::jsonb, 10),
  ('oyunika', '🎲 Oyunika Parkuru', 'user', 15, 8, 1, 1, '[{"id":"oy1","type":"lamp","gx":0,"gy":0,"rot":0,"owner":null},{"id":"oy2","type":"lamp","gx":14,"gy":0,"rot":0,"owner":null},{"id":"oy3","type":"plant","gx":14,"gy":6,"rot":0,"owner":null},{"id":"oy4","type":"palm","gx":3,"gy":0,"rot":0,"owner":null},{"id":"oy5","type":"palm","gx":11,"gy":0,"rot":0,"owner":null},{"id":"oy6","type":"lamp","gx":7,"gy":0,"rot":0,"owner":null},{"id":"oy7","type":"plant","gx":2,"gy":7,"rot":0,"owner":null},{"id":"oy8","type":"plant","gx":5,"gy":7,"rot":0,"owner":null},{"id":"oy9","type":"plant","gx":9,"gy":7,"rot":0,"owner":null},{"id":"oy10","type":"plant","gx":12,"gy":7,"rot":0,"owner":null},{"id":"oy11","type":"bench","gx":7,"gy":7,"rot":0,"owner":null},{"id":"oy12","type":"lamp","gx":14,"gy":7,"rot":0,"owner":null}]'::jsonb, 10),
  ('vip-cati-kati', 'VIP Çatı Katı', 'vip', 18, 14, 8, 8, '[{"id":"v1","type":"fountain","gx":9,"gy":3,"rot":0,"owner":null},{"id":"v2","type":"rug","gx":9,"gy":7,"rot":0,"owner":null},{"id":"v3","type":"rug","gx":10,"gy":7,"rot":0,"owner":null},{"id":"v4","type":"table","gx":9,"gy":7,"rot":0,"owner":null},{"id":"v5","type":"sofa","gx":7,"gy":7,"rot":0,"owner":null},{"id":"v6","type":"sofa","gx":12,"gy":7,"rot":1,"owner":null},{"id":"v7","type":"palm","gx":2,"gy":2,"rot":0,"owner":null},{"id":"v8","type":"palm","gx":15,"gy":2,"rot":0,"owner":null},{"id":"v9","type":"palm","gx":2,"gy":11,"rot":0,"owner":null},{"id":"v10","type":"palm","gx":15,"gy":11,"rot":0,"owner":null},{"id":"v11","type":"lounger","gx":3,"gy":7,"rot":0,"owner":null},{"id":"v12","type":"lounger","gx":5,"gy":7,"rot":0,"owner":null},{"id":"v13","type":"lounger","gx":3,"gy":11,"rot":0,"owner":null},{"id":"v14","type":"lounger","gx":5,"gy":11,"rot":0,"owner":null},{"id":"v15","type":"umbrella","gx":4,"gy":7,"rot":0,"owner":null},{"id":"v16","type":"umbrella","gx":4,"gy":11,"rot":0,"owner":null},{"id":"v17","type":"tiki_bar","gx":13,"gy":2,"rot":0,"owner":null},{"id":"v18","type":"chair","gx":13,"gy":4,"rot":0,"owner":null},{"id":"v19","type":"chair","gx":14,"gy":4,"rot":0,"owner":null},{"id":"v20","type":"lamp","gx":6,"gy":2,"rot":0,"owner":null},{"id":"v21","type":"lamp","gx":11,"gy":2,"rot":0,"owner":null},{"id":"v22","type":"lamp","gx":8,"gy":12,"rot":0,"owner":null},{"id":"v23","type":"lamp","gx":12,"gy":12,"rot":0,"owner":null},{"id":"v24","type":"plant","gx":1,"gy":6,"rot":0,"owner":null},{"id":"v25","type":"plant","gx":1,"gy":8,"rot":0,"owner":null},{"id":"v26","type":"plant","gx":8,"gy":5,"rot":0,"owner":null},{"id":"v27","type":"plant","gx":10,"gy":5,"rot":0,"owner":null},{"id":"v28","type":"bench","gx":12,"gy":11,"rot":1,"owner":null},{"id":"v29","type":"bench","gx":14,"gy":11,"rot":1,"owner":null},{"id":"v30","type":"beanbag","gx":15,"gy":7,"rot":0,"owner":null},{"id":"v31","type":"beanbag","gx":15,"gy":8,"rot":0,"owner":null}]'::jsonb, 10),
  ('monako-kulup', 'Monako Kulüp', 'user', 18, 14, 8, 10, '[{"id":"mk1","type":"casinotable","gx":5,"gy":6,"rot":0,"owner":null},{"id":"mk2","type":"casinotable","gx":11,"gy":6,"rot":0,"owner":null},{"id":"mk3","type":"casinotable","gx":5,"gy":9,"rot":0,"owner":null},{"id":"mk4","type":"casinotable","gx":11,"gy":9,"rot":0,"owner":null},{"id":"mk5","type":"rug","gx":5,"gy":6,"rot":0,"owner":null},{"id":"mk6","type":"rug","gx":11,"gy":6,"rot":0,"owner":null},{"id":"mk7","type":"rug","gx":5,"gy":9,"rot":0,"owner":null},{"id":"mk8","type":"rug","gx":11,"gy":9,"rot":0,"owner":null},{"id":"mk9","type":"rug","gx":8,"gy":12,"rot":0,"owner":null},{"id":"mk10","type":"rug","gx":8,"gy":11,"rot":0,"owner":null},{"id":"mk11","type":"rug","gx":8,"gy":10,"rot":0,"owner":null},{"id":"mk20","type":"tv","gx":14,"gy":1,"rot":0,"owner":null},{"id":"mk22","type":"sofa","gx":13,"gy":3,"rot":0,"owner":null},{"id":"mk23","type":"sofa","gx":15,"gy":3,"rot":1,"owner":null},{"id":"mk24","type":"table","gx":14,"gy":3,"rot":0,"owner":null},{"id":"mk25","type":"sofa","gx":13,"gy":12,"rot":0,"owner":null},{"id":"mk26","type":"sofa","gx":15,"gy":12,"rot":1,"owner":null},{"id":"mk27","type":"table","gx":14,"gy":12,"rot":0,"owner":null},{"id":"mk28","type":"plant","gx":1,"gy":1,"rot":0,"owner":null},{"id":"mk29","type":"plant","gx":16,"gy":1,"rot":0,"owner":null},{"id":"mk30","type":"plant","gx":1,"gy":12,"rot":0,"owner":null},{"id":"mk31","type":"plant","gx":16,"gy":12,"rot":0,"owner":null},{"id":"mk32","type":"plant","gx":4,"gy":12,"rot":0,"owner":null},{"id":"mk33","type":"plant","gx":12,"gy":12,"rot":0,"owner":null},{"id":"mk34","type":"lamp","gx":5,"gy":2,"rot":0,"owner":null},{"id":"mk35","type":"lamp","gx":12,"gy":2,"rot":0,"owner":null},{"id":"mk36","type":"lamp","gx":3,"gy":8,"rot":0,"owner":null},{"id":"mk37","type":"lamp","gx":13,"gy":8,"rot":0,"owner":null},{"id":"mon1","type":"casino_bar","gx":6,"gy":0,"rot":0,"owner":null},{"id":"mon2","type":"bookshelf","gx":3,"gy":0,"rot":0,"owner":null},{"id":"mon3","type":"bookshelf","gx":12,"gy":0,"rot":0,"owner":null},{"id":"mon4","type":"sofa","gx":1,"gy":4,"rot":0,"owner":null},{"id":"mon5","type":"sofa","gx":1,"gy":7,"rot":0,"owner":null},{"id":"mon6","type":"table","gx":2,"gy":6,"rot":0,"owner":null}]'::jsonb, 10),
  ('iskele', 'Sahil İskelesi', 'user', 15, 15, 5, 7, '[{"id":"is1","type":"palm","gx":1,"gy":2,"rot":0,"owner":null},{"id":"is2","type":"palm","gx":1,"gy":12,"rot":0,"owner":null},{"id":"is3","type":"lounger","gx":2,"gy":4,"rot":0,"owner":null},{"id":"is4","type":"lounger","gx":2,"gy":6,"rot":0,"owner":null},{"id":"is5","type":"bench","gx":4,"gy":11,"rot":0,"owner":null},{"id":"is6","type":"streetlight","gx":7,"gy":1,"rot":0,"owner":null},{"id":"is7","type":"streetlight","gx":7,"gy":6,"rot":0,"owner":null},{"id":"is8","type":"streetlight","gx":7,"gy":12,"rot":0,"owner":null},{"id":"is9","type":"kiosk","gx":3,"gy":1,"rot":0,"owner":null},{"id":"is10","type":"bin","gx":5,"gy":2,"rot":0,"owner":null},{"id":"isz1","type":"fish_hut","gx":3,"gy":12,"rot":0,"owner":null}]'::jsonb, 10),
  ('restoran', 'Sahil Restoranı', 'user', 16, 14, 7, 7, '[{"id":"rs7","type":"table","gx":9,"gy":4,"rot":0,"owner":null},{"id":"rs8","type":"chair","gx":8,"gy":4,"rot":0,"owner":null},{"id":"rs9","type":"chair","gx":10,"gy":4,"rot":1,"owner":null},{"id":"rs10","type":"table","gx":12,"gy":4,"rot":0,"owner":null},{"id":"rs11","type":"chair","gx":11,"gy":4,"rot":0,"owner":null},{"id":"rs12","type":"chair","gx":13,"gy":4,"rot":1,"owner":null},{"id":"rs13","type":"table","gx":9,"gy":7,"rot":0,"owner":null},{"id":"rs14","type":"chair","gx":8,"gy":7,"rot":0,"owner":null},{"id":"rs15","type":"chair","gx":10,"gy":7,"rot":1,"owner":null},{"id":"rs16","type":"table","gx":12,"gy":9,"rot":0,"owner":null},{"id":"rs17","type":"chair","gx":11,"gy":9,"rot":0,"owner":null},{"id":"rs18","type":"chair","gx":13,"gy":9,"rot":1,"owner":null},{"id":"rs19","type":"table","gx":9,"gy":10,"rot":0,"owner":null},{"id":"rs20","type":"chair","gx":8,"gy":10,"rot":0,"owner":null},{"id":"rs21","type":"chair","gx":10,"gy":10,"rot":1,"owner":null},{"id":"rs22","type":"table","gx":12,"gy":12,"rot":0,"owner":null},{"id":"rs23","type":"chair","gx":11,"gy":12,"rot":0,"owner":null},{"id":"rs24","type":"chair","gx":13,"gy":12,"rot":1,"owner":null},{"id":"rs25","type":"rug","gx":9,"gy":4,"rot":0,"owner":null},{"id":"rs26","type":"rug","gx":12,"gy":4,"rot":0,"owner":null},{"id":"rs27","type":"rug","gx":9,"gy":7,"rot":0,"owner":null},{"id":"rs28","type":"rug","gx":12,"gy":9,"rot":0,"owner":null},{"id":"rs29","type":"rug","gx":9,"gy":10,"rot":0,"owner":null},{"id":"rs30","type":"rug","gx":12,"gy":12,"rot":0,"owner":null},{"id":"rs31","type":"sofa","gx":2,"gy":9,"rot":0,"owner":null},{"id":"rs32","type":"sofa","gx":2,"gy":11,"rot":0,"owner":null},{"id":"rs33","type":"table","gx":3,"gy":10,"rot":0,"owner":null},{"id":"rs35","type":"plant","gx":14,"gy":1,"rot":0,"owner":null},{"id":"rs36","type":"plant","gx":1,"gy":12,"rot":0,"owner":null},{"id":"rs37","type":"plant","gx":14,"gy":12,"rot":0,"owner":null},{"id":"rs38","type":"plant","gx":1,"gy":5,"rot":0,"owner":null},{"id":"rs39","type":"plant","gx":6,"gy":12,"rot":0,"owner":null},{"id":"rs40","type":"lamp","gx":13,"gy":6,"rot":0,"owner":null},{"id":"rs41","type":"lamp","gx":6,"gy":6,"rot":0,"owner":null},{"id":"rs42","type":"lamp","gx":6,"gy":10,"rot":0,"owner":null},{"id":"rs43","type":"bookshelf","gx":1,"gy":6,"rot":0,"owner":null},{"id":"rs44","type":"bookshelf","gx":1,"gy":7,"rot":0,"owner":null},{"id":"rs45","type":"tv","gx":12,"gy":0,"rot":0,"owner":null},{"id":"rs46","type":"tv","gx":9,"gy":0,"rot":0,"owner":null},{"id":"ren1","type":"kitchen_block","gx":1,"gy":0,"rot":0,"owner":null}]'::jsonb, 10),
  ('ciftlik', 'Sevalika Çiftliği', 'user', 16, 14, 6, 6, '[{"id":"cf1","type":"tree","gx":2,"gy":2,"rot":0,"owner":null},{"id":"cf2","type":"tree","gx":13,"gy":12,"rot":0,"owner":null},{"id":"cf4","type":"tree","gx":14,"gy":9,"rot":0,"owner":null},{"id":"cf7","type":"bench","gx":5,"gy":2,"rot":0,"owner":null},{"id":"cf8","type":"bench","gx":7,"gy":11,"rot":1,"owner":null},{"id":"cf9","type":"kiosk","gx":6,"gy":1,"rot":0,"owner":null},{"id":"cf11","type":"streetlight","gx":11,"gy":9,"rot":0,"owner":null},{"id":"cf12","type":"streetlight","gx":4,"gy":3,"rot":0,"owner":null},{"id":"cf13","type":"streetlight","gx":11,"gy":3,"rot":0,"owner":null},{"id":"cf14","type":"plant","gx":8,"gy":1,"rot":0,"owner":null},{"id":"cf15","type":"plant","gx":11,"gy":1,"rot":0,"owner":null},{"id":"cf17","type":"plant","gx":12,"gy":8,"rot":0,"owner":null},{"id":"cf18","type":"plant","gx":9,"gy":12,"rot":0,"owner":null},{"id":"cf20","type":"campfire","gx":13,"gy":7,"rot":0,"owner":null},{"id":"cf21","type":"logseat","gx":12,"gy":7,"rot":0,"owner":null},{"id":"cf22","type":"logseat","gx":14,"gy":7,"rot":1,"owner":null},{"id":"cf23","type":"bin","gx":10,"gy":9,"rot":0,"owner":null},{"id":"cf24","type":"lamp","gx":3,"gy":5,"rot":0,"owner":null},{"id":"cin1","type":"barn","gx":1,"gy":8,"rot":0,"owner":null}]'::jsonb, 10),
  ('maden', 'Taş Ocağı Madeni', 'user', 15, 14, 6, 2, '[{"id":"md1","type":"streetlight","gx":2,"gy":2,"rot":0,"owner":null},{"id":"md2","type":"streetlight","gx":13,"gy":4,"rot":0,"owner":null},{"id":"md3","type":"streetlight","gx":2,"gy":10,"rot":0,"owner":null},{"id":"md4","type":"streetlight","gx":11,"gy":10,"rot":0,"owner":null},{"id":"md5","type":"bench","gx":9,"gy":5,"rot":0,"owner":null},{"id":"md6","type":"bin","gx":8,"gy":2,"rot":0,"owner":null},{"id":"md7","type":"campfire","gx":6,"gy":11,"rot":0,"owner":null},{"id":"md8","type":"logseat","gx":5,"gy":11,"rot":0,"owner":null},{"id":"md9","type":"logseat","gx":7,"gy":11,"rot":1,"owner":null},{"id":"maz1","type":"mine_entrance","gx":9,"gy":0,"rot":0,"owner":null},{"id":"maz2","type":"ore_cart","gx":7,"gy":10,"rot":0,"owner":null}]'::jsonb, 10),
('avm', '🛍️ Sevalika AVM', 'user', 28, 20, 13, 17, '[{"id":"av_s0","type":"store_fashion","gx":1,"gy":0,"rot":0,"owner":null},{"id":"av_s1","type":"store_tech","gx":6,"gy":0,"rot":0,"owner":null},{"id":"av_s2","type":"store_food","gx":11,"gy":0,"rot":0,"owner":null},{"id":"av_s3","type":"store_fashion","gx":16,"gy":0,"rot":0,"owner":null},{"id":"av_s4","type":"store_tech","gx":21,"gy":0,"rot":0,"owner":null},{"id":"av_p0","type":"plant","gx":0,"gy":2,"rot":0,"owner":null},{"id":"av_p1","type":"plant","gx":5,"gy":2,"rot":0,"owner":null},{"id":"av_p2","type":"plant","gx":10,"gy":2,"rot":0,"owner":null},{"id":"av_p3","type":"plant","gx":15,"gy":2,"rot":0,"owner":null},{"id":"av_p4","type":"plant","gx":20,"gy":2,"rot":0,"owner":null},{"id":"av_p5","type":"plant","gx":25,"gy":2,"rot":0,"owner":null},{"id":"av_p6","type":"plant","gx":27,"gy":2,"rot":0,"owner":null},{"id":"av_m1","type":"mannequin","gx":0,"gy":3,"rot":0,"owner":null},{"id":"av_m2","type":"mannequin","gx":5,"gy":3,"rot":0,"owner":null},{"id":"av_m3","type":"mannequin","gx":16,"gy":3,"rot":0,"owner":null},{"id":"av_m4","type":"mannequin","gx":21,"gy":3,"rot":0,"owner":null},{"id":"av_f1","type":"fountain","gx":13,"gy":9,"rot":0,"owner":null},{"id":"av_b0","type":"bench","gx":11,"gy":8,"rot":1,"owner":null},{"id":"av_b1","type":"bench","gx":15,"gy":8,"rot":1,"owner":null},{"id":"av_b2","type":"bench","gx":11,"gy":11,"rot":1,"owner":null},{"id":"av_b3","type":"bench","gx":15,"gy":11,"rot":1,"owner":null},{"id":"av_b4","type":"bench","gx":8,"gy":5,"rot":1,"owner":null},{"id":"av_b5","type":"bench","gx":19,"gy":5,"rot":1,"owner":null},{"id":"av_b6","type":"bench","gx":8,"gy":14,"rot":1,"owner":null},{"id":"av_b7","type":"bench","gx":19,"gy":14,"rot":1,"owner":null},{"id":"av_pl0","type":"plant","gx":7,"gy":9,"rot":0,"owner":null},{"id":"av_pl1","type":"plant","gx":20,"gy":9,"rot":0,"owner":null},{"id":"av_pl2","type":"plant","gx":9,"gy":16,"rot":0,"owner":null},{"id":"av_pl3","type":"plant","gx":18,"gy":16,"rot":0,"owner":null},{"id":"av_pl4","type":"plant","gx":7,"gy":17,"rot":0,"owner":null},{"id":"av_pl5","type":"plant","gx":20,"gy":17,"rot":0,"owner":null},{"id":"av_l0","type":"lamp","gx":6,"gy":3,"rot":0,"owner":null},{"id":"av_l1","type":"lamp","gx":22,"gy":3,"rot":0,"owner":null},{"id":"av_l2","type":"lamp","gx":10,"gy":6,"rot":0,"owner":null},{"id":"av_l3","type":"lamp","gx":17,"gy":6,"rot":0,"owner":null},{"id":"av_l4","type":"lamp","gx":3,"gy":9,"rot":0,"owner":null},{"id":"av_l5","type":"lamp","gx":24,"gy":9,"rot":0,"owner":null},{"id":"av_l6","type":"lamp","gx":3,"gy":15,"rot":0,"owner":null},{"id":"av_l7","type":"lamp","gx":24,"gy":15,"rot":0,"owner":null},{"id":"av_l8","type":"lamp","gx":12,"gy":13,"rot":0,"owner":null},{"id":"av_l9","type":"lamp","gx":14,"gy":13,"rot":0,"owner":null},{"id":"av_t1","type":"table","gx":24,"gy":6,"rot":0,"owner":null},{"id":"av_c1","type":"chair","gx":23,"gy":6,"rot":0,"owner":null},{"id":"av_c2","type":"chair","gx":25,"gy":6,"rot":0,"owner":null},{"id":"av_t2","type":"table","gx":3,"gy":6,"rot":0,"owner":null},{"id":"av_c3","type":"chair","gx":2,"gy":6,"rot":0,"owner":null},{"id":"av_c4","type":"chair","gx":4,"gy":6,"rot":0,"owner":null}]'::jsonb, 10)
on conflict (slug) do update set
  name = excluded.name, min_role = excluded.min_role,
  furni = case when public.rooms.cols is distinct from excluded.cols or public.rooms.rows is distinct from excluded.rows
                 or public.rooms.layout_v < excluded.layout_v
                 or jsonb_array_length(coalesce(public.rooms.furni, '[]'::jsonb)) = 0
               then excluded.furni else public.rooms.furni end,
  cols = excluded.cols, rows = excluded.rows, spawn_x = excluded.spawn_x, spawn_y = excluded.spawn_y,
  updated_at = case when public.rooms.cols is distinct from excluded.cols or public.rooms.layout_v < excluded.layout_v
                      or jsonb_array_length(coalesce(public.rooms.furni, '[]'::jsonb)) = 0
                    then now() else public.rooms.updated_at end,
  layout_v = excluded.layout_v;

create or replace function public._room_spawn(p_room text) returns int[]
language sql stable set search_path = '' as $$
  select case when spawn_x is null then null else array[spawn_x, spawn_y] end from public.rooms where slug = p_room $$;

create or replace function public.report_pos(p_room text, p_gx int, p_gy int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; sp int[]; dt numeric; d numeric; ok boolean := true; c int; r int;
begin
  me := public._me();
  select cols, rows into c, r from public.rooms where slug = p_room;
  if c is null then raise exception 'Oda bulunamadı.'; end if;
  if p_gx is null or p_gy is null or p_gx not between 0 and c - 1 or p_gy not between 0 and r - 1 then
    raise exception 'Geçersiz konum.';
  end if;
  if me.pos_room is distinct from p_room or me.pos_at is null then
    sp := public._room_spawn(p_room);
    -- sabit odalarda giriş noktasından başlamak zorunda (ışınlanma yok); kişisel odalarda serbest
    if sp is not null and greatest(abs(p_gx - sp[1]), abs(p_gy - sp[2])) > 2 then
      ok := false; p_gx := sp[1]; p_gy := sp[2];
    end if;
  else
    dt := least(30, greatest(0.2, extract(epoch from (now() - me.pos_at))));
    d := sqrt(((p_gx - me.pos_x)^2 + (p_gy - me.pos_y)^2)::numeric);
    if d > 2.5 + dt * 7 then ok := false; p_gx := me.pos_x; p_gy := me.pos_y; end if;
  end if;
  update public.profiles set pos_room = p_room, pos_x = p_gx, pos_y = p_gy, pos_at = now(), current_room = left(p_room, 60)
   where id = me.id;
  return jsonb_build_object('ok', ok, 'gx', p_gx, 'gy', p_gy);
end $$;

create or replace function public._in_room(me public.profiles, p_room text) returns void
language plpgsql stable set search_path = '' as $$
declare r public.profiles;
begin
  select * into r from public.profiles where id = me.id;
  if r.pos_room is distinct from p_room or r.pos_at is null or r.pos_at < now() - interval '40 seconds' then
    raise exception 'Bunun için doğru odada olmalısın.';
  end if;
end $$;

-- p_tiles: [[gx,gy],...] — herhangi birine p_dist kare içinde olmalı
create or replace function public._require_near(me public.profiles, p_room text, p_tiles int[][], p_dist numeric) returns void
language plpgsql stable set search_path = '' as $$
declare r public.profiles; i int; hit boolean := false;
begin
  select * into r from public.profiles where id = me.id;
  if r.pos_room is distinct from p_room or r.pos_at is null or r.pos_at < now() - interval '40 seconds' then
    raise exception 'Bunun için doğru odada olmalısın.';
  end if;
  for i in 1..array_length(p_tiles, 1) loop
    if sqrt(((r.pos_x - p_tiles[i][1])^2 + (r.pos_y - p_tiles[i][2])^2)::numeric) <= p_dist then hit := true; end if;
  end loop;
  if not hit then raise exception 'Buraya yeterince yakın değilsin.'; end if;
end $$;

-- ----- Ürün fiyatları -----
create or replace function public.goods_price(p_item text) returns int
language sql immutable set search_path = '' as $$
  select case p_item
    when 'ore_coal' then 8 when 'ore_iron' then 25 when 'ore_gold' then 70 when 'ore_gem' then 200
    when 'crop_wheat' then 30 when 'crop_tomato' then 70 when 'crop_pumpkin' then 180
    when 'dish_balik_ekmek' then 90 when 'dish_levrek_izgara' then 220 when 'dish_kabak_corbasi' then 520
    else null end $$;

-- ----- Balık tutma / satma: artık konum kontrolü var -----
create or replace function public.catch_fish(p_room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; roll int; item text; new_inv text[]; r public.profiles;
begin
  me := public._me();
  if p_room is distinct from 'iskele' then raise exception 'Burada balık tutamazsın; iskeleye git.'; end if;
  perform public._in_room(me, 'iskele');
  select * into r from public.profiles where id = me.id;
  if r.pos_x < 6 then raise exception 'Denize daha yakın dur (iskelenin sağ tarafı).'; end if;
  if me.tool is distinct from 'fishing_rod' or not ('fishing_rod' = any(me.inventory)) then
    raise exception 'Önce oltanı kuşan.';
  end if;
  if me.last_fish is not null and me.last_fish > now() - interval '2500 milliseconds' then
    raise exception 'Olta henüz hazır değil.';
  end if;
  if coalesce(array_length(me.inventory, 1), 0) >= 60 then raise exception 'Çantan dolu; balıkları sat.'; end if;
  roll := floor(random() * 100)::int;
  item := case when roll < 15 then 'fish_boot' when roll < 45 then 'fish_hamsi' when roll < 70 then 'fish_cipura'
               when roll < 88 then 'fish_levrek' when roll < 96 then 'fish_shark' else 'fish_treasure' end;
  update public.profiles set inventory = inventory || item, last_fish = now()
   where id = me.id returning inventory into new_inv;
  update public.profiles set fish_caught = fish_caught + 1 where id = me.id;
  perform public._close_tournaments();
  perform public._tournament_add(me.id, me.username, public.fish_price(item));
  perform public._progress(me.id, 'fish_5', 1);
  perform public._add_xp(me.id, case item when 'fish_boot' then 2 when 'fish_hamsi' then 5 when 'fish_cipura' then 8
                                          when 'fish_levrek' then 12 when 'fish_shark' then 30 else 60 end);
  perform public._ach(me.id, 'first_fish');
  if item = 'fish_shark' then perform public._ach(me.id, 'shark'); end if;
  if item = 'fish_treasure' then perform public._ach(me.id, 'treasure'); end if;
  if me.fish_caught + 1 >= 50 then perform public._ach(me.id, 'fish_50'); end if;
  return jsonb_build_object('item', item, 'value', public.fish_price(item), 'inventory', to_jsonb(new_inv));
end $$;

create or replace function public.sell_fish(p_item text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; it text; kept text[] := '{}'; sold int := 0; earned int := 0; removed boolean := false; new_coins int;
begin
  me := public._me();
  perform public._in_room(me, 'restoran');
  foreach it in array me.inventory loop
    if public.fish_price(it) is not null and (p_item is null or (it = p_item and not removed)) then
      earned := earned + public.fish_price(it);
      sold := sold + 1;
      if p_item is not null then removed := true; end if;
    else
      kept := kept || it;
    end if;
  end loop;
  if sold = 0 then raise exception 'Satacak balığın yok.'; end if;
  update public.profiles set inventory = kept, coins = coins + earned where id = me.id returning coins into new_coins;
  perform public._progress(me.id, 'sell_1', 1);
  perform public._add_xp(me.id, greatest(1, earned / 10));
  return jsonb_build_object('earned', earned, 'sold', sold, 'coins', new_coins, 'inventory', to_jsonb(kept));
end $$;

-- ----- Maden -----
create or replace function public.buy_pickaxe() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; new_inv text[]; new_coins int;
begin
  me := public._me();
  perform public._in_room(me, 'maden');
  if 'pickaxe' = any(me.inventory) then raise exception 'Zaten kazman var.'; end if;
  if me.role <> 'admin' and me.coins < 300 then raise exception 'Yetersiz bakiye (300 Sanil).'; end if;
  update public.profiles set coins = case when role = 'admin' then coins else coins - 300 end,
         inventory = array_append(inventory, 'pickaxe'::text)
   where id = me.id returning coins, inventory into new_coins, new_inv;
  return jsonb_build_object('coins', new_coins, 'inventory', to_jsonb(new_inv));
end $$;

create or replace function public.mine_ore() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; roll int; item text; new_inv text[];
begin
  me := public._me();
  perform public._require_near(me, 'maden', array[[3,3],[3,8],[8,3],[8,8],[5,5]], 2.2);
  if not ('pickaxe' = any(me.inventory)) then raise exception 'Önce kazma almalısın.'; end if;
  if me.last_work is not null and me.last_work > now() - interval '2500 milliseconds' then
    raise exception 'Kazma henüz hazır değil.';
  end if;
  if coalesce(array_length(me.inventory, 1), 0) >= 60 then raise exception 'Çantan dolu; cevherleri sat.'; end if;
  roll := floor(random() * 100)::int;
  item := case when roll < 45 then 'ore_coal' when roll < 75 then 'ore_iron' when roll < 93 then 'ore_gold' else 'ore_gem' end;
  update public.profiles set inventory = inventory || item, last_work = now() where id = me.id returning inventory into new_inv;
  perform public._add_xp(me.id, case item when 'ore_coal' then 3 when 'ore_iron' then 6 when 'ore_gold' then 14 else 40 end);
  if item = 'ore_gem' then perform public._ach(me.id, 'gem'); end if;
  return jsonb_build_object('item', item, 'value', public.goods_price(item), 'inventory', to_jsonb(new_inv));
end $$;

-- p_prefix: 'ore_' (maden), 'crop_' (çiftlik), 'dish_' (restoran); p_item boşsa hepsi
create or replace function public.sell_goods(p_prefix text, p_item text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; it text; kept text[] := '{}'; sold int := 0; earned int := 0; removed boolean := false; new_coins int;
begin
  me := public._me();
  if p_prefix not in ('ore_','crop_','dish_') then raise exception 'Geçersiz ürün türü.'; end if;
  perform public._in_room(me, case p_prefix when 'ore_' then 'maden' when 'crop_' then 'ciftlik' else 'restoran' end);
  foreach it in array me.inventory loop
    if left(it, length(p_prefix)) = p_prefix and public.goods_price(it) is not null
       and (p_item is null or (it = p_item and not removed)) then
      earned := earned + public.goods_price(it);
      sold := sold + 1;
      if p_item is not null then removed := true; end if;
    else
      kept := kept || it;
    end if;
  end loop;
  if sold = 0 then raise exception 'Satacak ürünün yok.'; end if;
  update public.profiles set inventory = kept, coins = least(coins::bigint + earned, 2000000000)::int where id = me.id returning coins into new_coins;
  perform public._progress(me.id, 'sell_1', 1);
  perform public._add_xp(me.id, greatest(1, earned / 10));
  return jsonb_build_object('earned', earned, 'sold', sold, 'coins', new_coins, 'inventory', to_jsonb(kept));
end $$;

-- ----- Çiftlik -----
create table if not exists public.farm_plots (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  slot       int  not null check (slot between 0 and 5),
  crop       text not null check (crop in ('crop_wheat','crop_tomato','crop_pumpkin')),
  planted_at timestamptz not null default now(),
  primary key (user_id, slot)
);
alter table public.farm_plots enable row level security;
revoke all on public.farm_plots from anon, authenticated;

create or replace function public._crop_seconds(p_crop text) returns int
language sql immutable set search_path = '' as $$
  select case p_crop when 'crop_wheat' then 120 when 'crop_tomato' then 300 when 'crop_pumpkin' then 600 end $$;
create or replace function public._crop_seed(p_crop text) returns int
language sql immutable set search_path = '' as $$
  select case p_crop when 'crop_wheat' then 10 when 'crop_tomato' then 25 when 'crop_pumpkin' then 60 end $$;

create or replace function public.farm_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'slot', s.slot, 'crop', f.crop,
        'seconds_left', case when f.crop is null then null
          else greatest(0, ceil(public._crop_seconds(f.crop) - extract(epoch from (now() - f.planted_at))))::int end
      ) order by s.slot)
    from generate_series(0, 5) as s(slot)
    left join public.farm_plots f on f.user_id = me.id and f.slot = s.slot
  ), '[]'::jsonb);
end $$;

create or replace function public.farm_plant(p_slot int, p_crop text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; cost int; new_coins int;
begin
  me := public._me();
  perform public._in_room(me, 'ciftlik');
  cost := public._crop_seed(p_crop);
  if cost is null then raise exception 'Geçersiz tohum.'; end if;
  if p_slot is null or p_slot not between 0 and 5 then raise exception 'Geçersiz tarla.'; end if;
  if exists (select 1 from public.farm_plots where user_id = me.id and slot = p_slot) then raise exception 'Bu tarla dolu.'; end if;
  if me.role <> 'admin' and me.coins < cost then raise exception 'Yetersiz bakiye (% Sanil).', cost; end if;
  update public.profiles set coins = case when role = 'admin' then coins else coins - cost end where id = me.id returning coins into new_coins;
  insert into public.farm_plots (user_id, slot, crop) values (me.id, p_slot, p_crop);
  return jsonb_build_object('coins', new_coins);
end $$;

create or replace function public.farm_harvest(p_slot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; f public.farm_plots; new_inv text[];
begin
  me := public._me();
  perform public._in_room(me, 'ciftlik');
  select * into f from public.farm_plots where user_id = me.id and slot = p_slot;
  if not found then raise exception 'Bu tarlada ekin yok.'; end if;
  if extract(epoch from (now() - f.planted_at)) < public._crop_seconds(f.crop) then raise exception 'Ekin henüz olgunlaşmadı.'; end if;
  if coalesce(array_length(me.inventory, 1), 0) >= 60 then raise exception 'Çantan dolu.'; end if;
  delete from public.farm_plots where user_id = me.id and slot = p_slot;
  update public.profiles set inventory = inventory || f.crop where id = me.id returning inventory into new_inv;
  perform public._add_xp(me.id, case f.crop when 'crop_wheat' then 8 when 'crop_tomato' then 20 else 50 end);
  perform public._ach(me.id, 'harvest');
  return jsonb_build_object('item', f.crop, 'inventory', to_jsonb(new_inv));
end $$;

-- ----- Aşçılık -----
create or replace function public.cook(p_dish text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; need text[]; it text; inv text[]; new_inv text[];
begin
  me := public._me();
  perform public._in_room(me, 'restoran');
  need := case p_dish
    when 'dish_balik_ekmek' then array['fish_hamsi','fish_hamsi','crop_wheat']
    when 'dish_levrek_izgara' then array['fish_levrek','crop_tomato']
    when 'dish_kabak_corbasi' then array['crop_pumpkin','crop_pumpkin']
    else null end;
  if need is null then raise exception 'Geçersiz tarif.'; end if;
  inv := me.inventory;
  foreach it in array need loop
    if not (it = any(inv)) then raise exception 'Malzeme eksik.'; end if;
    inv := public._inv_remove(inv, it);
  end loop;
  new_inv := inv || p_dish;
  update public.profiles set inventory = new_inv where id = me.id;
  perform public._add_xp(me.id, 25);
  perform public._ach(me.id, 'cook');
  return jsonb_build_object('item', p_dish, 'inventory', to_jsonb(new_inv));
end $$;

-- ----- Lonca -----
create table if not exists public.guilds (
  id         bigserial primary key,
  name       text not null check (char_length(name) between 3 and 16),
  tag        text not null check (tag ~ '^[A-Z0-9]{2,4}$'),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  bank       int  not null default 0 check (bank >= 0),
  created_at timestamptz not null default now()
);
create unique index if not exists guilds_name_uq on public.guilds (lower(name));
create unique index if not exists guilds_tag_uq on public.guilds (tag);
create table if not exists public.guild_members (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  guild_id  bigint not null references public.guilds(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index if not exists guild_members_guild_idx on public.guild_members (guild_id);
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
revoke all on public.guilds, public.guild_members from anon, authenticated;

create or replace function public._guild_level(p_bank int) returns int
language sql immutable set search_path = '' as $$ select floor(sqrt(p_bank / 500.0))::int + 1 $$;

-- Lonca seviyesi üyelere XP bonusu verir (seviye başına %5, en fazla %25)
create or replace function public._add_xp(p_uid uuid, p_xp int) returns void
language plpgsql security definer set search_path = '' as $$
declare old_xp int; new_xp int; lo int; ln int; gb int; bonus int := 0;
begin
  if p_xp is null or p_xp <= 0 then return; end if;
  select xp into old_xp from public.profiles where id = p_uid;
  if old_xp is null then return; end if;
  select g.bank into gb from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = p_uid;
  if gb is not null then bonus := least(25, 5 * (public._guild_level(gb) - 1)); end if;
  p_xp := p_xp + (p_xp * bonus) / 100;
  new_xp := least(old_xp::bigint + p_xp, 100000000)::int;
  update public.profiles set xp = new_xp where id = p_uid;
  lo := public._level(old_xp); ln := public._level(new_xp);
  if ln > lo then
    perform public._emit_user_event(p_uid, 'level_up', jsonb_build_object('level', ln));
    if ln >= 5 then perform public._ach(p_uid, 'lvl_5'); end if;
    if ln >= 10 then perform public._ach(p_uid, 'lvl_10'); end if;
  end if;
end $$;

create or replace function public.guild_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.guilds;
begin
  me := public._me();
  select gg.* into g from public.guild_members m join public.guilds gg on gg.id = m.guild_id where m.user_id = me.id;
  if not found then return null; end if;
  return jsonb_build_object(
    'name', g.name, 'tag', g.tag, 'bank', g.bank, 'level', public._guild_level(g.bank),
    'cap', 10 + 5 * (public._guild_level(g.bank) - 1), 'owner', g.owner_id = me.id,
    'members', (select jsonb_agg(jsonb_build_object('username', p.username, 'level', public._level(p.xp), 'owner', p.id = g.owner_id)
                                order by (p.id = g.owner_id) desc, p.xp desc)
                  from public.guild_members m2 join public.profiles p on p.id = m2.user_id where m2.guild_id = g.id));
end $$;

create or replace function public.guild_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('name', g.name, 'tag', g.tag, 'bank', g.bank, 'level', public._guild_level(g.bank),
                              'members', (select count(*) from public.guild_members m where m.guild_id = g.id),
                              'cap', 10 + 5 * (public._guild_level(g.bank) - 1)) as x
      from public.guilds g order by g.bank desc, g.id limit 10) t), '[]'::jsonb);
end $$;

create or replace function public.guild_create(p_name text, p_tag text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; n text := btrim(coalesce(p_name, '')); t text := upper(btrim(coalesce(p_tag, ''))); gid bigint;
begin
  me := public._me();
  if exists (select 1 from public.guild_members where user_id = me.id) then raise exception 'Zaten bir loncadasın.'; end if;
  if n !~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü ]{3,16}$' then raise exception 'Lonca adı 3-16 harf/rakam olmalı.'; end if;
  if t !~ '^[A-Z0-9]{2,4}$' then raise exception 'Etiket 2-4 harf/rakam olmalı.'; end if;
  if me.role <> 'admin' and me.coins < 1000 then raise exception 'Lonca kurmak 1000 Sanil.'; end if;
  if exists (select 1 from public.guilds where lower(name) = lower(n)) then raise exception 'Bu lonca adı alınmış.'; end if;
  if exists (select 1 from public.guilds where tag = t) then raise exception 'Bu etiket alınmış.'; end if;
  if me.role <> 'admin' then update public.profiles set coins = coins - 1000 where id = me.id; end if;
  insert into public.guilds (name, tag, owner_id) values (n, t, me.id) returning id into gid;
  insert into public.guild_members (user_id, guild_id) values (me.id, gid);
  perform public._ach(me.id, 'guild');
  return public.guild_get();
end $$;

create or replace function public.guild_join(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.guilds; cnt int;
begin
  me := public._me();
  if exists (select 1 from public.guild_members where user_id = me.id) then raise exception 'Zaten bir loncadasın.'; end if;
  select * into g from public.guilds where lower(name) = lower(btrim(coalesce(p_name, '')));
  if not found then raise exception 'Lonca bulunamadı.'; end if;
  select count(*) into cnt from public.guild_members where guild_id = g.id;
  if cnt >= 10 + 5 * (public._guild_level(g.bank) - 1) then raise exception 'Lonca dolu.'; end if;
  insert into public.guild_members (user_id, guild_id) values (me.id, g.id);
  perform public._ach(me.id, 'guild');
  return public.guild_get();
end $$;

create or replace function public.guild_leave() returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.guilds; heir uuid;
begin
  me := public._me();
  select gg.* into g from public.guild_members m join public.guilds gg on gg.id = m.guild_id where m.user_id = me.id;
  if not found then raise exception 'Bir loncada değilsin.'; end if;
  delete from public.guild_members where user_id = me.id;
  if g.owner_id = me.id then
    select user_id into heir from public.guild_members where guild_id = g.id order by joined_at limit 1;
    if heir is null then delete from public.guilds where id = g.id;
    else update public.guilds set owner_id = heir where id = g.id; end if;
  end if;
end $$;

create or replace function public.guild_kick(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.guilds; t public.profiles;
begin
  me := public._me();
  select * into g from public.guilds where owner_id = me.id;
  if not found then raise exception 'Sadece lonca lideri çıkarabilir.'; end if;
  t := public._find_user(p_username);
  if t.id = me.id then raise exception 'Kendini çıkaramazsın; loncadan ayrıl.'; end if;
  delete from public.guild_members where user_id = t.id and guild_id = g.id;
  if not found then raise exception 'Bu kişi loncanda değil.'; end if;
end $$;

create or replace function public.guild_donate(p_amount int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; gid bigint; new_coins int;
begin
  me := public._me();
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'Geçersiz miktar.'; end if;
  select guild_id into gid from public.guild_members where user_id = me.id;
  if gid is null then raise exception 'Bir loncada değilsin.'; end if;
  if me.role <> 'admin' and me.coins < p_amount then raise exception 'Yetersiz bakiye.'; end if;
  update public.profiles set coins = case when role = 'admin' then coins else coins - p_amount end where id = me.id returning coins into new_coins;
  update public.guilds set bank = least(bank::bigint + p_amount, 2000000000)::int where id = gid;
  perform public._add_xp(me.id, greatest(1, p_amount / 20));
  return jsonb_build_object('coins', new_coins, 'guild', public.guild_get());
end $$;

-- ----- Masalar: zar düellosu & blackjack (monako-kulup) -----
create or replace function public.dice_play(p_bet int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; a int; b int; c int; d int; res text; delta int; new_coins int;
begin
  me := public._me();
  perform public._in_room(me, 'monako-kulup');
  if p_bet is null or p_bet < 10 or p_bet > 500 then raise exception 'Bahis 10-500 Sanil olmalı.'; end if;
  if me.role <> 'admin' and me.coins < p_bet then raise exception 'Yetersiz bakiye.'; end if;
  a := 1 + floor(random() * 6)::int; b := 1 + floor(random() * 6)::int;
  c := 1 + floor(random() * 6)::int; d := 1 + floor(random() * 6)::int;
  if a + b > c + d then res := 'win'; delta := (p_bet * 95) / 100;
  elsif a + b < c + d then res := 'lose'; delta := -p_bet;
  else res := 'push'; delta := 0; end if;
  if me.role = 'admin' and delta < 0 then delta := 0; end if;
  update public.profiles set coins = least(coins::bigint + delta, 2000000000)::int where id = me.id returning coins into new_coins;
  if res = 'win' then perform public._add_xp(me.id, 5); end if;
  return jsonb_build_object('you', jsonb_build_array(a, b), 'house', jsonb_build_array(c, d), 'result', res, 'delta', delta, 'coins', new_coins);
end $$;

create table if not exists public.bj_games (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  bet        int not null,
  player     int[] not null,
  dealer     int[] not null,
  created_at timestamptz not null default now()
);
alter table public.bj_games enable row level security;
revoke all on public.bj_games from anon, authenticated;

create or replace function public._bj_total(a int[]) returns int
language plpgsql immutable set search_path = '' as $$
declare t int := 0; aces int := 0; c int;
begin
  foreach c in array a loop
    if c = 1 then aces := aces + 1; t := t + 11; else t := t + least(c, 10); end if;
  end loop;
  while t > 21 and aces > 0 loop t := t - 10; aces := aces - 1; end loop;
  return t;
end $$;

create or replace function public._bj_card() returns int
language sql volatile set search_path = '' as $$ select 1 + floor(random() * 13)::int $$;

create or replace function public._bj_view(g public.bj_games, p_done boolean, p_result text, p_coins int, p_delta int) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('bet', g.bet, 'player', to_jsonb(g.player),
    'dealer', case when p_done then to_jsonb(g.dealer) else jsonb_build_array(g.dealer[1], 0) end,
    'player_total', public._bj_total(g.player),
    'dealer_total', case when p_done then public._bj_total(g.dealer) else null end,
    'done', p_done, 'result', p_result, 'coins', p_coins, 'delta', p_delta) $$;

-- Bitiş: bahis baştan düşülmüştü; payout = geri ödenen toplam
create or replace function public._bj_finish(me public.profiles, g public.bj_games, p_result text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare payout int; new_coins int;
begin
  payout := case p_result when 'blackjack' then (g.bet * 5) / 2 when 'win' then g.bet * 2 when 'push' then g.bet else 0 end;
  update public.profiles set coins = least(coins::bigint + payout, 2000000000)::int where id = me.id returning coins into new_coins;
  delete from public.bj_games where user_id = me.id;
  if p_result in ('win','blackjack') then perform public._add_xp(me.id, 8); end if;
  return public._bj_view(g, true, p_result, new_coins, payout - g.bet);
end $$;

create or replace function public.bj_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.bj_games;
begin
  me := public._me();
  select * into g from public.bj_games where user_id = me.id;
  if not found then return null; end if;
  return public._bj_view(g, false, null, me.coins, 0);
end $$;

create or replace function public.bj_start(p_bet int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.bj_games; new_coins int;
begin
  me := public._me();
  perform public._in_room(me, 'monako-kulup');
  if exists (select 1 from public.bj_games where user_id = me.id) then raise exception 'Devam eden bir elin var.'; end if;
  if p_bet is null or p_bet < 10 or p_bet > 500 then raise exception 'Bahis 10-500 Sanil olmalı.'; end if;
  if me.role <> 'admin' and me.coins < p_bet then raise exception 'Yetersiz bakiye.'; end if;
  update public.profiles set coins = case when role = 'admin' then coins else coins - p_bet end where id = me.id returning coins into new_coins;
  insert into public.bj_games (user_id, bet, player, dealer)
  values (me.id, p_bet, array[public._bj_card(), public._bj_card()], array[public._bj_card(), public._bj_card()])
  returning * into g;
  if public._bj_total(g.player) = 21 then
    return public._bj_finish(me, g, case when public._bj_total(g.dealer) = 21 then 'push' else 'blackjack' end);
  end if;
  return public._bj_view(g, false, null, new_coins, 0);
end $$;

create or replace function public.bj_hit() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.bj_games;
begin
  me := public._me();
  perform public._in_room(me, 'monako-kulup');
  select * into g from public.bj_games where user_id = me.id for update;
  if not found then raise exception 'Aktif el yok.'; end if;
  g.player := g.player || public._bj_card();
  update public.bj_games set player = g.player where user_id = me.id;
  if public._bj_total(g.player) > 21 then return public._bj_finish(me, g, 'lose'); end if;
  if public._bj_total(g.player) = 21 then return public.bj_stand(); end if;
  return public._bj_view(g, false, null, me.coins, 0);
end $$;

create or replace function public.bj_stand() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.bj_games; pt int; dt int;
begin
  me := public._me();
  perform public._in_room(me, 'monako-kulup');
  select * into g from public.bj_games where user_id = me.id for update;
  if not found then raise exception 'Aktif el yok.'; end if;
  while public._bj_total(g.dealer) < 17 loop g.dealer := g.dealer || public._bj_card(); end loop;
  pt := public._bj_total(g.player); dt := public._bj_total(g.dealer);
  return public._bj_finish(me, g, case when dt > 21 or pt > dt then 'win' when pt = dt then 'push' else 'lose' end);
end $$;

-- ----- Mini oyunlar: bayrak kapma & ebelemece -----
create table if not exists public.flag_games (
  id      bigserial primary key,
  room    text not null,
  gx      int not null,
  gy      int not null,
  prize   int not null,
  ends_at timestamptz not null,
  active  boolean not null default true
);
create table if not exists public.hide_games (
  id          bigserial primary key,
  room        text not null,
  seeker_id   uuid not null references public.profiles(id) on delete cascade,
  seeker_name text not null,
  ends_at     timestamptz not null,
  active      boolean not null default true
);
create table if not exists public.hide_tags (
  game_id bigint not null references public.hide_games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (game_id, user_id)
);
alter table public.flag_games enable row level security;
alter table public.hide_games enable row level security;
alter table public.hide_tags  enable row level security;
revoke all on public.flag_games, public.hide_games, public.hide_tags from anon, authenticated;

create or replace function public._close_flags() returns void
language plpgsql security definer set search_path = '' as $$
declare g public.flag_games;
begin
  for g in update public.flag_games set active = false where active and ends_at <= now() returning * loop
    perform public._emit_event('flag_end', g.room, null, jsonb_build_object('winner', null), 'Sistem');
  end loop;
end $$;

create or replace function public.admin_start_flag(p_room text, p_prize int, p_seconds int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; x int; y int; ends timestamptz; c int; r int; i int;
begin
  me := public._require_admin();
  perform public._close_flags();
  if not exists (select 1 from public.rooms where slug = p_room) then raise exception 'Oda bulunamadı.'; end if;
  if exists (select 1 from public.flag_games where active) then raise exception 'Zaten aktif bir bayrak oyunu var.'; end if;
  if p_prize is null or p_prize < 1 or p_prize > 100000 then raise exception 'Geçersiz ödül.'; end if;
  p_seconds := least(greatest(coalesce(p_seconds, 60), 10), 600);
  select cols, rows into c, r from public.rooms where slug = p_room;
  for i in 1..30 loop
    x := 1 + floor(random() * greatest(c - 2, 1))::int;
    y := 1 + floor(random() * greatest(r - 2, 1))::int;
    exit when not public._is_water(p_room, x, y);
    x := 2; y := 2;
  end loop;
  ends := now() + make_interval(secs => p_seconds);
  insert into public.flag_games (room, gx, gy, prize, ends_at) values (p_room, x, y, p_prize, ends);
  perform public._emit_event('flag', p_room, null, jsonb_build_object('gx', x, 'gy', y, 'prize', p_prize, 'ends_at', ends), me.username);
  perform public._log(me.username, 'start_flag', null, p_room);
end $$;

create or replace function public.flag_grab(p_room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.flag_games; new_coins int;
begin
  me := public._me();
  perform public._close_flags();
  select * into g from public.flag_games where active and room = p_room for update;
  if not found then raise exception 'Bu odada aktif bayrak yok.'; end if;
  perform public._require_near(me, p_room, array[[g.gx, g.gy]], 1.6);
  update public.flag_games set active = false where id = g.id;
  update public.profiles set coins = least(coins::bigint + g.prize, 2000000000)::int where id = me.id returning coins into new_coins;
  perform public._add_xp(me.id, 30);
  perform public._ach(me.id, 'flag_win');
  perform public._emit_event('flag_end', p_room, null, jsonb_build_object('winner', me.username, 'prize', g.prize), me.username);
  return jsonb_build_object('coins', new_coins, 'prize', g.prize);
end $$;

create or replace function public.get_flag() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.flag_games;
begin
  me := public._me();
  perform public._close_flags();
  select * into g from public.flag_games where active;
  if not found then return jsonb_build_object('active', false); end if;
  return jsonb_build_object('active', true, 'room', g.room, 'gx', g.gx, 'gy', g.gy, 'prize', g.prize, 'ends_at', g.ends_at);
end $$;

create or replace function public._close_hides() returns void
language plpgsql security definer set search_path = '' as $$
declare g public.hide_games; tagged int; surv int := 0; u record;
begin
  for g in update public.hide_games set active = false where active and ends_at <= now() returning * loop
    select count(*) into tagged from public.hide_tags where game_id = g.id;
    for u in select id from public.profiles
              where pos_room = g.room and pos_at > now() - interval '60 seconds' and id <> g.seeker_id
                and id not in (select user_id from public.hide_tags where game_id = g.id) loop
      update public.profiles set coins = least(coins::bigint + 100, 2000000000)::int where id = u.id;
      perform public._add_xp(u.id, 30);
      perform public._emit_user_event(u.id, 'hide_survived', jsonb_build_object('prize', 100));
      surv := surv + 1;
    end loop;
    perform public._emit_event('hide_end', g.room, null,
      jsonb_build_object('seeker', g.seeker_name, 'tagged', tagged, 'survivors', surv), 'Sistem');
  end loop;
end $$;

create or replace function public.admin_start_hide(p_room text, p_seconds int) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; s public.profiles; ends timestamptz;
begin
  me := public._require_admin();
  perform public._close_hides();
  if exists (select 1 from public.hide_games where active) then raise exception 'Zaten aktif bir ebelemece var.'; end if;
  p_seconds := least(greatest(coalesce(p_seconds, 90), 30), 600);
  select * into s from public.profiles
   where pos_room = p_room and pos_at > now() - interval '60 seconds' and id <> me.id and role <> 'admin'
   order by random() limit 1;
  if not found then raise exception 'Bu odada ebe olabilecek oyuncu yok.'; end if;
  ends := now() + make_interval(secs => p_seconds);
  insert into public.hide_games (room, seeker_id, seeker_name, ends_at) values (p_room, s.id, s.username, ends);
  perform public._emit_event('hide', p_room, null, jsonb_build_object('seeker', s.username, 'ends_at', ends), me.username);
  perform public._log(me.username, 'start_hide', s.username, p_room);
end $$;

create or replace function public.hide_tag(p_username text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.hide_games; t public.profiles; mp public.profiles; n int;
begin
  me := public._me();
  perform public._close_hides();
  select * into g from public.hide_games where active and seeker_id = me.id for update;
  if not found then raise exception 'Ebe sen değilsin ya da oyun bitti.'; end if;
  t := public._find_user(p_username);
  if t.id = me.id then raise exception 'Kendini yakalayamazsın.'; end if;
  select * into mp from public.profiles where id = me.id;
  select * into t from public.profiles where id = t.id;
  if mp.pos_room is distinct from g.room or t.pos_room is distinct from g.room
     or mp.pos_at < now() - interval '40 seconds' or t.pos_at < now() - interval '40 seconds' then
    raise exception 'Hedef bu odada değil.';
  end if;
  if sqrt(((mp.pos_x - t.pos_x)^2 + (mp.pos_y - t.pos_y)^2)::numeric) > 1.9 then raise exception 'Yeterince yakın değilsin.'; end if;
  insert into public.hide_tags (game_id, user_id) values (g.id, t.id) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Bu kişi zaten yakalandı.'; end if;
  update public.profiles set coins = least(coins::bigint + 50, 2000000000)::int where id = me.id;
  perform public._add_xp(me.id, 10);
  perform public._emit_user_event(t.id, 'hide_tagged', jsonb_build_object('from', me.username));
  return jsonb_build_object('tagged', t.username, 'prize', 50);
end $$;

create or replace function public.get_hide() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; g public.hide_games;
begin
  me := public._me();
  perform public._close_hides();
  select * into g from public.hide_games where active;
  if not found then return jsonb_build_object('active', false); end if;
  return jsonb_build_object('active', true, 'room', g.room, 'seeker', g.seeker_name, 'ends_at', g.ends_at, 'me_seeker', g.seeker_id = me.id);
end $$;

-- Profil kartına lonca bilgisi + yeni başarımlar
create or replace function public.get_profile_card(p_username text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; t public.profiles;
begin
  me := public._me();
  t := public._find_user(p_username);
  return jsonb_build_object(
    'username', t.username, 'role', t.role, 'xp', t.xp, 'level', public._level(t.xp),
    'fish_caught', t.fish_caught, 'joined', t.created_at,
    'guild', (select g.name || ' [' || g.tag || ']' from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = t.id),
    'friends', (select count(*) from public.friendships f where f.status = 'accepted' and (f.requester = t.id or f.addressee = t.id)),
    'achievements', coalesce((select jsonb_agg(a.key order by a.created_at) from public.achievements a where a.user_id = t.id), '[]'::jsonb)
  );
end $$;

-- Odadan ayrılma/ heartbeat: ebelemece & bayrak süresi dolanları kapat
create or replace function public.heartbeat(p_room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._me();
  perform public._close_tournaments();
  perform public._close_flags();
  perform public._close_hides();
  update public.profiles set last_seen = now(), current_room = left(p_room, 60) where id = me.id;
  return jsonb_build_object('kicked_until', me.kicked_until, 'muted_until', me.muted_until);
end $$;

-- v12: mevcut ev odalarına başlangıç eşyaları (bir kez; layout_v = 11 olunca tekrar çalışmaz)
update public.rooms r set
  furni = r.furni
    || jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'bed',       'gx', 1, 'gy', 1,  'rot', 0, 'owner', r.owner_id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'bookshelf', 'gx', 4, 'gy', 0,  'rot', 0, 'owner', r.owner_id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'tv',        'gx', 7, 'gy', 0,  'rot', 0, 'owner', r.owner_id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'lamp',      'gx', 9, 'gy', 1,  'rot', 0, 'owner', r.owner_id),
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'plant',     'gx', 1, 'gy', 10, 'rot', 0, 'owner', r.owner_id)),
  layout_v = 11
where r.owner_id is not null and r.layout_v < 11 and jsonb_array_length(r.furni) <= 3;
update public.rooms set layout_v = 11 where owner_id is not null and layout_v < 11;

-- ---------- Herkese açık profil görünümü -------------------------------
-- Diğer oyuncuların rütbesi/rengi buradan okunur (presence'a güvenilmez).
create or replace view public.public_profiles as
  select username, role, shirt_color, hair_color, skin_color, id, hat, glasses, hair_style, top_style from public.profiles;

-- ---------- RLS + yetkiler ---------------------------------------------

alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.admin_events enable row level security;
alter table public.messages     enable row level security;
alter table public.user_events  enable row level security;
alter table public.friendships  enable row level security;
alter table public.quiz_state   enable row level security;
alter table public.reports      enable row level security;
alter table public.admin_log    enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "rooms_select_all" on public.rooms;
create policy "rooms_select_all" on public.rooms for select to authenticated using (true);

drop policy if exists "admin_events_select_all" on public.admin_events;
create policy "admin_events_select_all" on public.admin_events for select to authenticated using (true);

-- Oda sohbeti herkese açık; fısıltılar sadece gönderen ve alıcıya.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select to authenticated
  using (kind = 'chat' or sender_id = auth.uid() or target_id = auth.uid());

drop policy if exists "user_events_select_own" on public.user_events;
create policy "user_events_select_own" on public.user_events for select to authenticated using (target_id = auth.uid());

-- friendships, quiz_state, reports, admin_log: politika YOK → istemci hiç okuyamaz, sadece RPC.

-- Tablolara doğrudan yazma YOK; sadece izinli okuma.
revoke all on public.profiles, public.rooms, public.admin_events, public.public_profiles,
              public.messages, public.user_events, public.friendships, public.quiz_state,
              public.reports, public.admin_log from anon, authenticated;
grant select on public.profiles, public.rooms, public.admin_events, public.public_profiles,
                public.messages, public.user_events to authenticated;

-- Fonksiyon yetkileri: varsayılan "herkes çalıştırabilir"i kapat, sonra sadece gerekenlere aç.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('role_rank','furni_price','cosmetic_price','_me','_require_admin','_emit_event','_emit_user_event',
                         '_log','_norm','_find_user','_tile_free','handle_new_user','username_available','get_my_profile',
                         'claim_daily','set_look','buy_and_place_furni','place_from_bag','pickup_furni',
                         'admin_set_role','admin_gift','admin_kick','admin_announce','admin_dance','admin_clear_room',
                         'send_chat','roll_dice','heartbeat','friend_request','friend_respond','friend_remove','get_friends',
                         'gift_coins','gift_item','buy_cosmetic','equip_cosmetic','ensure_home','set_home_access','enter_room',
                         'admin_start_quiz','answer_quiz','admin_mute','admin_unmute','admin_ban','admin_unban',
                         'report_player','admin_list_reports','admin_close_report','admin_get_log',
                         'fish_price','buy_fishing_rod','equip_tool','catch_fish','sell_fish',
                         '_level','_ach','_add_xp','_quest_goal','_quest_coins','_quest_xp','_progress','get_quests','claim_quest',
                         'get_profile_card','_inv_remove','market_list_item','market_get','market_cancel','market_buy',
                         '_tournament_add','_close_tournaments','get_tournament','admin_start_tournament',
                         '_room_spawn','report_pos','_furni_w','_furni_h','_is_water','_check_place','_in_room','_require_near','goods_price','buy_pickaxe','mine_ore','sell_goods','_crop_seconds','_crop_seed','farm_get','farm_plant','farm_harvest','cook','_guild_level','guild_get','guild_list','guild_create','guild_join','guild_leave','guild_kick','guild_donate','dice_play','_bj_total','_bj_card','_bj_view','_bj_finish','bj_state','bj_start','bj_hit','bj_stand','_close_flags','admin_start_flag','flag_grab','get_flag','_close_hides','admin_start_hide','hide_tag','get_hide')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.get_my_profile()                               to authenticated;
grant execute on function public.claim_daily()                                  to authenticated;
grant execute on function public.set_look(text, text, text)                     to authenticated;
grant execute on function public.buy_and_place_furni(text, text, int, int, int) to authenticated;
grant execute on function public.place_from_bag(text, text, int, int, int)      to authenticated;
grant execute on function public.pickup_furni(text, text)                       to authenticated;
grant execute on function public.admin_set_role(text, text)                     to authenticated;
grant execute on function public.admin_gift(text, int)                          to authenticated;
grant execute on function public.admin_kick(text)                               to authenticated;
grant execute on function public.admin_announce(text)                           to authenticated;
grant execute on function public.admin_dance(text, boolean)                     to authenticated;
grant execute on function public.admin_clear_room(text)                         to authenticated;
grant execute on function public.send_chat(text, text, text)                    to authenticated;
grant execute on function public.roll_dice(text)                                to authenticated;
grant execute on function public.heartbeat(text)                                to authenticated;
grant execute on function public.friend_request(text)                           to authenticated;
grant execute on function public.friend_respond(text, boolean)                  to authenticated;
grant execute on function public.friend_remove(text)                            to authenticated;
grant execute on function public.get_friends()                                  to authenticated;
grant execute on function public.gift_coins(text, int)                          to authenticated;
grant execute on function public.gift_item(text, text)                          to authenticated;
grant execute on function public.buy_cosmetic(text)                             to authenticated;
grant execute on function public.equip_cosmetic(text, text)                     to authenticated;
grant execute on function public.ensure_home()                                  to authenticated;
grant execute on function public.set_home_access(text)                          to authenticated;
grant execute on function public.enter_room(text)                               to authenticated;
grant execute on function public.admin_start_quiz(text, text, int, int)         to authenticated;
grant execute on function public.answer_quiz(text)                              to authenticated;
grant execute on function public.admin_mute(text, int)                          to authenticated;
grant execute on function public.admin_unmute(text)                             to authenticated;
grant execute on function public.admin_ban(text, int)                           to authenticated;
grant execute on function public.admin_unban(text)                              to authenticated;
grant execute on function public.report_player(text, text)                      to authenticated;
grant execute on function public.admin_list_reports()                           to authenticated;
grant execute on function public.admin_close_report(bigint)                     to authenticated;
grant execute on function public.admin_get_log()                                to authenticated;
grant execute on function public.buy_fishing_rod()                              to authenticated;
grant execute on function public.equip_tool(text)                               to authenticated;
grant execute on function public.catch_fish(text)                               to authenticated;
grant execute on function public.sell_fish(text)                                to authenticated;
grant execute on function public.get_quests()                                   to authenticated;
grant execute on function public.claim_quest(text)                              to authenticated;
grant execute on function public.get_profile_card(text)                         to authenticated;
grant execute on function public.report_pos(text, int, int) to authenticated;
grant execute on function public.buy_pickaxe() to authenticated;
grant execute on function public.mine_ore() to authenticated;
grant execute on function public.sell_goods(text, text) to authenticated;
grant execute on function public.farm_get() to authenticated;
grant execute on function public.farm_plant(int, text) to authenticated;
grant execute on function public.farm_harvest(int) to authenticated;
grant execute on function public.cook(text) to authenticated;
grant execute on function public.guild_get() to authenticated;
grant execute on function public.guild_list() to authenticated;
grant execute on function public.guild_create(text, text) to authenticated;
grant execute on function public.guild_join(text) to authenticated;
grant execute on function public.guild_leave() to authenticated;
grant execute on function public.guild_kick(text) to authenticated;
grant execute on function public.guild_donate(int) to authenticated;
grant execute on function public.dice_play(int) to authenticated;
grant execute on function public.bj_state() to authenticated;
grant execute on function public.bj_start(int) to authenticated;
grant execute on function public.bj_hit() to authenticated;
grant execute on function public.bj_stand() to authenticated;
grant execute on function public.admin_start_flag(text, int, int) to authenticated;
grant execute on function public.flag_grab(text) to authenticated;
grant execute on function public.get_flag() to authenticated;
grant execute on function public.admin_start_hide(text, int) to authenticated;
grant execute on function public.hide_tag(text) to authenticated;
grant execute on function public.get_hide() to authenticated;
grant execute on function public.market_list_item(text, int, text)              to authenticated;
grant execute on function public.market_get()                                   to authenticated;
grant execute on function public.market_cancel(bigint)                          to authenticated;
grant execute on function public.market_buy(bigint)                             to authenticated;
grant execute on function public.get_tournament()                               to authenticated;
grant execute on function public.admin_start_tournament(int)                    to authenticated;

-- ---------- Realtime ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['rooms', 'admin_events', 'messages', 'user_events'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
