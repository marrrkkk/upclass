import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  jsonb,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  cover: text("cover"), // Cover image URL
  coverColor: text("cover_color").default("#0e6b52"), // Default cover color (primary mint)
  bio: text("bio"),
  // Notification settings
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  classNotifications: boolean("class_notifications").default(true).notNull(),
  messageNotifications: boolean("message_notifications").default(true).notNull(),
  // Privacy settings
  profileVisibility: text("profile_visibility").default("public").notNull(), // public, private, contacts
  showEmail: boolean("show_email").default(false).notNull(),
  showClasses: boolean("show_classes").default(true).notNull(),
  showResources: boolean("show_resources").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Organization multi-tenancy
export const orgRole = pgEnum("org_role", ["owner", "admin", "member", "teacher", "student"]);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    cover: text("cover"),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("organizations_slug_idx").on(table.slug),
    index("organizations_created_by_idx").on(table.createdBy),
  ],
);

export const orgMembership = pgTable(
  "org_membership",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: orgRole("role").notNull().default("student"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_membership_user_idx").on(table.userId),
    index("org_membership_org_idx").on(table.orgId),
    uniqueIndex("org_membership_unique_user_org").on(table.orgId, table.userId),
  ],
);

export const onboardingState = pgTable(
  "onboarding_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scopeKey: text("scope_key").notNull(),
    currentStep: text("current_step"),
    completedSteps: jsonb("completed_steps").$type<string[]>().default([]).notNull(),
    flowVersion: integer("flow_version").default(1).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    dismissedAt: timestamp("dismissed_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("onboarding_state_user_idx").on(table.userId),
    uniqueIndex("onboarding_state_user_scope_unique").on(table.userId, table.scopeKey),
  ],
);

export const orgInvitations = pgTable(
  "org_invitations",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRole("role").notNull().default("student"),
    token: text("token").notNull().unique(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("org_invitations_org_idx").on(table.orgId),
    index("org_invitations_token_idx").on(table.token),
    uniqueIndex("org_invitations_unique_org_email").on(table.orgId, table.email),
  ],
);

export const organizationRelations = relations(organizations, ({ one, many }) => ({
  creator: one(user, {
    fields: [organizations.createdBy],
    references: [user.id],
  }),
  memberships: many(orgMembership),
  invitations: many(orgInvitations),
}));

export const orgMembershipRelations = relations(orgMembership, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembership.orgId],
    references: [organizations.id],
  }),
  user: one(user, {
    fields: [orgMembership.userId],
    references: [user.id],
  }),
}));

export const onboardingStateRelations = relations(onboardingState, ({ one }) => ({
  user: one(user, {
    fields: [onboardingState.userId],
    references: [user.id],
  }),
}));

export const orgInvitationRelations = relations(orgInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgInvitations.orgId],
    references: [organizations.id],
  }),
  inviter: one(user, {
    fields: [orgInvitations.invitedBy],
    references: [user.id],
  }),
}));

export const classRole = pgEnum("class_role", ["teacher", "student"]);

export const gradeLevel = pgEnum("grade_level", [
  "kindergarten",
  "grade_1",
  "grade_2",
  "grade_3",
  "grade_4",
  "grade_5",
  "grade_6",
  "grade_7",
  "grade_8",
  "grade_9",
  "grade_10",
  "grade_11",
  "grade_12",
  "college",
  "other",
]);

export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").default("General"), // Legacy field, kept for compatibility
    gradeLevel: gradeLevel("grade_level"), // New structured field
    customGrade: text("custom_grade"), // Only used when gradeLevel is 'other'
    section: text("section"), // Optional section/stream identifier
    thumbnail: text("thumbnail"),
    code: text("code").notNull().unique(),
    codeEnabled: boolean("code_enabled").default(true).notNull(),
    color: text("color").default("#0e6b52"), // Default mint color
    schedule: text("schedule"), // Class schedule (e.g., "Mon, Wed, Fri 10:00 AM")
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("classes_org_idx").on(table.orgId),
    index("classes_owner_idx").on(table.ownerId),
    index("classes_code_idx").on(table.code),
    index("classes_grade_level_idx").on(table.gradeLevel),
    index("classes_section_idx").on(table.section),
  ],
);

