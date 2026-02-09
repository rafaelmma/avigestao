# 🔐 RLS Policy Implementation Guide

## What is Row-Level Security (RLS)?

RLS ensures that at the **database level**, users can only access their own data, even if they somehow bypass the frontend.

**Currently:** Frontend filters by `user_id` (can be bypassed)  
**After RLS:** Database enforces access control (bulletproof)

---

## Implementation (Copy-Paste Ready)

### Step 1: Open Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Create a new query

### Step 2: Enable RLS and Create Policies (for ALL tables)

Copy-paste this entire SQL block:

```sql
-- ========================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ========================================

-- Birds
ALTER TABLE birds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own birds"
  ON birds
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Pairs
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own pairs"
  ON pairs
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Clutches
ALTER TABLE clutches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own clutches"
  ON clutches
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Movements
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own movements"
  ON movements
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Medications
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own medications"
  ON medications
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own applications"
  ON applications
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Treatments
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own treatments"
  ON treatments
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own transactions"
  ON transactions
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tasks"
  ON tasks
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Tournaments
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tournaments"
  ON tournaments
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Breeder Settings
ALTER TABLE breeder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own settings"
  ON breeder_settings
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Sexing Requests
ALTER TABLE sexing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own sexing requests"
  ON sexing_requests
  FOR ALL
  USING (auth.uid()::text = user_id);
```

### Step 3: Execute

1. Paste the entire SQL above into the SQL Editor
2. Click **Run** button (or Ctrl+Enter)
3. Wait for confirmation: "✓ Success. No rows returned"

### Step 4: Verify

Go to **Authentication > Policies** (in Supabase dashboard) and confirm all tables show the policy.

---

## Testing RLS Works

### In Your App (should still work fine)

- ✅ Login as user1
- ✅ Add a bird
- ✅ Should see the bird (own data)

### Security Test (should be blocked)

In browser console:

```javascript
// This should FAIL (not authorized)
const { data, error } = await supabase.from('birds').select('*').eq('user_id', 'OTHER_USER_ID');

console.log(error); // Should show "permission denied"
```

---

## What If Something Breaks?

### Error: "new row violates row-level security policy"

**Cause:** `user_id` doesn't match authenticated user

**Fix in app:** Make sure you're always setting:

```typescript
const dbPayload = {
  id: bird.id,
  user_id: session.user.id, // ← This must match auth user
  name: bird.name,
  // ...
};
```

### Data Disappears After Enabling RLS

**Cause:** Old data doesn't have `user_id` populated

**Fix:** Update existing rows:

```sql
UPDATE birds SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE pairs SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- ... repeat for all tables
```

### How to Disable RLS (if you need to debug)

```sql
ALTER TABLE birds DISABLE ROW LEVEL SECURITY;
-- Repeat for other tables
```

⚠️ **Only do this temporarily for debugging!**

---

## Summary

✅ **Time needed:** 5 minutes (copy-paste + run)  
✅ **Risk level:** Low (can be undone instantly)  
✅ **Impact:** Massive security improvement  
✅ **Required before production:** YES

Once this is done, your app is **production-ready** 🚀
