# Engineering & Product Decision Log

## 1. Database Architecture: Supabase (PostgreSQL)

* **Options Considered:** MongoDB (NoSQL) vs. PostgreSQL (Relational).
* **Decision:** PostgreSQL via Supabase.
* **Reasoning:** The assignment strictly requires relational databases. Relational tables are necessary to satisfy Rohan's requirement ("no magic numbers, show exact line items"). By linking an `expenses` table to an `expense_splits` table via Foreign Keys, the system can instantly run aggregated `SUM()` queries to calculate balances while preserving the exact row-level breakdown.

## 2. Foreign Exchange (FX) Rate Strategy

* **Options Considered:** Real-time API fetching based on user geolocation vs. Hardcoded fallback rate.
* **Decision:** Hardcoded static conversion rate (1 USD = 83 INR).
* **Reasoning:** Relying on live geolocation APIs introduces testability issues. During the live evaluation, the amounts would fluctuate based on the day or the examiner's network. A static constant ensures the system is highly predictable, idempotent, and defensible in a technical interview.

## 3. Handling Duplicate Entries

* **Options Considered:** Silently overwrite, auto-delete, or quarantine.
* **Decision:** Quarantine (Flag as `pending_review`).
* **Reasoning:** Meera explicitly requested to "approve anything the app deletes or changes." Auto-resolving duplicates violates this product requirement. All suspected duplicates are imported but isolated in the UI until human intervention approves the deletion.

## 4. Time-Varying Memberships (Move-ins / Move-outs)

* **Options Considered:** Hardcode active dates in the code vs. store in DB vs. silently ignore members who left.
* **Decision:** Database-driven timestamps (`joined_at` and `left_at` in `group_memberships`), coupled with manual UI resolution for anomalies.
* **Reasoning:** Sam requested his balance not be affected by prior months. Silently dropping Meera from an April expense could accidentally inflate everyone else's share without their consent. The importer flags the row, blocks the calculation, and forces the user to explicitly confirm the new split distribution via the UI.

## 5. Ambiguous Dates & Formatting

* **Options Considered:** US Convention (MM/DD) vs. Rest of World Convention (DD/MM).
* **Decision:** Strict fallback to `DD/MM/YYYY`.
* **Reasoning:** Given the context of the expenses (transactions in INR, locations like Goa and Dmart), the Indian date convention is the most logically sound default for edge cases like `04/05/2026`.
