import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';

export async function getSessionAndProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authUser: null, profile: null };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  return { authUser: user, profile };
}

export async function getCurrentUser() {
  const { profile } = await getSessionAndProfile();
  if (!profile) return null;
  return { id: profile.id, email: profile.email, displayName: profile.display_name, role: profile.role };
}
