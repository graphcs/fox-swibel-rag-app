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
  -- Full-text search vector (auto-computed from content)
  fts               tsvector generated always as (to_tsvector('english', content)) stored,
  metadata          jsonb default '{}'::jsonb,
  created_at        timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- HNSW index for vector similarity search (works correctly at any dataset size,
-- unlike IVFFlat which requires sqrt(n) lists and fails on small datasets)
create index idx_chunks_embedding on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- GIN index for full-text search
create index idx_chunks_fts on document_chunks using gin(fts);

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
-- RPC FUNCTION: match_chunks (pure vector similarity, kept for
-- filter-only queries that have no text to do FTS on)
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
-- RPC FUNCTION: hybrid_search
-- Combines vector similarity + full-text search using
-- Reciprocal Rank Fusion (RRF) for robust retrieval.
-- Vector finds semantically similar content; FTS finds exact
-- keyword matches. RRF merges both ranked lists.
-- ============================================================
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int default 15,
  filter_document_type text default null,
  filter_jurisdiction text default null,
  filter_date_from date default null,
  filter_date_to date default null,
  filter_party text default null,
  filter_author text default null,
  filter_contract_form text default null,
  filter_witness text default null,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0,
  rrf_k int default 60
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
language sql
as $$
  -- Semantic search: top candidates by vector cosine similarity
  with semantic as (
    select
      dc.id as chunk_id,
      row_number() over (order by dc.embedding <=> query_embedding) as rank_ix,
      1 - (dc.embedding <=> query_embedding) as cos_sim
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where d.status = 'ready'
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
    limit least(match_count * 2, 100)
  ),
  -- Full-text search: keyword matches ranked by ts_rank_cd
  full_text as (
    select
      dc.id as chunk_id,
      row_number() over (order by ts_rank_cd(dc.fts, websearch_to_tsquery('english', query_text)) desc) as rank_ix
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where d.status = 'ready'
      and dc.fts @@ websearch_to_tsquery('english', query_text)
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
    order by ts_rank_cd(dc.fts, websearch_to_tsquery('english', query_text)) desc
    limit least(match_count * 2, 100)
  ),
  -- Reciprocal Rank Fusion: merge both ranked lists
  combined as (
    select
      coalesce(s.chunk_id, ft.chunk_id) as chunk_id,
      coalesce(1.0 / (rrf_k + s.rank_ix), 0.0) * semantic_weight +
      coalesce(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight as rrf_score,
      coalesce(s.cos_sim, 0.0) as cos_sim
    from semantic s
    full outer join full_text ft on s.chunk_id = ft.chunk_id
  )
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    dc.section_title,
    dc.page_numbers,
    dc.paragraph_numbers,
    combined.cos_sim::float as similarity,
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
  from combined
  join document_chunks dc on dc.id = combined.chunk_id
  join documents d on d.id = dc.document_id
  order by combined.rrf_score desc
  limit match_count;
$$;

-- ============================================================
-- MIGRATION SCRIPT (run this if tables already exist)
-- ============================================================
-- Step 1: Add new columns (skip if already added)
-- alter table documents add column if not exists author text;
-- alter table documents add column if not exists dollar_amounts text[];
-- alter table documents add column if not exists contract_form text;
-- alter table documents add column if not exists witnesses text[];
-- create index if not exists idx_documents_author on documents(author);
-- create index if not exists idx_documents_contract_form on documents(contract_form);
--
-- Step 2: Add full-text search column to chunks
-- alter table document_chunks
--   add column fts tsvector
--   generated always as (to_tsvector('english', content)) stored;
-- create index idx_chunks_fts on document_chunks using gin(fts);
--
-- Step 3: Switch vector index from IVFFlat to HNSW
-- (IVFFlat with lists=100 fails on small datasets; HNSW works at any size)
-- drop index if exists idx_chunks_embedding;
-- create index idx_chunks_embedding on document_chunks
--   using hnsw (embedding vector_cosine_ops)
--   with (m = 16, ef_construction = 64);
--
-- Step 4: Run both function definitions above (match_chunks + hybrid_search)
--
-- Step 5: Delete and re-upload all documents so they get fresh embeddings
