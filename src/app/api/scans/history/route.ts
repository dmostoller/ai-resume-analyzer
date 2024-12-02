// app/api/scans/history/route.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserScans } from '@/app/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scans = await getUserScans(session.user.email);

    return NextResponse.json(scans);
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
