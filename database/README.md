# bajetAI Database Setup

Complete guide for setting up the Supabase database for bajetAI.

## Overview

The bajetAI database uses **PostgreSQL** (via Supabase) with:

- 4 core tables (profiles, documents, comments, comment_summaries)
- Row Level Security (RLS) for data protection
- Automated triggers for timestamps and profile creation
- Storage bucket for PDF files

---

## Quick Start

### 1. Run Database Migrations

Execute these SQL scripts in **Supabase SQL Editor** (in order):

```
1. migrations/001_initial_schema.sql    (Tables, indexes, triggers)
2. migrations/002_rls_policies.sql      (Security policies)
```

**How to run:**

1. Go to: https://supabase.com/dashboard/project/uugujlvezpminoxlsevo/sql/new
2. Copy contents of `001_initial_schema.sql`
3. Paste into SQL Editor
4. Click **"Run"**
5. Repeat for `002_rls_policies.sql`

### 2. Set Up Storage

Follow the detailed guide in [STORAGE_SETUP.md](./STORAGE_SETUP.md)

**Quick steps:**

1. Create `documents` bucket (public, 50MB limit, PDF only)
2. Add 3 storage policies (upload, download, delete)

### 3. Generate TypeScript Types

After running migrations, generate types for TypeScript:

```bash
npm run db:types
```

This will create `types/database.types.ts` with all table definitions.

---

## Database Schema

### Tables

#### 1. **profiles**

Extends `auth.users` with role-based access control.

| Column     | Type        | Description            |
| ---------- | ----------- | ---------------------- |
| id         | UUID (PK)   | Links to auth.users.id |
| email      | TEXT        | User's email address   |
| full_name  | TEXT        | Display name           |
| role       | TEXT        | 'official' or 'public' |
| created_at | TIMESTAMPTZ | Profile creation time  |
| updated_at | TIMESTAMPTZ | Last update time       |

**Indexes:**

- `idx_profiles_role` - Fast role-based queries

---

#### 2. **documents**

Budget documents with AI-generated summaries.

| Column         | Type        | Description                           |
| -------------- | ----------- | ------------------------------------- |
| id             | UUID (PK)   | Primary key                           |
| title          | TEXT        | Document title                        |
| file_url       | TEXT        | Supabase storage URL                  |
| file_name      | TEXT        | Original filename                     |
| file_size      | INTEGER     | File size in bytes                    |
| uploaded_by    | UUID (FK)   | References profiles.id                |
| status         | TEXT        | 'processing', 'published', 'archived' |
| extracted_text | TEXT        | Raw PDF text                          |
| summary_en     | TEXT        | English summary                       |
| summary_sw     | TEXT        | Swahili summary                       |
| processed      | BOOLEAN     | AI processing complete                |
| created_at     | TIMESTAMPTZ | Upload time                           |
| updated_at     | TIMESTAMPTZ | Last update time                      |

**Indexes:**

- `idx_documents_status` - Filter by status
- `idx_documents_uploaded_by` - User's documents
- `idx_documents_created_at` - Sort by date
- `idx_documents_processed` - Processing status

---

#### 3. **comments**

Citizen comments on budget documents.

| Column      | Type        | Description                       |
| ----------- | ----------- | --------------------------------- |
| id          | UUID (PK)   | Primary key                       |
| document_id | UUID (FK)   | References documents.id           |
| user_name   | TEXT        | Commenter's name                  |
| user_email  | TEXT        | Optional email                    |
| content     | TEXT        | Comment text                      |
| category    | TEXT        | AI-detected category              |
| sentiment   | TEXT        | Optional sentiment                |
| status      | TEXT        | 'pending', 'approved', 'rejected' |
| created_at  | TIMESTAMPTZ | Comment time                      |

**Indexes:**

- `idx_comments_document_id` - Document's comments
- `idx_comments_status` - Moderation filtering
- `idx_comments_created_at` - Sort by date
- `idx_comments_category` - Group by category

---

#### 4. **comment_summaries**

AI-generated summaries grouped by category.

| Column        | Type        | Description             |
| ------------- | ----------- | ----------------------- |
| id            | UUID (PK)   | Primary key             |
| document_id   | UUID (FK)   | References documents.id |
| category      | TEXT        | Category name           |
| summary       | TEXT        | AI summary              |
| comment_count | INTEGER     | Number of comments      |
| created_at    | TIMESTAMPTZ | Generation time         |

