-- Enable the vector extension (Supabase has this pre-installed, just needs activation)
create extension if not exists vector;

-- ============================================================
-- TABLE 1: documents (one row per uploaded file)
-- ============================================================
create table documents (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  file_type     text not null check (file_type in ('pdf', 'docx')),
  file_size     bigint not null,
  title         text,
  document_type text,
  parties       text[],
  jurisdiction  text,
  case_number   text,
  date_filed    date,
  author        text,
  dollar_amounts text[],
  contract_form text,
  witnesses     text[],
  page_count    integer,
  chunk_count   integer default 0,
  status        text not null default 'processing'
                check (status in ('processing', 'ready', 'error')),
  error_message text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- TABLE 2: document_chunks (one row per chunk, with embedding)
-- ============================================================
create table document_chunks (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references documents(id) on delete cascade,
  chunk_index       integer not null,
  content           text not null,
  section_title     text,
  page_numbers      integer[],
  paragraph_numbers text,
  token_count       integer not null,
  embedding         vector(1536) not null,
  metadata          jsonb default '{}'::jsonb,
  created_at        timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- IVFFlat index for vector similarity search
create index idx_chunks_embedding on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- B-tree indexes for filtered queries
create index idx_chunks_document_id on document_chunks(document_id);
create index idx_chunks_section_title on document_chunks(section_title);
create index idx_documents_status on documents(status);
create index idx_documents_document_type on documents(document_type);
create index idx_documents_jurisdiction on documents(jurisdiction);
create index idx_documents_date_filed on documents(date_filed);
create index idx_documents_author on documents(author);
create index idx_documents_contract_form on documents(contract_form);

-- ============================================================
-- RPC FUNCTION: vector similarity search with metadata join
-- Supports filtering by document type, jurisdiction, date range,
-- party, author, contract form, and witness
-- ============================================================
create or replace function match_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 15,
  filter_document_type text default null,
  filter_jurisdiction text default null,
  filter_date_from date default null,
  filter_date_to date default null,
  filter_party text default null,
  filter_author text default null,
  filter_contract_form text default null,
  filter_witness text default null
)
returns table (
  chunk_id          uuid,
  document_id       uuid,
  content           text,
  section_title     text,
  page_numbers      integer[],
  paragraph_numbers text,
  similarity        float,
  filename          text,
  document_title    text,
  document_type     text,
  case_number       text,
  parties           text[],
  jurisdiction      text,
  date_filed        date,
  author            text,
  dollar_amounts    text[],
  contract_form     text,
  witnesses         text[]
)
language plpgsql
as $$
begin
  return query
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    dc.section_title,
    dc.page_numbers,
    dc.paragraph_numbers,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.filename,
    d.title as document_title,
    d.document_type,
    d.case_number,
    d.parties,
    d.jurisdiction,
    d.date_filed,
    d.author,
    d.dollar_amounts,
    d.contract_form,
    d.witnesses
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.status = 'ready'
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
    and (filter_document_type is null or d.document_type = filter_document_type)
    and (filter_jurisdiction is null or d.jurisdiction ilike '%' || filter_jurisdiction || '%')
    and (filter_date_from is null or d.date_filed >= filter_date_from)
    and (filter_date_to is null or d.date_filed <= filter_date_to)
    and (filter_party is null or (d.parties is not null and exists (
      select 1 from unnest(d.parties) as p where p ilike '%' || filter_party || '%'
    )))
    and (filter_author is null or d.author ilike '%' || filter_author || '%')
    and (filter_contract_form is null or d.contract_form ilike '%' || filter_contract_form || '%')
    and (filter_witness is null or (d.witnesses is not null and exists (
      select 1 from unnest(d.witnesses) as w where w ilike '%' || filter_witness || '%'
    )))
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================
-- MIGRATION SCRIPT (run this if tables already exist)
-- ============================================================
-- alter table documents add column if not exists author text;
-- alter table documents add column if not exists dollar_amounts text[];
-- alter table documents add column if not exists contract_form text;
-- alter table documents add column if not exists witnesses text[];
-- create index if not exists idx_documents_author on documents(author);
-- create index if not exists idx_documents_contract_form on documents(contract_form);
-- Then run the "create or replace function match_chunks" block above.
