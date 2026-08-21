export const orgKeys = {
  all: ["organizations"] as const,
}

export const userKeys = {
  byEmail: (email: string) => ["users", "by-email", email] as const,
}