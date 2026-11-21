-- Make order intake resilient to browser retries and repeated network submissions.
-- The client generates one UUID per checkout attempt and reuses it on retry.
create table if not exists public.order_submission_requests (
  request_id uuid primary key,
  order_number text not null,
  created_at timestamptz not null default now()
);
alter table public.order_submission_requests enable row level security;
revoke all on public.order_submission_requests from public,anon,authenticated;

create or replace function public.submit_public_order_idempotent(
  p_request_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_customer_note text,
  p_currency text,
  p_items jsonb
) returns table(order_number text, created boolean)
language plpgsql
security definer
set search_path=pg_catalog,public,extensions,pg_temp
as $$
declare
  v_order_number text;
begin
  if p_request_id is null then raise exception 'ORDER_REQUEST_ID_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));

  select r.order_number into v_order_number
  from public.order_submission_requests r
  where r.request_id=p_request_id;

  if found then
    return query select v_order_number,false;
    return;
  end if;

  select o.order_number into v_order_number
  from public.submit_public_order(
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_address,
    p_customer_note,
    p_currency,
    p_items
  ) o;

  if v_order_number is null then raise exception 'ORDER_SUBMISSION_FAILED'; end if;

  insert into public.order_submission_requests(request_id,order_number)
  values(p_request_id,v_order_number);

  return query select v_order_number,true;
end;
$$;

revoke all on function public.submit_public_order_idempotent(uuid,text,text,text,jsonb,text,text,jsonb) from public;
grant execute on function public.submit_public_order_idempotent(uuid,text,text,text,jsonb,text,text,jsonb) to anon,authenticated;
