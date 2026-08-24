create policy "Users can read transactions from their business"
on transactions
for select
to authenticated
using (
  business_id in (
    select id
    from businesses
    where owner_user_id = (select auth.uid())
  )
);

create policy "Users can read transaction items from their business"
on transaction_items
for select
to authenticated
using (
  transaction_id in (
    select t.id
    from transactions t
    join businesses b on b.id = t.business_id
    where b.owner_user_id = (select auth.uid())
  )
);