create table if not exists house_orders (
  id text primary key,
  user_id text not null,
  kind text not null,
  sku text not null,
  label text not null,
  cents integer not null check (cents > 0 and cents <= 50000),
  created_at timestamptz not null default now()
);

create index if not exists house_orders_user_idx on house_orders (user_id);
create index if not exists house_orders_created_idx on house_orders (created_at desc);
