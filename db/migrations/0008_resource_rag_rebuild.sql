CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "resource_document_status" AS ENUM ('processing', 'ready', 'failed', 'unsupported');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "resource_ai_chat_role" AS ENUM ('user', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DELETE FROM "resources";--> statement-breakpoint

ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "class_id" text;--> statement-breakpoint

DO $$
BEGIN
  ALTER TABLE "resources"
    ADD CONSTRAINT "resources_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "resources" ALTER COLUMN "class_id" SET NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "resources_class_idx" ON "resources" ("class_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resource_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "class_id" text NOT NULL REFERENCES "public"."classes"("id") ON DELETE cascade,
  "resource_id" text NOT NULL REFERENCES "public"."resources"("id") ON DELETE cascade,
  "status" "resource_document_status" DEFAULT 'processing' NOT NULL,
  "parser" text,
  "embedding_model" text,
  "embedding_dimensions" integer,
  "checksum" text,
  "extracted_text" text,
  "chunk_count" integer DEFAULT 0 NOT NULL,
  "page_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "ingested_at" timestamp,
  "created_by" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "resource_documents_resource_unique" ON "resource_documents" ("resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_documents_class_status_idx" ON "resource_documents" ("class_id", "status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resource_document_chunks" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL REFERENCES "public"."resource_documents"("id") ON DELETE cascade,
  "class_id" text NOT NULL REFERENCES "public"."classes"("id") ON DELETE cascade,
  "resource_id" text NOT NULL REFERENCES "public"."resources"("id") ON DELETE cascade,
  "chunk_text" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "page_number" integer,
  "section_label" text,
  "token_count" integer DEFAULT 0 NOT NULL,
  "embedding" vector(2048) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "resource_document_chunks_document_chunk_unique"
  ON "resource_document_chunks" ("document_id", "chunk_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_document_chunks_class_idx" ON "resource_document_chunks" ("class_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_document_chunks_resource_idx" ON "resource_document_chunks" ("resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_document_chunks_document_idx" ON "resource_document_chunks" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_document_chunks_embedding_hnsw_idx"
  ON "resource_document_chunks" USING hnsw (("embedding"::halfvec(2048)) halfvec_cosine_ops);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resource_ai_chat_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "class_id" text NOT NULL REFERENCES "public"."classes"("id") ON DELETE cascade,
  "resource_id" text REFERENCES "public"."resources"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
  "title" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_message_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "resource_ai_chat_sessions_user_scope_idx"
  ON "resource_ai_chat_sessions" ("user_id", "class_id", "resource_id", "updated_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resource_ai_chat_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL REFERENCES "public"."resource_ai_chat_sessions"("id") ON DELETE cascade,
  "role" "resource_ai_chat_role" NOT NULL,
  "content" text NOT NULL,
  "citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "resource_ai_chat_messages_session_idx"
  ON "resource_ai_chat_messages" ("session_id", "created_at");
