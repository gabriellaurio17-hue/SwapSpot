import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing REACT_APP_SUPABASE_URL environment variable. Add it to .env.local.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable. Add it to .env.local.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);