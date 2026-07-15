-- Chat messages for game group chats
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0 and char_length(content) <= 1000),
  created_at timestamptz default now()
);

create index idx_messages_game on public.messages(game_id, created_at);
create index idx_messages_user on public.messages(user_id);

-- RLS
alter table public.messages enable row level security;

-- Only game participants can read messages
create policy "Game participants can read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.game_participants
      where game_participants.game_id = messages.game_id
      and game_participants.user_id = auth.uid()
    )
  );

-- Only game participants can send messages
create policy "Game participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.game_participants
      where game_participants.game_id = messages.game_id
      and game_participants.user_id = auth.uid()
    )
  );

-- Users can delete their own messages
create policy "Users can delete own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
