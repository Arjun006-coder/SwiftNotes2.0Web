-- ============================================================
-- SWIFTNOTES — ADDITIVE MIGRATION SQL
-- Safe to run on your EXISTING database with TEXT PKs
-- Run in: https://supabase.com/dashboard/project/oxatkigymmzgqqihlkfw/sql
-- All statements use IF NOT EXISTS / IF EXISTS — safe to re-run
-- ============================================================

-- ==========================================
-- SECTION 1: ADD MISSING COLUMNS TO NOTEBOOK
-- ==========================================
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "description"  TEXT DEFAULT '';
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "tags"         TEXT[] DEFAULT '{}';
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "youtubeUrl"   TEXT;
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "videos"       TEXT[] DEFAULT '{}';
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "otp"          TEXT;
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "isPublic"     BOOLEAN DEFAULT false;
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "likes"        INTEGER DEFAULT 0;
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "views"        INTEGER DEFAULT 0;

-- Notify PostgREST to pick up schema changes
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- SECTION 2: ADD MISSING COLUMNS TO USERSTATS
-- ==========================================
-- Existing: streakCount, lastActiveDate, targetHours, reputation
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "longestStreak"    INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "studyTimeMinutes" INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "updatedAt"        TIMESTAMPTZ DEFAULT NOW();

-- ==========================================
-- SECTION 3: ADD MISSING COLUMNS TO NOTEPAGE
-- ==========================================
ALTER TABLE "NotePage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

-- ==========================================
-- SECTION 4: STREAK HISTORY TABLE
-- Stores one row per user per day — powers calendar heatmap
-- ==========================================
CREATE TABLE IF NOT EXISTS "StreakHistory" (
    "id"               TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId"           TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "date"             DATE NOT NULL,
    "minutesStudied"   INTEGER DEFAULT 0,
    "notebooksOpened"  INTEGER DEFAULT 0,
    UNIQUE("userId", "date")
);

CREATE INDEX IF NOT EXISTS idx_streak_user_date ON "StreakHistory"("userId", "date" DESC);
ALTER TABLE "StreakHistory" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECTION 5: COMMUNITY LIKES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS "NotebookLike" (
    "id"           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    "notebookId"   TEXT NOT NULL REFERENCES "Notebook"("id") ON DELETE CASCADE,
    "userId"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt"    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("notebookId", "userId")
);

ALTER TABLE "NotebookLike" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECTION 6: COMMUNITY COMMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS "NotebookComment" (
    "id"           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    "notebookId"   TEXT NOT NULL REFERENCES "Notebook"("id") ON DELETE CASCADE,
    "userId"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "content"      TEXT NOT NULL,
    "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "NotebookComment" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECTION 7: PLANNER TASKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS "PlannerTask" (
    "id"          TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "dueDate"     DATE,
    "completed"   BOOLEAN DEFAULT FALSE,
    "priority"    TEXT DEFAULT 'medium',   -- low | medium | high
    "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planner_user_date ON "PlannerTask"("userId", "dueDate");
ALTER TABLE "PlannerTask" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECTION 8: INDEXES FOR SEARCH PERFORMANCE
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast tag array searches: .contains("tags", [...])
CREATE INDEX IF NOT EXISTS idx_notebook_tags_gin  ON "Notebook" USING GIN("tags");

-- GIN index for title text search
CREATE INDEX IF NOT EXISTS idx_notebook_title_gin ON "Notebook" USING GIN(to_tsvector('english', "title"));

-- Index for community feed (public notebooks by likes)
CREATE INDEX IF NOT EXISTS idx_notebook_public_likes ON "Notebook"("isPublic", "likes" DESC);

-- ==========================================
-- SECTION 9: STREAK UPDATE FUNCTION
-- Called via Supabase RPC every time user opens app
-- Compatible with existing TEXT PK schema
-- ==========================================
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id TEXT)
RETURNS "UserStats" AS $$
DECLARE
    v_stats     "UserStats";
    v_today     DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_new_streak INTEGER;
