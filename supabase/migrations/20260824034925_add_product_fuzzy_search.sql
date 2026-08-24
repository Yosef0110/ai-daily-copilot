-- Enable trigram similarity/search support.
create extension if not exists pg_trgm;

-- Product fuzzy-search indexes.
create index if not exists idx_products_name_trgm
on products
using gin (name gin_trgm_ops);

create index if not exists idx_products_sku_trgm
on products
using gin (sku gin_trgm_ops);

create index if not exists idx_product_aliases_name_trgm
on product_aliases
using gin (alias_name gin_trgm_ops);

-- Fuzzy product search RPC.
create or replace function search_products(
  search_query text
)
returns table (
  id uuid,
  name varchar,
  sku varchar,
  matched_value text,
  match_source text,
  score real
)
language sql
security invoker
as $$
  with product_matches as (
    select
      p.id,
      p.name,
      p.sku,
      p.name::text as matched_value,
      'name'::text as match_source,
      similarity(p.name, search_query) as score
    from products p
    where p.name % search_query

    union all

    select
      p.id,
      p.name,
      p.sku,
      p.sku::text as matched_value,
      'sku'::text as match_source,
      similarity(p.sku, search_query) as score
    from products p
    where p.sku % search_query

    union all

    select
      p.id,
      p.name,
      p.sku,
      pa.alias_name::text as matched_value,
      'alias'::text as match_source,
      similarity(pa.alias_name, search_query) as score
    from product_aliases pa
    join products p
      on p.id = pa.product_id
    where pa.alias_name % search_query
  ),

  ranked_matches as (
    select
      *,
      row_number() over (
        partition by id
        order by score desc
      ) as row_rank
    from product_matches
  )

  select
    id,
    name,
    sku,
    matched_value,
    match_source,
    score
  from ranked_matches
  where row_rank = 1
  order by score desc;
$$;