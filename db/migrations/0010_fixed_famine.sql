CREATE TYPE "public"."ai_conversation_surface" AS ENUM('dashboard', 'class');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."ai_message_status" AS ENUM('completed', 'generating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_security_event_type" AS ENUM('injection_detected', 'injection_rejected', 'output_redacted', 'conversation_locked', 'canary_leak_detected');--> statement-breakpoint
CREATE TYPE "public"."org_memory_category" AS ENUM('teaching_rules', 'subject_knowledge', 'class_context', 'workflow_preferences');--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"surface" "ai_conversation_surface" NOT NULL,
	"entity_id" text NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"provider" text,
	"model" text,
	"status" "ai_message_status" DEFAULT 'completed' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_security_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" "ai_security_event_type" NOT NULL,
	"pattern_matched" text,
	"user_id" text,
	"org_id" text,
	"input_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_token_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"task_type" text NOT NULL,
	"model" text,
	"provider" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"latency_ms" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"unpriced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"task_type" text NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_summaries" (
	"conversation_id" text PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"embedding" jsonb,
	"category" "org_memory_category" DEFAULT 'teaching_rules' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_memories_title_length" CHECK (char_length("org_memories"."title") <= 200),
	CONSTRAINT "org_memories_content_length" CHECK (char_length("org_memories"."content") <= 4000),
	CONSTRAINT "org_memories_position_non_negative" CHECK ("org_memories"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_security_events" ADD CONSTRAINT "ai_security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_security_events" ADD CONSTRAINT "ai_security_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_logs" ADD CONSTRAINT "ai_token_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_logs" ADD CONSTRAINT "ai_token_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_summaries" ADD CONSTRAINT "conversation_summaries_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memories" ADD CONSTRAINT "org_memories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_conversations_user_org_idx" ON "ai_conversations" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_surface_entity_idx" ON "ai_conversations" USING btree ("surface","entity_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_org_last_message_idx" ON "ai_conversations" USING btree ("user_id","org_id","last_message_at") WHERE surface = 'dashboard';--> statement-breakpoint
CREATE UNIQUE INDEX "ai_conversations_class_default_unique" ON "ai_conversations" USING btree ("user_id","org_id","surface","entity_id") WHERE surface = 'class' AND is_default = true;--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_idx" ON "ai_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_id_idx" ON "ai_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_messages_conversation_client_message_unique" ON "ai_messages" USING btree ("conversation_id","client_message_id");--> statement-breakpoint
CREATE INDEX "ai_security_events_user_idx" ON "ai_security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_security_events_created_idx" ON "ai_security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_token_logs_user_idx" ON "ai_token_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_org_idx" ON "ai_token_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_task_idx" ON "ai_token_logs" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_token_logs_provider_idx" ON "ai_token_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_token_logs_created_idx" ON "ai_token_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_created_idx" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_org_created_idx" ON "ai_usage_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "conversation_summaries_updated_idx" ON "conversation_summaries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "org_memories_org_idx" ON "org_memories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_memories_org_position_idx" ON "org_memories" USING btree ("org_id","position");--> statement-breakpoint
CREATE INDEX "org_memories_org_category_idx" ON "org_memories" USING btree ("org_id","category");