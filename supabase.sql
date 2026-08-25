-- ===========================================================================
-- Ruaa — Supabase setup
--
-- Run this once, whole, in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- It creates the two tables, the photo bucket, the access rules, turns on live
-- updates, and loads the six starter designs. Safe to run twice.
--
-- Afterwards, put your project URL and anon key into CONFIG.supabase in
-- js/data.js and the site switches from this-browser-only to shared.
-- ===========================================================================


-- --------------------------------------------------------------------------
-- 1. The catalogue
--    "desc" is a reserved word in SQL, so the column is "descr".
--    "pos" keeps the order the dashboard shows.
-- --------------------------------------------------------------------------
create table if not exists public.products (
  id     text primary key,
  name   text not null,
  cat    text,
  price  integer not null default 0,
  mrp    integer not null default 0,
  mat    text,
  descr  text,
  art    text,
  img    text,
  stock  boolean not null default true,
  pos    integer not null default 0
);

create index if not exists products_pos_idx on public.products (pos);


-- --------------------------------------------------------------------------
-- 2. Categories
--    Rows the team added (hidden = false), and built-in ones they deleted
--    (hidden = true). The five defaults still live in js/data.js.
-- --------------------------------------------------------------------------
create table if not exists public.categories (
  name   text primary key,
  hidden boolean not null default false
);


-- --------------------------------------------------------------------------
-- 3. Who can read and write
--
--    READ IS PUBLIC, which is what a storefront needs.
--
--    WRITING IS ALSO PUBLIC, because the admin password lives in js/data.js
--    where any visitor can read it. That is fine for a demo or a soft launch;
--    it means a determined stranger could edit your catalogue. To lock it
--    down, see "Locking down writes" in README.md.
-- --------------------------------------------------------------------------
alter table public.products   enable row level security;
alter table public.categories enable row level security;

drop policy if exists "anyone can read products" on public.products;
create policy "anyone can read products"
  on public.products for select using (true);

drop policy if exists "anyone can write products" on public.products;
create policy "anyone can write products"
  on public.products for all using (true) with check (true);

drop policy if exists "anyone can read categories" on public.categories;
create policy "anyone can read categories"
  on public.categories for select using (true);

drop policy if exists "anyone can write categories" on public.categories;
create policy "anyone can write categories"
  on public.categories for all using (true) with check (true);


-- --------------------------------------------------------------------------
-- 4. Live updates
--    Without this the site still works, but visitors would have to refresh.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.categories;
  exception when duplicate_object then null;
  end;
end $$;


-- --------------------------------------------------------------------------
-- 5. The photo bucket
--    Product photos are uploaded here instead of being stored inside the
--    catalogue, which is what kept the old version under a 5 MB ceiling.
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "anyone can view photos" on storage.objects;
create policy "anyone can view photos"
  on storage.objects for select using (bucket_id = 'photos');

drop policy if exists "anyone can upload photos" on storage.objects;
create policy "anyone can upload photos"
  on storage.objects for insert with check (bucket_id = 'photos');


-- --------------------------------------------------------------------------
-- 6. The six starter designs
--    Delete them from the dashboard once your own pieces are up.
-- --------------------------------------------------------------------------
insert into public.products (id, name, cat, price, mrp, mat, descr, art, img, stock, pos)
values
  ('p1', 'Zoya Twisted Hoops', 'Earrings', 1499, 2499, '18k gold plated brass', 'Chunky twisted hoops with a click-top clasp that stays shut all day.', 'hoop', null, true, 0),
  ('p2', 'Mira Pearl Drop Studs', 'Earrings', 1299, 1999, '18k gold plated, freshwater pearl', 'A single freshwater pearl on a slim bar. The one pair that works with everything.', 'stud', null, true, 1),
  ('p3', 'Ira Solitaire Pendant', 'Necklaces', 1899, 2999, '18k gold plated, zircon', 'A brilliant-cut zircon on a 16-inch cable chain with a 2-inch extender.', 'pendant', null, true, 2),
  ('p4', 'Anaya Layered Chain', 'Necklaces', 2199, 3499, '18k gold plated brass', 'Two chains, one clasp — the layered look without the tangle.', 'layer', null, true, 3),
  ('p5', 'Noor Stacking Ring Set', 'Rings', 1099, 1799, '18k gold plated brass', 'Set of three: plain band, twisted band, and a pavé-set sliver.', 'ring', null, true, 4),
  ('p6', 'Saanvi Cuff Bracelet', 'Bracelets', 1699, 2699, '18k gold plated brass', 'An open cuff that flexes to your wrist. No clasp to fumble with.', 'cuff', null, false, 5)
on conflict (id) do nothing;
