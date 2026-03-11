# Imposter App

A party game where players receive secret word assignments — one or more players are secretly the "imposter" who doesn't know the word. After everyone checks their role, the group discusses and tries to identify the imposter before revealing who it was.

## Features

- **No-account game mode** — pick a category, set player count, play instantly
- **Custom word lists** — create and manage your own categories
- **Sharing** — share lists with friends via a link (view or edit access)
- **Accounts** — save lists across sessions with Supabase Auth

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/) (Postgres + Auth + RLS)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

## Local Development

### 1. Clone & install

```bash
git clone <your-repo-url>
cd imposter-app
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy your **Project URL** and **anon public** key.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Run the database migrations

Open the **SQL Editor** in your Supabase dashboard and run each migration file in order:

| File | Purpose |
|------|---------|
| [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) | Core tables: `collections`, `words`, `default_categories` + RLS |
| [`supabase/migrations/002_default_categories_rls.sql`](supabase/migrations/002_default_categories_rls.sql) | Public read access for built-in categories |
| [`supabase/migrations/003_collection_access.sql`](supabase/migrations/003_collection_access.sql) | Share links and per-user access grants |

Then run this snippet to fix an RLS circular dependency between `collections` and `collection_access`:

```sql
CREATE OR REPLACE FUNCTION auth_owns_collection(col_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM collections WHERE id = col_id AND user_id = auth.uid())
$$;

DROP POLICY IF EXISTS "Owners manage collection access" ON collection_access;
CREATE POLICY "Owners manage collection access" ON collection_access
  FOR ALL
  USING (auth_owns_collection(collection_id))
  WITH CHECK (auth_owns_collection(collection_id));
```

### 5. Enable Supabase Auth

In your Supabase dashboard, go to **Authentication → Providers** and ensure **Email** is enabled. Configure your site URL under **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (development) or your Vercel URL (production)

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Run tests

```bash
npm test
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
2. Vercel will auto-detect Next.js — no build settings need to change.

### 3. Add environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 4. Update Supabase Auth URLs

In Supabase **Authentication → URL Configuration**:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**`

### 5. Deploy

Click **Deploy** in Vercel (or push a new commit). The app will be live at your Vercel URL.

---

## Project Structure

```
app/
  page.tsx                   # Landing page
  game/
    setup/page.tsx           # Game configuration
    play/page.tsx            # Game play (reveal → discussion → results)
  dashboard/page.tsx         # User's word lists
  collections/
    new/page.tsx             # Create a list
    [id]/edit/page.tsx       # Edit a list + share settings
    import/[share_code]/     # Import a shared list
  auth/
    login/page.tsx
    signup/page.tsx
  api/                       # Route handlers (Supabase server-side)

lib/
  game-logic.ts              # Pure game logic (word selection, imposter assignment)
  GameContext.tsx            # React context for game state
  supabase.ts                # Browser Supabase client

supabase/migrations/         # SQL migrations (run manually in Supabase SQL editor)

__tests__/                   # Jest + Testing Library test suites
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |

Both variables are prefixed with `NEXT_PUBLIC_` so they are available in the browser. They are safe to expose — Supabase Row Level Security controls all data access.
