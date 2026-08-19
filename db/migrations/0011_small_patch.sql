CREATE TYPE "public"."ai_action_proposal_status" AS ENUM('completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_feedback_rating" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TABLE "ai_action_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "ai_action_proposal_status" DEFAULT 'completed' NOT NULL,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"run_id" text,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"rating" "ai_feedback_rating" NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tool_events" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text,
	"message_id" text,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"empty_result" boolean DEFAULT false NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_token_logs" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "ai_action_proposals" ADD CONSTRAINT "ai_action_proposals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_action_proposals" ADD CONSTRAINT "ai_action_proposals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_events" ADD CONSTRAINT "ai_tool_events_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_events" ADD CONSTRAINT "ai_tool_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_events" ADD CONSTRAINT "ai_tool_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_action_proposals_user_idx" ON "ai_action_proposals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_action_proposals_org_idx" ON "ai_action_proposals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ai_action_proposals_run_idx" ON "ai_action_proposals" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_feedback_message_user_unique" ON "ai_feedback" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "ai_feedback_user_idx" ON "ai_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_feedback_org_idx" ON "ai_feedback" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ai_feedback_run_idx" ON "ai_feedback" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_tool_events_tool_idx" ON "ai_tool_events" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "ai_tool_events_run_idx" ON "ai_tool_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_tool_events_org_idx" ON "ai_tool_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_run_idx" ON "ai_token_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_usage_events_run_idx" ON "ai_usage_events" USING btree ("run_id");