export const classMembership = pgTable(
  "class_membership",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: classRole("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("class_membership_user_idx").on(table.userId),
    index("class_membership_class_idx").on(table.classId),
    uniqueIndex("class_membership_unique_user_class").on(
      table.classId,
      table.userId,
    ),
  ],
);

export const classRelations = relations(classes, ({ many, one }) => ({
  memberships: many(classMembership),
  resources: many(resources),
  organization: one(organizations, {
    fields: [classes.orgId],
    references: [organizations.id],
  }),
  owner: one(user, {
    fields: [classes.ownerId],
    references: [user.id],
  }),
}));

export const classMembershipRelations = relations(
  classMembership,
  ({ one }) => ({
    class: one(classes, {
      fields: [classMembership.classId],
      references: [classes.id],
    }),
    user: one(user, {
      fields: [classMembership.userId],
      references: [user.id],
    }),
  }),
);

export const resourceFileType = pgEnum("resource_file_type", [
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "other",
]);

export const resourceType = pgEnum("resource_type", [
  "notes",
  "slides",
  "worksheet",
  "reading",
  "reference",
  "template",
  "other",
]);

export const resources = pgTable(
  "resources",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    classId: text("class_id").references(() => classes.id, { onDelete: "set null" }), // Optional class link
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").default("General"), // Legacy field, kept for compatibility
    resourceType: resourceType("resource_type"), // New structured type
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileType: resourceFileType("file_type").notNull(),
    fileSize: text("file_size"),
    storagePath: text("storage_path"), // Storage object path for cleanup
    aiSourceText: text("ai_source_text"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("resources_owner_idx").on(table.ownerId),
    index("resources_org_idx").on(table.orgId),
    index("resources_class_idx").on(table.classId),
    index("resources_resource_type_idx").on(table.resourceType),
  ],
);

export const resourceChunks = pgTable(
  "resource_chunks",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    pageNumber: integer("page_number"),
    sectionTitle: text("section_title"),
    embedding: jsonb("embedding").$type<number[] | null>(),
    embeddingModel: text("embedding_model"),
    embeddingVersion: text("embedding_version"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("resource_chunks_resource_index_unique").on(table.resourceId, table.chunkIndex),
    index("resource_chunks_resource_idx").on(table.resourceId),
    index("resource_chunks_org_idx").on(table.orgId),
  ],
);

export const studyCollections = pgTable(
  "study_collections",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("study_collections_student_idx").on(table.studentId), index("study_collections_org_idx").on(table.orgId)],
);

export const studyCards = pgTable(
  "study_cards",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => studyCollections.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    hint: text("hint"),
    explanation: text("explanation"),
    sourceRefs: jsonb("source_refs").$type<string[]>().default([]).notNull(),
    dueAt: timestamp("due_at").defaultNow().notNull(),
    intervalDays: integer("interval_days").default(0).notNull(),
    ease: integer("ease").default(250).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("study_cards_collection_due_idx").on(table.collectionId, table.dueAt)],
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => studyCollections.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    correct: integer("correct").default(0).notNull(),
    total: integer("total").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("study_sessions_student_idx").on(table.studentId, table.createdAt)],
);

export const studySourceStatus = pgEnum("study_source_status", ["pending", "processing", "ready", "failed"]);

