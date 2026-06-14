# Project Scope & Data Handling Specification

## 1. Database Schema (Supabase / PostgreSQL)

To meet the strict relational database requirement and handle complex time-varying group logic, the following schema must be implemented:

* **`users`**:
  * `id` (UUID, PK)
  * `name` (String, Unique) - Standardized to Title Case.
* **`group_memberships`**:
  * `id` (UUID, PK)
  * `user_id` (UUID, FK to users)
  * `joined_at` (Date)
  * `left_at` (Date, Nullable)
* **`expenses`**:
  * `id` (UUID, PK)
  * `date` (Date)
  * `description` (String)
  * `paid_by_id` (UUID, FK to users, Nullable for 'Unknown')
  * `base_amount` (Decimal)
  * `currency` (String)
  * `converted_inr_amount` (Decimal)
  * `status` (Enum: 'active', 'pending_review', 'action_required')
* **`expense_splits`**:
  * `id` (UUID, PK)
  * `expense_id` (UUID, FK to expenses)
  * `user_id` (UUID, FK to users)
  * `amount_owed` (Decimal)
* **`settlements`**:
  * `id` (UUID, PK)
  * `payer_id` (UUID, FK to users)
  * `payee_id` (UUID, FK to users)
  * `amount` (Decimal)
  * `date` (Date)
* **`import_anomalies`**:
  * `id` (UUID, PK)
  * `original_row_index` (Integer)
  * `raw_data` (JSONB)
  * `anomaly_type` (String)
  * `resolution_status` (Enum: 'pending', 'resolved')

---

## 2. CSV Anomaly Log & Resolution Policies

The importer module must programmatically detect the following anomalies in `expenses_export.csv` and apply these strict policies:

1. **Conflicting Duplicates (Different amounts/payers for same event)**
   * *Detection:* Similar description/date, differing amounts (e.g., Thalassa dinner).
   * *Policy:* Flag both. Import both but set status to `pending_review`. Do not auto-resolve.
2. **Exact Duplicates (Identical rows)**
   * *Detection:* Identical date, description, payer, and amount (e.g., Marina Bites).
   * *Policy:* Flag both. Import with status `pending_review` for user decision.
3. **Foreign Currency (USD)**
   * *Detection:* `currency` field is "USD".
   * *Policy:* Convert to INR using a hardcoded configuration constant (1 USD = 83 INR).
4. **Missing Currency**
   * *Detection:* `currency` field is empty or NaN.
   * *Policy:* Default to 'INR' but flag with an anomaly log for user confirmation.
5. **Time-Varying Membership Violations**
   * *Detection:* User in `split_with` who has already moved out (e.g., Meera in April).
   * *Policy:* Set expense status to `action_required`. Require user to manually update the `split_with` list via the UI before the split is calculated.
6. **Settlements Disguised as Expenses**
   * *Detection:* Description implies repayment (e.g., "Rohan paid Aisha back", "deposit share").
   * *Policy:* Do not insert into `expenses`. Reroute data to the `settlements` table.
7. **Invalid Percentage Splits (>100%)**
   * *Detection:* `split_details` percentages sum to >100%.
   * *Policy:* Reject row insertion into `expenses`. Flag as `action_required` for user to fix.
8. **Negative Amounts (Refunds)**
   * *Detection:* `amount` < 0.
   * *Policy:* Convert amount to positive absolute value. Swap the logic so the original payer now owes the original payees.
9. **Formatting Errors (Names & Whitespace)**
   * *Detection:* "Priya S", "rohan ", leading/trailing spaces on amounts.
   * *Policy:* Auto-correct. Trim whitespace, convert strings to Title Case, and map to existing UUIDs using case-insensitive/fuzzy matching. Log the correction in `import_anomalies`.
10. **Missing Payer (`paid_by`)**
    * *Detection:* `paid_by` is empty/NaN.
    * *Policy:* Insert into `expenses` with a `null` FK (or placeholder 'Unknown' user). Flag for user to assign later.
11. **Non-Member Guests in Split**
    * *Detection:* Unrecognized name in `split_with` (e.g., "Kabir").
    * *Policy:* The guest's calculated share is absorbed by the group. Split the guest's cost equally among the recognized valid group members.
12. **Zero-Amount Expenses**
    * *Detection:* `amount` = 0.
    * *Policy:* Import normally as a valid ₹0 expense. Log in anomalies for visibility only.
13. **Conflicting Split Types**
    * *Detection:* `split_type` says 'equal', but `split_details` contains numerical shares.
    * *Policy:* The `split_type` field takes strict precedence. Calculate as equal, ignore details, and log the conflict.
14. **Ambiguous Date Formats**
    * *Detection:* Mixed `YYYY-MM-DD`, `DD/MM/YYYY`, and `MM/DD/YYYY`.
    * *Policy:* Standardize strictly to Indian date convention (`DD/MM/YYYY`) for ambiguous dates (e.g., `04/05/2026` resolves to April 5th, not May 4th).
