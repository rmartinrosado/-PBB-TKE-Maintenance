-- PBB TKE Maintenance · biblioteca documental privada
create extension if not exists pgcrypto;
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 file_name text not null,
 storage_path text not null unique,
 mime_type text,
 file_size bigint,
 pbb_scope text not null default 'GENERAL',
 document_type text not null default 'Esquema RCS',
 revision text,
 notes text,
 extracted_chars integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.document_chunks (
 id bigint generated always as identity primary key,
 document_id uuid not null references public.documents(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 chunk_index integer not null,
 page_label text,
 content text not null,
 created_at timestamptz not null default now(),
 unique(document_id, chunk_index)
);
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
create policy "documents_select_own" on public.documents for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents for delete using (auth.uid() = user_id);
create policy "chunks_select_own" on public.document_chunks for select using (auth.uid() = user_id);
create policy "chunks_insert_own" on public.document_chunks for insert with check (auth.uid() = user_id);
create policy "chunks_delete_own" on public.document_chunks for delete using (auth.uid() = user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('pbb-private-docs','pbb-private-docs',false,52428800,
 array['application/pdf','text/plain','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'])
on conflict (id) do update set public=false, file_size_limit=52428800;
create policy "pbb_storage_read_own" on storage.objects for select to authenticated using (bucket_id='pbb-private-docs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "pbb_storage_insert_own" on storage.objects for insert to authenticated with check (bucket_id='pbb-private-docs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "pbb_storage_delete_own" on storage.objects for delete to authenticated using (bucket_id='pbb-private-docs' and (storage.foldername(name))[1]=auth.uid()::text);
