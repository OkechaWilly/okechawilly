-- Contact submissions now pass through /api/contact on Vercel, where
-- the edge firewall applies per-visitor IP limits. The route persists with
-- the service role. Remove the anonymous Data API insert path so it cannot
-- bypass that edge control.
revoke insert on table public.inquiries from anon;
grant insert on table public.inquiries to service_role;

-- Trusted server-side writes are already edge-throttled. Do not identify all
-- Vercel visitors as one shared database client IP. Keep the database limiter
-- for any authenticated direct insert path that remains.
create or replace function private.check_public_rpc_rate_limit()
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, pg_temp
as $function$
declare
  v_method text := current_setting('request.method', true);
  v_path text := regexp_replace(
    ltrim(split_part(coalesce(current_setting('request.path', true), ''), '?', 1), '/'),
    '^rest/v1/', ''
  );
  v_role text := coalesce(auth.jwt()->>'role', '');
  v_headers jsonb;
  v_ip_text text;
  v_ip inet;
  v_window_start timestamptz;
  v_count integer;
begin
  if v_method is distinct from 'POST' or v_path <> 'inquiries' then
    return;
  end if;

  -- The trusted /api/contact route uses service_role and is protected by
  -- Vercel's IP-based firewall. Its egress IP is shared by all visitors.
  if v_role = 'service_role' then
    return;
  end if;

  v_headers := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
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

  v_window_start := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  insert into private.api_rate_limits(client_ip, route, window_start, request_count)
  values (v_ip, 'inquiries', v_window_start, 1)
  on conflict (client_ip, route, window_start)
  do update set request_count = private.api_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count > 5 then
    raise sqlstate 'PGRST'
      using message = json_build_object('message', 'Too many requests. Please wait before trying again.')::text,
            detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;

  if v_count = 1 then
    delete from private.api_rate_limits
    where window_start < now() - interval '1 day';
  end if;
end;
$function$;
revoke all on function private.check_public_rpc_rate_limit() from public;
grant execute on function private.check_public_rpc_rate_limit()
  to anon, authenticated, service_role, authenticator;
notify pgrst, 'reload config';