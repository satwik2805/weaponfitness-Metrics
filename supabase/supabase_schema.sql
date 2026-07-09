-- supabase_schema.sql
-- Create a schema for storing muscle selections.
-- You can run this script directly in your Supabase Project's SQL Editor.

-- Drop the table if it already exists (caution: this deletes old selection data)
-- DROP TABLE IF EXISTS public.muscle_selections;

CREATE TABLE IF NOT EXISTS public.muscle_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT DEFAULT 'anonymous_user', -- Placeholder for future authentication integration
    selected_muscles TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.muscle_selections ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public (anon) read access
CREATE POLICY "Allow public read access"
ON public.muscle_selections
FOR SELECT
USING (true);

-- Create policy to allow public (anon) insert/update access
CREATE POLICY "Allow public insert/update access"
ON public.muscle_selections
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert a default baseline record to seed the table
INSERT INTO public.muscle_selections (user_id, selected_muscles)
VALUES ('anonymous_user', ARRAY['Pectoralis Major', 'Biceps Brachii', 'Quadriceps'])
ON CONFLICT DO NOTHING;
