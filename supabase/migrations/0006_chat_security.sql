-- 0006_chat_security.sql
-- Anonymous participant-token isolation for lightweight chat.

alter table conversations
  add column if not exists buyer_token_hash text,
  add column if not exists supplier_token_hash text;

-- Legacy shared conversations have no participant credentials. Preserve their
-- data but prevent anonymous users from claiming and reading old messages.
update conversations
set buyer_token_hash = 'legacy-disabled',
    supplier_token_hash = 'legacy-disabled'
where buyer_token_hash is null
  and supplier_token_hash is null;

-- One requirement may have many independent conversations.
alter table conversations
  drop constraint if exists conversations_requirement_id_key;
drop index if exists conversations_requirement_id_key;
create index if not exists idx_conversations_requirement_id
  on conversations (requirement_id);

alter table messages
  alter column conversation_id set not null;

alter table messages
  drop constraint if exists messages_content_not_blank,
  drop constraint if exists messages_content_max_length;

alter table messages
  add constraint messages_content_not_blank
    check (length(btrim(content)) > 0),
  add constraint messages_content_max_length
    check (char_length(content) <= 5000);

create index if not exists idx_messages_conversation_created_at
  on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "Allow all on conversations" on conversations;
drop policy if exists "Allow all on messages" on messages;

revoke all on conversations from anon, authenticated;
revoke all on messages from anon, authenticated;

-- No anon/authenticated policies are created. Only the server-side
-- service_role client may read or write private chat data.
