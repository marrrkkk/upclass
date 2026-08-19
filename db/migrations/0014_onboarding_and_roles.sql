ALTER TYPE "org_role" ADD VALUE IF NOT EXISTS 'teacher';--> statement-breakpoint
ALTER TYPE "org_role" ADD VALUE IF NOT EXISTS 'student';--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "code_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE "onboarding_state" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scope_key" text NOT NULL,
	"current_step" text,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flow_version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dismissed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_state_user_idx" ON "onboarding_state" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_state_user_scope_unique" ON "onboarding_state" USING btree ("user_id","scope_key");--> statement-breakpoint
UPDATE "org_membership" om
SET "role" = 'teacher'
WHERE om."role" = 'member'
AND (
  EXISTS (SELECT 1 FROM "classes" c WHERE c."org_id" = om."org_id" AND c."owner_id" = om."user_id")
  OR EXISTS (
    SELECT 1 FROM "class_membership" cm
    INNER JOIN "classes" c ON c."id" = cm."class_id"
    WHERE c."org_id" = om."org_id" AND cm."user_id" = om."user_id" AND cm."role" = 'teacher'
  )
);--> statement-breakpoint
UPDATE "org_membership" SET "role" = 'student' WHERE "role" = 'member';--> statement-breakpoint
UPDATE "org_invitations" SET "role" = 'student' WHERE "role" = 'member';
