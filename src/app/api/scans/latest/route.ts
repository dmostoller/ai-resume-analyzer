// app/api/scans/latest/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLatestUserScan } from '@/app/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const latestScan = await getLatestUserScan(session.user.email);

    if (!latestScan) {
      return NextResponse.json({ message: 'No scans found' }, { status: 200 });
    }

    return NextResponse.json(latestScan);
  } catch (error) {
    console.error('Error fetching latest scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