export const studySources = pgTable(
  "study_sources",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => studyCollections.id, { onDelete: "cascade" }),
    resourceId: text("resource_id").references(() => resources.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    status: studySourceStatus("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    aiSourceText: text("ai_source_text"),
    processingStartedAt: timestamp("processing_started_at"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("study_sources_collection_idx").on(table.collectionId), index("study_sources_status_idx").on(table.status)],
);

export const studyQuizzes = pgTable(
  "study_quizzes",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull().references(() => studyCollections.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("study_quizzes_collection_position_idx").on(table.collectionId, table.position)],
);

export const studyQuestions = pgTable(
  "study_questions",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id").notNull().references(() => studyQuizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().default([]).notNull(),
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation"),
    sourceRefs: jsonb("source_refs").$type<string[]>().default([]).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("study_questions_quiz_position_idx").on(table.quizId, table.position)],
);

export const resourceRelations = relations(resources, ({ one }) => ({
  owner: one(user, {
    fields: [resources.ownerId],
    references: [user.id],
  }),
  organization: one(organizations, {
    fields: [resources.orgId],
    references: [organizations.id],
  }),
  class: one(classes, {
    fields: [resources.classId],
    references: [classes.id],
  }),
}));

export const resourceAiMessageRole = pgEnum("resource_ai_message_role", ["user", "assistant"]);

export const resourceAiConversations = pgTable(
  "resource_ai_conversations",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("resource_ai_conversations_resource_user_unique").on(table.resourceId, table.userId),
    index("resource_ai_conversations_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const resourceAiMessages = pgTable(
  "resource_ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => resourceAiConversations.id, { onDelete: "cascade" }),
    role: resourceAiMessageRole("role").notNull(),
    content: text("content").notNull(),
    clientMessageId: text("client_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("resource_ai_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    uniqueIndex("resource_ai_messages_conversation_client_message_unique").on(
      table.conversationId,
      table.clientMessageId,
    ),
  ],
);

export const resourceAiRateLimits = pgTable(
  "resource_ai_rate_limits",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    day: text("day").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (table) => [
    primaryKey({
      name: "resource_ai_rate_limits_user_scope_day_pk",
      columns: [table.userId, table.scope, table.day],
    }),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("announcements_class_idx").on(table.classId),
    index("announcements_author_idx").on(table.authorId),
  ],
);

export const classworkType = pgEnum("classwork_type", ["assignment", "quiz", "material"]);

export const classwork = pgTable(
  "classwork",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: classworkType("type").notNull().default("assignment"),
    dueDate: timestamp("due_date"),
    points: text("points"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("classwork_class_idx").on(table.classId)],
);

export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "draft",
  "submitted",
  "graded",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    classworkId: text("classwork_id")
      .notNull()
      .references(() => classwork.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content"),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    status: submissionStatus("status").notNull().default("pending"),
    grade: text("grade"),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at"),
    gradedAt: timestamp("graded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("submissions_classwork_idx").on(table.classworkId),
    index("submissions_student_idx").on(table.studentId),
    uniqueIndex("submissions_unique_student_classwork").on(
      table.classworkId,
      table.studentId,
    ),
  ],
);

export const submissionAttachments = pgTable(
  "submission_attachments",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type"),
    fileSize: text("file_size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("submission_attachments_submission_idx").on(table.submissionId)],
);

export const submissionRevisions = pgTable(
  "submission_revisions",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    action: text("action").notNull(),
    content: text("content"),
    status: submissionStatus("status").notNull(),
    submittedAt: timestamp("submitted_at"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("submission_revisions_submission_idx").on(table.submissionId),
    uniqueIndex("submission_revisions_submission_number_unique").on(
      table.submissionId,
      table.revisionNumber,
    ),
  ],
);

export const gradingHistory = pgTable(
  "grading_history",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    gradedBy: text("graded_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    grade: text("grade").notNull(),
    feedback: text("feedback"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("grading_history_submission_idx").on(table.submissionId)],
);

export const announcementRelations = relations(announcements, ({ one, many }) => ({
  class: one(classes, {
    fields: [announcements.classId],
    references: [classes.id],
  }),
  author: one(user, {
    fields: [announcements.authorId],
    references: [user.id],
  }),
  reactions: many(announcementReactions),
}));

export const announcementReactions = pgTable(
  "announcement_reactions",
  {
    id: text("id").primaryKey(),
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("announcement_reactions_announcement_idx").on(table.announcementId),
    index("announcement_reactions_user_idx").on(table.userId),
    uniqueIndex("announcement_reactions_unique_user_announcement").on(
      table.announcementId,
      table.userId,
    ),
  ],
);

export const announcementReactionRelations = relations(announcementReactions, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReactions.announcementId],
    references: [announcements.id],
  }),
  user: one(user, {
    fields: [announcementReactions.userId],
    references: [user.id],
  }),
}));

