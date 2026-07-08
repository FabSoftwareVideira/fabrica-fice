-- Habilita a extensao pgvector (precisa estar instalada no Postgres)
CREATE EXTENSION IF NOT EXISTS vector;

-- Um registro por pessoa que passou pelo stand
CREATE TABLE IF NOT EXISTS visitors (
  id            BIGSERIAL PRIMARY KEY,
  event_id      TEXT NOT NULL,
  embedding     VECTOR(128) NOT NULL,   -- descritor facial gerado no navegador (face-api.js)
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_given  BOOLEAN NOT NULL DEFAULT false,
  reward_given_at TIMESTAMPTZ,
  notes         TEXT
);

-- Indice para busca por similaridade (aproximado, bom para volumes maiores)
-- Para poucos milhares de registros de uma feira, uma busca exata (sem indice) ja e rapida.
CREATE INDEX IF NOT EXISTS visitors_embedding_idx
  ON visitors USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS visitors_event_idx ON visitors (event_id);
