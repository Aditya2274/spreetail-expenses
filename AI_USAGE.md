# AI Usage & Collaboration Report

**Primary AI Tools Used:**

* **Claude / Gemini:** Used as an initial sounding board to parse the raw CSV, catalog the 12+ anomalies, and whiteboard the business logic and entity relationships.
* **Antigravity (Coding Agent):** Used to rapidly bootstrap the Express/TypeScript boilerplate, Supabase schema migrations, and React frontend components based on strict Markdown specifications.

**Key Prompts Used:**

* "Parse this CSV and identify at least 12 distinct data format anomalies, missing data issues, or logical contradictions."
* "Generate a strictly typed Supabase PostgreSQL schema that handles time-varying group memberships and discrete expense splits."
* "Build a Node.js CSV parsing pipeline that flags [Anomaly X] and routes it to an anomaly approval queue rather than inserting it directly into the database."

**Correction 1:**

* *Error:* The AI initially suggested using an external API to fetch live USD to INR exchange rates.
* *Fix:* I recognized this would make the assignment impossible to cleanly verify during the live code review. I overrode the AI and instructed it to use a hardcoded static conversion rate for deterministic testing.

**Correction 2:**

* *Error:* The AI generated a standard Supabase SQL migration without explicit Row-Level Security (RLS) policies. Since Supabase now heavily enforces RLS by default, the backend's CSV parser crashed with a `42501` Row Level Security violation when attempting to insert new expenses using the `anon` key.
* *Fix:* We updated the `init.sql` script to explicitly enable RLS on all tables and manually appended permissive `Allow all` policies bound to the `anon` role, allowing testing data flow to bypass security blocks.

**Correction 3:**

* *Error:* While dynamically updating the React frontend to point to the live Render backend URL (`VITE_API_URL`), the AI's regex replacement script accidentally left trailing single quotes in Javascript template literals (e.g. `import.meta.env.VITE_API_URL...'`), causing the Vercel Vite production build to fail with syntax errors.
* *Fix:* We executed a secondary Node script to strictly replace the corrupted terminating single quotes with proper backticks across all React components, successfully unblocking the Vercel deployment.
