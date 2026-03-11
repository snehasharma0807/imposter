-- collection_access: tracks share links (user_id=NULL) and user access (user_id set)
CREATE TABLE IF NOT EXISTS collection_access (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID  REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  access_type TEXT    NOT NULL CHECK (access_type IN ('edit', 'view')),
  share_code  TEXT    UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT user_or_sharecode CHECK (user_id IS NOT NULL OR share_code IS NOT NULL)
);

ALTER TABLE collection_access ENABLE ROW LEVEL SECURITY;

-- Collection owners can manage all access records for their collections
CREATE POLICY "Owners manage collection access" ON collection_access
  FOR ALL USING (
    collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
  );

-- Users can see and insert their own access records
CREATE POLICY "Users manage own access" ON collection_access
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can look up active share links (user_id IS NULL) for preview
CREATE POLICY "Public share code lookup" ON collection_access
  FOR SELECT USING (user_id IS NULL AND share_code IS NOT NULL);

-- -------------------------------------------------------------------------
-- Update collections RLS so access-granted users can read shared collections
-- -------------------------------------------------------------------------
CREATE POLICY "Shared collections readable by access users" ON collections
  FOR SELECT USING (
    id IN (
      SELECT collection_id FROM collection_access WHERE user_id = auth.uid()
    )
  );

-- Allow access users to read words in collections they have access to
CREATE POLICY "Words readable by access users" ON words
  FOR SELECT USING (
    collection_id IN (
      SELECT collection_id FROM collection_access WHERE user_id = auth.uid()
    )
  );

-- Allow edit-access users to add words
CREATE POLICY "Words writable by edit-access users" ON words
  FOR INSERT WITH CHECK (
    collection_id IN (
      SELECT collection_id FROM collection_access
      WHERE user_id = auth.uid() AND access_type = 'edit'
    )
  );

-- Allow edit-access users to delete words
CREATE POLICY "Words deletable by edit-access users" ON words
  FOR DELETE USING (
    collection_id IN (
      SELECT collection_id FROM collection_access
      WHERE user_id = auth.uid() AND access_type = 'edit'
    )
  );
