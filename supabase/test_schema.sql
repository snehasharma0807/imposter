-- Test queries to verify schema and RLS

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('collections', 'words', 'default_categories')
ORDER BY table_name;

-- Check columns for collections
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'collections'
ORDER BY ordinal_position;

-- Check columns for words
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'words'
ORDER BY ordinal_position;

-- Check columns for default_categories
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'default_categories'
ORDER BY ordinal_position;

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('collections', 'words', 'default_categories')
ORDER BY tablename;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('collections', 'words')
ORDER BY tablename, policyname;