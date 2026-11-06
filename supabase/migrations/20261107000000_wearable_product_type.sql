-- Adds "wearable" (t-shirts, clothing) as a product type so the shop can offer
-- a Wearables category once such products exist. Safe to run more than once.

do $$
declare existing record;
begin
  -- Remove the check constraint that lists the allowed product types,
  -- whatever it happens to be named. Other rules on the table are left alone.
  for existing in
    select conname
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%product_type%'
      and pg_get_constraintdef(oid) ilike '%art_object%' -- the rule that lists the allowed types
  loop
    execute format('alter table public.products drop constraint %I', existing.conname);
  end loop;
end $$;

alter table public.products
  add constraint products_product_type_check
  check (product_type in ('original', 'limited_print', 'open_print', 'wearable', 'merchandise', 'art_object'));
