DO $$
BEGIN
  CREATE TYPE "favorite_target_type" AS ENUM ('class', 'resource', 'classwork', 'conversation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "favorites" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "target_type" "favorite_target_type" NOT NULL,
  "target_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "favorites_user_idx"
ON "favorites" ("user_id");

CREATE INDEX IF NOT EXISTS "favorites_target_idx"
ON "favorites" ("target_type", "target_id");

CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_target_unique"
ON "favorites" ("user_id", "target_type", "target_id");
