-- Migration: 20250612182800_initial_schema.sql
-- Description: Initial schema setup for AI Agent project
-- Author: System
-- Date: 2025-06-12

-- enable pgvector extension for vector embeddings
create extension if not exists vector;

-- create custom types (enums)
create type message_role as enum ('user', 'assistant');
create type agent_type as enum ('SQL', 'Scraper', 'Graph', 'Vector');
create type log_status as enum ('started', 'completed', 'failed');

-- profiles table - extends auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table profiles enable row level security;

-- create rls policies for profiles
comment on table profiles is 'Public profiles for users';
create policy "Users can view any profile" 
  on profiles 
  for select 
  to authenticated, anon
  using (true);

create policy "Users can update their own profile" 
  on profiles 
  for update 
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- conversations table
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table conversations enable row level security;

-- create rls policies for conversations
comment on table conversations is 'User conversation sessions';
create policy "Users can view their own conversations" 
  on conversations 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own conversations" 
  on conversations 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations" 
  on conversations 
  for update 
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own conversations" 
  on conversations 
  for delete 
  to authenticated
  using (auth.uid() = user_id);

-- messages table
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- enable row level security
alter table messages enable row level security;

-- create rls policies for messages
comment on table messages is 'Individual messages within conversations';
create policy "Users can view their own messages" 
  on messages 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own messages" 
  on messages 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own messages" 
  on messages 
  for update 
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own messages" 
  on messages 
  for delete 
  to authenticated
  using (auth.uid() = user_id);

-- memories table
create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text,
  source text,
  tags text[],
  importance smallint default 1 check (importance >= 1 and importance <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table memories enable row level security;

-- create rls policies for memories
comment on table memories is 'User knowledge base entries';
create policy "Users can view their own memories" 
  on memories 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own memories" 
  on memories 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own memories" 
  on memories 
  for update 
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own memories" 
  on memories 
  for delete 
  to authenticated
  using (auth.uid() = user_id);

-- memory_chunks table
create table memory_chunks (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- enable row level security
alter table memory_chunks enable row level security;

-- create rls policies for memory_chunks
comment on table memory_chunks is 'Vector embeddings for memory content chunks';
create policy "Users can view their own memory chunks" 
  on memory_chunks 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own memory chunks" 
  on memory_chunks 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own memory chunks" 
  on memory_chunks 
  for update 
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own memory chunks" 
  on memory_chunks 
  for delete 
  to authenticated
  using (auth.uid() = user_id);

-- categories table
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- enable row level security
alter table categories enable row level security;

-- create rls policies for categories
comment on table categories is 'User-defined categories for organizing memories';
create policy "Users can view their own categories" 
  on categories 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own categories" 
  on categories 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own categories" 
  on categories 
  for update 
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own categories" 
  on categories 
  for delete 
  to authenticated
  using (auth.uid() = user_id);

-- memory_categories junction table
create table memory_categories (
  memory_id uuid references memories on delete cascade,
  category_id uuid references categories on delete cascade,
  primary key (memory_id, category_id)
);

-- enable row level security
alter table memory_categories enable row level security;

-- create rls policies for memory_categories
comment on table memory_categories is 'Junction table for many-to-many relationship between memories and categories';
create policy "Users can view links for their own memories" 
  on memory_categories 
  for select 
  to authenticated
  using ((select auth.uid()) = (select user_id from memories where id = memory_id));

create policy "Users can create links for their own memories" 
  on memory_categories 
  for insert 
  to authenticated
  with check ((select auth.uid()) = (select user_id from memories where id = memory_id));

create policy "Users can delete links for their own memories" 
  on memory_categories 
  for delete 
  to authenticated
  using ((select auth.uid()) = (select user_id from memories where id = memory_id));

-- agent_logs table
create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  agent_type agent_type not null,
  input_data jsonb,
  output_data jsonb,
  status log_status not null,
  error_message text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- enable row level security
alter table agent_logs enable row level security;

-- create rls policies for agent_logs
comment on table agent_logs is 'Logs of interactions with various AI agents';
create policy "Users can view their own agent logs" 
  on agent_logs 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own agent logs" 
  on agent_logs 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own agent logs" 
  on agent_logs 
  for update 
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- search_history table
create table search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

-- enable row level security
alter table search_history enable row level security;

-- create rls policies for search_history
comment on table search_history is 'History of user search queries';
create policy "Users can view their own search history" 
  on search_history 
  for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own search history" 
  on search_history 
  for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own search history" 
  on search_history 
  for delete 
  to authenticated
  using (auth.uid() = user_id);

-- create indexes for performance optimization
create index on conversations (user_id);
create index on messages (conversation_id);
create index on messages (user_id);
create index on memories (user_id);
create index on memory_chunks (memory_id);
create index on memory_chunks (user_id);
create index on categories (user_id);
create index on agent_logs (user_id);
create index on agent_logs (agent_type, status);
create index on search_history (user_id);

-- create vector index for efficient similarity search
create index on memory_chunks using hnsw (embedding vector_l2_ops);

-- create trigger functions for updated_at timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- create triggers for tables with updated_at column
create trigger update_profiles_updated_at
before update on profiles
for each row execute function update_updated_at();

create trigger update_conversations_updated_at
before update on conversations
for each row execute function update_updated_at();

create trigger update_memories_updated_at
before update on memories
for each row execute function update_updated_at();

-- add comments on tables for documentation
comment on table profiles is 'Extended user profiles linked to auth.users';
comment on table conversations is 'User conversation sessions';
comment on table messages is 'Individual messages within conversations';
comment on table memories is 'User knowledge base entries';
comment on table memory_chunks is 'Vector embeddings for memory content chunks';
comment on table categories is 'User-defined categories for organizing memories';
comment on table memory_categories is 'Junction table for many-to-many relationship between memories and categories';
comment on table agent_logs is 'Logs of interactions with various AI agents';
comment on table search_history is 'History of user search queries'; 