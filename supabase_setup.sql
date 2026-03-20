-- SQL Setup for SwiftNotes
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/oxatkigymmzgqqihlkfw/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "clerkId" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "avatar" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Notebook table
CREATE TABLE IF NOT EXISTS "Notebook" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "coverColor" TEXT DEFAULT 'from-[#A18CD1] to-[#FBC2EB]',
  "isPublic" BOOLEAN DEFAULT false,
  "likes" INTEGER DEFAULT 0,
  "views" INTEGER DEFAULT 0,
  "youtubeUrl" TEXT,
  "otp" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create NotePage table
CREATE TABLE IF NOT EXISTS "NotePage" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "notebookId" TEXT NOT NULL REFERENCES "Notebook"("id") ON DELETE CASCADE,
  "pageNumber" INTEGER NOT NULL,
  "content" TEXT,
  "drawingData" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("notebookId", "pageNumber")
);

-- 4. Create Snap table
CREATE TABLE IF NOT EXISTS "Snap" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "notePageId" TEXT NOT NULL REFERENCES "NotePage"("id") ON DELETE CASCADE,
  "imageUrl" TEXT NOT NULL,
  "caption" TEXT,
  "x" DOUBLE PRECISION DEFAULT 0,
  "y" DOUBLE PRECISION DEFAULT 0,
  "rotation" DOUBLE PRECISION DEFAULT 0
);

-- 5. Create UserStats table for Productivity
CREATE TABLE IF NOT EXISTS "UserStats" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "streakCount" INTEGER DEFAULT 0,
  "lastActiveDate" DATE DEFAULT CURRENT_DATE,
  "targetHours" INTEGER DEFAULT 2,
  "reputation" INTEGER DEFAULT 0
);

-- Grant permissions (Service Role has all by default, but let's be explicit for public access if needed later)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notebook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotePage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Snap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserStats" ENABLE ROW LEVEL SECURITY;

-- Simple Policy for Service Role (already exists implicitly, but ensures no lockout)
-- Note: Our server actions use supabaseAdmin (Service Role Key), so they bypass RLS.
-- If you want to enable public read/write later, you can add policies here.
