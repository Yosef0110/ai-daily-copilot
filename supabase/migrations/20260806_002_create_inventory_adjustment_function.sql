-- ============================================================
-- INVENTORY ADJUSTMENT RPC
-- ============================================================

create or replace function adjust_inventory(
  p_business_id uuid,
  p_product_id uuid,
  p_adjustment_type varchar,
  p_quantity numeric,
  p_reason varchar,
  p_notes text default null
)
returns table (
  product_id uuid,
  stock_before numeric,
  quantity_change numeric,
  stock_after numeric,
  movement_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product products%rowtype;
  v_quantity_change numeric;
  v_stock_after numeric;
  v_movement_id uuid;
begin
  -- Kunci row produk agar dua adjustment tidak mengubah stok
  -- yang sama secara bersamaan.
  select *
  into v_product
  from products
  where id = p_product_id
    and business_id = p_business_id
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not v_product.is_active then
    raise exception 'PRODUCT_INACTIVE';
  end if;

  if p_quantity < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  if p_adjustment_type in ('damaged', 'lost', 'expired') then
    if p_quantity = 0 then
      raise exception 'QUANTITY_MUST_BE_GREATER_THAN_ZERO';
    end if;

    v_quantity_change := -p_quantity;
    v_stock_after := v_product.current_stock + v_quantity_change;

  elsif p_adjustment_type in ('stock_opname', 'manual_correction') then
    v_stock_after := p_quantity;
    v_quantity_change := v_stock_after - v_product.current_stock;

    if v_quantity_change = 0 then
      raise exception 'NO_STOCK_CHANGE';
    end if;

  else
    raise exception 'INVALID_ADJUSTMENT_TYPE';
  end if;

  if v_stock_after < 0 then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update products
  set current_stock = v_stock_after
  where id = v_product.id;

  insert into inventory_movements (
    business_id,
    product_id,
    movement_type,
    quantity_change,
    stock_before,
    stock_after,
    reference_type,
    reason,
    notes
  )
  values (
    p_business_id,
    p_product_id,
    p_adjustment_type,
    v_quantity_change,
    v_product.current_stock,
    v_stock_after,
    'inventory_adjustment',
    p_reason,
    p_notes
  )
  returning id into v_movement_id;

  return query
  select
    v_product.id,
    v_product.current_stock,
    v_quantity_change,
    v_stock_after,
    v_movement_id;
end;
$$;

grant execute on function adjust_inventory(
  uuid,
  uuid,
  varchar,
  numeric,
  varchar,
  text
) to authenticated;

-- ============================================================
-- INVENTORY MOVEMENT POLICIES
-- ============================================================

create policy "Users can read inventory movements from their business"
on inventory_movements
for select
to authenticated
using (
  business_id in (
    select id
    from businesses
    where owner_user_id = (select auth.uid())
  )
);

create policy "Users can insert inventory movements into their business"
on inventory_movements
for insert
to authenticated
with check (
  business_id in (
    select id
    from businesses
    where owner_user_id = (select auth.uid())
  )
);