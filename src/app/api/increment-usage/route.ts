// app/api/increment-usage/route.ts
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { incrementUserUsage } from '@/app/lib/db';

export async function POST() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const result = await incrementUserUsage(session.user.email);

    if (!result.success) {
      return new NextResponse('Failed to increment usage', { status: 500 });
    }

    return NextResponse.json({ success: true, usage: result.usage });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
