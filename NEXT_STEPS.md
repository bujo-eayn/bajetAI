# bajetAI - Phase 1 Setup Complete! 🎉

## What We Just Built

✅ **Supabase Client Utilities**

- `lib/supabase/client.ts` - Browser client for client components
- `lib/supabase/server.ts` - Server client for API routes & server components

✅ **Database Schema Files**

- `database/migrations/001_initial_schema.sql` - All tables, indexes, triggers
- `database/migrations/002_rls_policies.sql` - Security policies

✅ **Documentation**

- `database/README.md` - Complete database setup guide
- `database/STORAGE_SETUP.md` - Storage bucket configuration

✅ **Type System**

- `types/index.ts` - Comprehensive TypeScript types
- Script added: `npm run db:types` for auto-generation

✅ **Health Check**

- `app/api/health/route.ts` - Test database connection

---

## 🚨 ACTION REQUIRED: Complete These Steps

### Step 1: Run Database Migrations (10 minutes)

1. **Go to Supabase SQL Editor:**
   - URL: https://supabase.com/dashboard/project/uugujlvezpminoxlsevo/sql/new

2. **Run Migration 001 (Schema):**
   - Open: `database/migrations/001_initial_schema.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **"Run"**
   - ✅ Should see "Success. No rows returned"

3. **Run Migration 002 (RLS Policies):**
   - Open: `database/migrations/002_rls_policies.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **"Run"**
   - ✅ Should see "Success. No rows returned"

4. **Verify Tables Created:**
   - Go to: Table Editor
   - Should see: profiles, documents, comments, comment_summaries

---

### Step 2: Set Up Storage Bucket (10 minutes)

Follow the detailed guide in `database/STORAGE_SETUP.md`:

**Quick Steps:**

1. Go to Storage → Create bucket `documents`
2. Set as Public, 50MB limit, PDF only
3. Add 3 policies:
   - Officials can upload
   - Anyone can download
   - Officials can delete own files

---

### Step 3: Add Hugging Face API Key to Vercel (2 minutes)

1. **Go to Vercel Environment Variables:**
   - URL: https://vercel.com/bujo-eayn/bajet-ai/settings/environment-variables

2. **Add Missing Variable:**

   ```
   Name: HUGGING_FACE_API_KEY
   Value: [paste from your .env.local file]
   ☑️ Production
   ☑️ Preview
   ```

3. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

### Step 4: Test Database Connection (2 minutes)

**Once migrations are complete:**

1. **Test Locally:**

   ```bash
   # Make sure dev server is running
   npm run dev

   # Open in browser or curl
   curl http://localhost:3000/api/health
   ```

   **Expected Response:**

   ```json
   {
     "status": "ok",
     "message": "bajetAI is running",
     "database": "connected",
     "timestamp": "2025-11-02T..."
   }
   ```

2. **Test Production (after Vercel redeploy):**
   ```bash
   curl https://bajet-ai.vercel.app/api/health
   ```

---

### Step 5: Generate TypeScript Types (Optional - After Migrations)

Once database tables are created:

```bash
npm run db:types
```

This creates `types/database.types.ts` with exact schema types.

---

## ✅ Phase 1 Checklist

Use this to track your manual steps:

- [ ] Ran `001_initial_schema.sql` in Supabase SQL Editor
- [ ] Ran `002_rls_policies.sql` in Supabase SQL Editor
- [ ] Verified 4 tables exist in Supabase Table Editor
- [ ] Created `documents` storage bucket
- [ ] Added 3 storage policies
- [ ] Added `HUGGING_FACE_API_KEY` to Vercel
- [ ] Redeployed Vercel app
- [ ] Tested `/api/health` endpoint locally (returns "ok")
- [ ] Tested `/api/health` endpoint on Vercel (returns "ok")
- [ ] Ran `npm run db:types` (optional)

---

## 🎯 What's Next - Phase 2: Authentication

Once Phase 1 is complete, we'll build:

1. **Auth Pages** (`/login`, `/signup`)
2. **Middleware** (protect dashboard routes)
3. **Auth Context** (useAuth hook)
4. **Role-Based Access** (official vs public)
5. **Profile Management**

**Estimated Time:** 3-4 days

---

## 🐛 Troubleshooting

### Migration Fails

**Error: "relation already exists"**

- Tables may already exist from previous attempt
- Drop tables and re-run, or skip to RLS policies

**Error: "permission denied"**

- Ensure you're project owner in Supabase
- Check you're on correct project (uugujlvezpminoxlsevo)

### Health Check Fails

**Error: "Database connection failed"**

- Check `.env.local` has correct Supabase URL and keys
- Verify migrations were run successfully
- Check `profiles` table exists

**Error: 404 on /api/health**

- Restart dev server: `npm run dev`
- Clear `.next` folder: `rm -rf .next` then `npm run dev`

### Storage Issues

**Cannot create bucket**

- Check you're on correct project
- Try refreshing the page
- Check browser console for errors

---

## 📁 Files Created (Phase 1)

```
bajetAI/
├── app/api/health/route.ts          # Health check endpoint
├── database/
│   ├── README.md                     # Database setup guide
│   ├── STORAGE_SETUP.md              # Storage configuration
│   └── migrations/
│       ├── 001_initial_schema.sql    # Tables & triggers
│       └── 002_rls_policies.sql      # Security policies
├── lib/supabase/
│   ├── client.ts                     # Browser client
│   └── server.ts                     # Server client
├── types/index.ts                    # TypeScript types
├── package.json                      # Added db:types script
└── NEXT_STEPS.md                     # This file
```

---

## 🆘 Need Help?

1. **Check Documentation:**
   - `database/README.md` - Database setup
   - `database/STORAGE_SETUP.md` - Storage setup
   - `README.md` - Project overview

2. **Review Migration Files:**
   - Read through SQL files to understand schema
   - Check for any syntax errors

3. **Claude Code:**
   - Ask me questions about any step
   - I can help debug issues

---

## 🚀 Ready to Continue?

Once you've completed all checklist items above, let me know and we'll:

1. ✅ Test the database connection
2. ✅ Verify RLS policies work
3. ✅ Move to Phase 2: Authentication

**Status Indicators:**

- 🟢 **Phase 0:** Project Setup - COMPLETE
- 🟡 **Phase 1:** Database & Supabase - IN PROGRESS (code done, manual steps pending)
- ⚪ **Phase 2:** Authentication - READY TO START

---

**Last Updated:** 2025-11-02
**Project:** bajetAI
**GitHub:** https://github.com/bujo-eayn/bajetAI
**Vercel:** https://bajet-ai.vercel.app
