-- Cover the actor foreign key on the order fulfilment audit table.
create index if not exists order_status_events_changed_by_idx
  on public.order_status_events(changed_by);