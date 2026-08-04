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
-- Indomie : 33333333-3333-3333-3333-333333333331
-- Aqua    : 33333333-3333-3333-3333-333333333332
-- Gula    : 33333333-3333-3333-3333-333333333333
--
-- Transactions:
-- Sale 1   : 44444444-4444-4444-4444-444444444441
-- Sale 2   : 44444444-4444-4444-4444-444444444442
-- Purchase : 44444444-4444-4444-4444-444444444443


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
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Demo Owner"}'::jsonb
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
--
-- Final stock:
-- Indomie = 70
-- Aqua    = 35
-- Gula    = 17
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
    '33333333-3333-3333-3333-333333333331',
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
    '33333333-3333-3333-3333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    'AQU-001',
    'Aqua 600ml',
    'Minuman',
    'botol',
    4000,
    35,
    8,
    6,
    2,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'GUL-001',
    'Gula Pasir 1kg',
    'Sembako',
    'pack',
    18000,
    17,
    5,
    4,
    3,
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
    '33333333-3333-3333-3333-333333333331',
    'Indomie Grg',
    'manual'
  ),
  (
    '33333333-3333-3333-3333-333333333331',
    'Indomie Goreng',
    'manual'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    'Aqua 600',
    'manual'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Gula 1kg',
    'manual'
  );


-- ============================================================
-- 5. FIRST SALE TRANSACTION
--
-- Indomie: 5 × 3,500  = 17,500
-- Aqua   : 5 × 4,000  = 20,000
-- Gula   : 2 × 18,000 = 36,000
-- Total                  73,500
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
  '44444444-4444-4444-4444-444444444441',
  '22222222-2222-2222-2222-222222222222',
  'sale',
  now() - interval '2 days',
  73500,
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
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333331',
    5,
    3500,
    17500
  ),
  (
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333332',
    5,
    4000,
    20000
  ),
  (
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333333',
    2,
    18000,
    36000
  );


-- ============================================================
-- 6. SECOND SALE TRANSACTION
--
-- Indomie: 7 × 3,500  = 24,500
-- Aqua   : 5 × 4,000  = 20,000
-- Gula   : 1 × 18,000 = 18,000
-- Total                  62,500
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
  '44444444-4444-4444-4444-444444444442',
  '22222222-2222-2222-2222-222222222222',
  'sale',
  now() - interval '1 day',
  62500,
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
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333331',
    7,
    3500,
    24500
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333332',
    5,
    4000,
    20000
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333333',
    1,
    18000,
    18000
  );


-- ============================================================
-- 7. PURCHASE TRANSACTION
--
-- Indomie: 32 × 3,000 = 96,000
-- Aqua   : 5 × 1,800  =  9,000
-- Total                  105,000
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
    '33333333-3333-3333-3333-333333333331',
    32,
    3000,
    96000
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '33333333-3333-3333-3333-333333333332',
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
    '33333333-3333-3333-3333-333333333331',
    'manual_correction',
    50,
    0,
    50,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '3 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333332',
    'manual_correction',
    40,
    0,
    40,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '3 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'manual_correction',
    20,
    0,
    20,
    'seed',
    'Initial stock',
    'Stok awal untuk data demo',
    now() - interval '3 days'
  );


-- ============================================================
-- 9. INVENTORY MOVEMENTS FROM FIRST SALE
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
    '33333333-3333-3333-3333-333333333331',
    'sale',
    -5,
    50,
    45,
    'transaction',
    '44444444-4444-4444-4444-444444444441',
    'Seed sale transaction',
    now() - interval '2 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333332',
    'sale',
    -5,
    40,
    35,
    'transaction',
    '44444444-4444-4444-4444-444444444441',
    'Seed sale transaction',
    now() - interval '2 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'sale',
    -2,
    20,
    18,
    'transaction',
    '44444444-4444-4444-4444-444444444441',
    'Seed sale transaction',
    now() - interval '2 days'
  );


-- ============================================================
-- 10. INVENTORY MOVEMENTS FROM SECOND SALE
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
    '33333333-3333-3333-3333-333333333331',
    'sale',
    -7,
    45,
    38,
    'transaction',
    '44444444-4444-4444-4444-444444444442',
    'Seed sale transaction',
    now() - interval '1 day'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333332',
    'sale',
    -5,
    35,
    30,
    'transaction',
    '44444444-4444-4444-4444-444444444442',
    'Seed sale transaction',
    now() - interval '1 day'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'sale',
    -1,
    18,
    17,
    'transaction',
    '44444444-4444-4444-4444-444444444442',
    'Seed sale transaction',
    now() - interval '1 day'
  );


-- ============================================================
-- 11. INVENTORY MOVEMENTS FROM PURCHASE
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
    '33333333-3333-3333-3333-333333333331',
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
    '33333333-3333-3333-3333-333333333332',
    'purchase',
    5,
    30,
    35,
    'transaction',
    '44444444-4444-4444-4444-444444444443',
    'Seed purchase transaction',
    now()
  );

commit;