export const classworkRelations = relations(classwork, ({ one, many }) => ({
  class: one(classes, {
    fields: [classwork.classId],
    references: [classes.id],
  }),
  submissions: many(submissions),
}));

export const submissionRelations = relations(submissions, ({ one }) => ({
  classwork: one(classwork, {
    fields: [submissions.classworkId],
    references: [classwork.id],
  }),
  student: one(user, {
    fields: [submissions.studentId],
    references: [user.id],
  }),
}));

export const submissionAttachmentRelations = relations(submissionAttachments, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionAttachments.submissionId],
    references: [submissions.id],
  }),
}));

export const submissionRevisionRelations = relations(submissionRevisions, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionRevisions.submissionId],
    references: [submissions.id],
  }),
  author: one(user, {
    fields: [submissionRevisions.createdBy],
    references: [user.id],
  }),
}));

export const gradingHistoryRelations = relations(gradingHistory, ({ one }) => ({
  submission: one(submissions, {
    fields: [gradingHistory.submissionId],
    references: [submissions.id],
  }),
  grader: one(user, {
    fields: [gradingHistory.gradedBy],
    references: [user.id],
  }),
}));

export const notificationType = pgEnum("notification_type", ["announcement", "classwork"]);
export const activityEventType = pgEnum("activity_event_type", [
  "class_created",
  "class_joined",
  "announcement_created",
  "assignment_created",
  "material_created",
  "quiz_created",
  "resource_uploaded",
  "draft_saved",
  "assignment_submitted",
  "assignment_resubmitted",
  "quiz_submitted",
  "submission_graded",
  "quiz_graded",
]);
export const activityEntityType = pgEnum("activity_entity_type", [
  "class",
  "announcement",
  "classwork",
  "resource",
  "quiz",
  "submission",
  "quiz_attempt",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }),
    relatedId: text("related_id"), // announcement id or classwork id
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_read_idx").on(table.read),
    index("notifications_class_idx").on(table.classId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id"),
    clientMessageId: text("client_message_id"),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    media: text("media"), // JSON array of media files: [{url, type, name, size}]
    url: text("url"), // Single URL if message contains a link
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    uniqueIndex("messages_conversation_client_message_unique").on(
      table.conversationId,
      table.clientMessageId,
    ),
    index("messages_sender_idx").on(table.senderId),
    index("messages_receiver_idx").on(table.receiverId),
    index("messages_read_idx").on(table.read),
  ],
);

export const classChannels = pgTable(
  "class_channels",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastMessageId: text("last_message_id"),
    lastMessageAt: timestamp("last_message_at"),
    lastMessagePreview: text("last_message_preview"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("class_channels_class_idx").on(table.classId),
    uniqueIndex("class_channels_class_slug_unique").on(table.classId, table.slug),
  ],
);

