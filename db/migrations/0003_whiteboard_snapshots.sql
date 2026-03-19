ALTER TABLE "whiteboards"
ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Class Whiteboard' NOT NULL;

ALTER TABLE "whiteboards"
ADD COLUMN IF NOT EXISTS "owner_id" text REFERENCES "user"("id") ON DELETE cascade;

UPDATE "whiteboards"
SET "owner_id" = "classes"."owner_id"
FROM "classes"
WHERE "classes"."id" = "whiteboards"."class_id"
  AND "whiteboards"."owner_id" IS NULL;

ALTER TABLE "whiteboards"
ALTER COLUMN "owner_id" SET NOT NULL;

ALTER TABLE "whiteboards"
ALTER COLUMN "data" SET DEFAULT '[]';

CREATE UNIQUE INDEX IF NOT EXISTS "whiteboards_class_unique"
ON "whiteboards" ("class_id");

CREATE INDEX IF NOT EXISTS "whiteboards_owner_idx"
ON "whiteboards" ("owner_id");

CREATE TABLE IF NOT EXISTS "whiteboard_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "board_id" text NOT NULL REFERENCES "whiteboards"("id") ON DELETE cascade,
  "document" jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "whiteboard_snapshots_board_unique"
ON "whiteboard_snapshots" ("board_id");

CREATE INDEX IF NOT EXISTS "whiteboard_snapshots_version_idx"
ON "whiteboard_snapshots" ("version");
