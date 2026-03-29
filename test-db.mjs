import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Client 1: Service Role (Bypasses RLS)
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Client 2: Anon Key (Subject to RLS)
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log("--- Bypassing RLS (Service Role) ---");
  const adminRes = await adminClient.from('profiles').select('*');
  console.log("Profiles in DB:", adminRes.data);
  
  console.log("\n--- Applying RLS (Anon Key) ---");
  const anonRes = await anonClient.from('profiles').select('*');
  console.log("Profiles visible to anon:", anonRes.data);
  if (anonRes.error) console.error("Anon Error:", anonRes.error);
}
main();
