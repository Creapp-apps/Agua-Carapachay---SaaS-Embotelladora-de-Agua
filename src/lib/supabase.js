import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://vyiduefwrpxpbnramfrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aWR1ZWZ3cnB4cGJucmFtZnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDEyNjYsImV4cCI6MjA4NzYxNzI2Nn0.ziaL2_qzLi6Hkx2Tgyni4e6A-dh8Q3Hg80mkTaTp4FU'
);
