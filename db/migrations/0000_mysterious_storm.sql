DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'quiz_attempt_status'
  ) THEN
    CREATE TYPE "public"."quiz_attempt_status" AS ENUM('pending_review', 'graded');
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "quiz_attempts"
ADD COLUMN IF NOT EXISTS "status" "quiz_attempt_status" DEFAULT 'graded' NOT NULL;
--> statement-breakpoint

ALTER TABLE "quiz_attempts"
ADD COLUMN IF NOT EXISTS "graded_at" timestamp;
--> statement-breakpoint

UPDATE "quiz_attempts" qa
SET
  "status" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "quiz_answers" qans
      INNER JOIN "quiz_questions" qq ON qq."id" = qans."question_id"
      WHERE qans."attempt_id" = qa."id"
        AND qq."type" = 'short_answer'
        AND qans."points_awarded" IS NULL
    ) THEN 'pending_review'::"quiz_attempt_status"
    ELSE 'graded'::"quiz_attempt_status"
  END,
  "graded_at" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "quiz_answers" qans
      INNER JOIN "quiz_questions" qq ON qq."id" = qans."question_id"
      WHERE qans."attempt_id" = qa."id"
        AND qq."type" = 'short_answer'
        AND qans."points_awarded" IS NULL
    ) THEN NULL
    ELSE COALESCE(qa."graded_at", qa."submitted_at")
  END;
