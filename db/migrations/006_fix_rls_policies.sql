-- ============================================
-- PARTE 1: DROP ALL EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can read their own pairs" ON pairs;
DROP POLICY IF EXISTS "Users can insert their own pairs" ON pairs;
DROP POLICY IF EXISTS "Users can update their own pairs" ON pairs;
DROP POLICY IF EXISTS "Users can delete their own pairs" ON pairs;

DROP POLICY IF EXISTS "Users can read their own clutches" ON clutches;
DROP POLICY IF EXISTS "Users can insert their own clutches" ON clutches;
DROP POLICY IF EXISTS "Users can update their own clutches" ON clutches;
DROP POLICY IF EXISTS "Users can delete their own clutches" ON clutches;

DROP POLICY IF EXISTS "Users can read their own birds" ON birds;
DROP POLICY IF EXISTS "Users can insert their own birds" ON birds;
DROP POLICY IF EXISTS "Users can update their own birds" ON birds;
DROP POLICY IF EXISTS "Users can delete their own birds" ON birds;

DROP POLICY IF EXISTS "Users can read their own medications" ON medications;
DROP POLICY IF EXISTS "Users can insert their own medications" ON medications;
DROP POLICY IF EXISTS "Users can update their own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete their own medications" ON medications;

DROP POLICY IF EXISTS "Users can read their own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON applications;

DROP POLICY IF EXISTS "Users can read their own movements" ON movements;
DROP POLICY IF EXISTS "Users can insert their own movements" ON movements;
DROP POLICY IF EXISTS "Users can update their own movements" ON movements;
DROP POLICY IF EXISTS "Users can delete their own movements" ON movements;

DROP POLICY IF EXISTS "Users can read their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can read their own tournaments" ON tournaments;
DROP POLICY IF EXISTS "Users can insert their own tournaments" ON tournaments;
DROP POLICY IF EXISTS "Users can update their own tournaments" ON tournaments;
DROP POLICY IF EXISTS "Users can delete their own tournaments" ON tournaments;

DROP POLICY IF EXISTS "Users can read their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can read their own treatments" ON treatments;
DROP POLICY IF EXISTS "Users can insert their own treatments" ON treatments;
DROP POLICY IF EXISTS "Users can update their own treatments" ON treatments;
DROP POLICY IF EXISTS "Users can delete their own treatments" ON treatments;

DROP POLICY IF EXISTS "Users can read their own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;

-- ============================================
-- PARTE 2: ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clutches ENABLE ROW LEVEL SECURITY;
ALTER TABLE birds ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 3: CREATE POLICIES FOR PAIRS
-- ============================================
CREATE POLICY "Users can read their own pairs" ON pairs
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own pairs" ON pairs
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own pairs" ON pairs
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own pairs" ON pairs
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 4: CREATE POLICIES FOR CLUTCHES
-- ============================================
CREATE POLICY "Users can read their own clutches" ON clutches
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own clutches" ON clutches
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own clutches" ON clutches
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own clutches" ON clutches
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 5: CREATE POLICIES FOR BIRDS
-- ============================================
CREATE POLICY "Users can read their own birds" ON birds
  FOR SELECT
  USING (breeder_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own birds" ON birds
  FOR INSERT
  WITH CHECK (breeder_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own birds" ON birds
  FOR UPDATE
  USING (breeder_id::text = auth.uid()::text)
  WITH CHECK (breeder_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own birds" ON birds
  FOR DELETE
  USING (breeder_id::text = auth.uid()::text);

-- ============================================
-- PARTE 6: CREATE POLICIES FOR MEDICATIONS
-- ============================================
CREATE POLICY "Users can read their own medications" ON medications
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own medications" ON medications
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own medications" ON medications
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own medications" ON medications
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 7: CREATE POLICIES FOR APPLICATIONS
-- ============================================
CREATE POLICY "Users can read their own applications" ON applications
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own applications" ON applications
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own applications" ON applications
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own applications" ON applications
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 8: CREATE POLICIES FOR MOVEMENTS
-- ============================================
CREATE POLICY "Users can read their own movements" ON movements
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own movements" ON movements
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own movements" ON movements
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own movements" ON movements
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 9: CREATE POLICIES FOR TASKS
-- ============================================
CREATE POLICY "Users can read their own tasks" ON tasks
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 10: CREATE POLICIES FOR TOURNAMENTS
-- ============================================
CREATE POLICY "Users can read their own tournaments" ON tournaments
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own tournaments" ON tournaments
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own tournaments" ON tournaments
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own tournaments" ON tournaments
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 11: CREATE POLICIES FOR TRANSACTIONS
-- ============================================
CREATE POLICY "Users can read their own transactions" ON transactions
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 12: CREATE POLICIES FOR TREATMENTS
-- ============================================
CREATE POLICY "Users can read their own treatments" ON treatments
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own treatments" ON treatments
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own treatments" ON treatments
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own treatments" ON treatments
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 13: CREATE POLICIES FOR SETTINGS
-- ============================================
CREATE POLICY "Users can read their own settings" ON settings
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own settings" ON settings
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own settings" ON settings
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ============================================
-- PARTE 14: VERIFY POLICIES CREATED
-- ============================================
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pairs', 'clutches', 'birds', 'medications', 'applications',
    'movements', 'tasks', 'tournaments', 'transactions', 'treatments', 'settings'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;
