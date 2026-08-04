create extension if not exists "pgcrypto";

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(150) not null,
  business_type varchar(100),
  currency varchar(10) not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sku varchar(100) not null,
  name varchar(200) not null,
  category varchar(100),
  unit varchar(50) not null,
  selling_price numeric(15,2) not null default 0 check (selling_price >= 0),
  current_stock numeric(15,2) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(15,2) not null default 0 check (minimum_stock >= 0),
  safety_stock numeric(15,2) not null default 0 check (safety_stock >= 0),
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create table product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  alias_name varchar(200) not null,
  source varchar(50) check (
    source in ('manual', 'ocr', 'excel', 'csv', 'matching')
    ),
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_type varchar(30) not null
    check (transaction_type in ('sale', 'purchase')),
  transaction_date timestamptz not null,
  total_amount numeric(15,2) not null default 0 check (total_amount >= 0),
  source varchar(30) check (
    source in ('manual', 'ocr', 'excel', 'csv', 'pos', 'seed')
    ),
  created_at timestamptz not null default now()
);

create table transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity numeric(15,2) not null check (quantity > 0),
  unit_price numeric(15,2) not null default 0 check (unit_price >= 0),
  subtotal numeric(15,2) not null default 0 check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id),
  movement_type varchar(30) not null
    check (
      movement_type in (
        'sale',
        'purchase',
        'damaged',
        'lost',
        'expired',
        'stock_opname',
        'manual_correction'
      )
    ),
  quantity_change numeric(15,2) not null check (quantity_change <> 0),
  stock_before numeric(15,2) not null check (stock_before >= 0),
  stock_after numeric(15,2) not null check (stock_after >= 0),
  reference_type varchar(50),
  reference_id uuid,
  reason varchar(200),
  notes text,
  created_at timestamptz not null default now(),
  check (stock_after = stock_before + quantity_change)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_businesses_updated_at
before update on businesses
for each row
execute function set_updated_at();

create trigger set_products_updated_at
before update on products
for each row
execute function set_updated_at();

create index idx_products_business_id
  on products(business_id);


create index idx_transactions_transaction_date
  on transactions(transaction_date);

create index idx_transaction_items_transaction_id
  on transaction_items(transaction_id);

create index idx_transaction_items_product_id
  on transaction_items(product_id);

create index idx_inventory_movements_business_id
  on inventory_movements(business_id);

create index idx_inventory_movements_product_id
  on inventory_movements(product_id);

create index idx_inventory_movements_created_at
  on inventory_movements(created_at);

create index idx_product_aliases_product_id
  on product_aliases(product_id);

create unique index uq_product_aliases_product_lower_name
  on product_aliases(product_id, lower(alias_name));

create index idx_transactions_business_date
  on transactions(business_id, transaction_date);