**Indexes:**

- `idx_comment_summaries_document_id` - Document summaries
- `idx_comment_summaries_category` - Category filtering

---

## Security (RLS Policies)

### Public Users Can:

- ✅ View published documents and approved comments
- ✅ Submit comments on published documents
- ✅ Download PDF files
- ❌ Cannot upload or modify documents
- ❌ Cannot moderate comments

### Officials Can:

- ✅ Upload, edit, delete their own documents
- ✅ View all documents (any status)
- ✅ View all comments (any status)
- ✅ Moderate comments (approve/reject)
- ✅ Delete inappropriate comments
- ✅ Upload/delete PDF files

### System (Service Role) Can:

- ✅ Create comment summaries
- ✅ Update document processing status
- ✅ Bypass RLS for background jobs

---

## Automated Functions

### 1. Update Timestamp Trigger

Automatically updates `updated_at` on profile and document changes.

### 2. Auto-Create Profile

When a user signs up, automatically creates a profile record with:

- Email from auth
- Full name from metadata
- Role from metadata (defaults to 'public')

---

## Storage Structure

```
documents/
├── [user_id_1]/
│   ├── 1730000001-budget-2024.pdf
│   ├── 1730000002-fiscal-report.pdf
│   └── ...
├── [user_id_2]/
│   └── ...
```

**Benefits:**

- Clear ownership
- Easy bulk deletion
- No filename conflicts

---

## Type Generation

### Automatic (Recommended)

Add this script to `package.json`:

```json
{
  "scripts": {
    "db:types": "npx supabase gen types typescript --project-id uugujlvezpminoxlsevo > types/database.types.ts"
  }
}
```

Then run:

```bash
npm run db:types
```

### Manual

1. Install Supabase CLI: `npm install -g supabase`
2. Run: `supabase gen types typescript --project-id uugujlvezpminoxlsevo > types/database.types.ts`

### Usage

```typescript
import { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
```

---

## Testing Database Setup

### 1. Test Connection

Create a test file: `lib/supabase/test.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export async function testConnection() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('count');

  if (error) {
    console.error('Connection failed:', error);
    return false;
  }

  console.log('Connection successful!');
  return true;
}
```

### 2. Test RLS Policies

Try these scenarios:

- Create a user without auth → Should fail
- View published document without auth → Should succeed
- Submit comment without auth → Should succeed
- Upload document without auth → Should fail
- Upload document as official → Should succeed

---

## Troubleshooting

### Migration Errors

**Error: relation already exists**

- Tables may already be created
- Drop tables and re-run, or modify migration

**Error: permission denied**

- Ensure you're running as project owner
- Check Supabase dashboard permissions

### RLS Policy Errors

**Error: new row violates row-level security policy**

- Check that user is authenticated
- Verify user role in profiles table
- Review policy conditions in SQL

### Connection Errors

**Error: Invalid API key**

- Check `.env.local` has correct values
- Verify keys match Supabase dashboard
- Ensure `NEXT_PUBLIC_` prefix for client keys

---

## Migration History

| #   | File               | Description               | Date       |
| --- | ------------------ | ------------------------- | ---------- |
| 001 | initial_schema.sql | Tables, indexes, triggers | 2025-11-02 |
| 002 | rls_policies.sql   | Security policies         | 2025-11-02 |

---

## Next Steps

After database setup:

1. ✅ Run migrations
2. ✅ Set up storage
3. ⏳ Generate TypeScript types
4. ⏳ Test database connection
5. ⏳ **Phase 2: Authentication** - Create login/signup

---

## Useful Queries

### Count documents by status

```sql
SELECT status, COUNT(*)
FROM documents
GROUP BY status;
```

### View recent comments

```sql
SELECT c.*, d.title
FROM comments c
JOIN documents d ON d.id = c.document_id
ORDER BY c.created_at DESC
LIMIT 10;
```

### Find officials

```sql
SELECT * FROM profiles WHERE role = 'official';
```

---

**Project:** bajetAI
**Database:** PostgreSQL (Supabase)
**Last Updated:** 2025-11-02
