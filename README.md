# SwiftNotes Web - Complete Setup & Installation Guide

Welcome to SwiftNotes Web! This guide will walk you through setting up the entire project from scratch on a new machine. Because SwiftNotes leverages advanced features like Local AI Semantic mapping, Live Collaboration, and YouTube Native Frame Extraction, you will need to install a few external dependencies.

---

## 🚀 1. Prerequisites (System Dependencies)

Before touching the codebase, you must install the following software on your system (Windows/Mac/Linux):

### 🟢 Node.js & Git
- **Node.js**: Download and install the latest LTS version from [nodejs.org](https://nodejs.org/).
- **Git**: Download and install from [git-scm.com](https://git-scm.com/).

### 🤖 Ollama (Local AI Engine)
SwiftNotes uses **Ollama** natively to process Semantic tags and AI queries locally without API costs.
1. Download Ollama from [ollama.com](https://ollama.com) and install it.
2. Open your terminal and pull the lightweight Gemma model we use:
   ```bash
   ollama pull gemma:2b
   ```
3. Keep Ollama running in the background while using the app.

### 🎥 FFmpeg & YT-DLP (YouTube Engine)
To allow SwiftNotes to snap actual visual frames from YouTube videos, you need these installed and injected into your system's `PATH`.
1. **FFmpeg**: 
   - Windows: Download via `winget install ffmpeg` or from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/), then add the `bin` folder to your System Environment Variables `PATH`.
   - Mac: `brew install ffmpeg`
2. **YT-DLP**:
   - Install Python, then run:
     ```bash
     pip install yt-dlp
     ```
   - Ensure you can type `yt-dlp --version` and `ffmpeg -version` in your terminal without errors.

---

## 🛠️ 2. Database & Authentication Setup

SwiftNotes uses **Clerk** for User Authentication and **Supabase** (PostgreSQL) for Data & Collaboration signaling.

### Set Up Clerk
1. Go to [clerk.com](https://clerk.com), create an application, and select Email/Google login.
2. Go to the "API Keys" page to get your Publishable and Secret keys.

### Set Up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Go to Project Settings -> API to get your `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Open the **SQL Editor** in your Supabase dashboard.
4. Locate the `supabase_migrations_v1.sql` and `supabase_migrations_v2.sql` files in the root of this project.
5. Copy and paste the contents of both files into the SQL Editor and **Run** them. This will build all required tables (`Notebook`, `NotePage`, `Snap`, `RoomAccessRequest`, `UserFavorite`, `NotebookVote`, etc.) and set up Realtime features.

---

## 💻 3. Project Installation

Now, let's wire up the actual code.

1. **Clone the repository:**
   ```bash
   git clone <your-repo-link>
   cd SwiftNotesWeb
   ```

2. **Install all NPM Packages:**
   ```bash
   npm install
   # or explicitly bypass peer warnings if any occur:
   # npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables:**
   Create a file named `.env.local` in the root folder (`SwiftNotesWeb/.env.local`) and paste the following keys, replacing the values with your actual dashboard keys:

   ```env
   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Supabase Database
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=ey...

   # Liveblocks (Optional - Currently bypassed for Native Yjs on Supabase)
   # NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_live_...
   ```

---

## ⚡ 4. Start the Application

You're completely ready! Just boot up the development server:

```bash
npm run dev
```

- Head over to `http://localhost:3000` in your browser.
- Sign in, create a notebook, and explore!

> **Troubleshooting:**

> - Ensure Ollama is running (`ollama run gemma:2b`) if AI features or semantic Community Search is spinning forever.

> - If YouTube Video Snaps result in empty thumbnails, double check that `yt-dlp` and `ffmpeg` are successfully mapped to your System PATH variables.