export const channelMessages = pgTable(
  "channel_messages",
  {
    id: text("id").primaryKey(),
    clientMessageId: text("client_message_id"),
    channelId: text("channel_id")
      .notNull()
      .references(() => classChannels.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    media: text("media"),
    readBy: text("read_by").default("[]").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("channel_messages_channel_idx").on(table.channelId),
    index("channel_messages_channel_created_idx").on(table.channelId, table.createdAt),
    uniqueIndex("channel_messages_channel_client_message_unique").on(
      table.channelId,
      table.clientMessageId,
    ),
    index("channel_messages_sender_idx").on(table.senderId),
  ],
);

export const directConversations = pgTable(
  "direct_conversations",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    participantOneId: text("participant_one_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    participantTwoId: text("participant_two_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastMessageId: text("last_message_id"),
    lastMessageAt: timestamp("last_message_at"),
    lastMessagePreview: text("last_message_preview"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("direct_conversations_org_participants_unique").on(
      table.orgId,
      table.participantOneId,
      table.participantTwoId,
    ),
    index("direct_conversations_org_last_message_idx").on(table.orgId, table.lastMessageAt),
  ],
);

export const directConversationMembers = pgTable(
  "direct_conversation_members",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => directConversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadCreatedAt: timestamp("last_read_created_at"),
    lastReadMessageId: text("last_read_message_id"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("direct_conversation_members_user_idx").on(table.userId),
  ],
);

export const channelMemberState = pgTable(
  "channel_member_state",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => classChannels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadCreatedAt: timestamp("last_read_created_at"),
    lastReadMessageId: text("last_read_message_id"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.userId] }),
    index("channel_member_state_user_idx").on(table.userId),
  ],
);

export const messageNotificationOutbox = pgTable(
  "message_notification_outbox",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").notNull(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    status: text("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at").defaultNow().notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("message_notification_outbox_due_idx").on(table.status, table.nextAttemptAt),
    uniqueIndex("message_notification_outbox_message_channel_unique").on(
      table.messageId,
      table.channel,
    ),
  ],
);

export const messageMigrationQuarantine = pgTable("message_migration_quarantine", {
  id: text("id").primaryKey(),
  originalMessageId: text("original_message_id").notNull().unique(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  content: text("content").notNull(),
  media: text("media"),
  createdAt: timestamp("created_at").notNull(),
  reason: text("reason").notNull(),
  quarantinedAt: timestamp("quarantined_at").defaultNow().notNull(),
});

export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventType: activityEventType("event_type").notNull(),
    entityType: activityEntityType("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    metadata: text("metadata"),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_log_actor_occurred_idx").on(table.actorId, table.occurredAt),
    index("activity_log_actor_event_idx").on(table.actorId, table.eventType),
    index("activity_log_class_occurred_idx").on(table.classId, table.occurredAt),
  ],
);

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  class: one(classes, {
    fields: [notifications.classId],
    references: [classes.id],
  }),
}));

// Quiz system
export const quizStatus = pgEnum("quiz_status", ["draft", "published"]);
export const quizAttemptStatus = pgEnum("quiz_attempt_status", ["pending_review", "graded"]);
export const quizQuestionType = pgEnum("quiz_question_type", [
  "single_choice",
  "multiple_select",
  "true_false",
  "short_answer",
]);

export const quizzes = pgTable(
  "quizzes",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: quizStatus("status").notNull().default("draft"),
    dueDate: timestamp("due_date"),
    timeLimitSeconds: text("time_limit_seconds"),
    totalPoints: text("total_points"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("quizzes_class_idx").on(table.classId),
    index("quizzes_status_idx").on(table.status),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    type: quizQuestionType("type").notNull(),
    points: text("points").notNull(),
    order: text("order_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("quiz_questions_quiz_idx").on(table.quizId)],
);

export const quizOptions = pgTable(
  "quiz_options",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("quiz_options_question_idx").on(table.questionId)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: quizAttemptStatus("status").notNull().default("graded"),
    score: text("score"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
    gradedAt: timestamp("graded_at"),
    timeSpentSeconds: text("time_spent_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("quiz_attempts_quiz_idx").on(table.quizId),
    uniqueIndex("quiz_attempts_student_quiz_unique").on(table.quizId, table.studentId),
  ],
);

export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    selectedOptionIds: text("selected_option_ids"), // JSON string array
    textAnswer: text("text_answer"),
    isCorrect: boolean("is_correct"),
    pointsAwarded: text("points_awarded"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("quiz_answers_attempt_idx").on(table.attemptId)],
);

export const quizRelations = relations(quizzes, ({ one, many }) => ({
  class: one(classes, {
    fields: [quizzes.classId],
    references: [classes.id],
  }),
  creator: one(user, {
    fields: [quizzes.createdBy],
    references: [user.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionRelations = relations(quizQuestions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
  options: many(quizOptions),
  answers: many(quizAnswers),
}));

export const quizOptionRelations = relations(quizOptions, ({ one }) => ({
  question: one(quizQuestions, {
    fields: [quizOptions.questionId],
    references: [quizQuestions.id],
  }),
}));

export const quizAttemptRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  student: one(user, {
    fields: [quizAttempts.studentId],
    references: [user.id],
  }),
  answers: many(quizAnswers),
}));

export const quizAnswerRelations = relations(quizAnswers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [quizAnswers.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(quizQuestions, {
    fields: [quizAnswers.questionId],
    references: [quizQuestions.id],
  }),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
    relationName: "sender",
  }),
  receiver: one(user, {
    fields: [messages.receiverId],
    references: [user.id],
    relationName: "receiver",
  }),
}));

