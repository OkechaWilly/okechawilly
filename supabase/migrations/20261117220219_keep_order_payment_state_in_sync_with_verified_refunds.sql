-- A case marked "refunded" means the refund has already been completed
-- and verified in the payment provider. Reflect that state even if the
-- original order had previously reached "paid".
create or replace function public.resolve_payment_reconciliation_case(
  p_case_id uuid,
  p_outcome text,
  p_admin_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_case public.payment_reconciliation_cases%rowtype;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_outcome is null or p_outcome not in ('refund_initiated','refunded') then
    raise exception 'RECONCILIATION_INVALID_OUTCOME';
  end if;
  if length(trim(coalesce(p_admin_note,''))) < 8 then
    raise exception 'RECONCILIATION_NOTE_REQUIRED';
  end if;

  select * into v_case from public.payment_reconciliation_cases
  where id=p_case_id for update;
  if not found then raise exception 'RECONCILIATION_CASE_NOT_FOUND'; end if;
  if v_case.status=p_outcome then
    return jsonb_build_object('case_id',v_case.id,'order_number',v_case.order_number,'status',v_case.status);
  end if;
  if (p_outcome='refund_initiated' and v_case.status<>'pending_review')
     or (p_outcome='refunded' and v_case.status not in ('pending_review','refund_initiated')) then
    raise exception 'RECONCILIATION_CASE_ALREADY_RESOLVED';
  end if;

  -- "refunded" is an operator attestation that the provider-side refund
  -- has completed; the order state must mirror that verified outcome.
  if p_outcome='refunded' then
    update public.orders set payment_status='refunded'
    where id=v_case.order_id;
    if not found then raise exception 'RECONCILIATION_ORDER_NOT_FOUND'; end if;
  end if;

  update public.payment_reconciliation_cases
  set status=p_outcome,
      admin_note=left(trim(p_admin_note),1000),
      updated_at=now(),
      resolved_at=case when p_outcome='refunded' then now() else null end
  where id=p_case_id
  returning * into v_case;

  return jsonb_build_object('case_id',v_case.id,'order_number',v_case.order_number,'status',v_case.status);
end;
$$;
revoke all on function public.resolve_payment_reconciliation_case(uuid,text,text) from public,anon;
grant execute on function public.resolve_payment_reconciliation_case(uuid,text,text) to authenticated;
