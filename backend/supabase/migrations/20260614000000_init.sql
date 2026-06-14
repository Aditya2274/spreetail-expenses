-- Phase 2: Supabase SQL migrations for the schema defined in SCOPE.md

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS expense_splits CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS import_anomalies CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS expense_status CASCADE;
DROP TYPE IF EXISTS resolution_status CASCADE;

-- Enums
CREATE TYPE expense_status AS ENUM ('active', 'pending_review', 'action_required');
CREATE TYPE resolution_status AS ENUM ('pending', 'resolved');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

-- Group Memberships
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATE NOT NULL,
    left_at DATE
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    paid_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for 'Unknown'
    base_amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL,
    converted_inr_amount DECIMAL(12, 2) NOT NULL,
    status expense_status NOT NULL DEFAULT 'active'
);

-- Expense Splits
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_owed DECIMAL(12, 2) NOT NULL
);

-- Settlements
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL
);

-- Import Anomalies
CREATE TABLE import_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_row_index INTEGER,
    raw_data JSONB NOT NULL,
    anomaly_type TEXT NOT NULL,
    resolution_status resolution_status NOT NULL DEFAULT 'pending'
);

-- ========================================================
-- SEED DATA (Required for CSV matching to work!)
-- ========================================================
INSERT INTO users (name) VALUES 
('Aisha'), 
('Rohan'), 
('Priya'), 
('Meera');

INSERT INTO group_memberships (user_id, joined_at)
SELECT id, '2020-01-01' FROM users;

-- ========================================================
-- RLS POLICIES (Bypass security for testing data flow)
-- ========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all anon operations" ON users FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all anon operations" ON group_memberships FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all anon operations" ON expenses FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all anon operations" ON expense_splits FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all anon operations" ON settlements FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE import_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all anon operations" ON import_anomalies FOR ALL TO anon USING (true) WITH CHECK (true);
