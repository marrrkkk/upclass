CREATE TABLE IF NOT EXISTS "study_collections" (
  "id" text PRIMARY KEY NOT NULL, "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "student_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade, "title" text NOT NULL,
  "description" text, "source_type" text, "source_id" text, "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "study_collections_student_idx" ON "study_collections" ("student_id");
CREATE INDEX IF NOT EXISTS "study_collections_org_idx" ON "study_collections" ("org_id");
CREATE TABLE IF NOT EXISTS "study_cards" (
  "id" text PRIMARY KEY NOT NULL, "collection_id" text NOT NULL REFERENCES "study_collections"("id") ON DELETE cascade,
  "front" text NOT NULL, "back" text NOT NULL, "hint" text, "explanation" text, "source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "due_at" timestamp DEFAULT now() NOT NULL, "interval_days" integer DEFAULT 0 NOT NULL, "ease" integer DEFAULT 250 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "study_cards_collection_due_idx" ON "study_cards" ("collection_id", "due_at");
CREATE TABLE IF NOT EXISTS "study_sessions" (
  "id" text PRIMARY KEY NOT NULL, "collection_id" text NOT NULL REFERENCES "study_collections"("id") ON DELETE cascade,
  "student_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade, "mode" text NOT NULL,
  "correct" integer DEFAULT 0 NOT NULL, "total" integer DEFAULT 0 NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);
CREATE INDEX IF NOT EXISTS "study_sessions_student_idx" ON "study_sessions" ("student_id", "created_at");
