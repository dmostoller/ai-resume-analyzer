// app/api/scans/save/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { saveUserScan } from '@/app/lib/db';
import { AnalysisResponse } from '@/app/types/analysis';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scanData: AnalysisResponse = await request.json();

    const scan = await saveUserScan(session.user.email, {
      ...scanData,
      createdAt: new Date()
    });

    return NextResponse.json(scan);
  } catch (error) {
    console.error('Error saving scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
