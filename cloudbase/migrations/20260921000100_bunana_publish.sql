-- Bunana publishing main chain on CloudBase PostgreSQL + PG Storage.
-- Conversations and messages intentionally remain outside this migration.

create table if not exists public.image_assets (
  id uuid primary key default gen_random_uuid(),
  sha256 text not null unique,
  storage_path text not null,
  public_url text not null,
  original_name text not null,
  mime_type text not null,
  size bigint not null default 0 check (size >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null default '其他面料',
  fabric_name text not null default '',
  specs text not null default '',
  post_type text not null default 'seeking'
    check (post_type in ('seeking', 'offering')),
  keywords jsonb not null default '[]'::jsonb,
  summary text not null default '',
  confidence real not null default 0 check (confidence >= 0 and confidence <= 1),
  image_ids jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  ai_provider text not null default 'demo',
  fabric_dna jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_requirements_created_at
  on public.requirements (created_at desc);
create index if not exists idx_requirements_category
  on public.requirements (category);
create index if not exists idx_requirements_post_type
  on public.requirements (post_type);

comment on column public.requirements.fabric_dna is
  'Complete 14-field Fabric DNA with value, status, confidence, and source metadata';
comment on column public.requirements.post_type is
  'Fabric request type: seeking or offering';

alter table public.image_assets enable row level security;
alter table public.requirements enable row level security;

revoke all on table public.image_assets from anon, authenticated;
revoke all on table public.requirements from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert on table public.image_assets to service_role;
grant select, insert on table public.requirements to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'fabric-samples',
  'fabric-samples',
  true,
  10 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy fabric_samples_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'fabric-samples');
