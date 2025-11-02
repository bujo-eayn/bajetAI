# Supabase Storage Setup Guide

This guide walks you through setting up the storage bucket for PDF documents in Supabase.

## Prerequisites

- ✅ Database schema created (001_initial_schema.sql)
- ✅ RLS policies applied (002_rls_policies.sql)
- ✅ Supabase project: https://uugujlvezpminoxlsevo.supabase.co

---

## Step 1: Create Storage Bucket

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/uugujlvezpminoxlsevo/storage/buckets

2. **Create New Bucket**
   - Click **"New bucket"** button
   - Bucket name: `documents`
   - Public bucket: **Yes** (so published documents can be accessed)
   - File size limit: `52428800` (50 MB in bytes)
   - Allowed MIME types: `application/pdf`
   - Click **"Create bucket"**

---

## Step 2: Configure Storage Policies

Storage policies control who can upload, download, and delete files.

### Policy 1: Officials Can Upload Files

1. Go to **Storage > Policies** tab
2. Click **"New policy"** for the `documents` bucket
3. Select **"Custom"** (for full control)
4. Configure:
   - **Policy name:** `Officials can upload files`
   - **Allowed operation:** `INSERT`
   - **Target roles:** Leave as `public` (we'll use custom logic)
   - **Policy definition (WITH CHECK):**
     ```sql
     bucket_id = 'documents' AND
     (auth.role() = 'authenticated' AND
     EXISTS (
       SELECT 1 FROM public.profiles
       WHERE profiles.id = auth.uid()
       AND profiles.role = 'official'
     ))
     ```
5. Click **"Review"** then **"Save policy"**

### Policy 2: Anyone Can Download Files

1. Click **"New policy"** for the `documents` bucket
2. Select **"Custom"**
3. Configure:
   - **Policy name:** `Anyone can download files`
   - **Allowed operation:** `SELECT`
   - **Target roles:** `public`
   - **Policy definition (USING):**
     ```sql
     bucket_id = 'documents'
     ```
4. Click **"Review"** then **"Save policy"**

### Policy 3: Officials Can Delete Own Files

1. Click **"New policy"** for the `documents` bucket
2. Select **"Custom"**
3. Configure:
   - **Policy name:** `Officials can delete own files`
   - **Allowed operation:** `DELETE`
   - **Target roles:** Leave as `public`
   - **Policy definition (USING):**
     ```sql
     bucket_id = 'documents' AND
     (auth.role() = 'authenticated' AND
     auth.uid()::text = (storage.foldername(name))[1] AND
     EXISTS (
       SELECT 1 FROM public.profiles
       WHERE profiles.id = auth.uid()
       AND profiles.role = 'official'
     ))
     ```
4. Click **"Review"** then **"Save policy"**

---

## Step 3: Verify Storage Setup

### Test Upload (Manual Test)

1. Go to **Storage > documents bucket**
2. Try uploading a test PDF file
3. Verify file appears in bucket
4. Note the file URL format: `https://uugujlvezpminoxlsevo.supabase.co/storage/v1/object/public/documents/[filename]`

### Test from Application (Later)

Once authentication is set up, you'll test:

- ✅ Officials can upload PDFs
- ✅ Officials can delete their own PDFs
- ✅ Public users can view/download PDFs for published documents
- ❌ Public users cannot upload or delete

---

## File Organization Strategy

We'll organize uploaded files by user ID:

```
documents/
├── [user_id]/
│   ├── [timestamp]-document1.pdf
│   ├── [timestamp]-document2.pdf
│   └── ...
```

This structure allows:

- Easy deletion of user's files
- Clear ownership tracking
- No filename conflicts

### Example Upload Code (Preview)

```typescript
// This will be implemented in Phase 3: Document Upload
const fileName = `${user.id}/${Date.now()}-${file.name}`;
const { data, error } = await supabase.storage.from('documents').upload(fileName, file);
```

---

## Storage Limits

### Free Tier Limits:

- Storage: 1 GB
- Bandwidth: 2 GB
- File uploads: Unlimited (within storage limit)

### Recommended Limits for Production:

- Individual file size: 50 MB (configured above)
- Total storage: Monitor in dashboard
- Consider upgrading to Pro if exceeding limits

---

## Troubleshooting

### Issue: Cannot upload files

**Solution:**

- Check if user is authenticated
- Verify user has `role = 'official'` in profiles table
- Check browser console for detailed error
- Verify storage policies are created correctly

### Issue: Files not accessible publicly

**Solution:**

- Ensure bucket is set to **Public**
- Check that SELECT policy exists
- Verify file URL format is correct

### Issue: Storage quota exceeded

**Solution:**

- Check Supabase dashboard for usage
- Consider upgrading plan
- Implement file cleanup for old documents

---

## Next Steps

After setting up storage:

1. ✅ Run database migrations
2. ✅ Set up storage bucket
3. ⏳ Generate TypeScript types
4. ⏳ Test database connection
5. ⏳ Move to Phase 2: Authentication

---

## Quick Checklist

- [ ] Created `documents` bucket
- [ ] Set bucket to public
- [ ] Set file size limit to 50 MB
- [ ] Restricted to PDF files only
- [ ] Created "Officials can upload" policy
- [ ] Created "Anyone can download" policy
- [ ] Created "Officials can delete own files" policy
- [ ] Tested manual upload (optional)

---

**Last Updated:** 2025-11-02
