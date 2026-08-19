CREATE TABLE "channel_member_state" (
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_created_at" timestamp,
	"last_read_message_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_member_state_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "direct_conversation_members" (
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_created_at" timestamp,
	"last_read_message_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "direct_conversation_members_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "direct_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"participant_one_id" text NOT NULL,
	"participant_two_id" text NOT NULL,
	"last_message_id" text,
	"last_message_at" timestamp,
	"last_message_preview" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_migration_quarantine" (
	"id" text PRIMARY KEY NOT NULL,
	"original_message_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"content" text NOT NULL,
	"media" text,
	"created_at" timestamp NOT NULL,
	"reason" text NOT NULL,
	"quarantined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_migration_quarantine_original_message_id_unique" UNIQUE("original_message_id")
);
--> statement-breakpoint
CREATE TABLE "message_notification_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "client_message_id" text;--> statement-breakpoint
ALTER TABLE "class_channels" ADD COLUMN "last_message_id" text;--> statement-breakpoint
ALTER TABLE "class_channels" ADD COLUMN "last_message_at" timestamp;--> statement-breakpoint
ALTER TABLE "class_channels" ADD COLUMN "last_message_preview" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "client_message_id" text;--> statement-breakpoint
ALTER TABLE "channel_member_state" ADD CONSTRAINT "channel_member_state_channel_id_class_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."class_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_member_state" ADD CONSTRAINT "channel_member_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversation_members" ADD CONSTRAINT "direct_conversation_members_conversation_id_direct_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversation_members" ADD CONSTRAINT "direct_conversation_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participant_one_id_user_id_fk" FOREIGN KEY ("participant_one_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participant_two_id_user_id_fk" FOREIGN KEY ("participant_two_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_notification_outbox" ADD CONSTRAINT "message_notification_outbox_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_member_state_user_idx" ON "channel_member_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "direct_conversation_members_user_idx" ON "direct_conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_conversations_org_participants_unique" ON "direct_conversations" USING btree ("org_id","participant_one_id","participant_two_id");--> statement-breakpoint
CREATE INDEX "direct_conversations_org_last_message_idx" ON "direct_conversations" USING btree ("org_id","last_message_at");--> statement-breakpoint
CREATE INDEX "message_notification_outbox_due_idx" ON "message_notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_notification_outbox_message_channel_unique" ON "message_notification_outbox" USING btree ("message_id","channel");--> statement-breakpoint
CREATE INDEX "channel_messages_channel_created_idx" ON "channel_messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_messages_channel_client_message_unique" ON "channel_messages" USING btree ("channel_id","client_message_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_conversation_client_message_unique" ON "messages" USING btree ("conversation_id","client_message_id");
--> statement-breakpoint
-- Legacy direct rows lack an organization-scoped conversation identity. Preserve them
-- for an explicit admin migration instead of guessing tenant membership.
INSERT INTO "message_migration_quarantine" (
  "id", "original_message_id", "sender_id", "receiver_id", "content", "media", "created_at", "reason"
)
SELECT
  'quarantine_' || m."id", m."id", m."sender_id", m."receiver_id", m."content", m."media", m."created_at",
  'legacy message has no conversation_id; organization cannot be inferred safely'
FROM "messages" m
WHERE m."conversation_id" IS NULL
ON CONFLICT ("original_message_id") DO NOTHING;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE direct_conversation_members ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE channel_member_state ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY direct_conversations_member_select ON direct_conversations FOR SELECT USING (participant_one_id = auth.jwt()->>''sub'' OR participant_two_id = auth.jwt()->>''sub'')';
    EXECUTE 'CREATE POLICY direct_conversation_members_owner_select ON direct_conversation_members FOR SELECT USING (user_id = auth.jwt()->>''sub'')';
    EXECUTE 'CREATE POLICY direct_conversation_members_owner_update ON direct_conversation_members FOR ALL USING (user_id = auth.jwt()->>''sub'') WITH CHECK (user_id = auth.jwt()->>''sub'')';
    EXECUTE 'CREATE POLICY messages_conversation_member_select ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM direct_conversation_members m WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.jwt()->>''sub''))';
    EXECUTE 'CREATE POLICY messages_sender_insert ON messages FOR INSERT WITH CHECK (sender_id = auth.jwt()->>''sub'' AND EXISTS (SELECT 1 FROM direct_conversation_members m WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.jwt()->>''sub''))';
    EXECUTE 'CREATE POLICY channel_messages_member_select ON channel_messages FOR SELECT USING (EXISTS (SELECT 1 FROM class_channels c JOIN class_membership cm ON cm.class_id = c.class_id WHERE c.id = channel_messages.channel_id AND cm.user_id = auth.jwt()->>''sub''))';
    EXECUTE 'CREATE POLICY channel_messages_member_insert ON channel_messages FOR INSERT WITH CHECK (sender_id = auth.jwt()->>''sub'' AND EXISTS (SELECT 1 FROM class_channels c JOIN class_membership cm ON cm.class_id = c.class_id WHERE c.id = channel_messages.channel_id AND cm.user_id = auth.jwt()->>''sub''))';
    EXECUTE 'CREATE POLICY channel_member_state_owner ON channel_member_state FOR ALL USING (user_id = auth.jwt()->>''sub'') WITH CHECK (user_id = auth.jwt()->>''sub'')';
  END IF;
END $$;
