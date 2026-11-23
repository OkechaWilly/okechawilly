-- Replace deprecated auth.role() with the signed JWT role claim in the
-- service-only payment completion guard. Keep the function body otherwise intact.
do $migration$
declare
  v_definition text;
  v_old text := 'coalesce(auth.role(),'''')';
  v_new text := 'coalesce(auth.jwt()->>''role'','''')';
begin
  select pg_get_functiondef(
    'public.complete_flutterwave_payment(text,text,numeric,text)'::regprocedure
  ) into v_definition;

  if position(v_old in v_definition) = 0 then
    raise exception 'Expected legacy payment role check was not found';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end
$migration$;