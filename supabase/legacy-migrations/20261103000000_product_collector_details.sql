-- Add optional collector-facing specifications to shop products.
alter table public.products
  add column if not exists medium text,
  add column if not exists materials text,
  add column if not exists dimensions text,
  add column if not exists framing text,
  add column if not exists shipping_information text;
