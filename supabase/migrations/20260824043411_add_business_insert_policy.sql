create policy "Users can create their own business"
on businesses
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
);