CREATE TYPE "public"."activity_event_type" AS ENUM(
  'class_created',
  'class_joined',
  'announcement_created',
  'assignment_created',
  'material_created',
  'quiz_created',
  'resource_uploaded',
  'assignment_submitted',
  'quiz_submitted',
  'submission_graded',
  'quiz_graded'
);
--> statement-breakpoint

CREATE TYPE "public"."activity_entity_type" AS ENUM(
  'class',
  'announcement',
  'classwork',
  'resource',
  'quiz',
  'submission',
  'quiz_attempt'
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" text PRIMARY KEY NOT NULL,
  "actor_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "event_type" "activity_event_type" NOT NULL,
  "entity_type" "activity_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "class_id" text REFERENCES "classes"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "description" text,
  "metadata" text,
  "occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "activity_log_actor_occurred_idx"
ON "activity_log" ("actor_id", "occurred_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "activity_log_actor_event_idx"
ON "activity_log" ("actor_id", "event_type");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "activity_log_class_occurred_idx"
ON "activity_log" ("class_id", "occurred_at");
