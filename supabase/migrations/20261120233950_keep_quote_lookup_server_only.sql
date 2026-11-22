-- Quote lookup is performed by the server-rendered quote page only.
-- Keep the bearer token out of the public Data API function surface.
revoke all on function public.get_order_shipping_quote(text)
  from public, anon, authenticated;
grant execute on function public.get_order_shipping_quote(text)
  to service_role;