export const classChannelRelations = relations(classChannels, ({ one, many }) => ({
  class: one(classes, {
    fields: [classChannels.classId],
    references: [classes.id],
  }),
  creator: one(user, {
    fields: [classChannels.createdBy],
    references: [user.id],
  }),
  messages: many(channelMessages),
}));

export const channelMessageRelations = relations(channelMessages, ({ one }) => ({
  channel: one(classChannels, {
    fields: [channelMessages.channelId],
    references: [classChannels.id],
  }),
  sender: one(user, {
    fields: [channelMessages.senderId],
    references: [user.id],
  }),
}));

export const whiteboards = pgTable(
  "whiteboards",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Class Whiteboard"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    data: text("data").notNull().default("[]"),
    lastSequence: integer("last_sequence").default(0).notNull(),
    snapshotSequence: integer("snapshot_sequence").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("whiteboards_class_unique").on(table.classId),
    index("whiteboards_class_idx").on(table.classId),
    index("whiteboards_owner_idx").on(table.ownerId),
  ],
);

export const whiteboardSnapshots = pgTable(
  "whiteboard_snapshots",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => whiteboards.id, { onDelete: "cascade" }),
    document: jsonb("document").$type<Record<string, unknown>>().notNull(),
    version: integer("version").default(1).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("whiteboard_snapshots_board_unique").on(table.boardId),
    index("whiteboard_snapshots_version_idx").on(table.version),
  ],
);

