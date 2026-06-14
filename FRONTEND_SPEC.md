# Frontend Specification & API Mapping

## 1. Tech Stack & State

* **Framework:** React with TypeScript.
* **Styling:** Tailwind CSS (keep it minimal and functional, no heavy design systems).
* **Routing:** `react-router-dom` for simple navigation.

## 2. Required Views (Mapping to User Requests)

### View A: Dashboard (Aisha's Request)

* **Goal:** "One number per person. Who pays whom, how much."
* **Component:** `<Dashboard />`
* **Data to Fetch:** `GET /api/balances`
* **UI Elements:** * A clean list or grid showing each group member's current net balance.
  * Green text for "Owed" (positive balance), Red text for "Owes" (negative balance).

### View B: Individual Expense Breakdown (Rohan's Request)

* **Goal:** "No magic numbers. See exactly which expenses make up the balance."
* **Component:** `<UserDetail id={userId} />`
* **Data to Fetch:** `GET /api/users/:id/expenses`
* **UI Elements:**
  * A table listing every exact line item from the `expense_splits` table for that specific user.
  * Columns: Date, Description, Total Expense Amount, User's Exact Share.

### View C: CSV Upload & Anomaly Queue (Meera's Request)

* **Goal:** "Clean up duplicates but I want to approve anything the app deletes or changes."
* **Component:** `<ImportManager />`
* **Data to Fetch:** * `POST /api/upload` (multipart/form-data for the CSV)
  * `GET /api/anomalies` (to fetch the `pending_review` items)
* **UI Elements:**
  * A file upload input for `expenses_export.csv`.
  * An **Anomaly Resolution Table** that maps to the `import_anomalies` database table.
  * Each row in this table must show the flagged data and have two buttons: **[Approve (Insert)]** and **[Reject (Delete)]**.
  * Clicking a button sends a `POST /api/anomalies/:id/resolve` request.

## 3. API Contract (Backend to Frontend Mapping)

The React frontend must use standard `fetch` or `axios` to hit these exact Express routes:

* `GET /api/users` -> Returns active group members.
* `GET /api/balances` -> Returns aggregated `SUM()` from `expense_splits` per user.
* `GET /api/users/:userId/expenses` -> Returns row-level details for Rohan's view.
* `POST /api/expenses/upload` -> The endpoint that triggers the `csv-parser` controller.
* `GET /api/anomalies` -> Returns rows where `resolution_status` is 'pending'.
* `POST /api/anomalies/:anomalyId/resolve` -> Payload `{ action: 'approve' | 'reject' }`.

## 4. Component Architecture

Build the following component tree:

```text
<App>
  <Navigation />
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/user/:id" element={<UserDetail />} />
    <Route path="/import" element={<ImportManager />} />
  </Routes>
</App>
```
