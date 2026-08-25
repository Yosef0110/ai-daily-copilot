-- ============================================================
-- AI DAILY COPILOT FOR UMKM
-- LOCAL DEVELOPMENT SEED DATA
--
-- Login demo:
-- Email    : demo@aidailycopilot.local
-- Password : demo123456
-- ============================================================

begin;

-- ============================================================
-- FIXED UUIDS
-- ============================================================
-- Demo user:
-- 11111111-1111-1111-1111-111111111111
--
-- Demo business:
-- 22222222-2222-2222-2222-222222222222
--
-- Products:
-- Indomie : 33333333-3333-4333-8333-333333333331
-- Aqua    : 33333333-3333-4333-8333-333333333332
-- Gula    : 33333333-3333-4333-8333-333333333333
-- Kopi    : 33333333-3333-4333-8333-333333333334
-- Teh     : 33333333-3333-4333-8333-333333333335
--
-- Purchase transaction:
-- 44444444-4444-4444-4444-444444444443


-- ============================================================
-- 1. DEMO AUTH USER
-- ============================================================

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@aidailycopilot.local',
  crypt('demo123456', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Demo Owner"}'::jsonb
);


-- ============================================================
-- 1B. DEMO AUTH IDENTITY
-- ============================================================

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'email', 'demo@aidailycopilot.local',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
);


-- ============================================================
-- 2. DEMO BUSINESS
-- ============================================================

insert into businesses (
  id,
  owner_user_id,
  name,
  business_type,
  currency
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Warung Maju Jaya',
  'Warung Sembako',
  'IDR'
);


-- ============================================================
-- 3. PRODUCTS
-- ============================================================

insert into products (
  id,
  business_id,
  sku,
  name,
  category,
  unit,
  selling_price,
  current_stock,
  minimum_stock,
  safety_stock,
  lead_time_days,
  is_active
)
values
  (
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-2222-2222-222222222222',
    'IND-001',
    'Indomie Goreng 85g',
    'Makanan Instan',
    'pcs',
    3500,
    70,
    10,
    8,
    2,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    'AQU-001',
    'Aqua 600ml',
    'Minuman',
    'botol',
    4000,
    55,
    8,
    6,
    2,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'GUL-001',
    'Gula Pasir 1kg',
    'Sembako',
    'pack',
    18000,
    30,
    5,
    4,
    3,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333334',
    '22222222-2222-2222-2222-222222222222',
    'KOP-001',
    'Kopi ABC Susu',
    'Minuman',
    'sachet',
    2500,
    45,
    10,
    8,
    2,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333335',
    '22222222-2222-2222-2222-222222222222',
    'TEH-001',
    'Teh Botol Sosro 450ml',
    'Minuman',
    'botol',
    6000,
    40,
    8,
    6,
    2,
    true
  );


-- ============================================================
-- 4. PRODUCT ALIASES
-- ============================================================

insert into product_aliases (
  product_id,
  alias_name,
  source
)
values
  (
    '33333333-3333-4333-8333-333333333331',
    'Indomie Grg',
    'manual'
  ),
  (
    '33333333-3333-4333-8333-333333333331',
    'Indomie Goreng',
    'manual'
  ),
  (
    '33333333-3333-4333-8333-333333333332',
    'Aqua 600',
    'manual'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Gula 1kg',
    'manual'
  ),
  (
    '33333333-3333-4333-8333-333333333334',
    'Kopi ABC',
    'manual'
  ),
  (
    '33333333-3333-4333-8333-333333333335',
    'Teh Sosro',
    'manual'
  );


-- ============================================================
-- 5. 30-DAY HISTORICAL SALES DATA
-- ============================================================

insert into transactions (
  id,
  business_id,
  transaction_type,
  transaction_date,
  total_amount,
  source
)
select
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  'sale',
  current_date - day_offset,
  0,
  'seed'
from generate_series(1, 30) as day_offset;


-- ============================================================
-- 6. HISTORICAL SALE ITEMS
-- ============================================================

insert into transaction_items (
  transaction_id,
  product_id,
  quantity,
  unit_price,
  subtotal
)
select
  t.id,
  p.product_id,
  p.quantity,
  p.unit_price,
  p.quantity * p.unit_price
from transactions t
cross join lateral (
  values
    (
      '33333333-3333-4333-8333-333333333331'::uuid,
      (5 + extract(day from t.transaction_date)::int % 6)::numeric,
      3500::numeric
    ),
    (
      '33333333-3333-4333-8333-333333333332'::uuid,
      (4 + extract(day from t.transaction_date)::int % 5)::numeric,
      4000::numeric
    ),
    (
      '33333333-3333-4333-8333-333333333333'::uuid,
      (2 + extract(day from t.transaction_date)::int % 4)::numeric,
      18000::numeric
    ),
    (
      '33333333-3333-4333-8333-333333333334'::uuid,
      (6 + extract(day from t.transaction_date)::int % 7)::numeric,
      2500::numeric
    ),
    (
      '33333333-3333-4333-8333-333333333335'::uuid,
      (3 + extract(day from t.transaction_date)::int % 6)::numeric,
      6000::numeric
    )
) as p(product_id, quantity, unit_price)
where t.transaction_type = 'sale'
  and t.source = 'seed';


-- ============================================================
-- 6B. UPDATE SALE TRANSACTION TOTALS
-- ============================================================

update transactions t
set total_amount = totals.total_amount
from (
  select
    transaction_id,
    sum(subtotal) as total_amount
  from transaction_items
  group by transaction_id
) totals
where t.id = totals.transaction_id
  and t.transaction_type = 'sale';


-- ============================================================
-- 7. PURCHASE TRANSACTION
-- ============================================================

insert into transactions (
  id,
  business_id,
  transaction_type,
  transaction_date,
  total_amount,
  source
)
values (
  '44444444-4444-4444-4444-444444444443',
  '22222222-2222-2222-2222-222222222222',
  'purchase',
  now(),
  105000,
  'seed'
);

insert into transaction_items (
  transaction_id,
  product_id,
  quantity,
  unit_price,
  subtotal
)
values
  (
    '44444444-4444-4444-4444-444444444443',
    '33333333-3333-4333-8333-333333333331',
    32,
    3000,
    96000
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '33333333-3333-4333-8333-333333333332',
    5,
    1800,
    9000
  );


-- ============================================================
-- 8. INITIAL INVENTORY MOVEMENTS
-- ============================================================

insert into inventory_movements (
  business_id,
  product_id,
  movement_type,
  quantity_change,
  stock_before,
  stock_after,
  reference_type,
  reason,
  notes,
  created_at
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333331',
    'manual_correction',
    70,
    0,
    70,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '31 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333332',
    'manual_correction',
    55,
    0,
    55,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '31 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    'manual_correction',
    30,
    0,
    30,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '31 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333334',
    'manual_correction',
    45,
    0,
    45,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '31 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333335',
    'manual_correction',
    40,
    0,
    40,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '31 days'
  );


-- ============================================================
-- 9. INVENTORY MOVEMENT FROM PURCHASE
-- ============================================================

insert into inventory_movements (
  business_id,
  product_id,
  movement_type,
  quantity_change,
  stock_before,
  stock_after,
  reference_type,
  reference_id,
  reason,
  created_at
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333331',
    'purchase',
    32,
    38,
    70,
    'transaction',
    '44444444-4444-4444-4444-444444444443',
    'Seed purchase transaction',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-4333-8333-333333333332',
    'purchase',
    5,
    50,
    55,
    'transaction',
    '44444444-4444-4444-4444-444444444443',
    'Seed purchase transaction',
    now()
  );

commit;