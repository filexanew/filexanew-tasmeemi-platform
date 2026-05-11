import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://bggvmvrewvmwmmlvfgoj.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ3ZtdnJld3Ztd21tbHZmZ29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDkyNzQsImV4cCI6MjA4NzYyNTI3NH0._Q0rN-2YhXw79YZh4kEn1ocnFYSnCEsgnpQd3K8Z_-E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
