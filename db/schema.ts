import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
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
    fileSize: text("file_size"),
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

export const submissionStatus = pgEnum("submission_status", ["pending", "submitted", "graded"]);

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

export const announcementRelations = relations(announcements, ({ one }) => ({
  class: one(classes, {
    fields: [announcements.classId],
    references: [classes.id],
  }),
  author: one(user, {
    fields: [announcements.authorId],
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
