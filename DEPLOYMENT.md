# Deployment Guide for Vercel

This guide covers deploying UpClass to Vercel with the repository's gated build, optional database migrations, and Supabase Storage setup. Keep [`env.example`](env.example) as the authoritative variable list.

## Prerequisites

Before deploying, make sure you have:

1. ✅ A Vercel account
2. ✅ A PostgreSQL database (Neon, Supabase, or other)
3. ✅ A Supabase project for Storage and Realtime
4. ✅ Google OAuth credentials (for authentication)
5. ✅ A Cerebras API key (for resource AI chat features via Vercel AI SDK)
6. ✅ (Optional) Resend API key (for transactional emails)

## Deployment Process

### 1. Connect Your Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub/GitLab repository
4. Select the repository: `upclass`

### 2. Configure Environment Variables

Add these environment variables in Vercel:

**Core Variables:**

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# Auth
BETTER_AUTH_SECRET=generate-a-random-secret-here
BETTER_AUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# AI - Uses Vercel AI SDK with Cerebras via OpenAI-compatible provider
CEREBRAS_API_KEY=your-cerebras-api-key
# Optional: defaults to gpt-oss-120b
CEREBRAS_MODEL=gpt-oss-120b
```

**Optional Variables:**

```env
# Email (for transactional emails)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="UpClass <notifications@your-domain.com>"
EMAIL_REPLY_TO=support@your-domain.com

# AI fallbacks, embeddings, cache, quotas, and cron protection
GEMINI_API_KEY=...
GROQ_API_KEY=...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=...
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=...
AI_CANARY_SECRET=...
AI_MONTHLY_CREDIT_LIMIT=500
CRON_SECRET=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SUPABASE_WHITEBOARD_BUCKET=whiteboards
```

**How to add variables in Vercel:**
1. Go to your project settings
2. Click **"Environment Variables"**
3. Add each variable for **Production**, **Preview**, and **Development**

### 3. Configure Build Settings

Vercel should auto-detect these settings, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build:vercel` _(already configured in vercel.json)_
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Node Version:** 20.x or higher

### 4. Deploy!

Click **"Deploy"** and Vercel will:

1. ✅ Install dependencies
2. ✅ Run ESLint checks (`npm run lint`)
3. ✅ Run TypeScript checks (`npm run type-check`)
4. ✅ Run tests (`npm run test`)
5. ✅ Run database migrations (`npm run db:migrate`)
6. ✅ Set up storage buckets (`npm run deploy:setup`)
   - Creates `avatars`, `resources`, and `media` buckets
   - Attempts to set up RLS policies (if supported)
7. ✅ Build the Next.js application
8. ✅ Deploy to production

### 5. Post-Deployment Setup

After the first successful deployment:

#### A. Verify Storage Buckets

1. Go to your Supabase dashboard → Storage
2. Verify these buckets exist:
   - ✅ `avatars` (4 MB limit, public)
   - ✅ `resources` (16 MB limit, public)
   - ✅ `media` (16 MB limit, public)

If any bucket is missing, create it manually or run:
```bash
npm run storage:setup
```

#### B. Set Up RLS Policies (If Not Auto-Created)

If the deployment logs show "Could not auto-create RLS policies":

1. Go to Supabase dashboard → SQL Editor
2. Open the file `scripts/storage-policies.sql`
3. Copy all the SQL
4. Paste into SQL Editor and click **"Run"**

This sets up the Row Level Security policies for file uploads.

#### C. Configure Google OAuth Redirect URIs

Add your Vercel domain to Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Select your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```

#### D. Test Your Deployment

1. Visit your deployed site: `https://your-domain.vercel.app`
2. Sign in with Google
3. Try creating a class
4. Try uploading a file (avatar, resource, or media)
5. Test real-time features (messages, notifications)

## Continuous Deployment

Every push to your `main` branch will trigger a new deployment with:

- ✅ Automatic database migrations
- ✅ Automatic storage bucket creation (if missing)
- ✅ Full test suite validation
- ✅ Type checking and linting

**Preview Deployments:**

Pushes to other branches create preview deployments that:
- Use the same environment variables
- Run the same build process
- Don't affect production data

## Troubleshooting

### Build Fails During Migration

**Error:** `Database migration failed`

**Solution:**
1. Check that `DATABASE_URL` is set correctly in Vercel
2. Verify your database is accessible from Vercel's IP range
3. Check migration files in `db/migrations/`

### Storage Bucket Creation Fails

**Error:** `Failed to create bucket`

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Create buckets manually in Supabase dashboard
3. Re-deploy or skip automatic setup

### File Upload Not Working

**Possible causes:**
1. ❌ Buckets not created → Run `npm run storage:setup`
2. ❌ RLS policies missing → Run SQL from `scripts/storage-policies.sql`
3. ❌ Service role key incorrect → Check Vercel environment variables

### OAuth Redirect Not Working

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Add your Vercel domain to Google OAuth redirect URIs
2. Use exact URL: `https://your-domain.vercel.app/api/auth/callback/google`
3. Wait a few minutes for Google to update settings

### Environment Variables Not Loading

**Solution:**
1. Go to Vercel project → Settings → Environment Variables
2. Verify each variable is set for **Production**, **Preview**, and **Development**
3. Redeploy after adding/updating variables

## Production Checklist

Before going live, verify:

- [ ] All environment variables are set in Vercel
- [ ] Database migrations have run successfully
- [ ] Storage buckets are created
- [ ] RLS policies are set up
- [ ] Google OAuth redirect URIs include production domain
- [ ] Custom domain is configured (if applicable)
- [ ] SSL/HTTPS is working
- [ ] Test user sign-up flow
- [ ] Test file uploads
- [ ] Test real-time features
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)

## Updating the App

To deploy updates:

1. Make changes locally
2. Test locally: `npm run dev`
3. Run checks: `npm run lint && npm run type-check && npm run test`
4. Commit and push to GitHub
5. Vercel automatically deploys from `main` branch

## Rollback

If a deployment breaks production:

1. Go to Vercel dashboard
2. Click on the previous successful deployment
3. Click **"Promote to Production"**
4. Fix the issue locally
5. Deploy again when ready

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Better Auth Deployment](https://www.better-auth.com/docs/deployment)

## Support

If you encounter issues:

1. Check the Vercel build logs
2. Check the Vercel function logs
3. Review this deployment guide
4. Check `SUPABASE_STORAGE_SETUP.md` for storage issues
5. Open an issue on GitHub
