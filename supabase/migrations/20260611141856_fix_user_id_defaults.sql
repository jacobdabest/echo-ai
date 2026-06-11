/*
# Fix user_id defaults for RLS insert policies

1. Modified Tables
- `memories`: Add DEFAULT auth.uid() to user_id
- `conversations`: Add DEFAULT auth.uid() to user_id  
- `knowledge`: Add DEFAULT auth.uid() to user_id
- `login_history`: Add DEFAULT auth.uid() to user_id

2. Why
According to RLS best practices, owner columns must have DEFAULT auth.uid() so that 
frontend inserts (which naturally omit user_id) satisfy the WITH CHECK policy.
Without this default, inserts fail with "new row violates row-level security policy".

3. Security
No RLS changes - existing policies remain correct.
*/

ALTER TABLE memories ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE conversations ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE knowledge ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE login_history ALTER COLUMN user_id SET DEFAULT auth.uid();
