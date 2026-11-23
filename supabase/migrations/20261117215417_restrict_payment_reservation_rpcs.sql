-- Keep payment reservation controls behind the trusted server.
-- The customer-facing quote token is a bearer credential for viewing/responding
-- to a quote; it must not also grant direct control over payment reservations.
revoke all on function public.prepare_flutterwave_payment(text,text) from public, anon, authenticated;
revoke all on function public.reset_flutterwave_payment(text) from public, anon, authenticated;
grant execute on function public.prepare_flutterwave_payment(text,text) to service_role;
grant execute on function public.reset_flutterwave_payment(text) to service_role;

-- Payment completion remains server-only.
revoke all on function public.complete_flutterwave_payment(text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.complete_flutterwave_payment(text,text,numeric,text) to service_role;
