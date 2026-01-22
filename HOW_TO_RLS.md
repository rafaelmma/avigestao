# ✅ How to Run RLS Implementation (Step-by-Step)

## What is RLS?
RLS (Row-Level Security) is a database feature that prevents users from accessing each other's data at the **database level** (not just the frontend). It's the final security piece your app needs.

**Current State:** Frontend filters data (can be bypassed)  
**After RLS:** Database enforces access control (bulletproof) ✅

---

## 🚀 Implementation (Copy-Paste Ready)

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Login with your account
3. **Select your AviGestão project**
4. In the left sidebar, click **SQL Editor** (looks like a code icon)

### Step 2: Create a New Query
1. Click the **"+ New Query"** button (top left of SQL Editor)
2. A blank SQL editor window opens

### Step 3: Copy-Paste This SQL Code
Paste the **entire code below** into the SQL editor:

```sql
-- ========================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- This prevents users from accessing each other's data
-- ========================================

-- Birds Table
ALTER TABLE birds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own birds"
  ON birds
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Pairs Table
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own pairs"
  ON pairs
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Clutches Table
ALTER TABLE clutches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own clutches"
  ON clutches
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Movements Table
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own movements"
  ON movements
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Medications Table
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own medications"
  ON medications
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Applications Table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own applications"
  ON applications
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Treatments Table
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own treatments"
  ON treatments
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Transactions Table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own transactions"
  ON transactions
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Tasks Table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tasks"
  ON tasks
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Tournaments Table
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tournaments"
  ON tournaments
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Breeder Settings Table
ALTER TABLE breeder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own settings"
  ON breeder_settings
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Sexing Requests Table
ALTER TABLE sexing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own sexing requests"
  ON sexing_requests
  FOR ALL
  USING (auth.uid()::text = user_id);
```

### Step 4: Execute the SQL
1. Click the **blue "Run" button** (or press Ctrl+Enter)
2. Wait for the query to complete (usually 5-10 seconds)
3. You should see: **✓ Success. No rows returned**

### Step 5: Verify It Worked
1. Go to **Authentication > Policies** (left sidebar under "Authentication")
2. You should see all 12 tables listed with a policy badge
3. Confirm each table shows: "✓ [Number] policies"

**Example:**
```
🔒 birds              ✓ 1 policy
🔒 pairs              ✓ 1 policy
🔒 clutches           ✓ 1 policy
🔒 movements          ✓ 1 policy
🔒 medications        ✓ 1 policy
🔒 applications       ✓ 1 policy
🔒 treatments         ✓ 1 policy
🔒 transactions       ✓ 1 policy
🔒 tasks              ✓ 1 policy
🔒 tournaments        ✓ 1 policy
🔒 breeder_settings   ✓ 1 policy
🔒 sexing_requests    ✓ 1 policy
```

---

## ✅ Test That It Works

### Test 1: Your App Should Still Work
1. Refresh your app
2. Login as your user
3. Add a bird
4. Refresh the page
5. **✅ Bird should still be there** (means RLS allows your own data)

### Test 2: Verify Security
In your browser console (F12 → Console tab):

```javascript
// This should FAIL (returns error, not data)
const { data, error } = await supabase
  .from('birds')
  .select('*')
  .eq('user_id', 'DIFFERENT_USER_ID_HERE');

console.log(error); // Should say "permission denied"
```

---

## 🚨 If Something Goes Wrong

### Error: "relation does not exist"
**Cause:** Table name is wrong  
**Fix:** Check exact table names in Supabase dashboard → Tables

### Error: "new row violates row-level security policy"
**Cause:** `user_id` doesn't match your auth user  
**Fix:** In your app code, make sure you're setting:
```typescript
user_id: session.user.id  // This must match auth
```

### Data Disappears
**Cause:** Old data doesn't have `user_id` set  
**Fix:** Update existing rows (run this SQL):
```sql
UPDATE birds SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- Repeat for other tables
```

### Disable RLS Temporarily (for debugging)
```sql
ALTER TABLE birds DISABLE ROW LEVEL SECURITY;
-- Repeat for other tables
```
⚠️ Only use this temporarily! Re-enable when done.

---

## 🎯 Summary

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Open Supabase Dashboard | 1 min | 📍 Start here |
| 2 | Click SQL Editor | 10 sec | ✅ Easy |
| 3 | Copy-paste SQL code | 30 sec | ✅ Easy |
| 4 | Click Run button | 10 sec | ✅ Easy |
| 5 | Verify in Policies tab | 30 sec | ✅ Easy |
| 6 | Test in your app | 2 min | ✅ Should work |

**Total Time:** ~5 minutes

---

## 📋 Checklist

Before you consider yourself done:

- [ ] Opened Supabase Dashboard
- [ ] Clicked SQL Editor
- [ ] Copied and pasted the SQL code
- [ ] Clicked Run button
- [ ] Saw "Success" message
- [ ] Checked Policies tab (all tables have policies)
- [ ] Tested in app (added bird, refreshed, still there)
- [ ] Tested security (tried accessing different user's data, got error)

---

## 🚀 Next Steps After RLS

After RLS is done, your app is **production ready**! 🎉

1. Verify Vercel environment variables are set (STRIPE_SECRET_KEY, etc.)
2. Do a final test with real browser (not dev mode)
3. Deploy! (`git push origin main` - Vercel auto-deploys)

---

## 💡 Pro Tips

**If you want to see RLS policies you just created:**
```sql
SELECT * FROM pg_policies;
```

**If you want to temporarily test without RLS:**
```sql
-- Run these to disable RLS temporarily
ALTER TABLE birds DISABLE ROW LEVEL SECURITY;
ALTER TABLE pairs DISABLE ROW LEVEL SECURITY;
-- ... etc
```

**If you need to delete a policy:**
```sql
DROP POLICY "Users can only access their own birds" ON birds;
```

---

**Ready?** Go to https://app.supabase.com and start with Step 1! 🚀

Questions? Check [FINAL_REPORT.md](FINAL_REPORT.md) for more details.
