import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateAuditPdf } from '@/lib/generateAuditPdf';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let buffer, fileName;
  try {
    ({ buffer, fileName } = await generateAuditPdf(params.id));
  } catch (e) {
    return NextResponse.json({ error: `Could not generate PDF: ${e.message}` }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