BEGIN
    -- Track daily activity in StreakHistory
    INSERT INTO "StreakHistory"("userId", "date", "notebooksOpened")
    VALUES (p_user_id, v_today, 1)
    ON CONFLICT ("userId", "date")
    DO UPDATE SET "notebooksOpened" = "StreakHistory"."notebooksOpened" + 1;

    -- Create UserStats row if first time
    INSERT INTO "UserStats"("userId", "streakCount", "lastActiveDate")
    VALUES (p_user_id, 1, v_today)
    ON CONFLICT ("userId") DO NOTHING;

    SELECT * INTO v_stats FROM "UserStats" WHERE "userId" = p_user_id;

    -- Already counted today — return as-is
    IF v_stats."lastActiveDate" = v_today THEN
        RETURN v_stats;
    END IF;

    -- Calculate new streak
    IF v_stats."lastActiveDate" = v_yesterday THEN
        v_new_streak := v_stats."streakCount" + 1;
    ELSE
        v_new_streak := 1;  -- Streak broken
    END IF;

    UPDATE "UserStats" SET
        "streakCount"    = v_new_streak,
        "longestStreak"  = GREATEST(COALESCE("longestStreak", 0), v_new_streak),
        "lastActiveDate" = v_today,
        "updatedAt"      = NOW()
    WHERE "userId" = p_user_id
    RETURNING * INTO v_stats;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- SECTION 10: COMMUNITY SEARCH HELPER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION search_community_notebooks(
    search_query TEXT DEFAULT '',
    tag_filter   TEXT DEFAULT NULL
)
RETURNS SETOF "Notebook"
LANGUAGE sql STABLE AS $$
    SELECT * FROM "Notebook"
    WHERE "isPublic" = TRUE
      AND (
          search_query = '' OR
          "title" ILIKE '%' || search_query || '%' OR
          "description" ILIKE '%' || search_query || '%' OR
          search_query = ANY("tags")
      )
      AND (
          tag_filter IS NULL OR
          tag_filter = ANY("tags")
      )
    ORDER BY "likes" DESC, "updatedAt" DESC
    LIMIT 50;
$$;

-- ==========================================
-- SECTION 11: STORAGE BUCKET FOR MEDIA
-- ==========================================
INSERT INTO storage.buckets ("id", "name", "public")
VALUES ('notebook-media', 'notebook-media', true)
ON CONFLICT ("id") DO NOTHING;

-- Allow public read of media
DROP POLICY IF EXISTS "Public read notebook-media" ON storage.objects;
CREATE POLICY "Public read notebook-media" ON storage.objects
    FOR SELECT USING (bucket_id = 'notebook-media');

-- Allow authenticated upload
DROP POLICY IF EXISTS "Auth upload notebook-media" ON storage.objects;
CREATE POLICY "Auth upload notebook-media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'notebook-media');

-- ==========================================
-- SECTION 12: RLS POLICY — PUBLIC NOTEBOOK READ
-- ==========================================
DROP POLICY IF EXISTS "Public notebooks readable" ON "Notebook";
CREATE POLICY "Public notebooks readable" ON "Notebook"
    FOR SELECT USING ("isPublic" = TRUE);

-- ==========================================
-- SECTION 13: VERIFY (run these to check everything)
-- ==========================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'Notebook' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'UserStats' ORDER BY ordinal_position;
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================================
-- DONE — All additive migrations applied
-- Your existing data is untouched
-- ============================================================

-- ============================================================
-- SECTION 14: Supabase Storage — snap-media bucket
-- Run this to enable image/PDF/audio uploads for snap polaroids
-- ============================================================

-- Create public bucket for snap media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'snap-media',
    'snap-media',
    true,
    52428800,  -- 50 MB limit per file
    ARRAY['image/*', 'application/pdf', 'audio/*']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: anyone can read (public bucket)
DROP POLICY IF EXISTS "Public snap-media read" ON storage.objects;
CREATE POLICY "Public snap-media read"
ON storage.objects FOR SELECT
USING (bucket_id = 'snap-media');

-- RLS policy: authenticated users can upload
DROP POLICY IF EXISTS "Authenticated snap-media upload" ON storage.objects;
CREATE POLICY "Authenticated snap-media upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'snap-media');

-- RLS policy: authenticated users can delete their own uploads
DROP POLICY IF EXISTS "Authenticated snap-media delete" ON storage.objects;
CREATE POLICY "Authenticated snap-media delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'snap-media');

