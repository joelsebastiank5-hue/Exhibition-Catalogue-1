-- ZAAS EXHIBITION MVP: run once in Supabase SQL Editor.
-- Public customers: read active catalogue + create/read orders ONLY via the RPCs below.
-- Admin = any authenticated Supabase Auth user (disable public sign-ups in Auth settings).

create extension if not exists pgcrypto;

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  slug text not null unique,
  sku text not null unique,
  description text,
  price numeric(10,2) not null check (price >= 0),
  primary_image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on products (category_id) where is_active;

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  label text,
  colour text,
  size text,
  price_override numeric(10,2) check (price_override >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- one real variant per colour/size combination
  unique nulls not distinct (product_id, colour, size)
);
create index on product_variants (product_id) where is_active;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  status text not null default 'new' check (status in ('new','completed','cancelled')),
  customer_name text,
  customer_phone text,
  total_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on orders (status, created_at desc);

-- Snapshot table: nothing here depends on live product data.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  sku text not null,
  variant_label text,
  colour text,
  size text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity between 1 and 99),
  line_total numeric(10,2) not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index on order_items (order_id);

-- ---------- RLS ----------
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "public read categories" on categories for select to anon, authenticated using (is_active);
create policy "public read products" on products for select to anon, authenticated using (is_active);
create policy "public read variants" on product_variants for select to anon, authenticated using (is_active);

-- Orders: no anon policies at all (anon cannot list or read orders directly).
create policy "admin read orders" on orders for select to authenticated using (true);
create policy "admin update orders" on orders for update to authenticated using (true) with check (true);
create policy "admin read order_items" on order_items for select to authenticated using (true);

-- ---------- Order code: ZAAS-XXXX, no 0/O/1/I/L ----------
create or replace function gen_order_code() returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text := '';
begin
  for i in 1..4 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'ZAAS-' || code;
end $$;

-- ---------- Create order (server-side pricing + variant validation) ----------
-- p_items: [{"product_id":"uuid","variant_id":"uuid|null","quantity":2}, ...]
-- Client-sent prices are ignored. Returns the order code.
create or replace function create_order(p_name text, p_phone text, p_items jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod products%rowtype; var product_variants%rowtype;
  qty int; unit numeric(10,2); total numeric(10,2) := 0;
  has_variants boolean; v_order_id uuid; v_code text; tries int := 0;
  lines jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'too many lines'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    qty := (it->>'quantity')::int;
    if qty is null or qty < 1 or qty > 99 then raise exception 'invalid quantity'; end if;

    select * into prod from products where id = (it->>'product_id')::uuid and is_active;
    if not found then raise exception 'product unavailable'; end if;

    select exists(select 1 from product_variants where product_id = prod.id and is_active) into has_variants;
    var := null;
    if has_variants then
      if it->>'variant_id' is null then raise exception 'variant required'; end if;
      select * into var from product_variants
        where id = (it->>'variant_id')::uuid and product_id = prod.id and is_active;
      if not found then raise exception 'variant unavailable'; end if;
    end if;

    unit := coalesce(var.price_override, prod.price);
    total := total + unit * qty;
    lines := lines || jsonb_build_object(
      'product_id', prod.id, 'variant_id', var.id, 'product_name', prod.name,
      'sku', coalesce(var.sku, prod.sku), 'variant_label', var.label,
      'colour', var.colour, 'size', var.size, 'unit_price', unit,
      'quantity', qty, 'line_total', unit * qty, 'image_url', prod.primary_image_url);
  end loop;

  -- insert with collision retry (unique constraint is the real guarantee)
  loop
    tries := tries + 1;
    v_code := gen_order_code();
    begin
      insert into orders (order_code, customer_name, customer_phone, total_amount)
      values (v_code, nullif(trim(p_name), ''), nullif(trim(p_phone), ''), total)
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      if tries >= 20 then raise exception 'could not allocate code'; end if;
    end;
  end loop;

  insert into order_items (order_id, product_id, variant_id, product_name, sku, variant_label,
                           colour, size, unit_price, quantity, line_total, image_url)
  select v_order_id, (l->>'product_id')::uuid, (l->>'variant_id')::uuid, l->>'product_name',
         l->>'sku', l->>'variant_label', l->>'colour', l->>'size',
         (l->>'unit_price')::numeric, (l->>'quantity')::int, (l->>'line_total')::numeric, l->>'image_url'
  from jsonb_array_elements(lines) l;

  return v_code;
end $$;

-- ---------- Retrieve one order by code (customer slip page) ----------
create or replace function get_order_by_code(p_code text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'order_code', o.order_code, 'status', o.status, 'customer_name', o.customer_name,
    'total_amount', o.total_amount, 'created_at', o.created_at,
    'total_items', (select coalesce(sum(quantity),0) from order_items where order_id = o.id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'sku', i.sku, 'colour', i.colour, 'size', i.size,
        'unit_price', i.unit_price, 'quantity', i.quantity, 'line_total', i.line_total,
        'image_url', i.image_url) order by i.created_at), '[]'::jsonb)
      from order_items i where i.order_id = o.id))
  from orders o
  where o.order_code = case when upper(trim(p_code)) like 'ZAAS-%' then upper(trim(p_code))
                            else 'ZAAS-' || upper(trim(p_code)) end;
