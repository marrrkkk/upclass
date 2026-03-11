ALTER TABLE "whiteboards"
ADD COLUMN IF NOT EXISTS "last_sequence" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

ALTER TABLE "whiteboards"
ADD COLUMN IF NOT EXISTS "snapshot_sequence" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "whiteboard_operations" (
  "id" text PRIMARY KEY NOT NULL,
  "whiteboard_id" text NOT NULL REFERENCES "whiteboards"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "sequence" integer NOT NULL,
  "op_type" text NOT NULL,
  "payload" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "whiteboard_operations_whiteboard_idx"
ON "whiteboard_operations" ("whiteboard_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "whiteboard_operations_user_idx"
ON "whiteboard_operations" ("user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "whiteboard_operations_sequence_unique"
ON "whiteboard_operations" ("whiteboard_id", "sequence");
