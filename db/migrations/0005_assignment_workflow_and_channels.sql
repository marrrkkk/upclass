DO $$
BEGIN
  ALTER TYPE "submission_status" ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'draft_saved';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'assignment_resubmitted';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "submission_attachments" (
  "id" text PRIMARY KEY NOT NULL,
  "submission_id" text NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "file_type" text,
  "file_size" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "submission_attachments_submission_idx"
ON "submission_attachments" ("submission_id");

CREATE TABLE IF NOT EXISTS "submission_revisions" (
  "id" text PRIMARY KEY NOT NULL,
  "submission_id" text NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
  "revision_number" integer NOT NULL,
  "action" text NOT NULL,
  "content" text,
  "status" "submission_status" NOT NULL,
  "submitted_at" timestamp,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "submission_revisions_submission_idx"
ON "submission_revisions" ("submission_id");

CREATE UNIQUE INDEX IF NOT EXISTS "submission_revisions_submission_number_unique"
ON "submission_revisions" ("submission_id", "revision_number");

CREATE TABLE IF NOT EXISTS "grading_history" (
  "id" text PRIMARY KEY NOT NULL,
  "submission_id" text NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
  "graded_by" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "grade" text NOT NULL,
  "feedback" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "grading_history_submission_idx"
ON "grading_history" ("submission_id");

CREATE TABLE IF NOT EXISTS "class_channels" (
  "id" text PRIMARY KEY NOT NULL,
  "class_id" text NOT NULL REFERENCES "classes"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "class_channels_class_idx"
ON "class_channels" ("class_id");

CREATE UNIQUE INDEX IF NOT EXISTS "class_channels_class_slug_unique"
ON "class_channels" ("class_id", "slug");

CREATE TABLE IF NOT EXISTS "channel_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "channel_id" text NOT NULL REFERENCES "class_channels"("id") ON DELETE cascade,
  "sender_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "media" text,
  "read_by" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "channel_messages_channel_idx"
ON "channel_messages" ("channel_id");

CREATE INDEX IF NOT EXISTS "channel_messages_sender_idx"
ON "channel_messages" ("sender_id");
