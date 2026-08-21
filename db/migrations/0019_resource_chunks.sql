CREATE TABLE IF NOT EXISTS "resource_chunks" (
  "id" text PRIMARY KEY NOT NULL,
  "resource_id" text NOT NULL REFERENCES "resources"("id") ON DELETE cascade,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "content_hash" text NOT NULL,
  "page_number" integer,
  "section_title" text,
  "embedding" jsonb,
  "embedding_model" text,
  "embedding_version" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "resource_chunks_resource_index_unique" ON "resource_chunks" ("resource_id", "chunk_index");
CREATE INDEX IF NOT EXISTS "resource_chunks_resource_idx" ON "resource_chunks" ("resource_id");
CREATE INDEX IF NOT EXISTS "resource_chunks_org_idx" ON "resource_chunks" ("org_id");
ALTER TABLE "org_memories" ADD COLUMN IF NOT EXISTS "embedding_model" text;
ALTER TABLE "org_memories" ADD COLUMN IF NOT EXISTS "embedding_version" text;
