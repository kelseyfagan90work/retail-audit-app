import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Bypasses RLS entirely — every Route Handler using this does its own
// role/ownership checks in code before running a query (see lib/auth.js).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
