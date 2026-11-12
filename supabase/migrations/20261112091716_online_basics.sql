-- Only the Edge Function's service role can access accounts and saved Companies.
create table public.leap_players (
  id uuid primary key default gen_random_uuid(),
  recovery_hash text not null unique check (length(recovery_hash) = 64),
  nickname text not null check (char_length(nickname) between 2 and 24),
  save jsonb,
  revision integer not null default 0,
  updated_at timestamptz,
  value numeric not null default 0 check (value between 0 and 1e15),
  missions integer not null default 0 check (missions >= 0),
  reputation integer not null default 0 check (reputation >= 0),
  research integer not null default 0 check (research >= 0)
);
alter table public.leap_players enable row level security;
revoke all on public.leap_players from anon, authenticated;
grant all on public.leap_players to service_role;

-- The Edge Function returns just nickname + scores, ordered by one allowlisted metric.
create index leap_players_value on public.leap_players (value desc, id) where save is not null;
create index leap_players_missions on public.leap_players (missions desc, id) where save is not null;
create index leap_players_reputation on public.leap_players (reputation desc, id) where save is not null;
create index leap_players_research on public.leap_players (research desc, id) where save is not null;
