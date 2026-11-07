-- Repair product collector-detail columns and refresh PostgREST's schema cache.
-- Safe to run even if the original product collector-details migration was applied.
alter table public.products
  add column if not exists medium text,
  add column if not exists materials text,
  add column if not exists dimensions text,
  add column if not exists framing text,
  add column if not exists shipping_information text;

notify pgrst, 'reload schema';
