import { NextResponse } from 'next/server';
import { getSessionAndProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { authUser, profile } = await getSessionAndProfile();
  if (!authUser) return NextResponse.json({ authenticated: false });
  if (!profile) return NextResponse.json({ authenticated: true, provisioned: false });
  return NextResponse.json({
    authenticated: true,
    provisioned: true,
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
  });
}
