CREATE TYPE "public"."resource_ai_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "resource_ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "resource_ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_ai_conversations" ADD CONSTRAINT "resource_ai_conversations_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_ai_conversations" ADD CONSTRAINT "resource_ai_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_ai_messages" ADD CONSTRAINT "resource_ai_messages_conversation_id_resource_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."resource_ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_ai_conversations_resource_user_unique" ON "resource_ai_conversations" USING btree ("resource_id","user_id");--> statement-breakpoint
CREATE INDEX "resource_ai_conversations_user_updated_idx" ON "resource_ai_conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "resource_ai_messages_conversation_created_idx" ON "resource_ai_messages" USING btree ("conversation_id","created_at");