-- Create collections table
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  share_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create words table
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default_categories table
CREATE TABLE default_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  words TEXT[]
);

-- Enable Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Users can view own collections and shared" ON collections
  FOR SELECT USING (auth.uid() = user_id OR share_code IS NOT NULL);

CREATE POLICY "Users can insert own collections" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for words
CREATE POLICY "Users can view words in own or shared collections" ON words
  FOR SELECT USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid() OR share_code IS NOT NULL
    )
  );

CREATE POLICY "Users can insert words in own collections" ON words
  FOR INSERT WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update words in own collections" ON words
  FOR UPDATE USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete words in own collections" ON words
  FOR DELETE USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );