-- Public order intake must pass through the idempotent wrapper.
-- The wrapper runs as its owner and remains the only public order-intake RPC.
revoke execute on function public.submit_public_order(text,text,text,jsonb,text,text,jsonb)
  from public,anon,authenticated;
