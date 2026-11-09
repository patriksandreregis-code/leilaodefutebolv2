-- Resenha do Fut: perfis, resultados verificados e XP
-- Execute no SQL Editor do projeto Supabase antes de publicar as variáveis no Render.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null check (game_key in ('leilao','dado','resenha_ball')),
  result_code text not null check (result_code in ('win','draw','loss','completed')),
  external_event_id text not null unique,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.xp_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null check (game_key in ('leilao','dado','resenha_ball')),
  event_key text not null,
  description text not null default '',
  xp_delta integer not null check (xp_delta > 0),
  source_event_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.game_results enable row level security;
alter table public.xp_history enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.game_results from anon, authenticated;
revoke all on public.xp_history from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name, username) on public.profiles to authenticated;
grant select on public.game_results to anon, authenticated;
grant select on public.xp_history to anon, authenticated;
grant usage, select on sequence public.game_results_id_seq to service_role;
grant usage, select on sequence public.xp_history_id_seq to service_role;
grant insert on public.game_results, public.xp_history to service_role;

create policy "Perfis públicos podem ser consultados"
on public.profiles for select to anon, authenticated using (true);
create policy "Jogador atualiza apenas o próprio perfil"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
create policy "Resultados verificados são públicos"
on public.game_results for select to anon, authenticated using (true);
create policy "Histórico de XP é público para consulta"
on public.xp_history for select to anon, authenticated using (true);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_resenha_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  chosen_name text;
  chosen_username text;
begin
  chosen_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Jogador');
  chosen_username := lower(regexp_replace(chosen_name, '[^a-zA-Z0-9_]', '', 'g'));
  if length(chosen_username) < 3 then
    chosen_username := 'jogador' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, chosen_username || '_' || substr(replace(new.id::text, '-', ''), 1, 4), chosen_name);
  return new;
end;
$$;
revoke all on function private.handle_new_resenha_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_resenha on auth.users;
create trigger on_auth_user_created_resenha
after insert on auth.users
for each row execute function private.handle_new_resenha_user();

create or replace view public.player_rankings with (security_invoker = true) as
with xp as (
  select user_id, sum(xp_delta)::bigint as total_xp from public.xp_history group by user_id
), results as (
  select user_id, count(*)::integer as matches,
    count(*) filter (where result_code = 'win')::integer as wins
  from public.game_results group by user_id
)
select p.id as user_id, p.username, p.display_name,
  coalesce(x.total_xp,0)::bigint as total_xp,
  (1 + floor(coalesce(x.total_xp,0) / 500.0))::integer as level,
  coalesce(r.matches,0)::integer as matches, coalesce(r.wins,0)::integer as wins,
  row_number() over (order by coalesce(x.total_xp,0) desc, p.created_at asc)::integer as position
from public.profiles p
left join xp x on x.user_id=p.id
left join results r on r.user_id=p.id;

create or replace view public.player_game_rankings with (security_invoker = true) as
with xp as (
  select user_id, game_key, sum(xp_delta)::bigint as total_xp
  from public.xp_history group by user_id, game_key
), results as (
  select user_id, game_key, count(*)::integer as matches,
    count(*) filter (where result_code = 'win')::integer as wins
  from public.game_results group by user_id, game_key
), players as (
  select user_id, game_key from xp union select user_id, game_key from results
)
select p.id as user_id, p.username, p.display_name, g.game_key,
  coalesce(x.total_xp,0)::bigint as total_xp,
  (1 + floor(coalesce(x.total_xp,0) / 500.0))::integer as level,
  coalesce(r.matches,0)::integer as matches, coalesce(r.wins,0)::integer as wins,
  row_number() over (partition by g.game_key order by coalesce(x.total_xp,0) desc, p.created_at asc)::integer as position
from players g join public.profiles p on p.id=g.user_id
left join xp x on x.user_id=g.user_id and x.game_key=g.game_key
left join results r on r.user_id=g.user_id and r.game_key=g.game_key;

grant select on public.player_rankings, public.player_game_rankings to anon, authenticated;