export const whiteboardOperations = pgTable(
  "whiteboard_operations",
  {
    id: text("id").primaryKey(),
    whiteboardId: text("whiteboard_id")
      .notNull()
      .references(() => whiteboards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    opType: text("op_type").notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("whiteboard_operations_whiteboard_idx").on(table.whiteboardId),
    index("whiteboard_operations_user_idx").on(table.userId),
    uniqueIndex("whiteboard_operations_sequence_unique").on(table.whiteboardId, table.sequence),
  ],
);

export const whiteboardCursors = pgTable(
  "whiteboard_cursors",
  {
    id: text("id").primaryKey(),
    whiteboardId: text("whiteboard_id")
      .notNull()
      .references(() => whiteboards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    x: text("x").notNull(),
    y: text("y").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("whiteboard_cursors_whiteboard_idx").on(table.whiteboardId),
    index("whiteboard_cursors_user_idx").on(table.userId),
  ],
);

export const whiteboardRelations = relations(whiteboards, ({ one, many }) => ({
  class: one(classes, {
    fields: [whiteboards.classId],
    references: [classes.id],
  }),
  cursors: many(whiteboardCursors),
  operations: many(whiteboardOperations),
  snapshots: many(whiteboardSnapshots),
}));

export const whiteboardSnapshotRelations = relations(whiteboardSnapshots, ({ one }) => ({
  whiteboard: one(whiteboards, {
    fields: [whiteboardSnapshots.boardId],
    references: [whiteboards.id],
  }),
  creator: one(user, {
    fields: [whiteboardSnapshots.createdBy],
    references: [user.id],
  }),
}));

export const whiteboardCursorRelations = relations(whiteboardCursors, ({ one }) => ({
  whiteboard: one(whiteboards, {
    fields: [whiteboardCursors.whiteboardId],
    references: [whiteboards.id],
  }),
  user: one(user, {
    fields: [whiteboardCursors.userId],
    references: [user.id],
  }),
}));

export const whiteboardOperationRelations = relations(whiteboardOperations, ({ one }) => ({
  whiteboard: one(whiteboards, {
    fields: [whiteboardOperations.whiteboardId],
    references: [whiteboards.id],
  }),
  user: one(user, {
    fields: [whiteboardOperations.userId],
    references: [user.id],
  }),
}));

// ---------------------------------------------------------------------------
// AI assistant
// ---------------------------------------------------------------------------

export const aiConversationSurface = pgEnum("ai_conversation_surface", ["dashboard", "class", "resource", "study"]);
export const aiMessageRole = pgEnum("ai_message_role", ["user", "assistant", "system"]);
export const aiMessageStatus = pgEnum("ai_message_status", [
  "completed",
  "generating",
  "failed",
]);
export const orgMemoryCategory = pgEnum("org_memory_category", [
  "teaching_rules",
  "subject_knowledge",
  "class_context",
  "workflow_preferences",
]);
export const aiSecurityEventType = pgEnum("ai_security_event_type", [
  "injection_detected",
  "injection_rejected",
  "output_redacted",
  "conversation_locked",
  "canary_leak_detected",
]);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    surface: aiConversationSurface("surface").notNull(),
    entityId: text("entity_id").notNull(), // "dashboard" for dashboard, class id for class, resource id for resource
    title: text("title").notNull().default("New chat"),
    isDefault: boolean("is_default").default(false).notNull(),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("ai_conversations_user_org_idx").on(table.userId, table.orgId),
    index("ai_conversations_surface_entity_idx").on(table.surface, table.entityId),
    index("ai_conversations_user_org_last_message_idx")
      .on(table.userId, table.orgId, table.lastMessageAt)
      .where(sql`surface = 'dashboard'`),
    uniqueIndex("ai_conversations_class_default_unique")
      .on(table.userId, table.orgId, table.surface, table.entityId)
      .where(sql`surface = 'class' AND is_default = true`),
  ],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: aiMessageRole("role").notNull(),
    content: text("content").notNull().default(""),
    provider: text("provider"),
    model: text("model"),
    status: aiMessageStatus("status").notNull().default("completed"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    clientMessageId: text("client_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("ai_messages_conversation_idx").on(table.conversationId),
    index("ai_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("ai_messages_conversation_created_id_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    uniqueIndex("ai_messages_conversation_client_message_unique").on(
      table.conversationId,
      table.clientMessageId,
    ),
  ],
);

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(),
    weight: integer("weight").notNull().default(1),
    /** Correlates a usage event with its AI run (request-level identifier). */
    runId: text("run_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_usage_events_user_created_idx").on(table.userId, table.createdAt),
    index("ai_usage_events_org_created_idx").on(table.orgId, table.createdAt),
    index("ai_usage_events_run_idx").on(table.runId),
  ],
);

export const aiTokenLogs = pgTable(
  "ai_token_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(),
    model: text("model"),
    provider: text("provider"),
    /** Correlates a token log with its AI run (request-level identifier). */
    runId: text("run_id"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
    cacheHit: boolean("cache_hit").default(false).notNull(),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull().default("success"),
    errorMessage: text("error_message"),
    unpriced: boolean("unpriced").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_token_logs_user_idx").on(table.userId),
    index("ai_token_logs_org_idx").on(table.orgId),
    index("ai_token_logs_task_idx").on(table.taskType),
    index("ai_token_logs_provider_idx").on(table.provider),
    index("ai_token_logs_run_idx").on(table.runId),
    index("ai_token_logs_created_idx").on(table.createdAt),
  ],
);

