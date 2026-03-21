-- Phase 11: Reddit Community Hub & Ephemeral Authorization Roles

-- Add Views counter to Notebooks for Trending algorithms
ALTER TABLE "Notebook" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;

-- 1. Upvote/Downvote System
CREATE TABLE IF NOT EXISTS "NotebookVote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL, -- 1 for UP, -1 for DOWN
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotebookVote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NotebookVote_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotebookVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotebookVote_notebookId_userId_key" ON "NotebookVote"("notebookId", "userId");

-- 2. Notebook Discussion Comments
CREATE TABLE IF NOT EXISTS "NotebookComment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotebookComment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NotebookComment_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotebookComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Bookmarks / Playlist Favorites
CREATE TABLE IF NOT EXISTS "UserFavorite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserFavorite_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserFavorite_notebookId_userId_key" ON "UserFavorite"("notebookId", "userId");

-- 4. Ephemeral Room Access Requests (Ask-To-Edit functionality)
CREATE TABLE IF NOT EXISTS "RoomAccessRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAccessRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoomAccessRequest_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RoomAccessRequest_notebookId_userId_key" ON "RoomAccessRequest"("notebookId", "userId");
