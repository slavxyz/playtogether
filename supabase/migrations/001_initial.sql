-- Sportify MVP schema

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  age integer check (age > 0 and age < 150),
  city text,
  preferred_times text,
  bio text,
  games_played integer default 0,
  rating numeric(3,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Games table
create table public.games (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  sport text not null check (sport in (
    'football','basketball','volleyball','tennis','table_tennis',
    'padel','squash','chess','board_games','esports',
    'paintball','martial_arts','running','other'
  )),
  title text not null,
  location text not null,
  city text,
  date_time timestamptz not null,
  max_players integer not null check (max_players > 0),
  current_players integer default 0,
  skill_level text check (skill_level in ('beginner','semi-intermediate','intermediate','semi-advanced','advanced')),
  price numeric(10,2) default 0,
  description text,
  status text default 'open' check (status in ('open','full','cancelled','completed')),
  created_at timestamptz default now()
);

-- Game participants junction table
create table public.game_participants (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(game_id, user_id)
);

-- Per-sport profile details (player level & position)
create table public.profile_sports (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  sport text not null check (sport in (
    'football','basketball','volleyball','tennis','table_tennis',
    'padel','squash','chess','board_games','esports',
    'paintball','martial_arts','running','other'
  )),
  player_level text not null default 'beginner' check (player_level in (
    'beginner','novice','intermediate','advanced','semi-pro','professional'
  )),
  player_position text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_id, sport)
);

-- Players blocked from rejoining a specific game
create table public.game_blocked_players (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  blocked_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(game_id, user_id)
);

-- Indexes
create index idx_games_sport on public.games(sport);
create index idx_games_date_time on public.games(date_time);
create index idx_games_status on public.games(status);
create index idx_games_city on public.games(city);
create index idx_game_participants_game on public.game_participants(game_id);
create index idx_game_participants_user on public.game_participants(user_id);
create index idx_profile_sports_profile on public.profile_sports(profile_id);
create index idx_game_blocked_players_game on public.game_blocked_players(game_id);

-- ============================================================
-- Triggers
-- ============================================================

-- 1. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Auto-add creator as participant when game is created
create or replace function public.handle_new_game()
returns trigger as $$
begin
  insert into public.game_participants (game_id, user_id)
  values (new.id, new.creator_id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_game_created
  after insert on public.games
  for each row execute function public.handle_new_game();

-- 3. Auto-update current_players count
create or replace function public.update_player_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.games
    set current_players = current_players + 1,
        status = case
          when current_players + 1 >= max_players then 'full'
          else status
        end
    where id = new.game_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.games
    set current_players = current_players - 1,
        status = case
          when status = 'full' then 'open'
          else status
        end
    where id = old.game_id;
    return old;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_participant_change
  after insert or delete on public.game_participants
  for each row execute function public.update_player_count();

-- 4. Auto-update updated_at on profiles / profile_sports
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_update
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger on_profile_sport_update
  before update on public.profile_sports
  for each row execute function public.update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_participants enable row level security;
alter table public.profile_sports enable row level security;
alter table public.game_blocked_players enable row level security;

-- Profiles: anyone authenticated can read, users can update own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Games: authenticated can read, authenticated can insert, creator can update/delete
create policy "Games are viewable by authenticated users"
  on public.games for select
  to authenticated
  using (true);

create policy "Authenticated users can create games"
  on public.games for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Creators can update own games"
  on public.games for update
  to authenticated
  using (auth.uid() = creator_id);

create policy "Creators can delete own games"
  on public.games for delete
  to authenticated
  using (auth.uid() = creator_id);

-- Game participants: authenticated can read, users can join/leave
create policy "Participants are viewable by authenticated users"
  on public.game_participants for select
  to authenticated
  using (true);

create policy "Users can join games"
  on public.game_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.game_blocked_players
      where game_blocked_players.game_id = game_participants.game_id
      and game_blocked_players.user_id = auth.uid()
    )
  );

create policy "Users can leave games"
  on public.game_participants for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Creators can remove participants"
  on public.game_participants for delete
  to authenticated
  using (
    exists (
      select 1 from public.games
      where games.id = game_participants.game_id
      and games.creator_id = auth.uid()
    )
  );

-- Profile sports: authenticated can read, users manage own
create policy "Profile sports are viewable by authenticated users"
  on public.profile_sports for select
  to authenticated
  using (true);

create policy "Users can add own sports"
  on public.profile_sports for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "Users can update own sports"
  on public.profile_sports for update
  to authenticated
  using (auth.uid() = profile_id);

create policy "Users can delete own sports"
  on public.profile_sports for delete
  to authenticated
  using (auth.uid() = profile_id);

-- Game blocked players: creators manage their game's block list,
-- any user can check their own block status
create policy "Creators can view blocked players"
  on public.game_blocked_players for select
  to authenticated
  using (
    exists (
      select 1 from public.games
      where games.id = game_blocked_players.game_id
      and games.creator_id = auth.uid()
    )
  );

create policy "Users can check own block status"
  on public.game_blocked_players for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Creators can block players"
  on public.game_blocked_players for insert
  to authenticated
  with check (
    exists (
      select 1 from public.games
      where games.id = game_blocked_players.game_id
      and games.creator_id = auth.uid()
    )
  );

create policy "Creators can unblock players"
  on public.game_blocked_players for delete
  to authenticated
  using (
    exists (
      select 1 from public.games
      where games.id = game_blocked_players.game_id
      and games.creator_id = auth.uid()
    )
  );

  -- Let a user permanently delete their own account.
--
-- The anon/authenticated client can't call the auth admin API to delete a
-- user, so this exposes a security-definer RPC that deletes the caller's
-- row in auth.users directly. profiles.id -> auth.users has "on delete
-- cascade", and games, game_participants, profile_sports and messages all
-- cascade from profiles/games, so this removes all of the user's data.
create or replace function public.delete_own_account()
returns void as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
