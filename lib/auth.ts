import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";  // path to your Drizzle client

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // optionally, you can pass schema/table config here
    // e.g. { schema: { user: ..., session: ..., account: ..., verification: ... } }
  }),
  // enable OAuth providers:
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // ... other providers if you like
  },
  // configure session/cookies as needed
  session: {
    cookieCache: { enabled: true },
  },
  // other settings (email/password if you want fallback, etc.)
});
