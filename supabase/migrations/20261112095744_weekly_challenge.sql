-- Same recovery-code boundary as ticket 22: only the Edge Function may read or submit results.
create table public.leap_weekly (
  week date not null check (extract(isodow from week) = 1),
  player_id uuid not null references public.leap_players(id) on delete cascade,
  score integer not null check (score between 1 and 10000),
  primary key (week, player_id)
);
alter table public.leap_weekly enable row level security;
revoke all on public.leap_weekly from public, anon, authenticated;
grant select, insert, update on public.leap_weekly to service_role;
create index leap_weekly_board on public.leap_weekly (week, score desc, player_id);
create index leap_weekly_player on public.leap_weekly (player_id, week desc);

-- A single statement preserves the best attempt even when two submissions arrive together.
create function public.leap_submit_weekly(p_player uuid, p_week date, p_score integer)
returns void language sql security invoker set search_path = '' as $$
  insert into public.leap_weekly (week, player_id, score) values (p_week, p_player, p_score)
  on conflict (week, player_id) do update
  set score = greatest(public.leap_weekly.score, excluded.score);
$$;
revoke all on function public.leap_submit_weekly(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.leap_submit_weekly(uuid, date, integer) to service_role;
