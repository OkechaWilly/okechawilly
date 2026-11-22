-- Restrict Studio order writes to an audited fulfilment transition function.
-- Financial/payment fields and order line items remain server-controlled.

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_number text not null,
  previous_status text not null,
  new_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint order_status_events_status_check
    check (new_status in ('pending','confirmed','processing','shipped','completed','cancelled'))
);

create index if not exists order_status_events_order_created_idx
  on public.order_status_events(order_id, created_at desc);

alter table public.order_status_events enable row level security;
revoke all on public.order_status_events from public, anon, authenticated;
grant select on public.order_status_events to authenticated;

drop policy if exists "Admins can view order status events" on public.order_status_events;
create policy "Admins can view order status events"
  on public.order_status_events for select to authenticated
  using (public.is_admin());

-- Admins can read order records, but browser sessions cannot write orders or lines.
revoke insert, update, delete, truncate, references, trigger
  on public.orders, public.order_items from authenticated;
grant select on public.orders, public.order_items to authenticated;

create or replace function public.update_order_fulfilment_status(
  p_order_id uuid,
  p_new_status text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_order public.orders%rowtype;
  v_allowed boolean := false;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_new_status is null or p_new_status not in (
    'pending','confirmed','processing','shipped','completed','cancelled'
  ) then
    raise exception 'ORDER_INVALID_FULFILMENT_STATUS';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status = p_new_status then
    return jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'reused', true
    );
  end if;

  v_allowed := case v_order.status
    when 'pending' then p_new_status in ('confirmed','cancelled')
    when 'confirmed' then p_new_status in ('processing','cancelled')
    when 'processing' then p_new_status in ('shipped','cancelled')
    when 'shipped' then p_new_status = 'completed'
    else false
  end;

  if not v_allowed then
    raise exception 'ORDER_INVALID_STATUS_TRANSITION';
  end if;

  update public.orders
  set status = p_new_status
  where id = v_order.id;

  insert into public.order_status_events(
    order_id, order_number, previous_status, new_status, changed_by
  ) values (
    v_order.id, v_order.order_number, v_order.status, p_new_status, auth.uid()
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', p_new_status,
    'reused', false
  );
end;
$function$;

revoke all on function public.update_order_fulfilment_status(uuid,text) from public, anon;
grant execute on function public.update_order_fulfilment_status(uuid,text) to authenticated;
