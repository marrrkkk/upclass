import { relations } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["teacher", "student"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  imageStorageBucket: text("image_storage_bucket"),
  imageStoragePath: text("image_storage_path"),
  cover: text("cover"), // Cover image URL
  coverStorageBucket: text("cover_storage_bucket"),
  coverStoragePath: text("cover_storage_path"),
  coverColor: text("cover_color").default("#3b82f6"), // Default cover color (primary blue)
  bio: text("bio"),
  role: userRole("role"),
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

export const classRole = pgEnum("class_role", ["teacher", "student"]);

export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").default("General"),
    thumbnail: text("thumbnail"),
    code: text("code").notNull().unique(),
    color: text("color").default("#3b82f6"), // Default blue color
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
    index("classes_owner_idx").on(table.ownerId),
    index("classes_code_idx").on(table.code),
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

export const resources = pgTable(
  "resources",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").default("General"),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileType: resourceFileType("file_type").notNull(),
    mimeType: text("mime_type"),
    fileSize: text("file_size"),
    storageBucket: text("storage_bucket"),
    storagePath: text("storage_path"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("resources_owner_idx").on(table.ownerId)],
);

export const resourceRelations = relations(resources, ({ one }) => ({
  owner: one(user, {
    fields: [resources.ownerId],
    references: [user.id],
  }),
}));

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
    storageBucket: text("storage_bucket"),
    storagePath: text("storage_path"),
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
    index("channel_messages_sender_idx").on(table.senderId),
  ],
);

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
