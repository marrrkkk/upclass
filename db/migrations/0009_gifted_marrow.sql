CREATE TABLE "resource_ai_rate_limits" (
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "resource_ai_rate_limits_user_scope_day_pk" PRIMARY KEY("user_id","scope","day")
);
--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "color" SET DEFAULT '#0e6b52';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "cover_color" SET DEFAULT '#0e6b52';--> statement-breakpoint
ALTER TABLE "resource_ai_messages" ADD COLUMN "client_message_id" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "ai_source_text" text;--> statement-breakpoint
ALTER TABLE "resource_ai_rate_limits" ADD CONSTRAINT "resource_ai_rate_limits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_ai_messages_conversation_client_message_unique" ON "resource_ai_messages" USING btree ("conversation_id","client_message_id");