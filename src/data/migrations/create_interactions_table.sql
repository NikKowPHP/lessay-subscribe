CREATE TABLE interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_ip TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  recording_size INTEGER,
  response_time INTEGER,
  ai_response_length INTEGER,
  recording_time INTEGER,
  ai_response JSONB,
  recording JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);