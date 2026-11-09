-- Run once in the Supabase SQL editor before enabling sync.
create table if not exists public.daywise_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint daywise_payload_size check (octet_length(data::text) <= 6000)
);
alter table public.daywise_events enable row level security;
revoke all on public.daywise_events from anon;
grant select, insert, update, delete on public.daywise_events to authenticated;
create policy "daywise_select_own" on public.daywise_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "daywise_insert_own" on public.daywise_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daywise_update_own" on public.daywise_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daywise_delete_own" on public.daywise_events for delete to authenticated using ((select auth.uid()) = user_id);
