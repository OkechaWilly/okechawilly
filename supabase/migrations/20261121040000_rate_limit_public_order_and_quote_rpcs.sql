-- Add database-level rate limits for anonymous order and quote RPCs.
-- This protects direct Supabase Data API calls that bypass the Vercel firewall.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres;

create table if not exists private.api_rate_limits (
  client_ip inet not null,
  route text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (client_ip, route, window_start)
);

alter table private.api_rate_limits enable row level security;
revoke all on private.api_rate_limits from public, anon, authenticated, service_role;

create or replace function public.check_public_rpc_rate_limit()
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, pg_temp
as $function$
declare
  v_method text := current_setting('request.method', true);
  v_path text := current_setting('request.path', true);
  v_headers jsonb;
  v_ip_text text;
  v_ip inet;
  v_limit integer;
  v_window_start timestamptz;
  v_count integer;
begin
  if v_method is distinct from 'POST' then
    return;
  end if;

  if v_path not in (
    'rpc/submit_public_order_idempotent',
    'rpc/get_order_shipping_quote',
    'rpc/respond_order_shipping_quote'
  ) then
    return;
  end if;

  v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip_text := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');

  if v_ip_text is null then
    raise sqlstate 'PGRST'
      using message = json_build_object('message', 'Request could not be rate limited safely')::text,
            detail = json_build_object('status', 503, 'status_text', 'Service Unavailable')::text;
  end if;

  begin
    v_ip := v_ip_text::inet;
  exception when invalid_text_representation then
    raise sqlstate 'PGRST'
      using message = json_build_object('message', 'Request source could not be verified')::text,
            detail = json_build_object('status', 400, 'status_text', 'Bad Request')::text;
  end;

  v_limit := case v_path
    when 'rpc/submit_public_order_idempotent' then 10
    when 'rpc/get_order_shipping_quote' then 30
    when 'rpc/respond_order_shipping_quote' then 10
  end;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / 600) * 600);

  insert into private.api_rate_limits(client_ip, route, window_start, request_count)
  values (v_ip, v_path, v_window_start, 1)
  on conflict (client_ip, route, window_start)
  do update set request_count = private.api_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count > v_limit then
    raise sqlstate 'PGRST'
      using message = json_build_object('message', 'Too many requests. Please wait before trying again.')::text,
            detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;

  -- Keep cleanup off the hot path except for the first request in a window.
  if v_count = 1 then
    delete from private.api_rate_limits
    where window_start < now() - interval '1 day';
  end if;
end;
$function$;

revoke all on function public.check_public_rpc_rate_limit() from public, anon, authenticated;
grant execute on function public.check_public_rpc_rate_limit() to authenticator;

alter role authenticator set pgrst.db_pre_request = 'public.check_public_rpc_rate_limit';
notify pgrst, 'reload config';
