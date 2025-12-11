import { createAuthClient } from "better-auth/react"

// Don't specify baseURL - Better Auth will use relative URLs
// which automatically work on any domain (localhost, Vercel, etc.)
export const authClient = createAuthClient()