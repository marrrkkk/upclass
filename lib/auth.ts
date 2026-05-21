import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";  // path to your Drizzle client
import * as schema from "@/db/schema";
import { siteUrl } from "@/lib/seo";

// Determine base URL for production/development
const getBaseURL = () => {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
  trustedOrigins: [
    getBaseURL(),
    siteUrl,
    process.env.NEXT_PUBLIC_APP_URL || "",
  ].filter(Boolean),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  // Enable email + password authentication
  emailAndPassword: {
    enabled: true,
  },
  // enable OAuth providers:
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // configure session/cookies as needed
  session: {
    cookieCache: { enabled: true },
  },
});
