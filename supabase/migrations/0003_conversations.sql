-- 0003_conversations.sql
-- 轻量聊天：一个 requirement 对应一个 conversation，双方共用

create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  requirement_id text not null,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender text not null check (sender in ('buyer', 'supplier', 'system')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_conversations_requirement_id
  on conversations(requirement_id);

create index if not exists idx_messages_conversation_id
  on messages(conversation_id);

-- 权限：允许 anon 读写（暂不做账号体系）
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Allow all on conversations"
  on conversations for all
  using (true)
  with check (true);

create policy "Allow all on messages"
  on messages for all
  using (true)
  with check (true);
