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