$$;

revoke all on function create_order(text,text,jsonb), get_order_by_code(text) from public;
grant execute on function create_order(text,text,jsonb), get_order_by_code(text) to anon, authenticated;
revoke all on function gen_order_code() from public, anon, authenticated;

-- ---------- Seed data (placeholder images) ----------
insert into categories (name, slug, image_url, sort_order) values
 ('Sunglasses','sunglasses','https://picsum.photos/seed/zs/600/600',1),
 ('Underwear','underwear','https://picsum.photos/seed/zu/600/600',2),
 ('Caps','caps','https://picsum.photos/seed/zc/600/600',3),
 ('T-Shirts','t-shirts','https://picsum.photos/seed/zt/600/600',4),
 ('Hair Accessories','hair-accessories','https://picsum.photos/seed/zh/600/600',5);

insert into products (category_id, name, slug, sku, description, price, primary_image_url, sort_order)
select c.id, p.name, p.slug, p.sku, p.descr, p.price, 'https://picsum.photos/seed/'||p.slug||'/800/800', p.ord
from (values
 ('sunglasses','Classic Aviator','classic-aviator','ZAAS S101','Metal frame, UV400.',39,1),
 ('underwear','ZAAS Premium Underwear','premium-underwear','ZAAS-U101','Soft stretch cotton.',29,1),
 ('t-shirts','ZAAS Classic T-Shirt','classic-tshirt','ZAAS-T101','Heavyweight cotton tee.',35,1),
 ('caps','ZAAS Everyday Cap','everyday-cap','ZAAS-C101','Adjustable strap.',25,1),
 ('hair-accessories','Satin Scrunchie Set','satin-scrunchie-set','ZAAS-H101','Set of 3, no options.',15,1)
) as p(cat, name, slug, sku, descr, price, ord)
join categories c on c.slug = p.cat;

-- Variants: (product sku, variant sku, colour, size)
insert into product_variants (product_id, sku, label, colour, size)
select p.id, v.vsku, concat_ws(' / ', v.colour, v.size), v.colour, v.size
from (values
 ('ZAAS-U101','ZAAS-U101-M-BLK','Black','M'),('ZAAS-U101','ZAAS-U101-L-BLK','Black','L'),
 ('ZAAS-U101','ZAAS-U101-XL-BLK','Black','XL'),('ZAAS-U101','ZAAS-U101-S-WHT','White','S'),
 ('ZAAS-U101','ZAAS-U101-M-WHT','White','M'),('ZAAS-U101','ZAAS-U101-XL-WHT','White','XL'),
 ('ZAAS-U101','ZAAS-U101-M-NVY','Navy','M'),
 ('ZAAS-T101','ZAAS-T101-S-BLK','Black','S'),('ZAAS-T101','ZAAS-T101-M-BLK','Black','M'),
 ('ZAAS-T101','ZAAS-T101-L-BLK','Black','L'),('ZAAS-T101','ZAAS-T101-M-WHT','White','M'),
 ('ZAAS-T101','ZAAS-T101-L-WHT','White','L'),('ZAAS-T101','ZAAS-T101-XL-WHT','White','XL'),
 ('ZAAS-C101','ZAAS-C101-BLK','Black',null),('ZAAS-C101','ZAAS-C101-WHT','White',null),
 ('ZAAS-C101','ZAAS-C101-NVY','Navy',null)
) as v(psku, vsku, colour, size)
join products p on p.sku = v.psku;
-- Sunglasses (S101) and scrunchies (H101) intentionally have NO variants.
