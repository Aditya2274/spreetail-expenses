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

* *Error:* [Leave this blank and fill it in when Antigravity makes a mistake with a React hook or a Supabase join query tonight].
* *Fix:* [Your fix here].

**Correction 3:**

* *Error:* [Leave blank for now].
* *Fix:* [Your fix here].
