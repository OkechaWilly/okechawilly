-- Extend database-side abuse protection to public enquiry inserts.
-- Normalize PostgREST's request path, whether it includes the /rest/v1 prefix or not.
create or replace function public.check_public_rpc_rate_limit()
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, pg_temp
as $function$
declare
  v_method text := current_setting('request.method', true);
  v_path text := regexp_replace(ltrim(coalesce(current_setting('request.path', true), ''), '/'), '^rest/v1/', '');
  v_headers jsonb;
  v_ip_text text;
  v_ip inet;
  v_limit integer;
  v_window_start timestamptz;
  v_count integer;
begin
  if v_method is distinct from 'POST' then return; end if;
  if v_path not in (
    'rpc/submit_public_order_idempotent',
    'rpc/get_order_shipping_quote',
    'rpc/respond_order_shipping_quote',
    'inquiries'
  ) then return; end if;

  v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip_text := nullif(trim(v_headers->>'cf-connecting-ip'), '');
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
    when 'inquiries' then 5
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

  if v_count = 1 then
    delete from private.api_rate_limits where window_start < now() - interval '1 day';
  end if;
end;
$function$;
