ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "mime_type" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "storage_bucket" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "storage_path" text;--> statement-breakpoint
ALTER TABLE "submission_attachments" ADD COLUMN IF NOT EXISTS "storage_bucket" text;--> statement-breakpoint
ALTER TABLE "submission_attachments" ADD COLUMN IF NOT EXISTS "storage_path" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image_storage_bucket" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image_storage_path" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cover_storage_bucket" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cover_storage_path" text;--> statement-breakpoint

UPDATE "user"
SET
  "image" = NULL,
  "image_storage_bucket" = NULL,
  "image_storage_path" = NULL
WHERE "image" ~* '(uploadthing|utfs\.io|ufs\.sh)';--> statement-breakpoint

UPDATE "user"
SET
  "cover" = NULL,
  "cover_storage_bucket" = NULL,
  "cover_storage_path" = NULL
WHERE "cover" ~* '(uploadthing|utfs\.io|ufs\.sh)';--> statement-breakpoint

DELETE FROM "resources"
WHERE "file_url" ~* '(uploadthing|utfs\.io|ufs\.sh)';--> statement-breakpoint

DELETE FROM "submission_attachments"
WHERE "file_url" ~* '(uploadthing|utfs\.io|ufs\.sh)';--> statement-breakpoint

UPDATE "submissions"
SET
  "file_url" = NULL,
  "file_name" = NULL
WHERE "file_url" ~* '(uploadthing|utfs\.io|ufs\.sh)';--> statement-breakpoint

WITH cleaned_messages AS (
  SELECT
    "id",
    COALESCE(
      (
        SELECT jsonb_agg("item")
        FROM jsonb_array_elements(COALESCE("media"::jsonb, '[]'::jsonb)) AS "item"
        WHERE COALESCE("item"->>'url', '') !~* '(uploadthing|utfs\.io|ufs\.sh)'
      ),
      '[]'::jsonb
    ) AS "filtered_media"
  FROM "messages"
  WHERE "media" IS NOT NULL
)
UPDATE "messages" AS "messages"
SET "media" = CASE
  WHEN jsonb_array_length("cleaned_messages"."filtered_media") = 0 THEN NULL
  ELSE "cleaned_messages"."filtered_media"::text
END
FROM "cleaned_messages"
WHERE "messages"."id" = "cleaned_messages"."id";--> statement-breakpoint

DELETE FROM "messages"
WHERE COALESCE(BTRIM("content"), '') = ''
  AND ("media" IS NULL OR "media" = '[]');--> statement-breakpoint

WITH cleaned_channel_messages AS (
  SELECT
    "id",
    COALESCE(
      (
        SELECT jsonb_agg("item")
        FROM jsonb_array_elements(COALESCE("media"::jsonb, '[]'::jsonb)) AS "item"
        WHERE COALESCE("item"->>'url', '') !~* '(uploadthing|utfs\.io|ufs\.sh)'
      ),
      '[]'::jsonb
    ) AS "filtered_media"
  FROM "channel_messages"
  WHERE "media" IS NOT NULL
)
UPDATE "channel_messages" AS "channel_messages"
SET "media" = CASE
  WHEN jsonb_array_length("cleaned_channel_messages"."filtered_media") = 0 THEN NULL
  ELSE "cleaned_channel_messages"."filtered_media"::text
END
FROM "cleaned_channel_messages"
WHERE "channel_messages"."id" = "cleaned_channel_messages"."id";--> statement-breakpoint

DELETE FROM "channel_messages"
WHERE COALESCE(BTRIM("content"), '') = ''
  AND ("media" IS NULL OR "media" = '[]');
