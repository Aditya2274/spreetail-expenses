# Spreetail Shared Expenses Application

A full-stack web application designed to automatically parse, quarantine, and manage shared group expenses from complex, anomaly-ridden CSV exports.

## 🚀 Features

- **Robust CSV Ingestion:** Parses expenses and intelligently routes rows to an Anomaly Queue based on 14 strict validation policies (e.g., duplicate detection, out-of-bounds splits, missing users, ambiguous dates).
- **Quarantine Workflow:** Structurally flawed records are intercepted and placed in a `pending_review` status where they can be manually approved or rejected via the frontend dashboard.
- **Automated Settlement Generation:** Identifies settlement keywords (e.g., "paid back", "settled") and maps them to a distinct `settlements` database schema instead of standard expenses.
- **Real-Time Balances:** Dynamically calculates who owes whom based on split logic (equal vs. percentage) and hardcoded currency conversions (USD to INR).
- **Supabase Authentication:** Secure, minimal login module leveraging `supabase.auth` to protect the dashboard and link CSV uploads to authenticated users.

## 🛠 Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript, `csv-parser`, Multer
- **Database:** Supabase (PostgreSQL)

## 📦 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- A Supabase Project (for PostgreSQL and Auth)

### 1. Database Setup
1. Open your Supabase Dashboard -> SQL Editor.
2. Run the full migration script located at `backend/supabase/migrations/20260614000000_init.sql`.
3. This will create all 6 core tables (`users`, `expenses`, `expense_splits`, `settlements`, `group_memberships`, `import_anomalies`), insert seed data, and configure permissive RLS policies for local testing.
4. Go to Supabase Auth settings and **Disable "Confirm Email"** to test sign-ups smoothly.

### 2. Backend Configuration
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start the backend server: `npm start` (Runs on `http://localhost:3000`)

### 3. Frontend Configuration
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file mapping to your backend and Supabase:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:3000
   ```
4. Start the Vite development server: `npm run dev`

## ☁️ Deployment

- **Backend (Render):** Set the Root Directory to `backend`, use `npm install` for the Build Command, and `npm start` for the Start Command. Make sure to add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables.
- **Frontend (Vercel):** Set the Root Directory to `frontend`. Vercel automatically detects the Vite preset. Add all three `VITE_` environment variables in the Vercel dashboard.

## ⚠️ Anomaly Policies Implemented
- Semicolon & Comma mixed delimiter parsing.
- Missing `paid_by` assignments.
- Negative amounts converted to positive "refund" logic.
- Unrecognized guests absorbed by the group.
- Exact duplicates vs. Conflicting duplicates.
- Null or ambiguous date quarantining.
- Ex-member expense allocation tracking.

## 🤖 AI Usage & Collaboration Report

**Primary AI Tools Used:**
- **Claude / Gemini:** Used as an initial sounding board to parse the raw CSV, catalog the 12+ anomalies, and whiteboard the business logic and entity relationships.
- **Antigravity (Coding Agent):** Used to rapidly bootstrap the Express/TypeScript boilerplate, Supabase schema migrations, and React frontend components based on strict Markdown specifications.

**Key Prompts Used:**
- "Parse this CSV and identify at least 12 distinct data format anomalies, missing data issues, or logical contradictions."
- "Generate a strictly typed Supabase PostgreSQL schema that handles time-varying group memberships and discrete expense splits."
- "Build a Node.js CSV parsing pipeline that flags [Anomaly X] and routes it to an anomaly approval queue rather than inserting it directly into the database."

**Correction 1:**
- *Error:* The AI initially suggested using an external API to fetch live USD to INR exchange rates.
- *Fix:* I recognized this would make the assignment impossible to cleanly verify during the live code review. I overrode the AI and instructed it to use a hardcoded static conversion rate for deterministic testing.

**Correction 2:**
- *Error:* The AI generated a standard Supabase SQL migration without explicit Row-Level Security (RLS) policies. Since Supabase now heavily enforces RLS by default, the backend's CSV parser crashed with a `42501` Row Level Security violation when attempting to insert new expenses using the `anon` key.
- *Fix:* We updated the `init.sql` script to explicitly enable RLS on all tables and manually appended permissive `Allow all` policies bound to the `anon` role, allowing testing data flow to bypass security blocks.

**Correction 3:**
- *Error:* While dynamically updating the React frontend to point to the live Render backend URL (`VITE_API_URL`), the AI's regex replacement script accidentally left trailing single quotes in Javascript template literals (e.g. `import.meta.env.VITE_API_URL...'`), causing the Vercel Vite production build to fail with syntax errors.
- *Fix:* We executed a secondary Node script to strictly replace the corrupted terminating single quotes with proper backticks across all React components, successfully unblocking the Vercel deployment.
