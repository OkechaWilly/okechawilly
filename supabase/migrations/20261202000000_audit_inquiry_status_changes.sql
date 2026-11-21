-- Restrict enquiry workflow writes and keep an immutable status history.
create table if not exists public.inquiry_status_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inquiry_status_events_status_check
    check (new_status in ('new','in_progress','replied','closed'))
);
create index if not exists inquiry_status_events_inquiry_created_idx
  on public.inquiry_status_events(inquiry_id,created_at desc);
create index if not exists inquiry_status_events_changed_by_idx
  on public.inquiry_status_events(changed_by);
alter table public.inquiry_status_events enable row level security;
revoke all on public.inquiry_status_events from public,anon,authenticated;
grant select on public.inquiry_status_events to authenticated;
drop policy if exists "Admins can view inquiry status events" on public.inquiry_status_events;
create policy "Admins can view inquiry status events"
  on public.inquiry_status_events for select to authenticated using (public.is_admin());

revoke update,delete,truncate,references,trigger on public.inquiries from authenticated;

create or replace function public.update_inquiry_status(p_inquiry_id uuid,p_new_status text)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare v_inquiry public.inquiries%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_new_status is null or p_new_status not in ('new','in_progress','replied','closed') then
    raise exception 'INQUIRY_INVALID_STATUS';
  end if;
  select * into v_inquiry from public.inquiries where id=p_inquiry_id for update;
  if not found then raise exception 'INQUIRY_NOT_FOUND'; end if;
  if v_inquiry.status=p_new_status then
    return jsonb_build_object('id',v_inquiry.id,'status',v_inquiry.status,'reused',true);
  end if;
  update public.inquiries set status=p_new_status where id=v_inquiry.id;
  insert into public.inquiry_status_events(inquiry_id,previous_status,new_status,changed_by)
  values(v_inquiry.id,v_inquiry.status,p_new_status,auth.uid());
  return jsonb_build_object('id',v_inquiry.id,'status',p_new_status,'reused',false);
end;
$function$;
revoke all on function public.update_inquiry_status(uuid,text) from public,anon;
grant execute on function public.update_inquiry_status(uuid,text) to authenticated;
