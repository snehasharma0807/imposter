-- Enable RLS on default_categories and allow anyone (including unauthenticated
-- users using the anon key) to read rows. No write access via the API.

ALTER TABLE default_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read default categories" ON default_categories
  FOR SELECT USING (true);
