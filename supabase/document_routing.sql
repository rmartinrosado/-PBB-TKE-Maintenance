-- TKE PBB Maintenance · clasificación y búsqueda documental por biblioteca
-- Ejecutar en Supabase SQL Editor después de document_library.sql.
-- No cambia los documentos existentes ni elimina datos.

alter table public.documents
  add column if not exists pbb_scope text not null default 'GENERAL';

create index if not exists documents_user_scope_created_idx
  on public.documents(user_id, pbb_scope, created_at desc);

create index if not exists document_chunks_user_document_idx
  on public.document_chunks(user_id, document_id, chunk_index);

comment on column public.documents.pbb_scope is
'COMMON: biblioteca común estándar. A380_SPECIAL: exclusiva PBB-504/507/508. También admite número de PBB para documentación específica. GENERAL se interpreta como COMMON por compatibilidad.';

notify pgrst, 'reload schema';