export const aiSecurityEvents = pgTable(
  "ai_security_events",
  {
    id: text("id").primaryKey(),
    eventType: aiSecurityEventType("event_type").notNull(),
    patternMatched: text("pattern_matched"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    inputHash: text("input_hash"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_security_events_user_idx").on(table.userId),
    index("ai_security_events_created_idx").on(table.createdAt),
  ],
);

export const conversationSummaries = pgTable(
  "conversation_summaries",
  {
    conversationId: text("conversation_id")
      .primaryKey()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    messageCount: integer("message_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("conversation_summaries_updated_idx").on(table.updatedAt)],
);

export const orgMemories = pgTable(
  "org_memories",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    position: integer("position").notNull().default(0),
    embedding: jsonb("embedding").$type<number[] | null>(),
    embeddingModel: text("embedding_model"),
    embeddingVersion: text("embedding_version"),
    category: orgMemoryCategory("category").notNull().default("teaching_rules"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_memories_org_idx").on(table.orgId),
    index("org_memories_org_position_idx").on(table.orgId, table.position),
    index("org_memories_org_category_idx").on(table.orgId, table.category),
    check("org_memories_title_length", sql`char_length(${table.title}) <= 200`),
    check("org_memories_content_length", sql`char_length(${table.content}) <= 4000`),
    check("org_memories_position_non_negative", sql`${table.position} >= 0`),
  ],
);

export const aiConversationRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(user, {
    fields: [aiConversations.userId],
    references: [user.id],
  }),
  organization: one(organizations, {
    fields: [aiConversations.orgId],
    references: [organizations.id],
  }),
  messages: many(aiMessages),
  summary: one(conversationSummaries, {
    fields: [aiConversations.id],
    references: [conversationSummaries.conversationId],
  }),
}));

export const aiMessageRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const orgMemoryRelations = relations(orgMemories, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMemories.orgId],
    references: [organizations.id],
  }),
}));

/* --------------------------------------------------------------------------- */
/* AI feedback, action proposals, and tool events (run-attributable)           */
/* --------------------------------------------------------------------------- */

export const aiFeedbackRating = pgEnum("ai_feedback_rating", ["up", "down"]);

export const aiFeedback = pgTable(
  "ai_feedback",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => aiMessages.id, { onDelete: "cascade" }),
    runId: text("run_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rating: aiFeedbackRating("rating").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_feedback_message_user_unique").on(table.messageId, table.userId),
    index("ai_feedback_user_idx").on(table.userId),
    index("ai_feedback_org_idx").on(table.orgId),
    index("ai_feedback_run_idx").on(table.runId),
  ],
);

export const aiActionProposalStatus = pgEnum("ai_action_proposal_status", [
  "completed",
  "failed",
]);

/**
 * Durable idempotency ledger for confirmed AI actions. The primary key IS the
 * proposal id issued by the action tool; re-confirming a completed proposal
 * replays the stored result instead of creating another entity.
 */
export const aiActionProposals = pgTable(
  "ai_action_proposals",
  {
    id: text("id").primaryKey(),
    runId: text("run_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: aiActionProposalStatus("status").notNull().default("completed"),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("ai_action_proposals_user_idx").on(table.userId),
    index("ai_action_proposals_org_idx").on(table.orgId),
    index("ai_action_proposals_run_idx").on(table.runId),
  ],
);

/** Per-tool-call usage metrics for the tool-quality evaluation loop. */
export const aiToolEvents = pgTable(
  "ai_tool_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id"),
    messageId: text("message_id").references(() => aiMessages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    success: boolean("success").notNull().default(true),
    emptyResult: boolean("empty_result").notNull().default(false),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_tool_events_tool_idx").on(table.toolName),
    index("ai_tool_events_run_idx").on(table.runId),
    index("ai_tool_events_org_idx").on(table.orgId),
  ],
);
